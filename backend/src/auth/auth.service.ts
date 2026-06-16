import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  validateInitData(initData: string): TelegramUser {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new UnauthorizedException('Missing hash');

    params.delete('hash');
    const checkArr = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);
    const checkString = checkArr.join('\n');

    const botToken = this.configService.get<string>('BOT_TOKEN', '');
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (expectedHash !== hash) {
      throw new UnauthorizedException('Invalid initData signature');
    }

    const authDate = parseInt(params.get('auth_date') ?? '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new UnauthorizedException('initData expired');
    }

    const userJson = params.get('user');
    if (!userJson) throw new UnauthorizedException('Missing user');
    return JSON.parse(userJson) as TelegramUser;
  }

  async loginWithTelegram(initData: string) {
    const tgUser = this.validateInitData(initData);

    const user = await this.usersService.findOrCreate({
      telegramId: String(tgUser.id),
      username: tgUser.username ?? tgUser.first_name,
      avatarUrl: tgUser.photo_url,
    });

    const payload = { sub: user.id, telegramId: user.telegramId };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user };
  }
}
