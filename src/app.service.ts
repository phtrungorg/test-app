import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}
  getHello(): string {
    return 'Hello World!';
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
