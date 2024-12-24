import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  getGreeting(name: string, timeOfDay: string): string {
    if (timeOfDay === 'morning') {
      return `Good morning, ${name}`;
    } else if (timeOfDay === 'afternoon') {
      return `Good afternoon, ${name}`;
    } else if (timeOfDay === 'evening') {
      return `Good evening, ${name}`;
    } else {
      return `Hello, ${name}`;
    }
  }
}
