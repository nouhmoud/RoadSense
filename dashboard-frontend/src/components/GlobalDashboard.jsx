import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
    Activity, AlertTriangle, MapPin, CheckCircle, TrendingUp,
    ArrowUpRight, Target, Clock, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getDashboardStats } from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

export default function GlobalDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader size={48} className="animate-spin text-primary-500" />
            <p className="text-slate-400 font-medium animate-pulse">Extraction des données spatiales...</p>
        </div>
    );

    if (!stats) return <div className="p-12 text-center text-red-500 bg-red-500/10 rounded-3xl border border-red-500/20">Erreur de chargement. Veuillez vérifier le backend Dashboard.</div>;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    font: { size: 11, weight: 'bold' },
                    color: '#94a3b8'
                }
            }
        },
        maintainAspectRatio: false
    };

    const pieData = {
        labels: Object.keys(stats.charts.class_distribution),
        datasets: [{
            data: Object.values(stats.charts.class_distribution),
            backgroundColor: ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981'],
            borderColor: 'transparent',
            hoverOffset: 20
        }],
    };

    const barData = {
        labels: stats.charts.top_roads.map(r => r.name),
        datasets: [{
            label: 'Densité de Défauts',
            data: stats.charts.top_roads.map(r => r.count),
            backgroundColor: '#6366f1',
            borderRadius: 8,
            barThickness: 32
        }],
    };

    const lineData = {
        labels: stats.charts.timeline.map(t => t.month),
        datasets: [{
            label: 'Tendance Mensuelle',
            data: stats.charts.timeline.map(t => t.count),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0ea5e9',
            pointBorderWidth: 2
        }],
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Anomalies"
                    value={stats.kpi.total_defects}
                    icon={<AlertTriangle size={24} />}
                    trend="+12%"
                    color="primary"
                    delay={0}
                />
                <KpiCard
                    title="Confiance IA"
                    value={`${(stats.kpi.avg_confidence * 100).toFixed(1)}%`}
                    icon={<Target size={24} />}
                    trend="Stable"
                    color="emerald"
                    delay={0.1}
                />
                <KpiCard
                    title="Zones Couvertes"
                    value={stats.charts.top_roads.length}
                    icon={<MapPin size={24} />}
                    trend="+3"
                    color="indigo"
                    delay={0.2}
                />
                <KpiCard
                    title="Taux Correction"
                    value="84%"
                    icon={<ShieldCheck size={24} />}
                    trend="+5%"
                    color="blue"
                    delay={0.3}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Typologie</h3>
                        <Activity size={16} className="text-slate-400" />
                    </div>
                    <div className="h-64 flex justify-center items-center">
                        <Pie data={pieData} options={chartOptions} />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Points d'Attention Critiques</h3>
                        <TrendingUp size={16} className="text-slate-400" />
                    </div>
                    <div className="h-64">
                        <Bar
                            data={barData}
                            options={{
                                ...chartOptions,
                                scales: {
                                    y: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                                }
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Timeline & Analysis Coverage */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">Flux de Données Temporel</h3>
                        <p className="text-slate-400 text-sm">Fréquence de détection sur les 6 derniers mois.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                            <span className="text-xs font-bold text-slate-500">Actif</span>
                        </div>
                    </div>
                </div>
                <div className="h-72">
                    <Line
                        data={lineData}
                        options={{
                            ...chartOptions,
                            scales: {
                                y: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#94a3b8' } },
                                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                            }
                        }}
                    />
                </div>
            </motion.div>
        </div>
    );
}

function KpiCard({ title, value, icon, trend, color, delay }) {
    const colors = {
        primary: 'text-primary-600 bg-primary-500/10 border-primary-500/20',
        emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
        indigo: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
        blue: 'text-blue-600 bg-blue-500/10 border-blue-500/20'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            whileHover={{ y: -5 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-between"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colors[color]}`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                    <ArrowUpRight size={14} /> {trend}
                </div>
            </div>
            <div>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">{title}</p>
                <p className="text-3xl font-black tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
}

function Loader({ size, className }) {
    return <Activity size={size} className={className} />;
}
