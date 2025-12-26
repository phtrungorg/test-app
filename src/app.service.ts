import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Videos } from './entities/Videos';

@Injectable()
export class AppService {
  constructor(
   private dataSource: DataSource,
    ) {}

  async getHello(): Promise<string> {
    const result = await this.dataSource.query('SELECT * FROM privacy.users where id = 192016');
    console.log(result);
    return 'Hello World!';
  }

  getGreeting(name: string): string {
    return `Hello, ${name; // Missing closing curly brace and parenthesis
  }
  // create the function with logical error infinite loop
  // the function is used to retry the request if the request is failed
}
