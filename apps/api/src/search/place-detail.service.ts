import { Injectable } from '@nestjs/common';
import type { estypes } from '@elastic/elasticsearch';
import { EsClientService } from './es-client.service';
import { IntroRefetchService } from './intro-refetch.service';
import { PlaceDetailQueryDto } from './dto/place-detail-query.dto';
import { matchVerdict, MatchResult } from './match-verdict';

interface PlaceDetailSource {
  title: string;
  category?: { content_type_id?: string };
  pet_tags?: Record<string, unknown>;
  intro?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlaceDetail extends Omit<PlaceDetailSource, 'intro'> {
  contentId: string;
  match: MatchResult;
  intro: Record<string, unknown> | null;
  introSource: 'cache' | 'live' | 'synced';
  introCheckedAt: string;
}

function isNotFound(error: unknown): boolean {
  const statusCode =
    (error as { meta?: { statusCode?: number } })?.meta?.statusCode ??
    (error as { statusCode?: number })?.statusCode;
  return statusCode === 404;
}

@Injectable()
export class PlaceDetailService {
  constructor(
    private readonly es: EsClientService,
    private readonly introRefetchService: IntroRefetchService,
  ) {}

  async getDetail(
    contentId: string,
    query: PlaceDetailQueryDto,
  ): Promise<PlaceDetail | null> {
    let response: estypes.GetGetResult<PlaceDetailSource>;
    try {
      response = await this.es.client.get<PlaceDetailSource>({
        index: 'pettour-place',
        id: contentId,
      });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }

    const source = response._source ?? ({} as PlaceDetailSource);
    const { intro: esIntro, ...rest } = source;

    const match = matchVerdict(source.pet_tags ?? {}, {
      weightKg: query.weightKg ?? null,
      hasCage: query.hasCage,
    });

    const { intro, introSource, introCheckedAt } =
      await this.introRefetchService.getIntro(
        contentId,
        source.category?.content_type_id ?? null,
        esIntro ?? null,
      );

    return {
      contentId,
      ...rest,
      match,
      intro,
      introSource,
      introCheckedAt,
    };
  }
}
