import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';
import { CoursesService } from './courses.service';

export interface AddCourseItemInput {
  dayNo: number;
  sortOrder?: number;
  contentId: string;
  titleSnapshot?: string;
  memo?: string;
}

export interface UpdateCourseItemInput {
  dayNo?: number;
  sortOrder?: number;
  titleSnapshot?: string;
  memo?: string;
}

@Injectable()
export class CourseItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly es: EsClientService,
  ) {}

  async add(
    userId: bigint,
    courseId: bigint,
    input: AddCourseItemInput,
  ): Promise<CourseItem> {
    await this.coursesService.findOwned(userId, courseId);

    if (!(await this.es.placeExists(input.contentId))) {
      throw new NotFoundException('시설을 찾을 수 없습니다.');
    }

    const sortOrder =
      input.sortOrder ?? (await this.nextSortOrder(courseId, input.dayNo));

    return this.prisma.courseItem.create({
      data: {
        courseId,
        dayNo: input.dayNo,
        sortOrder,
        contentId: input.contentId,
        titleSnapshot: input.titleSnapshot,
        memo: input.memo,
      },
    });
  }

  async findOwnedItem(
    userId: bigint,
    courseId: bigint,
    itemId: bigint,
  ): Promise<CourseItem> {
    await this.coursesService.findOwned(userId, courseId);
    const item = await this.prisma.courseItem.findFirst({
      where: { id: itemId, courseId },
    });
    if (!item) throw new NotFoundException('코스 항목을 찾을 수 없습니다.');
    return item;
  }

  async update(
    userId: bigint,
    courseId: bigint,
    itemId: bigint,
    input: UpdateCourseItemInput,
  ): Promise<CourseItem> {
    await this.findOwnedItem(userId, courseId, itemId);
    return this.prisma.courseItem.update({
      where: { id: itemId },
      data: input,
    });
  }

  async remove(
    userId: bigint,
    courseId: bigint,
    itemId: bigint,
  ): Promise<void> {
    await this.findOwnedItem(userId, courseId, itemId);
    await this.prisma.courseItem.delete({ where: { id: itemId } });
  }

  private async nextSortOrder(
    courseId: bigint,
    dayNo: number,
  ): Promise<number> {
    const last = await this.prisma.courseItem.findFirst({
      where: { courseId, dayNo },
      orderBy: { sortOrder: 'desc' },
    });
    return last ? last.sortOrder + 1 : 0;
  }
}
