import { Injectable } from '@nestjs/common';
import type { estypes } from '@elastic/elasticsearch';
import { EsClientService } from './es-client.service';
import { CodesService, CodeItem } from './codes.service';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';
import { buildPlacesSearchQuery } from './places-search.query-builder';
import { matchVerdict, MatchResult } from './match-verdict';

const CONTENT_TYPE_NAMES: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제행사',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점',
};

interface PlaceSource {
  title: string;
  addr1?: string;
  location?: { lat: number; lon: number };
  media?: { thumb?: string; first_image?: string };
  category?: {
    content_type_id?: string;
    content_type?: string;
    lcls1?: string;
    lcls2?: string;
    lcls3?: string;
  };
  region?: {
    ldong_regn_cd?: string;
    ldong_signgu_cd?: string;
    sido?: string;
    sigungu?: string;
  };
  pet_tags?: Record<string, unknown>;
  pet_evidence?: unknown[];
}

export interface PlaceSearchItem {
  contentId: string;
  title: string;
  addr1: string | null;
  location: { lat: number; lon: number } | null;
  thumb: string | null;
  category: {
    contentTypeId: string | null;
    contentType: string | null;
    lcls1: string | null;
    lcls2: string | null;
    lcls3: string | null;
    categoryPath: string | null;
  };
  region: { sido: string | null; sigungu: string | null };
  // [비활성화 2026-09-14] 서버는 더 이상 distanceKm을 계산하지 않는다 — 클라이언트가
  // location으로 직접 계산한다 (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // distanceKm?: number;
  petTags: Record<string, unknown>;
  match: MatchResult;
  evidence: unknown[];
  highlight: Record<string, string[]>;
}

export interface PlaceFacetBucket {
  code: string;
  name: string;
  count: number;
}

export interface ConfidenceFacetBucket {
  code: string;
  count: number;
}

export interface PlacesSearchResult {
  total: number;
  page: number;
  size: number;
  hasNext: boolean;
  items: PlaceSearchItem[];
  facets: {
    byCategory: PlaceFacetBucket[];
    byType: PlaceFacetBucket[];
    bySido: PlaceFacetBucket[];
    byConfidence: ConfidenceFacetBucket[];
  };
}

@Injectable()
export class PlacesService {
  constructor(
    private readonly es: EsClientService,
    private readonly codesService: CodesService,
  ) {}

  async search(dto: PlacesSearchQueryDto): Promise<PlacesSearchResult> {
    const query = buildPlacesSearchQuery(dto);
    const [response, categories, regions] = await Promise.all([
      this.es.client.search<PlaceSource>(query),
      this.codesService.getCategories(),
      this.codesService.getRegions(),
    ]);

    const categoryByCode = new Map(categories.map((item) => [item.code, item]));
    const regionByCode = new Map(regions.map((item) => [item.code, item]));

    const items = response.hits.hits.map((hit) =>
      this.mapHit(hit, categoryByCode, regionByCode, dto),
    );

    const total = this.getTotal(response.hits.total);

    return {
      total,
      page: dto.page,
      size: dto.size,
      hasNext: dto.page * dto.size < total,
      items,
      facets: this.buildFacets(
        response.aggregations,
        categoryByCode,
        regionByCode,
      ),
    };
  }

  private mapHit(
    hit: estypes.SearchHit<PlaceSource>,
    categoryByCode: Map<string, CodeItem>,
    regionByCode: Map<string, CodeItem>,
    dto: PlacesSearchQueryDto,
  ): PlaceSearchItem {
    const source = hit._source ?? ({} as PlaceSource);
    const petTags = source.pet_tags ?? {};
    const category = source.category ?? {};
    const region = source.region ?? {};

    const categoryEntry =
      (category.lcls3 && categoryByCode.get(category.lcls3)) ||
      (category.lcls2 && categoryByCode.get(category.lcls2)) ||
      (category.lcls1 && categoryByCode.get(category.lcls1)) ||
      undefined;

    return {
      contentId: hit._id ?? '',
      title: source.title,
      addr1: source.addr1 ?? null,
      location: source.location ?? null,
      thumb: source.media?.thumb ?? source.media?.first_image ?? null,
      category: {
        contentTypeId: category.content_type_id ?? null,
        // place 문서에 content_type이 이미 한글로 채워져 있다(areaBasedList2 단계) —
        // 코드 조인 없이 그대로 쓰고, 누락된 경우에만 하드코딩 맵으로 보완한다.
        contentType:
          category.content_type ??
          (category.content_type_id
            ? (CONTENT_TYPE_NAMES[category.content_type_id] ?? null)
            : null),
        lcls1: category.lcls1 ?? null,
        lcls2: category.lcls2 ?? null,
        lcls3: category.lcls3 ?? null,
        categoryPath: categoryEntry?.path ?? null,
      },
      region: {
        // place 문서에 sido/sigungu가 이미 한글로 채워져 있다. ldong_signgu_cd는
        // 시도 안에서만 고유해서 전역 코드→이름 맵으로 조회하면 다른 시도의 같은
        // 코드와 충돌한다 — sido 레벨(전역 고유)만 폴백으로 쓰고 sigungu는 폴백하지 않는다.
        sido:
          region.sido ??
          (region.ldong_regn_cd &&
            regionByCode.get(region.ldong_regn_cd)?.name) ??
          null,
        sigungu: region.sigungu ?? null,
      },
      petTags,
      match: matchVerdict(petTags, {
        weightKg: dto.weightKg ?? null,
        hasCage: dto.hasCage,
      }),
      evidence: source.pet_evidence ?? [],
      highlight: hit.highlight ?? {},
    };
  }

  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // private getDistanceKm(
  //   hit: estypes.SearchHit<PlaceSource>,
  //   sort: PlacesSortOption,
  // ): number | undefined {
  //   if (sort !== 'distance') return undefined;
  //   const value: unknown = hit.sort?.[0];
  //   return typeof value === 'number' ? value : undefined;
  // }

  private getTotal(total: estypes.SearchHitsMetadata['total']): number {
    if (typeof total === 'number') return total;
    return total?.value ?? 0;
  }

  private buildFacets(
    aggregations: estypes.SearchResponse<PlaceSource>['aggregations'],
    categoryByCode: Map<string, CodeItem>,
    regionByCode: Map<string, CodeItem>,
  ): PlacesSearchResult['facets'] {
    const buckets = (agg: unknown): { key: string; doc_count: number }[] =>
      (
        (agg as { buckets?: { key: string; doc_count: number }[] })?.buckets ??
        []
      ).map((b) => ({
        key: String(b.key),
        doc_count: b.doc_count,
      }));

    return {
      byCategory: buckets(aggregations?.by_lcls1).map((b) => ({
        code: b.key,
        name: categoryByCode.get(b.key)?.name ?? b.key,
        count: b.doc_count,
      })),
      byType: buckets(aggregations?.by_type).map((b) => ({
        code: b.key,
        name: CONTENT_TYPE_NAMES[b.key] ?? b.key,
        count: b.doc_count,
      })),
      bySido: buckets(aggregations?.by_sido).map((b) => ({
        code: b.key,
        name: regionByCode.get(b.key)?.name ?? b.key,
        count: b.doc_count,
      })),
      byConfidence: buckets(aggregations?.by_confidence).map((b) => ({
        code: b.key,
        count: b.doc_count,
      })),
    };
  }
}
