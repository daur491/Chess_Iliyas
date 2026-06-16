import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsString, IsOptional, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { PuzzlesService } from './puzzles.service';
import { PuzzleCategory, PuzzleDifficulty } from '../shared/entities/puzzle.entity';

class SubmitAttemptDto {
  @IsArray()
  @IsString({ each: true })
  moves: string[];
}

@Controller('puzzles')
@UseGuards(JwtAuthGuard)
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Get()
  getPuzzles(
    @Query('category') category?: PuzzleCategory,
    @Query('difficulty') difficulty?: PuzzleDifficulty,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.puzzlesService.getPuzzles(category, difficulty, +page, +limit);
  }

  @Get('daily')
  getDailyPuzzle() {
    return this.puzzlesService.getDailyPuzzle();
  }

  @Post(':id/attempt')
  submitAttempt(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.puzzlesService.submitAttempt(user.id, id, dto.moves);
  }

  @Get(':id/solution')
  showSolution(@CurrentUser() user: User, @Param('id') id: string) {
    return this.puzzlesService.showSolution(user.id, id);
  }
}
