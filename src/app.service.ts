import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getGreeting(name: string): string {
    return `Hello, ${name; // Missing closing curly brace and parenthesis
  }
  // create the function with logical error infinite loop
  // the function is used to retry the request if the request is failed
}
