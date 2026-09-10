export type Verdict = 'allowed' | 'conditional' | 'denied' | 'unknown';

export interface MatchResult {
  verdict: Verdict;
  reasons: string[];
  confidence: string;
  areaRestricted: boolean;
}

export function matchVerdict(
  t: Record<string, unknown>,
  user: { weightKg?: number | null; hasCage?: boolean },
): MatchResult {
  const confidence = (t.confidence as string | undefined) ?? 'unknown';

  if (t.pet_allowed === false) {
    return {
      verdict: 'denied',
      confidence,
      areaRestricted: false,
      reasons: ['원문에 반려동물 동반 불가로 명시됨 (안내견·보조견 전용 포함)'],
    };
  }

  const reasons: string[] = [];
  const limit = (t.weight_limit_kg as number | undefined) ?? null;
  const op = (t.weight_op as string | undefined) ?? 'lte';
  const estimated = t.weight_is_estimated === true;
  const weightKg = user.weightKg ?? null;

  let verdict: Verdict = 'unknown';

  if (limit !== null && weightKg !== null) {
    const ok = op === 'lt' ? weightKg < limit : weightKg <= limit;
    if (!ok) {
      return {
        verdict: 'denied',
        confidence,
        areaRestricted: false,
        reasons: [
          `체중 ${weightKg}kg > ${estimated ? '추정' : '명시'} 기준 ${limit}kg ${op}`,
        ],
      };
    }
    reasons.push(`체중 ${weightKg}kg ≤ ${limit}kg 충족`);
    verdict = estimated ? 'conditional' : 'allowed';
  } else if (t.size_max === '제한없음') {
    reasons.push('견종·체중 제한 없음');
    verdict = 'allowed';
  } else if (limit === null && confidence === 'unknown') {
    return {
      verdict: 'unknown',
      confidence,
      areaRestricted: false,
      reasons: ['원문에 동반 조건 문구 없음 — 방문 전 확인 필요'],
    };
  } else {
    verdict = 'conditional';
  }

  if (t.cage_required && !user.hasCage) {
    reasons.push('이동장(켄넬) 필수 — 미소지 시 입장 불가');
    verdict = 'conditional';
  }
  if (confidence === 'estimated' && verdict === 'allowed')
    verdict = 'conditional';

  const areaRestricted = t.area_scope === 'partial';
  if (areaRestricted)
    reasons.push('일부 구역만 동반 가능 — 상세 구역은 원문 확인');

  return { verdict, reasons, confidence, areaRestricted };
}
