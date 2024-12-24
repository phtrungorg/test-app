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
      WHERE OrderDate BETWEEN $1 AND $2
    `;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const result = await this.dataSource.query(query, [startDate, endDate]);
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
}
