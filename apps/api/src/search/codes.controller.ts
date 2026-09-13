import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CodesService, CodeItem } from './codes.service';
import { CodesQueryDto } from './dto/codes-query.dto';

@ApiTags('codes')
@Controller('codes')
export class CodesController {
  constructor(private readonly codesService: CodesService) {}

  @Get('categories')
  async getCategories(
    @Query() query: CodesQueryDto,
  ): Promise<{ items: CodeItem[] }> {
    const items = await this.codesService.getCategories(query.parentCode);
    return { items };
  }

  @Get('regions')
  async getRegions(
    @Query() query: CodesQueryDto,
  ): Promise<{ items: CodeItem[] }> {
    const items = await this.codesService.getRegions(query.parentCode);
    return { items };
  }
}
