import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DemoService {
  constructor(private dataSource: any) {}
  svcFunction1(): string {
    return 'Hello World!';
  }

  svcFunction2(): string {
    return 'Hello!';
  }
}
