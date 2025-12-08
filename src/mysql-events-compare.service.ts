import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
const MySQLEvents = require('@rodrigogs/mysql-events');

@Injectable()
export class MySQLEventsCompareService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(MySQLEventsCompareService.name);
  private mysqlEvents: any;
  private isConnected = false;

  constructor() {
    super();
  }

  async startMonitoring() {
    if (this.isConnected) {
      this.logger.warn('MySQL Events monitoring already started');
      return;
    }

    try {
      const dsn = {
        host: 'host.docker.internal',
        user: 'development',
        password: 'kh56)*sG+cXw!yRW7U).CVHK',
        port: 3306,
      };

      this.mysqlEvents = new MySQLEvents(dsn, {
        startAtEnd: true,
        excludedSchemas: {
          mysql: true
        }
      });

      await this.mysqlEvents.start();
      this.isConnected = true;
      this.logger.log('MySQL Events monitoring started successfully');

      this.mysqlEvents.addTrigger({
        name: 'all_tables_all_schemas_trigger',
        expression: '*',
        statement: MySQLEvents.STATEMENTS.ALL,
        onEvent: (event: any) => {
          console.log('event', event);
          console.log('event', event.affectedRows);
          // this.handleMySQLEvent(event);
        },
      });

      this.mysqlEvents.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (error: any) => {
        this.logger.error('MySQL Events connection error:', error);
        this.isConnected = false;
      });

      this.mysqlEvents.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (error: any) => {
        this.logger.error('MySQL Events Zongji error:', error);
      });

    } catch (error) {
      this.logger.error('Failed to start MySQL Events monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring() {
    if (this.mysqlEvents) {
      await this.mysqlEvents.stop();
      this.isConnected = false;
      this.logger.log('MySQL Events monitoring stopped');
    }
  }

 

  isMonitoringActive(): boolean {
    return this.isConnected;
  }

 

  async onModuleDestroy() {
    await this.stopMonitoring();
  }
}