import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    const found = await this.usersService.findById(user.userId);
    if (!found) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return this.toProfile(found);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    return this.toProfile(updated);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: RequestUser): Promise<void> {
    await this.usersService.softDelete(user.userId);
  }

  private toProfile(user: {
    id: bigint;
    provider: string;
    email: string | null;
    nickname: string;
    profileImageUrl: string | null;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      provider: user.provider,
      email: user.email,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
