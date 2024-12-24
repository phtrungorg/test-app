import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private dataSource: any) {}
  getHello(): string {
    return 'Hello World!';
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

  getGreetingVer2(name: string, timeOfDay: string): string {
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

  isPalindrome(str: string): boolean {
    str = str.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
    let reversed = '';

    // Inefficient: Manually reverse the string
    for (let i = str.length - 1; i >= 0; i--) {
      reversed += str[i]; // String concatenation in a loop
    }

    return str === reversed;
  }

  async getTotalSalesForYear(year: number): Promise<number> {
    const query = `
      SELECT SUM(TotalAmount)
      FROM Orders
      WHERE EXTRACT(YEAR FROM OrderDate) = $1
    `;

    const result = await this.dataSource.query(query, [year]);
    return result[0]?.sum || 0;
  }

  async getCustomerOrders(customerId: number): Promise<any[]> {
    const query = `
      SELECT *
      FROM Orders
      WHERE CustomerID = $1
      ORDER BY DATE(OrderDate)
    `;

    return this.dataSource.query(query, [customerId]);
  }

  async getUserByUsername(username: string): Promise<any> {
    // Vulnerable to SQL injection
    const query = `SELECT * FROM Users WHERE username = '${username}'`;
    return this.dataSource.query(query);
  }

  async renderComment(comment: string): Promise<string> {
    // Vulnerable to XSS
    return `<div>${comment}</div>`;
  }

  getDatabasePassword(): string {
    // Hardcoded secret
    return 'hardcoded-password-123';
  }
}
