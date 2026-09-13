import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const favorites = await this.favoritesService.list(user.userId);
    return {
      items: favorites.map((f) => ({
        contentId: f.contentId,
        createdAt: f.createdAt,
      })),
    };
  }

  @Post()
  async add(@CurrentUser() user: RequestUser, @Body() dto: AddFavoriteDto) {
    const favorite = await this.favoritesService.add(
      user.userId,
      dto.contentId,
    );
    return { contentId: favorite.contentId, createdAt: favorite.createdAt };
  }

  @Delete(':contentId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('contentId') contentId: string,
  ): Promise<void> {
    await this.favoritesService.remove(user.userId, contentId);
  }
}
