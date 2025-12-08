import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
const ZongJi = require('@powersync/mysql-zongji');

export interface DatabaseChangeEvent {
  timestamp: Date;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  affectedRows: any[];
  oldValues?: any[];
}

@Injectable()
export class MySqlEventsService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(MySqlEventsService.name);
  private zongji: any;
  private isConnected = false;
  private eventHistory: DatabaseChangeEvent[] = [];

  constructor() {
    super();
  }

  async startMonitoring() {
    if (this.isConnected) {
      this.logger.warn('ZongJi monitoring already started');
      return;
    }

    try {
      this.zongji = new ZongJi({
        host: 'host.docker.internal',
        port: 3306,
        user: 'development',
        password: 'kh56)*sG+cXw!yRW7U).CVHK',
        startAtEnd: true,
        includeEvents: ['writerows', 'updaterows', 'deleterows'],
        excludedSchemas: {
          mysql: true
        }
      });

      this.zongji.on('ready', () => {
        this.logger.log('ZongJi ready to receive events');
        this.isConnected = true;
      });

      this.zongji.on('error', (error: any) => {
        this.logger.error('ZongJi error:', error);
        this.isConnected = false;
      });

      this.zongji.on('binlog', (binlogEvent: any) => {
        binlogEvent.dump();
        // console.log('binlogEvent', binlogEvent);
        // this.handleZongJiEvent(binlogEvent);
      });

      this.zongji.start();
      this.logger.log('ZongJi monitoring started successfully');

    } catch (error) {
      this.logger.error('Failed to start ZongJi monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring() {
    if (this.zongji) {
      this.zongji.stop();
      this.isConnected = false;
      this.logger.log('ZongJi monitoring stopped');
    }
  }

  private handleZongJiEvent(binlogEvent: any) {
    if (!binlogEvent.rows || binlogEvent.rows.length === 0) {
      return;
    }
    console.log('binlogEvent', binlogEvent.getEventName());
    console.log('binlogEvent', binlogEvent.tableMap.tableName);
    const changeEvent: DatabaseChangeEvent = {
      timestamp: new Date(),
      type: this.getEventType(binlogEvent.getEventName()),
      schema: binlogEvent.schemaName || 'unknown',
      table: binlogEvent.tableName || 'unknown',
      affectedRows: binlogEvent.rows || [],
    };

    if (binlogEvent.getEventName() === 'updaterows' && binlogEvent.rows) {
      changeEvent.oldValues = binlogEvent.rows.map((row: any) => row.before);
      changeEvent.affectedRows = binlogEvent.rows.map((row: any) => row.after);
    }

    this.eventHistory.push(changeEvent);
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    this.logger.log(`ZongJi event: ${changeEvent.type} on ${changeEvent.schema}.${changeEvent.table}`);
    this.emit('databaseChange', changeEvent);
  }

  private getEventType(eventType: string): 'INSERT' | 'UPDATE' | 'DELETE' {
    switch (eventType) {
      case 'writerows':
        return 'INSERT';
      case 'updaterows':
        return 'UPDATE';
      case 'deleterows':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  getRecentEvents(limit = 50): DatabaseChangeEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getEventsByTable(tableName: string, limit = 50): DatabaseChangeEvent[] {
    return this.eventHistory
      .filter(event => event.table === tableName)
      .slice(-limit);
  }

  getEventsByType(type: 'INSERT' | 'UPDATE' | 'DELETE', limit = 50): DatabaseChangeEvent[] {
    return this.eventHistory
      .filter(event => event.type === type)
      .slice(-limit);
  }

  isMonitoringActive(): boolean {
    return this.isConnected;
  }

  getEventCount(): number {
    return this.eventHistory.length;
  }

  clearEventHistory(): void {
    this.eventHistory = [];
    this.logger.log('Event history cleared');
  }

  async onModuleDestroy() {
    await this.stopMonitoring();
  }
}