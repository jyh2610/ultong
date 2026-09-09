import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface KakaoUserInfo {
  id: string;
  nickname: string | null;
}

interface KakaoUserMeResponse {
  id: number;
  properties?: { nickname?: string };
}

@Injectable()
export class KakaoService {
  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
    }

    const body = (await response.json()) as KakaoUserMeResponse;

    return {
      id: String(body.id),
      nickname: body.properties?.nickname ?? null,
    };
  }
}
