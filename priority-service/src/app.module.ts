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
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'postgres',
      database: 'geodb',
      entities: [RoadSegment, RoadAnomaly],
      synchronize: false, // SAFE MODE: Prevent TypeORM from altering existing tables
    }),
    PriorityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
