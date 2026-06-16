import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty } from 'class-validator';

class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async telegramLogin(@Body() dto: TelegramAuthDto) {
    return this.authService.loginWithTelegram(dto.initData);
  }
}
