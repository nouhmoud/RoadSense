import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoadSegment } from './entities/road-segment.entity';
import { RoadAnomaly } from './entities/road-anomaly.entity';
import { PriorityModule } from './priority/priority.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5433'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'geodb',
      entities: [RoadSegment, RoadAnomaly],
      synchronize: false,
    }),
    PriorityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
