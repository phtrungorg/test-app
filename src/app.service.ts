import { Injectable } from '@nestjs/common';
import axios from 'axios';

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

  async addAvailableCommunities(userId: number, saleSessionId: string) {
    const RETRY_COUNT = 3;
    if (!userId || !saleSessionId) {
      return;
    }
    for (let i = 1; i <= RETRY_COUNT; i++) {
      try {
        // update status of sale session
        await axios.post(`${process.env.SALE_API_URL}/api/sales/update`, {
          saleSessionId,
        });
      } catch (e) {
        console.error(e);
        if (i === RETRY_COUNT - 1) {
          throw e;
        }
        await new Promise((resolve) => setTimeout(resolve, i * 200)); // 200ms, 400ms, 600ms
      }
    }
  }

  async hasReview(userId) {
    const sql = `SELECT COUNT(id)
               FROM (SELECT a.id AS id
                     FROM common.reviews a
                     WHERE a.user_id = ?
                       AND a.is_valid = 1
                     UNION ALL
                     SELECT b.id AS id
                     FROM common.reviews a
                            INNER JOIN privacy.products b
                                       ON b.id = a.product_id
                     WHERE b.user_id = ?
                       AND a.is_valid = 1) AS t`;
    const reviews = await this.dataSource.query(sql, [userId, userId]);
    return reviews[0].cnt || 0;
  }

  async getTrendingKeywordData(): Promise<any[]> {
    const sql = `
      select a.keywords, count(a.keywords) as counts, a.created_at
      from (select keywords, Max(created_at) as created_at
            from ??
            where created_at between (NOW() - interval 14 day) and NOW()
         and country = ? and keywords is not null
         and not exist (
          select 1
          from master.ng_words ng
          where ng.is_valid = 1 and ng.word = search_histories.keywords
        )
        and not exist (
            select 1
            from master.search_trending_keywords_monitor stkm
            where stkm.is_valid = 1
            and stkm.is_ignore = 1
            and stkm.country = ?
            and stkm.keywords = search_histories.keywords
        ))
            group by keywords, ip_address) as a
      group by a.keywords
      order by counts desc, a.created_at desc
        limit ?`;
    return await this.dataSource.query(sql, [
      'logs.search_histories',
      'ja',
      'ja',
      10,
    ]);
  }
}
