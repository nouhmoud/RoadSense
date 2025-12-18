import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('road_anomalies')
export class RoadAnomaly {
    @PrimaryColumn({ name: 'anomaly_id' })
    id: string;

    @Column({ name: 'class_name' })
    className: string;

    @Column({ name: 'confidence', type: 'float' })
    confidence: number;

    @Column({ name: 'road_segment_id' })
    roadSegmentId: string;
}
