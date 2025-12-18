import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Activity, AlertTriangle, MapPin, CheckCircle, TrendingUp } from 'lucide-react';
import axios from 'axios';
import AnalysisMap from './AnalysisMap';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const API_BASE_URL = 'http://127.0.0.1:8088';

export default function GlobalDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/dashboard-stats`);
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Erreur de chargement.</div>;

    // --- Prepare Chart Data ---
    const pieData = {
        labels: Object.keys(stats.charts.class_distribution),
        datasets: [
            {
                data: Object.values(stats.charts.class_distribution),
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'], // Red, Yellow, Blue, Green
                borderWidth: 1,
            },
        ],
    };

    const barData = {
        labels: stats.charts.top_roads.map(r => r.name),
        datasets: [
            {
                label: 'Nombre de Défauts',
                data: stats.charts.top_roads.map(r => r.count),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
            },
        ],
    };

    // Timeline Data (if available)
    const lineData = {
        labels: stats.charts.timeline.map(t => t.month),
        datasets: [
            {
                label: 'Nouveaux Défauts',
                data: stats.charts.timeline.map(t => t.count),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
        ],
    };


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Vue d'Ensemble du Réseau</h1>
                <p className="text-gray-500">Statistiques en temps réel via PostGIS.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                    title="Total Anomalies"
                    value={stats.kpi.total_defects}
                    icon={<AlertTriangle className="text-red-500" />}
                    color="bg-red-50 border-red-200"
                />
                <KpiCard
                    title="Confiance Moyenne"
                    value={`${(stats.kpi.avg_confidence * 100).toFixed(1)}%`}
                    icon={<CheckCircle className="text-green-500" />}
                    color="bg-green-50 border-green-200"
                />
                <KpiCard
                    title="Tronçons Actifs"
                    value={stats.charts.top_roads.length}
                    icon={<MapPin className="text-blue-500" />}
                    color="bg-blue-50 border-blue-200"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribution des Défauts</h3>
                    <div className="h-64 flex justify-center">
                        <Pie data={pieData} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Routes les plus Critiques</h3>
                    <div className="h-64">
                        <Bar options={{ maintainAspectRatio: false }} data={barData} />
                    </div>
                </div>
            </div>

            {/* Timeline Row */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} /> Évolution Temporelle
                </h3>
                <div className="h-64">
                    <Line options={{ maintainAspectRatio: false }} data={lineData} />
                </div>
            </div>

            {/* Global Map Preview */}
            {/* Note: In a real app, this would be a full screen map, here we show a preview or just link to History */}
        </div>
    );
}

function KpiCard({ title, value, icon, color }) {
    return (
        <div className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 ${color}`}>
            <div className="p-3 bg-white rounded-full shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
