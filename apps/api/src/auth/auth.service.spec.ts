import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findByProviderUid: jest.fn(),
    createLocal: jest.fn(),
    createOAuth: jest.fn(),
  };
  const passwordService = { hash: jest.fn(), compare: jest.fn() };
  const tokenService = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };
  const kakaoService = { getUserInfo: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as unknown as UsersService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      kakaoService,
    );
    tokenService.issueAccessToken.mockReturnValue('access-token');
    tokenService.issueRefreshToken.mockResolvedValue('refresh-token');
  });

  describe('signup', () => {
    it('creates a user and returns tokens when the email is not taken', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      usersService.createLocal.mockResolvedValue({ id: 1n });

      const result = await service.signup({
        email: 'a@b.com',
        password: 'plaintext-pw',
        nickname: '멍냥이',
      });

      expect(usersService.createLocal).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        nickname: '멍냥이',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws ConflictException when the email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1n });

      await expect(
        service.signup({ email: 'a@b.com', password: 'x', nickname: 'y' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens for correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1n,
        passwordHash: 'hashed-password',
      });
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login({
        email: 'a@b.com',
        password: 'plaintext-pw',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws UnauthorizedException for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1n,
        passwordHash: 'hashed-password',
      });
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithKakao', () => {
    it('logs in an existing kakao user without creating a new one', async () => {
      kakaoService.getUserInfo.mockResolvedValue({
        id: 'kakao-1',
        nickname: '멍멍이',
      });
      usersService.findByProviderUid.mockResolvedValue({ id: 5n });

      const result = await service.loginWithKakao({
        accessToken: 'kakao-token',
      });

      expect(usersService.createOAuth).not.toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('creates a new user on first kakao login', async () => {
      kakaoService.getUserInfo.mockResolvedValue({
        id: 'kakao-1',
        nickname: '멍멍이',
      });
      usersService.findByProviderUid.mockResolvedValue(null);
      usersService.createOAuth.mockResolvedValue({ id: 6n });

      await service.loginWithKakao({ accessToken: 'kakao-token' });

      expect(usersService.createOAuth).toHaveBeenCalledWith({
        provider: AuthProvider.kakao,
        providerUid: 'kakao-1',
        nickname: '멍멍이',
      });
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      tokenService.rotateRefreshToken.mockResolvedValue({
        userId: 1n,
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refresh({
        refreshToken: 'old-refresh-token',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      await service.logout({ refreshToken: 'some-refresh-token' });

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'some-refresh-token',
      );
    });
  });
});
