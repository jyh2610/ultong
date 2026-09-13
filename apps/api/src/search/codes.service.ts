import { Injectable } from '@nestjs/common';
import { EsClientService } from './es-client.service';

export interface CodeItem {
  code: string;
  name: string;
  parentCode: string | null;
  parentName: string | null;
  depth: number;
  path: string;
}

interface CodeSource {
  code: string;
  name: string;
  parent_code?: string | null;
  parent_name?: string | null;
  depth: number;
  path: string;
}

type CodeType = 'lcls' | 'ldong';

@Injectable()
export class CodesService {
  constructor(private readonly es: EsClientService) {}

  getCategories(parentCode?: string): Promise<CodeItem[]> {
    return this.listByType('lcls', parentCode);
  }

  getRegions(parentCode?: string): Promise<CodeItem[]> {
    return this.listByType('ldong', parentCode);
  }

  private async listByType(
    codeType: CodeType,
    parentCode?: string,
  ): Promise<CodeItem[]> {
    const filter: Record<string, unknown>[] = [
      { term: { code_type: codeType } },
    ];
    if (parentCode) {
      filter.push({ term: { parent_code: parentCode } });
    }

    const result = await this.es.client.search<CodeSource>({
      index: 'pettour-code',
      size: 1000,
      query: { bool: { filter } },
      sort: [{ depth: 'asc' }, { code: 'asc' }],
    });

    return result.hits.hits.map((hit) => {
      const source = hit._source as CodeSource;
      return {
        code: source.code,
        name: source.name,
        parentCode: source.parent_code ?? null,
        parentName: source.parent_name ?? null,
        depth: source.depth,
        path: source.path,
      };
    });
  }
}
