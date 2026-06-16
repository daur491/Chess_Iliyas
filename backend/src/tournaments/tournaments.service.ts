import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Tournament,
  TournamentStatus,
  TournamentFormat,
} from '../shared/entities/tournament.entity';
import { TournamentParticipant } from '../shared/entities/tournament-participant.entity';
import { TimeControl } from '../shared/entities/game.entity';
import { GamesService } from '../games/games.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantsRepo: Repository<TournamentParticipant>,
    private readonly gamesService: GamesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAll(): Promise<Tournament[]> {
    return this.tournamentsRepo.find({
      relations: { participants: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: string): Promise<Tournament> {
    const t = await this.tournamentsRepo.findOne({
      where: { id },
      relations: { participants: { user: true } },
    });
    if (!t) throw new NotFoundException('Tournament not found');
    return t;
  }

  async join(tournamentId: string, userId: string): Promise<TournamentParticipant> {
    const tournament = await this.getOne(tournamentId);

    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament is not open for registration');
    }

    const existing = await this.participantsRepo.findOne({
      where: { tournamentId, userId },
    });
    if (existing) throw new BadRequestException('Already registered');

    if (tournament.participants.length >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    const participant = this.participantsRepo.create({ tournamentId, userId });
    const saved = await this.participantsRepo.save(participant);

    this.eventEmitter.emit('tournament.joined', { userId, tournamentId });

    return saved;
  }

  async getStandings(tournamentId: string): Promise<TournamentParticipant[]> {
    return this.participantsRepo.find({
      where: { tournamentId },
      relations: { user: true },
      order: { score: 'DESC', buchholz: 'DESC' },
    });
  }

  async create(dto: {
    name: string;
    timeControl: TimeControl;
    maxPlayers?: number;
    rounds?: number;
    description?: string;
  }): Promise<Tournament> {
    const tournament = this.tournamentsRepo.create({
      name: dto.name,
      timeControl: dto.timeControl,
      format: TournamentFormat.SWISS,
      status: TournamentStatus.REGISTRATION,
      maxPlayers: dto.maxPlayers ?? 64,
      rounds: dto.rounds ?? 7,
      description: dto.description,
    });
    return this.tournamentsRepo.save(tournament);
  }

  async updateStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const tournament = await this.getOne(id);
    tournament.status = status;
    if (status === TournamentStatus.ACTIVE) {
      tournament.startedAt = new Date();
    } else if (status === TournamentStatus.FINISHED) {
      tournament.endedAt = new Date();
      await this.updateRanksAndNotifyWinner(id);
    }
    return this.tournamentsRepo.save(tournament);
  }

  private async updateRanksAndNotifyWinner(tournamentId: string): Promise<void> {
    const standings = await this.getStandings(tournamentId);
    for (let i = 0; i < standings.length; i++) {
      standings[i].rank = i + 1;
      await this.participantsRepo.save(standings[i]);
    }
    if (standings.length > 0) {
      this.eventEmitter.emit('tournament.won', { userId: standings[0].userId, tournamentId });
    }
  }
}
