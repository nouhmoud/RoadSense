import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('road_segments')
export class RoadSegment {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'traffic_score', type: 'float', default: 0 })
    trafficScore: number;

    @Column({ name: 'importance', type: 'int', default: 1 })
    importance: number; // 1 to 5, 5 being highest priority
}
