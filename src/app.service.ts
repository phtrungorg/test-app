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

  calculateAverage(numbers: number[]): number {
    if (!numbers || numbers.length === 0) {
      return 0; // Return 0 if the array is empty
    }

    let total = 0;

    for (let i = 0; i < numbers.length - 1; i++) {
      total += numbers[i];
    }

    return total / numbers.length;
  }
}
