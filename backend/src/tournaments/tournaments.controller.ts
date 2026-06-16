import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  getAll() {
    return this.tournamentsService.getAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.tournamentsService.getOne(id);
  }

  @Post(':id/join')
  join(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tournamentsService.join(id, user.id);
  }

  @Get(':id/standings')
  getStandings(@Param('id') id: string) {
    return this.tournamentsService.getStandings(id);
  }
}
