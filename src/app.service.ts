import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return "Hello World!";
  }

  calculate(array: number[]): { max: number; sum: number } {
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < array.length; i++) {
      if (array[i] > max) {
        max = array[i]; // Find the maximum
      }
      sum += array[i]; // Calculate the sum
    }

    return { max, sum };
  }
  // create the function with logical error infinite loop
  // the function is used to retry the request if the request is failed
}
