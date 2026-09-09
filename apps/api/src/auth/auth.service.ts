import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { KakaoService } from './kakao.service';
import { SignupLocalDto } from './dto/signup-local.dto';
import { LoginLocalDto } from './dto/login-local.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly kakaoService: KakaoService,
  ) {}

  async signup(dto: SignupLocalDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    let user: User;
    try {
      user = await this.usersService.createLocal({
        email: dto.email,
        passwordHash,
        nickname: dto.nickname,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('이미 가입된 이메일입니다.');
      }
      throw error;
    }

    return this.issueTokens(user.id);
  }

  async login(dto: LoginLocalDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const passwordMatches = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return this.issueTokens(user.id);
  }

  async loginWithKakao(dto: KakaoLoginDto): Promise<AuthTokens> {
    const kakaoUser = await this.kakaoService.getUserInfo(dto.accessToken);
    let user = await this.usersService.findByProviderUid(
      AuthProvider.kakao,
      kakaoUser.id,
    );

    if (!user) {
      user = await this.usersService.createOAuth({
        provider: AuthProvider.kakao,
        providerUid: kakaoUser.id,
        nickname:
          kakaoUser.nickname ?? `user_${randomBytes(4).toString('hex')}`,
      });
    } else if (user.deletedAt !== null) {
      user = await this.usersService.reactivate(user.id);
    }

    return this.issueTokens(user.id);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    const { userId, refreshToken } = await this.tokenService.rotateRefreshToken(
      dto.refreshToken,
    );
    return {
      accessToken: this.tokenService.issueAccessToken(userId),
      refreshToken,
    };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.tokenService.revokeRefreshToken(dto.refreshToken);
  }

  private async issueTokens(userId: bigint): Promise<AuthTokens> {
    const accessToken = this.tokenService.issueAccessToken(userId);
    const refreshToken = await this.tokenService.issueRefreshToken(userId);
    return { accessToken, refreshToken };
  }
}
