import { CodesService } from './codes.service';
import { EsClientService } from './es-client.service';

describe('CodesService', () => {
  let service: CodesService;
  const search = jest.fn();
  const esClient = { client: { search } };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CodesService(esClient as unknown as EsClientService);
  });

  function mockSearchResult(sources: Record<string, unknown>[]) {
    search.mockResolvedValue({
      hits: { hits: sources.map((source) => ({ _source: source })) },
    });
  }

  describe('getCategories', () => {
    it('queries pettour-code filtered to code_type=lcls', async () => {
      mockSearchResult([]);

      await service.getCategories();

      expect(search).toHaveBeenCalledWith({
        index: 'pettour-code',
        size: 1000,
        query: { bool: { filter: [{ term: { code_type: 'lcls' } }] } },
        sort: [{ depth: 'asc' }, { code: 'asc' }],
      });
    });

    it('adds a parent_code filter when parentCode is given', async () => {
      mockSearchResult([]);

      await service.getCategories('NA');

      expect(search).toHaveBeenCalledWith({
        index: 'pettour-code',
        size: 1000,
        query: {
          bool: {
            filter: [
              { term: { code_type: 'lcls' } },
              { term: { parent_code: 'NA' } },
            ],
          },
        },
        sort: [{ depth: 'asc' }, { code: 'asc' }],
      });
    });

    it('maps ES _source fields from snake_case to camelCase', async () => {
      mockSearchResult([
        {
          code: 'NA',
          name: '자연관광',
          parent_code: null,
          parent_name: null,
          depth: 1,
          path: '자연관광',
        },
        {
          code: 'VE03',
          name: '도시공원',
          parent_code: 'VE',
          parent_name: '문화관광',
          depth: 2,
          path: '문화관광 > 도시공원',
        },
      ]);

      const result = await service.getCategories();

      expect(result).toEqual([
        {
          code: 'NA',
          name: '자연관광',
          parentCode: null,
          parentName: null,
          depth: 1,
          path: '자연관광',
        },
        {
          code: 'VE03',
          name: '도시공원',
          parentCode: 'VE',
          parentName: '문화관광',
          depth: 2,
          path: '문화관광 > 도시공원',
        },
      ]);
    });
  });

  describe('getRegions', () => {
    it('queries pettour-code filtered to code_type=ldong', async () => {
      mockSearchResult([]);

      await service.getRegions();

      expect(search).toHaveBeenCalledWith({
        index: 'pettour-code',
        size: 1000,
        query: { bool: { filter: [{ term: { code_type: 'ldong' } }] } },
        sort: [{ depth: 'asc' }, { code: 'asc' }],
      });
    });

    it('adds a parent_code filter when parentCode is given', async () => {
      mockSearchResult([]);

      await service.getRegions('26');

      expect(search).toHaveBeenCalledWith({
        index: 'pettour-code',
        size: 1000,
        query: {
          bool: {
            filter: [
              { term: { code_type: 'ldong' } },
              { term: { parent_code: '26' } },
            ],
          },
        },
        sort: [{ depth: 'asc' }, { code: 'asc' }],
      });
    });
  });
});
