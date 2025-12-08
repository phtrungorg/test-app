import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Videos } from './entities/Videos';
import { VideoConversionController } from './video-conversion.controller';
import { DbEventsController } from './db-events.controller';
import { MySqlEventsService } from './mysql-events.service';
import { MySQLEventsCompareController } from './mysql-events-compare.controller';
import { MySQLEventsCompareService } from './mysql-events-compare.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'host.docker.internal',
      port: 3306,
      username: 'development',
      password: 'kh56)*sG+cXw!yRW7U).CVHK',
      database: 'master',
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([Videos]),
    CacheModule.register(),
  ],
  controllers: [
    AppController,
    VideoConversionController,
    DbEventsController,
    MySQLEventsCompareController,
  ],
  providers: [AppService, MySqlEventsService, MySQLEventsCompareService],
})
export class AppModule {}
