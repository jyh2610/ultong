import { OmitType, PartialType } from '@nestjs/swagger';
import { AddCourseItemDto } from './add-course-item.dto';

// contentId는 바꿀 수 없다 — 다른 시설로 바꾸고 싶으면 삭제 후 새로 추가한다.
export class UpdateCourseItemDto extends PartialType(
  OmitType(AddCourseItemDto, ['contentId']),
) {}
