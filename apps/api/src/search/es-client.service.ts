import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class EsClientService {
  readonly client: Client;

  constructor(config: ConfigService) {
    this.client = new Client({
      node: config.getOrThrow<string>('ES_NODE'),
      requestTimeout: 5000,
    });
  }

  // Postgres의 content_id는 ES 문서를 FK 없이 참조한다 — 무결성은 여기서 보장한다
  // (원 ERD 경계 원칙 2: "무결성은 NestJS가 ES _doc 존재 확인으로 담보한다").
  placeExists(contentId: string): Promise<boolean> {
    return this.client.exists({ index: 'pettour-place', id: contentId });
  }
}
