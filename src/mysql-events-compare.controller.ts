import { Controller, Post } from '@nestjs/common';
import { MySQLEventsCompareService } from './mysql-events-compare.service';

@Controller('mysql-events-compare')
export class MySQLEventsCompareController {
  constructor(
    private readonly mysqlEventsService: MySQLEventsCompareService,
  ) {}

  @Post('start-monitoring')
  async startMonitoring() {
    try {
      await this.mysqlEventsService.startMonitoring();
      return {
        success: true,
        message: 'MySQL Events monitoring started',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('stop-monitoring')
  async stopMonitoring() {
    try {
      await this.mysqlEventsService.stopMonitoring();
      return {
        success: true,
        message: 'MySQL Events monitoring stopped',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date(),
      };
    }
  }
}