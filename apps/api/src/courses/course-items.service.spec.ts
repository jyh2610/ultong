import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';
import { CoursesService } from './courses.service';
import { CourseItemsService } from './course-items.service';

describe('CourseItemsService', () => {
  let service: CourseItemsService;
  const prisma = {
    courseItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const es = { placeExists: jest.fn() };
  const coursesService = { findOwned: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CourseItemsService(
      prisma as unknown as PrismaService,
      coursesService as unknown as CoursesService,
      es as unknown as EsClientService,
    );
  });

  describe('add', () => {
    it('rejects adding to a course not owned by the user', async () => {
      coursesService.findOwned.mockRejectedValue(new NotFoundException());

      await expect(
        service.add(9n, 1n, { dayNo: 1, contentId: '126508' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.courseItem.create).not.toHaveBeenCalled();
    });

    it('rejects a contentId that does not exist in ES', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      es.placeExists.mockResolvedValue(false);

      await expect(
        service.add(9n, 1n, { dayNo: 1, contentId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.courseItem.create).not.toHaveBeenCalled();
    });

    it('appends to the end of the day when sortOrder is not given', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      es.placeExists.mockResolvedValue(true);
      prisma.courseItem.findFirst.mockResolvedValue({ sortOrder: 2 });
      prisma.courseItem.create.mockResolvedValue({ id: 5n });

      await service.add(9n, 1n, {
        dayNo: 1,
        contentId: '126508',
        titleSnapshot: '해운대',
      });

      expect(prisma.courseItem.findFirst).toHaveBeenCalledWith({
        where: { courseId: 1n, dayNo: 1 },
        orderBy: { sortOrder: 'desc' },
      });
      expect(prisma.courseItem.create).toHaveBeenCalledWith({
        data: {
          courseId: 1n,
          dayNo: 1,
          sortOrder: 3,
          contentId: '126508',
          titleSnapshot: '해운대',
          memo: undefined,
        },
      });
    });

    it('starts sortOrder at 0 for the first item of a day', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      es.placeExists.mockResolvedValue(true);
      prisma.courseItem.findFirst.mockResolvedValue(null);
      prisma.courseItem.create.mockResolvedValue({ id: 1n });

      await service.add(9n, 1n, { dayNo: 1, contentId: '126508' });

      expect(prisma.courseItem.create).toHaveBeenCalledWith({
        data: {
          courseId: 1n,
          dayNo: 1,
          sortOrder: 0,
          contentId: '126508',
          titleSnapshot: undefined,
          memo: undefined,
        },
      });
    });

    it('uses the given sortOrder instead of appending when provided', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      es.placeExists.mockResolvedValue(true);
      prisma.courseItem.create.mockResolvedValue({ id: 1n });

      await service.add(9n, 1n, {
        dayNo: 1,
        contentId: '126508',
        sortOrder: 7,
      });

      expect(prisma.courseItem.findFirst).not.toHaveBeenCalled();
      expect(prisma.courseItem.create).toHaveBeenCalledWith({
        data: {
          courseId: 1n,
          dayNo: 1,
          sortOrder: 7,
          contentId: '126508',
          titleSnapshot: undefined,
          memo: undefined,
        },
      });
    });
  });

  describe('findOwnedItem', () => {
    it('rejects when the course is not owned', async () => {
      coursesService.findOwned.mockRejectedValue(new NotFoundException());

      await expect(service.findOwnedItem(9n, 1n, 5n)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the item does not belong to that course', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      prisma.courseItem.findFirst.mockResolvedValue(null);

      await expect(service.findOwnedItem(9n, 1n, 5n)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the item when the course is owned and the item belongs to it', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      prisma.courseItem.findFirst.mockResolvedValue({ id: 5n, courseId: 1n });

      const result = await service.findOwnedItem(9n, 1n, 5n);

      expect(prisma.courseItem.findFirst).toHaveBeenCalledWith({
        where: { id: 5n, courseId: 1n },
      });
      expect(result).toEqual({ id: 5n, courseId: 1n });
    });
  });

  describe('update', () => {
    it('updates the item once ownership is confirmed', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      prisma.courseItem.findFirst.mockResolvedValue({ id: 5n, courseId: 1n });
      prisma.courseItem.update.mockResolvedValue({ id: 5n, memo: '주차 가능' });

      await service.update(9n, 1n, 5n, { memo: '주차 가능' });

      expect(prisma.courseItem.update).toHaveBeenCalledWith({
        where: { id: 5n },
        data: { memo: '주차 가능' },
      });
    });
  });

  describe('remove', () => {
    it('deletes the item once ownership is confirmed', async () => {
      coursesService.findOwned.mockResolvedValue({ id: 1n });
      prisma.courseItem.findFirst.mockResolvedValue({ id: 5n, courseId: 1n });
      prisma.courseItem.delete.mockResolvedValue({ id: 5n });

      await service.remove(9n, 1n, 5n);

      expect(prisma.courseItem.delete).toHaveBeenCalledWith({
        where: { id: 5n },
      });
    });
  });
});
