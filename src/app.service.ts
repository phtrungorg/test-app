import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}
  getHello(): string {
    return 'Hello World!';
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
}
