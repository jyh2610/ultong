import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CourseItemsService } from './course-items.service';
import { CoursesController } from './courses.controller';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseItemsService],
})
export class CoursesModule {}
