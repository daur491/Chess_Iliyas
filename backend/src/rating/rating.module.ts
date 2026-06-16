import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../shared/entities/user.entity';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [RatingService],
  controllers: [RatingController],
  exports: [RatingService],
})
export class RatingModule {}
