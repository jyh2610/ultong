import { NotFoundException } from '@nestjs/common';
import { ReportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    report: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    placeReportStats: {
      upsert: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const es = { placeExists: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    service = new ReportsService(
      prisma as unknown as PrismaService,
      es as unknown as EsClientService,
    );
  });

  describe('list', () => {
    it('lists the current user reports, most recent first', async () => {
      prisma.report.findMany.mockResolvedValue([{ id: 1n }]);

      const result = await service.list(9n, undefined);

      expect(prisma.report.findMany).toHaveBeenCalledWith({
        where: { userId: 9n },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 1n }]);
    });

    it('filters by contentId when given', async () => {
      prisma.report.findMany.mockResolvedValue([]);

      await service.list(9n, '126508');

      expect(prisma.report.findMany).toHaveBeenCalledWith({
        where: { userId: 9n, contentId: '126508' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    const dto = {
      contentId: '126508',
      type: ReportType.denied_entry,
      detail: '입장 거부당함',
    };

    it('rejects a contentId that does not exist in ES', async () => {
      es.placeExists.mockResolvedValue(false);

      await expect(service.create(9n, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.report.create).not.toHaveBeenCalled();
    });

    it('creates the report and increments place_report_stats.count in a transaction', async () => {
      es.placeExists.mockResolvedValue(true);
      prisma.report.create.mockResolvedValue({ id: 1n, ...dto, userId: 9n });
      prisma.placeReportStats.findUniqueOrThrow.mockResolvedValue({
        contentId: '126508',
        count: 1,
        warning: false,
      });

      const result = await service.create(9n, dto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          userId: 9n,
          contentId: '126508',
          type: ReportType.denied_entry,
          detail: '입장 거부당함',
          reportedOn: expect.any(Date) as Date,
        },
      });
      expect(prisma.placeReportStats.upsert).toHaveBeenCalledWith({
        where: { contentId: '126508' },
        create: {
          contentId: '126508',
          count: 1,
          lastReportedAt: expect.any(Date) as Date,
        },
        update: {
          count: { increment: 1 },
          lastReportedAt: expect.any(Date) as Date,
        },
      });
      expect(result).toEqual({ id: 1n, ...dto, userId: 9n });
    });

    it('flips warning=true once the report count reaches the threshold (3)', async () => {
      es.placeExists.mockResolvedValue(true);
      prisma.report.create.mockResolvedValue({ id: 1n, ...dto, userId: 9n });
      prisma.placeReportStats.findUniqueOrThrow.mockResolvedValue({
        contentId: '126508',
        count: 3,
        warning: false,
      });

      await service.create(9n, dto);

      expect(prisma.placeReportStats.update).toHaveBeenCalledWith({
        where: { contentId: '126508' },
        data: { warning: true },
      });
    });

    it('does not re-update warning once it is already true', async () => {
      es.placeExists.mockResolvedValue(true);
      prisma.report.create.mockResolvedValue({ id: 1n, ...dto, userId: 9n });
      prisma.placeReportStats.findUniqueOrThrow.mockResolvedValue({
        contentId: '126508',
        count: 5,
        warning: true,
      });

      await service.create(9n, dto);

      expect(prisma.placeReportStats.update).not.toHaveBeenCalled();
    });

    it('uses the given reportedOn date instead of today when provided', async () => {
      es.placeExists.mockResolvedValue(true);
      prisma.report.create.mockResolvedValue({ id: 1n });
      prisma.placeReportStats.findUniqueOrThrow.mockResolvedValue({
        contentId: '126508',
        count: 1,
        warning: false,
      });

      await service.create(9n, { ...dto, reportedOn: new Date('2026-01-01') });

      expect(prisma.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportedOn: new Date('2026-01-01'),
        }) as unknown,
      });
    });
  });
});
