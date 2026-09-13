import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class EsClientService {
  readonly client: Client;

  constructor(config: ConfigService) {
    this.client = new Client({ node: config.getOrThrow<string>('ES_NODE') });
  }
}
