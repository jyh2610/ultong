import { UnauthorizedException } from '@nestjs/common';
import { KakaoService } from './kakao.service';

describe('KakaoService', () => {
  let service: KakaoService;

  beforeEach(() => {
    service = new KakaoService();
    jest.restoreAllMocks();
  });

  it('getUserInfo() returns id + nickname for a valid token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: 123456, properties: { nickname: '멍냥이집사' } }),
    } as Response);

    const result = await service.getUserInfo('valid-token');

    expect(global.fetch).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(result).toEqual({ id: '123456', nickname: '멍냥이집사' });
  });

  it('getUserInfo() returns nickname: null when Kakao omits properties', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 123456 }),
    } as Response);

    const result = await service.getUserInfo('valid-token');

    expect(result).toEqual({ id: '123456', nickname: null });
  });

  it('getUserInfo() throws UnauthorizedException on a non-OK response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(service.getUserInfo('bad-token')).rejects.toThrow(UnauthorizedException);
  });
});
