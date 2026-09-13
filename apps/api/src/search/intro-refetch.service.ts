import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IntroSource = 'cache' | 'live' | 'synced';

export interface IntroResult {
  intro: Record<string, unknown> | null;
  introSource: IntroSource;
  introCheckedAt: string;
}

interface CacheEntry {
  intro: Record<string, unknown>;
  fetchedAt: number;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

@Injectable()
export class IntroRefetchService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly dailyLimit: number;
  private dailyCount = 0;
  private resetAt: number;

  constructor(private readonly config: ConfigService) {
    this.cacheTtlMs =
      Number(this.config.get<string>('TOUR_API_INTRO_CACHE_TTL_MIN') ?? '20') *
      60_000;
    this.dailyLimit = Number(
      this.config.get<string>('TOUR_API_DAILY_LIMIT') ?? '1000',
    );
    this.resetAt = this.nextKstMidnight(Date.now());
  }

  async getIntro(
    contentId: string,
    contentTypeId: string | null,
    fallbackIntro: Record<string, unknown> | null,
  ): Promise<IntroResult> {
    const now = Date.now();
    const checkedAt = new Date(now).toISOString();

    const cached = this.cache.get(contentId);
    if (cached && now - cached.fetchedAt < this.cacheTtlMs) {
      return {
        intro: cached.intro,
        introSource: 'cache',
        introCheckedAt: checkedAt,
      };
    }

    if (!this.hasQuotaRemaining(now)) {
      return {
        intro: fallbackIntro,
        introSource: 'synced',
        introCheckedAt: checkedAt,
      };
    }

    this.dailyCount += 1;
    try {
      const intro = await this.fetchFromTourApi(contentId, contentTypeId);
      this.cache.set(contentId, { intro, fetchedAt: now });
      return { intro, introSource: 'live', introCheckedAt: checkedAt };
    } catch {
      return {
        intro: fallbackIntro,
        introSource: 'synced',
        introCheckedAt: checkedAt,
      };
    }
  }

  private hasQuotaRemaining(now: number): boolean {
    if (now >= this.resetAt) {
      this.dailyCount = 0;
      this.resetAt = this.nextKstMidnight(now);
    }
    return this.dailyCount < this.dailyLimit;
  }

  private nextKstMidnight(fromMs: number): number {
    const kstNow = new Date(fromMs + KST_OFFSET_MS);
    const kstNextMidnightMs = Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate() + 1,
    );
    return kstNextMidnightMs - KST_OFFSET_MS;
  }

  // ★ serviceKey는 포털의 URL-인코딩된 값을 그대로 쓴다. URLSearchParams나 fetch의
  // 자동 인코딩에 맡기면 %2B가 %252B로 재인코딩되어 인증이 깨진다(검색-API-스펙.md §3.1) —
  // 그래서 쿼리스트링을 직접 문자열로 이어붙인다.
  //
  // ⚠️ 응답 스키마(response.header.resultCode, response.body.items.item[])는 TourAPI
  // 4.0 매뉴얼 기준 표준 포맷이다. 이 프로젝트의 서비스키가 아직 인증 승인 문제로
  // 실제 성공 응답을 받아본 적이 없다 — 키 문제가 풀리면 실제 응답으로 검증 필요.
  private async fetchFromTourApi(
    contentId: string,
    contentTypeId: string | null,
  ): Promise<Record<string, unknown>> {
    const serviceKey = this.config.getOrThrow<string>('TOUR_API_SERVICE_KEY');
    const query =
      `serviceKey=${serviceKey}` +
      `&MobileOS=ETC&MobileApp=mungnyangroad&_type=json` +
      `&contentId=${encodeURIComponent(contentId)}` +
      (contentTypeId
        ? `&contentTypeId=${encodeURIComponent(contentTypeId)}`
        : '');

    const response = await fetch(
      `https://apis.data.go.kr/B551011/KorService2/detailIntro2?${query}`,
    );
    if (!response.ok) {
      throw new Error(`TourAPI detailIntro2 responded with ${response.status}`);
    }

    const body = (await response.json()) as {
      response?: {
        header?: { resultCode?: string };
        body?: { items?: { item?: unknown[] } };
      };
    };

    if (body.response?.header?.resultCode !== '0000') {
      throw new Error(
        `TourAPI detailIntro2 error code ${body.response?.header?.resultCode ?? 'unknown'}`,
      );
    }

    const item = body.response.body?.items?.item?.[0];
    if (!item || typeof item !== 'object') {
      throw new Error('TourAPI detailIntro2 returned no item');
    }

    return item as Record<string, unknown>;
  }
}
