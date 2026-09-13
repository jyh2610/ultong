import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ITEMS_ORDER = [{ dayNo: 'asc' as const }, { sortOrder: 'asc' as const }];

export interface CreateCourseInput {
  title: string;
  startDate: Date;
  endDate: Date;
  isPublic?: boolean;
}

export interface UpdateCourseInput {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  isPublic?: boolean;
}

function generateShareSlug(): string {
  return randomBytes(9).toString('base64url');
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: bigint): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }

  create(userId: bigint, input: CreateCourseInput): Promise<Course> {
    return this.prisma.course.create({
      data: {
        userId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        isPublic: input.isPublic ?? false,
        shareSlug: input.isPublic ? generateShareSlug() : null,
      },
    });
  }

  async findOwned(userId: bigint, courseId: bigint) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, userId },
      include: { items: { orderBy: ITEMS_ORDER } },
    });
    if (!course) throw new NotFoundException('여행 코스를 찾을 수 없습니다.');
    return course;
  }

  async findShared(shareSlug: string) {
    const course = await this.prisma.course.findFirst({
      where: { shareSlug, isPublic: true },
      include: { items: { orderBy: ITEMS_ORDER } },
    });
    if (!course) throw new NotFoundException('여행 코스를 찾을 수 없습니다.');
    return course;
  }

  async update(
    userId: bigint,
    courseId: bigint,
    input: UpdateCourseInput,
  ): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, userId },
    });
    if (!course) throw new NotFoundException('여행 코스를 찾을 수 없습니다.');

    const data: UpdateCourseInput & { shareSlug?: string } = { ...input };
    if (input.isPublic && !course.shareSlug) {
      data.shareSlug = generateShareSlug();
    }

    return this.prisma.course.update({ where: { id: courseId }, data });
  }

  async remove(userId: bigint, courseId: bigint): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, userId },
    });
    if (!course) throw new NotFoundException('여행 코스를 찾을 수 없습니다.');

    // course_items -> courses FK에 onDelete cascade가 없어 먼저 지운다.
    await this.prisma.courseItem.deleteMany({ where: { courseId } });
    await this.prisma.course.delete({ where: { id: courseId } });
  }
}
