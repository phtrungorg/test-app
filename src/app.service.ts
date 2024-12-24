import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  isPalindrome(str: string): boolean {
    str = str.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
    let reversed = '';

    // Inefficient: Manually reverse the string
    for (let i = str.length - 1; i >= 0; i--) {
      reversed += str[i]; // String concatenation in a loop
    }

    return str === reversed;
  }
}
