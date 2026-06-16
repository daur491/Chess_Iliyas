import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsInt, IsEnum, IsArray, IsOptional, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/guards/admin.guard';
import { UsersService } from '../users/users.service';
import { PuzzlesService } from '../puzzles/puzzles.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { PuzzleCategory, PuzzleDifficulty } from '../shared/entities/puzzle.entity';
import { TournamentStatus } from '../shared/entities/tournament.entity';
import { TimeControl } from '../shared/entities/game.entity';

class BanUserDto {
  @IsString()
  reason: string;
}

class UpdateEloDto {
  @IsInt()
  @Min(100)
  @Max(3000)
  elo: number;
}

class CreatePuzzleDto {
  @IsString()
  fen: string;

  @IsArray()
  @IsString({ each: true })
  solutionMoves: string[];

  @IsEnum(PuzzleCategory)
  category: PuzzleCategory;

  @IsEnum(PuzzleDifficulty)
  difficulty: PuzzleDifficulty;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

class CreateTournamentDto {
  @IsString()
  name: string;

  @IsEnum(TimeControl)
  timeControl: TimeControl;

  @IsOptional()
  @IsInt()
  maxPlayers?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly puzzlesService: PuzzlesService,
    private readonly tournamentsService: TournamentsService,
  ) {}

  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(+page, +limit);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.usersService.banUser(id, dto.reason);
  }

  @Put('users/:id/elo')
  updateElo(@Param('id') id: string, @Body() dto: UpdateEloDto) {
    return this.usersService.updateUserEloAdmin(id, dto.elo);
  }

  @Post('puzzles')
  createPuzzle(@Body() dto: CreatePuzzleDto) {
    return this.puzzlesService.createPuzzle(dto);
  }

  @Put('puzzles/:id')
  updatePuzzle(@Param('id') id: string, @Body() dto: Partial<CreatePuzzleDto>) {
    return this.puzzlesService.updatePuzzle(id, dto as any);
  }

  @Delete('puzzles/:id')
  deletePuzzle(@Param('id') id: string) {
    return this.puzzlesService.deletePuzzle(id);
  }

  @Post('tournaments')
  createTournament(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @Put('tournaments/:id/status')
  updateTournamentStatus(
    @Param('id') id: string,
    @Body('status') status: TournamentStatus,
  ) {
    return this.tournamentsService.updateStatus(id, status);
  }
}
