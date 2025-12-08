import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { MySqlEventsService, DatabaseChangeEvent } from './mysql-events.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Videos } from './entities/Videos';

@Controller('db-events')
export class DbEventsController {
  constructor(
    private readonly mysqlEventsService: MySqlEventsService,
    @InjectRepository(Videos)
    private videosRepository: Repository<Videos>,
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

  @Get('status')
  getMonitoringStatus() {
    return {
      isActive: this.mysqlEventsService.isMonitoringActive(),
      eventCount: this.mysqlEventsService.getEventCount(),
      timestamp: new Date(),
    };
  }

  @Get('events')
  getRecentEvents(@Query('limit') limit?: string) {
    const eventLimit = limit ? parseInt(limit, 10) : 50;
    return {
      events: this.mysqlEventsService.getRecentEvents(eventLimit),
      count: this.mysqlEventsService.getEventCount(),
      timestamp: new Date(),
    };
  }

  @Get('events/table/:tableName')
  getEventsByTable(
    @Query('table') tableName: string,
    @Query('limit') limit?: string,
  ) {
    const eventLimit = limit ? parseInt(limit, 10) : 50;
    return {
      table: tableName,
      events: this.mysqlEventsService.getEventsByTable(tableName, eventLimit),
      timestamp: new Date(),
    };
  }

  @Get('events/type/:type')
  getEventsByType(
    @Query('type') type: 'INSERT' | 'UPDATE' | 'DELETE',
    @Query('limit') limit?: string,
  ) {
    const eventLimit = limit ? parseInt(limit, 10) : 50;
    return {
      type,
      events: this.mysqlEventsService.getEventsByType(type, eventLimit),
      timestamp: new Date(),
    };
  }

  @Post('events/clear')
  clearEventHistory() {
    this.mysqlEventsService.clearEventHistory();
    return {
      success: true,
      message: 'Event history cleared',
      timestamp: new Date(),
    };
  }

  @Post('test/create-video')
  async testCreateVideo(@Body() videoData?: Partial<Videos>) {
    const testVideo = this.videosRepository.create({
      isValid: 1,
      statusType: 1,
      userId: Math.floor(Math.random() * 1000),
      title: `Test Video ${Date.now()}`,
      providerUUID: `test-uuid-${Date.now()}`,
      sizeInMb: Math.random() * 100,
      fileType: 'mp4',
      totalTimeInSec: Math.floor(Math.random() * 3600),
      viewCount: 0,
      likeCount: 0,
      ...videoData,
    });

    const saved = await this.videosRepository.save(testVideo);
    return {
      action: 'CREATE',
      video: saved,
      message: 'Test video created - check events endpoint for binlog changes',
      timestamp: new Date(),
    };
  }

  @Post('test/update-video/:id')
  async testUpdateVideo(@Query('id') id: string) {
    const videoId = parseInt(id, 10);
    const updateData = {
      viewCount: Math.floor(Math.random() * 1000),
      likeCount: Math.floor(Math.random() * 100),
      updatedAt: new Date(),
    };

    await this.videosRepository.update(videoId, updateData);
    const updated = await this.videosRepository.findOne({ where: { id: videoId } });

    return {
      action: 'UPDATE',
      video: updated,
      updateData,
      message: 'Test video updated - check events endpoint for binlog changes',
      timestamp: new Date(),
    };
  }

  @Post('test/delete-video/:id')
  async testDeleteVideo(@Query('id') id: string) {
    const videoId = parseInt(id, 10);
    const video = await this.videosRepository.findOne({ where: { id: videoId } });
    
    if (!video) {
      return {
        success: false,
        message: 'Video not found',
        timestamp: new Date(),
      };
    }

    await this.videosRepository.delete(videoId);

    return {
      action: 'DELETE',
      deletedVideo: video,
      message: 'Test video deleted - check events endpoint for binlog changes',
      timestamp: new Date(),
    };
  }

  @Post('test/bulk-operations')
  async testBulkOperations() {
    const videos = [];
    for (let i = 0; i < 3; i++) {
      const video = await this.testCreateVideo();
      videos.push(video.video);
    }

    for (const video of videos) {
      await this.testUpdateVideo(video.id.toString());
    }

    return {
      message: 'Bulk operations completed - check events endpoint for all changes',
      createdVideos: videos.length,
      updatedVideos: videos.length,
      timestamp: new Date(),
    };
  }
}