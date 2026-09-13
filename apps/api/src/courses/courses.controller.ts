import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Course, CourseItem } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CourseItemsService } from './course-items.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AddCourseItemDto } from './dto/add-course-item.dto';
import { UpdateCourseItemDto } from './dto/update-course-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseItemsService: CourseItemsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const courses = await this.coursesService.list(user.userId);
    return { items: courses.map((c) => this.toResponse(c)) };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCourseDto) {
    const course = await this.coursesService.create(user.userId, dto);
    return this.toResponse(course);
  }

  // /courses/shared/:shareSlug가 /courses/:id 보다 먼저 매칭되도록 이 순서를 유지한다.
  @Get('shared/:shareSlug')
  async getShared(@Param('shareSlug') shareSlug: string) {
    const course = await this.coursesService.findShared(shareSlug);
    return this.toResponse(course);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const course = await this.coursesService.findOwned(user.userId, BigInt(id));
    return this.toResponse(course);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    const course = await this.coursesService.update(
      user.userId,
      BigInt(id),
      dto,
    );
    return this.toResponse(course);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.coursesService.remove(user.userId, BigInt(id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/items')
  async addItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCourseItemDto,
  ) {
    const item = await this.courseItemsService.add(
      user.userId,
      BigInt(id),
      dto,
    );
    return this.toItemResponse(item);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/items/:itemId')
  async updateItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCourseItemDto,
  ) {
    const item = await this.courseItemsService.update(
      user.userId,
      BigInt(id),
      BigInt(itemId),
      dto,
    );
    return this.toItemResponse(item);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/items/:itemId')
  @HttpCode(204)
  async removeItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<void> {
    await this.courseItemsService.remove(
      user.userId,
      BigInt(id),
      BigInt(itemId),
    );
  }

  private toResponse(course: Course & { items?: CourseItem[] }) {
    return {
      id: course.id,
      title: course.title,
      startDate: course.startDate,
      endDate: course.endDate,
      isPublic: course.isPublic,
      shareSlug: course.shareSlug,
      items: course.items?.map((item) => this.toItemResponse(item)),
    };
  }

  private toItemResponse(item: CourseItem) {
    return {
      id: item.id,
      dayNo: item.dayNo,
      sortOrder: item.sortOrder,
      contentId: item.contentId,
      titleSnapshot: item.titleSnapshot,
      memo: item.memo,
    };
  }
}
