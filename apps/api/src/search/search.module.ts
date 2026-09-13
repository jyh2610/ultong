import { Module } from '@nestjs/common';
import { EsClientService } from './es-client.service';
import { CodesService } from './codes.service';
import { CodesController } from './codes.controller';

@Module({
  controllers: [CodesController],
  providers: [EsClientService, CodesService],
})
export class SearchModule {}
