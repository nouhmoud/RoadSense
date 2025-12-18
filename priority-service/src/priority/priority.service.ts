import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoadSegment } from '../entities/road-segment.entity';
import { RoadAnomaly } from '../entities/road-anomaly.entity';

@Injectable()
export class PriorityService {
    constructor(
        @InjectRepository(RoadSegment)
        private segmentsRepository: Repository<RoadSegment>,
        @InjectRepository(RoadAnomaly)
        private anomaliesRepository: Repository<RoadAnomaly>,
    ) { }

    async onModuleInit() {
        // Ensure table exists (Safe implementation)
        await this.segmentsRepository.query(`
          CREATE TABLE IF NOT EXISTS road_segments (
            id VARCHAR PRIMARY KEY,
            traffic_score FLOAT DEFAULT 0,
            importance INT DEFAULT 1
          );
        `);

        console.log('Synchronizing Road Segments...');
        const segmentsToSeed = [
            { id: 'Avenue Mohammed V', trafficScore: 85, importance: 5 },
            { id: 'Boulevard des FAR', trafficScore: 40, importance: 3 },
            { id: 'Rue de la Gare', trafficScore: 10, importance: 1 },
            { id: 'Secteur Inconnu', trafficScore: 50, importance: 2 },
        ];

        for (const segment of segmentsToSeed) {
            await this.segmentsRepository.save(segment);
        }
        console.log('Synchronization Complete.');
    }

    async calculatePriorities() {
        // 1. Fetch all segments and anomalies
        // In a real app, we might join these in SQL, but for clarity/simplicity we'll fetch and process.
        const segments = await this.segmentsRepository.find();
        const anomalies = await this.anomaliesRepository.find();

        // Map anomalies to segments
        const anomaliesBySegment: Record<string, RoadAnomaly[]> = {};
        anomalies.forEach((a) => {
            if (!anomaliesBySegment[a.roadSegmentId]) {
                anomaliesBySegment[a.roadSegmentId] = [];
            }
            anomaliesBySegment[a.roadSegmentId].push(a);
        });

        // 2. Calculate Score
        const results = segments.map((segment) => {
            const segmentAnomalies = anomaliesBySegment[segment.id] || [];

            // Calculate Average Severity (Confidence as a proxy for severity if real severity score is missing, 
            // or assume we have it. For now let's use a mock 'severity' from detected anomalies 
            // but strictly speaking we only have 'confidence' and 'class_name' in the entity I defined.
            // Let's assume class_name implies severity or just use simple counts for now).

            // Better: Let's assume severe classes weigh more.
            let totalSeverity = 0;
            segmentAnomalies.forEach(a => {
                let weight = 1;
                if (a.className === 'Nid de poule') weight = 5;
                if (a.className === 'Fissure') weight = 2;
                totalSeverity += weight * 10; // Base score
            });

            const avgSeverity = segmentAnomalies.length > 0 ? totalSeverity / segmentAnomalies.length : 0;
            const defectCount = segmentAnomalies.length;

            // Algorithm: Priority = (DefectScore * 0.7) + (TrafficScore * 0.3)
            // DefectScore increases with count and severity.
            const defectScore = Math.min(100, (defectCount * 20) + avgSeverity);

            const priorityScore = (defectScore * 0.7) + (segment.trafficScore * 0.3);

            return {
                segment_id: segment.id,
                priority_score: parseFloat(priorityScore.toFixed(2)),
                defect_count: defectCount,
                traffic_score: segment.trafficScore,
                importance: segment.importance
            };
        });

        // 3. Sort by Priority (Descending)
        return results.sort((a, b) => b.priority_score - a.priority_score);
    }

    async clearTable() {
        await this.segmentsRepository.query('DELETE FROM road_segments');
        return { message: 'Database cleared. Restart service to re-seed.' };
    }
}
