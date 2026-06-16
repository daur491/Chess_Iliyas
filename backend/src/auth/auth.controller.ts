import { Controller, Post, Body, Get, ForbiddenException } from '@nestjs/common';
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

  @Get('dev-login')
  async devLogin() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return this.authService.devLogin();
  }
}
