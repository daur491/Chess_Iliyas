import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement, AchievementType } from '../shared/entities/achievement.entity';

const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementType,
  { title: string; description: string; target: number }
> = {
  [AchievementType.FIRST_WIN]: { title: 'Первая победа', description: 'Выиграй первую партию', target: 1 },
  [AchievementType.WIN_STREAK_5]: { title: 'Серия из 5', description: 'Выиграй 5 партий подряд', target: 5 },
  [AchievementType.WIN_STREAK_10]: { title: 'Серия из 10', description: 'Выиграй 10 партий подряд', target: 10 },
  [AchievementType.GAMES_10]: { title: 'Новичок', description: 'Сыграй 10 партий', target: 10 },
  [AchievementType.GAMES_50]: { title: 'Опытный', description: 'Сыграй 50 партий', target: 50 },
  [AchievementType.GAMES_100]: { title: 'Ветеран', description: 'Сыграй 100 партий', target: 100 },
  [AchievementType.PUZZLES_10]: { title: 'Тактик', description: 'Реши 10 задач', target: 10 },
  [AchievementType.PUZZLES_50]: { title: 'Стратег', description: 'Реши 50 задач', target: 50 },
  [AchievementType.PUZZLES_100]: { title: 'Гроссмейстер задач', description: 'Реши 100 задач', target: 100 },
  [AchievementType.PUZZLE_PERFECT]: { title: 'Идеальное решение', description: 'Реши задачу с первой попытки', target: 1 },
  [AchievementType.ELO_1400]: { title: 'Рейтинг 1400', description: 'Достигни рейтинга 1400', target: 1400 },
  [AchievementType.ELO_1500]: { title: 'Рейтинг 1500', description: 'Достигни рейтинга 1500', target: 1500 },
  [AchievementType.ELO_1700]: { title: 'Рейтинг 1700', description: 'Достигни рейтинга 1700', target: 1700 },
  [AchievementType.ELO_2000]: { title: 'Эксперт', description: 'Достигни рейтинга 2000', target: 2000 },
  [AchievementType.TOURNAMENT_WIN]: { title: 'Чемпион', description: 'Выиграй турнир', target: 1 },
  [AchievementType.TOURNAMENT_PARTICIPATE]: { title: 'Участник', description: 'Участвуй в турнире', target: 1 },
  [AchievementType.DAILY_PUZZLE]: { title: 'Ежедневная задача', description: 'Реши ежедневное задание', target: 1 },
  [AchievementType.DAILY_PUZZLE_7]: { title: '7 дней подряд', description: 'Решай ежедневное задание 7 дней', target: 7 },
  [AchievementType.CHECKMATE_SCHOLAR]: { title: 'Детский мат', description: 'Поставь мат в 4 хода', target: 1 },
  [AchievementType.FIRST_DRAW]: { title: 'Ничья', description: 'Сыграй вничью', target: 1 },
};

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementsRepo: Repository<Achievement>,
  ) {}

  async checkAndUnlock(userId: string, type: AchievementType, progress: number): Promise<Achievement | null> {
    const def = ACHIEVEMENT_DEFINITIONS[type];
    if (!def) return null;

    let achievement = await this.achievementsRepo.findOne({
      where: { userId, type },
    });

    if (!achievement) {
      achievement = this.achievementsRepo.create({
        userId,
        type,
        title: def.title,
        description: def.description,
        target: def.target,
        progress: 0,
        unlocked: false,
      });
    }

    if (achievement.unlocked) return achievement;

    achievement.progress = Math.min(progress, def.target);

    if (achievement.progress >= def.target) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
    }

    return this.achievementsRepo.save(achievement);
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementsRepo.find({
      where: { userId },
      order: { unlockedAt: 'DESC' },
    });
  }

  async getRecentUnlocked(userId: string, limit = 3): Promise<Achievement[]> {
    return this.achievementsRepo.find({
      where: { userId, unlocked: true },
      order: { unlockedAt: 'DESC' },
      take: limit,
    });
  }
}
