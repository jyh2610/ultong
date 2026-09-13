import { Injectable, NotFoundException } from '@nestjs/common';
import { Report, ReportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';

const WARNING_THRESHOLD = 3;

export interface CreateReportInput {
  contentId: string;
  type: ReportType;
  detail?: string;
  reportedOn?: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly es: EsClientService,
  ) {}

  list(userId: bigint, contentId?: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: contentId ? { userId, contentId } : { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: bigint, input: CreateReportInput): Promise<Report> {
    if (!(await this.es.placeExists(input.contentId))) {
      throw new NotFoundException('시설을 찾을 수 없습니다.');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          userId,
          contentId: input.contentId,
          type: input.type,
          detail: input.detail,
          reportedOn: input.reportedOn ?? now,
        },
      });

      await tx.placeReportStats.upsert({
        where: { contentId: input.contentId },
        create: { contentId: input.contentId, count: 1, lastReportedAt: now },
        update: { count: { increment: 1 }, lastReportedAt: now },
      });

      const stats = await tx.placeReportStats.findUniqueOrThrow({
        where: { contentId: input.contentId },
      });
      if (stats.count >= WARNING_THRESHOLD && !stats.warning) {
        await tx.placeReportStats.update({
          where: { contentId: input.contentId },
          data: { warning: true },
        });
      }

      return report;
    });
  }
}
