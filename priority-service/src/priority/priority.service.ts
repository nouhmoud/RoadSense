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
        // 1. Fetch all anomalies to see which segments are actually present
        const anomalies = await this.anomaliesRepository.find();

        // 2. Ensure all referenced segments exist in the road_segments table
        const uniqueSegmentIds = [...new Set(anomalies.map(a => a.roadSegmentId))];
        for (const segmentId of uniqueSegmentIds) {
            const existing = await this.segmentsRepository.findOne({ where: { id: segmentId } });
            if (!existing) {
                // Register new segment with default values
                const newSegment = this.segmentsRepository.create({
                    id: segmentId,
                    trafficScore: 50, // Default mid-level traffic
                    importance: 2     // Default importance
                });
                await this.segmentsRepository.save(newSegment);
            }
        }

        // 3. Fetch all segments (now including newly registered ones)
        const segments = await this.segmentsRepository.find();

        // Map anomalies to segments
        const anomaliesBySegment: Record<string, RoadAnomaly[]> = {};
        anomalies.forEach((a) => {
            if (!anomaliesBySegment[a.roadSegmentId]) {
                anomaliesBySegment[a.roadSegmentId] = [];
            }
            anomaliesBySegment[a.roadSegmentId].push(a);
        });

        // 4. Calculate Score
        const results = segments.map((segment) => {
            const segmentAnomalies = anomaliesBySegment[segment.id] || [];
            if (segmentAnomalies.length === 0 && !['Avenue Mohammed V', 'Boulevard des FAR', 'Rue de la Gare'].includes(segment.id)) {
                return null; // Don't show empty auto-generated segments
            }

            // Better: Let's assume severe classes weigh more.
            let totalSeverity = 0;
            segmentAnomalies.forEach(a => {
                let weight = 1;
                const lowerClass = a.className.toLowerCase();
                if (lowerClass.includes('pothole') || lowerClass.includes('nid de poule')) weight = 5;
                if (lowerClass.includes('hole') || lowerClass.includes('open')) weight = 4;
                if (lowerClass.includes('crack') || lowerClass.includes('fissure')) weight = 2;
                totalSeverity += weight * 10; // Base score
            });

            const avgSeverity = segmentAnomalies.length > 0 ? totalSeverity / segmentAnomalies.length : 0;
            const defectCount = segmentAnomalies.length;

            // Algorithm: Priority = (DefectScore * 0.7) + (TrafficScore * 0.3)
            const defectScore = Math.min(100, (defectCount * 15) + avgSeverity);
            const priorityScore = (defectScore * 0.7) + (segment.trafficScore * 0.3);

            return {
                segment_id: segment.id,
                priority_score: parseFloat(priorityScore.toFixed(2)),
                defect_count: defectCount,
                traffic_score: segment.trafficScore,
                importance: segment.importance
            };
        }).filter(r => r !== null);

        // 5. Sort by Priority (Descending)
        return results.sort((a, b) => b.priority_score - a.priority_score);
    }

    async clearTable() {
        await this.segmentsRepository.query('DELETE FROM road_segments');
        return { message: 'Database cleared. Restart service to re-seed.' };
    }
}
