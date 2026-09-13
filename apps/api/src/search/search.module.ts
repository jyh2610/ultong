import { Module } from '@nestjs/common';
import { EsClientService } from './es-client.service';
import { CodesService } from './codes.service';
import { CodesController } from './codes.controller';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { PlaceDetailService } from './place-detail.service';
import { IntroRefetchService } from './intro-refetch.service';

@Module({
  controllers: [CodesController, PlacesController],
  providers: [
    EsClientService,
    CodesService,
    PlacesService,
    PlaceDetailService,
    IntroRefetchService,
  ],
})
export class SearchModule {}
