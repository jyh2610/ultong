import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  const prisma = {
    course: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn<Promise<unknown>, [{ data: Record<string, unknown> }]>(),
      update: jest.fn<Promise<unknown>, [{ data: Record<string, unknown> }]>(),
      delete: jest.fn(),
    },
    courseItem: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('lists the courses belonging to the given user', async () => {
      prisma.course.findMany.mockResolvedValue([{ id: 1n }]);

      const result = await service.list(9n);

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: { userId: 9n },
        orderBy: { id: 'desc' },
      });
      expect(result).toEqual([{ id: 1n }]);
    });
  });

  describe('create', () => {
    it('creates a course owned by the given user, isPublic defaulting to false', async () => {
      prisma.course.create.mockResolvedValue({ id: 1n });

      await service.create(9n, {
        title: '부산 여행',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
      });

      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          userId: 9n,
          title: '부산 여행',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-03'),
          isPublic: false,
          shareSlug: null,
        },
      });
    });

    it('generates a shareSlug when isPublic=true is requested at creation', async () => {
      prisma.course.create.mockResolvedValue({ id: 1n });

      await service.create(9n, {
        title: '부산 여행',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
        isPublic: true,
      });

      const call = prisma.course.create.mock.calls[0][0] as {
        data: { shareSlug: string | null };
      };
      expect(typeof call.data.shareSlug).toBe('string');
      expect(call.data.shareSlug?.length).toBeGreaterThan(0);
    });
  });

  describe('findOwned', () => {
    it('returns the course with its items when owned by the user', async () => {
      prisma.course.findFirst.mockResolvedValue({
        id: 1n,
        userId: 9n,
        items: [],
      });

      const result = await service.findOwned(9n, 1n);

      expect(prisma.course.findFirst).toHaveBeenCalledWith({
        where: { id: 1n, userId: 9n },
        include: {
          items: { orderBy: [{ dayNo: 'asc' }, { sortOrder: 'asc' }] },
        },
      });
      expect(result).toEqual({ id: 1n, userId: 9n, items: [] });
    });

    it('throws NotFoundException when not owned or missing', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.findOwned(9n, 1n)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findShared', () => {
    it('returns a public course by shareSlug', async () => {
      prisma.course.findFirst.mockResolvedValue({ id: 1n, isPublic: true });

      const result = await service.findShared('abc123');

      expect(prisma.course.findFirst).toHaveBeenCalledWith({
        where: { shareSlug: 'abc123', isPublic: true },
        include: {
          items: { orderBy: [{ dayNo: 'asc' }, { sortOrder: 'asc' }] },
        },
      });
      expect(result).toEqual({ id: 1n, isPublic: true });
    });

    it('throws NotFoundException when the slug does not resolve to a public course', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.findShared('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects updating a course not owned by the user', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.update(9n, 1n, { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.course.update).not.toHaveBeenCalled();
    });

    it('generates a shareSlug when isPublic flips to true and none exists yet', async () => {
      prisma.course.findFirst.mockResolvedValue({
        id: 1n,
        userId: 9n,
        shareSlug: null,
      });
      prisma.course.update.mockResolvedValue({ id: 1n });

      await service.update(9n, 1n, { isPublic: true });

      const call = prisma.course.update.mock.calls[0][0];
      expect(typeof (call.data as { shareSlug?: string }).shareSlug).toBe(
        'string',
      );
    });

    it('keeps the existing shareSlug when isPublic=true is set again', async () => {
      prisma.course.findFirst.mockResolvedValue({
        id: 1n,
        userId: 9n,
        shareSlug: 'already-set',
      });
      prisma.course.update.mockResolvedValue({ id: 1n });

      await service.update(9n, 1n, { isPublic: true, title: '수정됨' });

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { isPublic: true, title: '수정됨' },
      });
    });
  });

  describe('remove', () => {
    it('rejects removing a course not owned by the user', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.remove(9n, 1n)).rejects.toThrow(NotFoundException);
    });

    it('deletes the course items first, then the course (no cascade on course_items)', async () => {
      prisma.course.findFirst.mockResolvedValue({ id: 1n, userId: 9n });

      await service.remove(9n, 1n);

      expect(prisma.courseItem.deleteMany).toHaveBeenCalledWith({
        where: { courseId: 1n },
      });
      expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 1n } });
    });
  });
});
