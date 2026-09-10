import { readFileSync } from 'fs';
import { join } from 'path';
import { matchVerdict } from './match-verdict';

interface GoldenPersona {
  id: string;
  label: string;
  weight_kg: number | null;
  size: string | null;
  has_cage: boolean;
}

interface GoldenExpected {
  verdict: string;
  area_restricted: boolean;
  confidence: string;
  reasons: string[];
}

interface GoldenCase {
  bucket: string;
  content_id: string;
  title: string;
  pet_tags: Record<string, unknown>;
  expected: Record<string, GoldenExpected>;
}

interface GoldenFixture {
  personas: GoldenPersona[];
  cases: GoldenCase[];
}

const fixturePath = join(
  __dirname,
  '../../../../docs/contracts/match-golden.json',
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as GoldenFixture;

describe('matchVerdict() golden fixture', () => {
  it('loads at least one case and one persona from the fixture', () => {
    expect(fixture.cases.length).toBeGreaterThan(0);
    expect(fixture.personas.length).toBeGreaterThan(0);
  });

  for (const testCase of fixture.cases) {
    for (const persona of fixture.personas) {
      const expected = testCase.expected[persona.id];

      it(`[${testCase.bucket}] ${testCase.title} x ${persona.label} -> ${expected.verdict}`, () => {
        const result = matchVerdict(testCase.pet_tags, {
          weightKg: persona.weight_kg,
          hasCage: persona.has_cage,
        });

        expect(result.verdict).toBe(expected.verdict);
        expect(result.confidence).toBe(expected.confidence);
        expect(result.areaRestricted).toBe(expected.area_restricted);
        expect(result.reasons).toHaveLength(expected.reasons.length);
      });
    }
  }
});
