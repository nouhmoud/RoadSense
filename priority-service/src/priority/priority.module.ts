import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriorityService } from './priority.service';
import { PriorityController } from './priority.controller';
import { RoadSegment } from '../entities/road-segment.entity';
import { RoadAnomaly } from '../entities/road-anomaly.entity';

@Module({
    imports: [TypeOrmModule.forFeature([RoadSegment, RoadAnomaly])],
    controllers: [PriorityController],
    providers: [PriorityService],
})
export class PriorityModule { }
