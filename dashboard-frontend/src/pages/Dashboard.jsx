import { useState, useEffect } from 'react';
import {
    Upload, AlertCircle, CheckCircle, MapPin, Loader2,
    ThermometerSun, ListOrdered, LayoutDashboard, Image as ImageIcon,
    Sun, Moon, MousePointer2, Settings2, Sparkles, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectDefects, georeferenceDetections, calculateSeverity, getPriorities, resolveCoordinates } from '../services/api';
import { extractGpsFromImage } from '../services/gps';
import AnalysisMap from '../components/AnalysisMap';
import GlobalDashboard from '../components/GlobalDashboard';

export default function Dashboard() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, analyzing, severity, georeferencing, done, error
    const [result, setResult] = useState(null);
    const [geoResult, setGeoResult] = useState(null);
    const [severityResult, setSeverityResult] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [priorityList, setPriorityList] = useState([]);
    const [resolvedAddress, setResolvedAddress] = useState(null);
    const [viewMode, setViewMode] = useState('upload'); // 'upload' or 'global'
    const [manualGps, setManualGps] = useState({ lat: 43.501, lng: 1.001 });

    // Theme Management
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        getPriorities().then(data => setPriorityList(data));
    }, [result]);

    const handleFileChange = async (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setResult(null);
            setGeoResult(null);
            setSeverityResult(null);
            setStatus("idle");
            setBackendError(null);
            setResolvedAddress(null);

            const gps = await extractGpsFromImage(selected);
            if (gps) setManualGps(gps);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setStatus("analyzing");
        setBackendError(null);

        try {
            const detectionData = await detectDefects(file);
            setResult(detectionData);
            let currentDetections = detectionData.detections;

            if (currentDetections && currentDetections.length > 0) {
                setStatus("severity");
                try {
                    const severityData = await calculateSeverity(currentDetections);
                    setSeverityResult(severityData);
                    currentDetections = severityData;
                } catch (sevErr) { console.error("Severity Error:", sevErr); }

                setStatus("georeferencing");
                const gpsData = {
                    latitude: parseFloat(manualGps.lat) || 0,
                    longitude: parseFloat(manualGps.lng) || 0
                };

                try {
                    const geoData = await georeferenceDetections(detectionData.filename, gpsData, currentDetections);
                    setGeoResult(geoData);
                } catch (geoErr) { console.error("GeoRef Error:", geoErr); }
            }
            setStatus("done");
        } catch (err) {
            console.error(err);
            setBackendError(err.response?.data?.detail || err.message);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (level) => {
        switch (level) {
            case 'CRITIQUE': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'ÉLEVÉ': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'MOYEN': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500 px-4 sm:px-6 lg:px-8 py-8 selection:bg-primary-500/30">
            {/* Animated Background Mesh */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-primary-500 rounded-lg text-white shadow-lg shadow-primary-500/20">
                                <Sparkles size={20} />
                            </span>
                            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                                RoadSense
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Système intelligent d'inspection et de maintenance routière.</p>
                    </motion.div>

                    <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => setViewMode('upload')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${viewMode === 'upload' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                        >
                            <ImageIcon size={16} /> Analyse
                        </button>
                        <button
                            onClick={() => setViewMode('global')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${viewMode === 'global' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                        >
                            <BarChart3 size={16} /> Statistiques
                        </button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {viewMode === 'global' ? (
                        <motion.div
                            key="global"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <GlobalDashboard />
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Panel */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="lg:col-span-4 space-y-6"
                            >
                                {/* Upload Card */}
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
                                            <Upload size={22} />
                                        </div>
                                        Capture
                                    </h2>

                                    <div className="relative group mb-6">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                        />
                                        <div className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${file ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-primary-400 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                            {preview ? (
                                                <div className="relative">
                                                    <img src={preview} alt="Preview" className="max-h-56 mx-auto rounded-2xl shadow-lg object-contain" />
                                                    <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Changer l'image</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 py-4">
                                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Cliquez ou glissez l'image</p>
                                                        <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP (Max 10MB)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* GPS Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Coordonnées GPS</label>
                                            <Settings2 size={14} className="text-slate-400" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 ml-2">LATITUDE</label>
                                                <input
                                                    type="text"
                                                    value={manualGps.lat}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(',', '.');
                                                        if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
                                                            setManualGps({ ...manualGps, lat: val });
                                                            setResolvedAddress(null);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 ml-2">LONGITUDE</label>
                                                <input
                                                    type="text"
                                                    value={manualGps.lng}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(',', '.');
                                                        if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
                                                            setManualGps({ ...manualGps, lng: val });
                                                            setResolvedAddress(null);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 transition-all font-mono"
                                                />
                                            </div>
                                        </div>

                                        {resolvedAddress && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-2 p-3 bg-primary-500/5 rounded-2xl border border-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold"
                                            >
                                                <MapPin size={14} className="shrink-0" />
                                                <span className="truncate">{resolvedAddress}</span>
                                            </motion.div>
                                        )}

                                        <div className="flex gap-2 mt-6">
                                            <button
                                                onClick={async () => {
                                                    if (!manualGps.lat || !manualGps.lng) return;
                                                    const res = await resolveCoordinates(manualGps.lat, manualGps.lng);
                                                    setResolvedAddress(res.road_name);
                                                }}
                                                className="flex-none p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors text-slate-600 dark:text-slate-300"
                                                title="Identifier la zone"
                                            >
                                                <MousePointer2 size={20} />
                                            </button>
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={!file || loading}
                                                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-white shadow-xl shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 ${!file || loading ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 shadow-none' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400'}`}
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={18} />}
                                                {loading ? "Calcul..." : "Lancer l'Analyse"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Card */}
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Pipeline Logiciel</h3>
                                    <div className="space-y-6">
                                        <StepItem status={status} stepName="analyzing" label="Vision par Ordinateur (YOLOv8)" />
                                        <StepItem status={status} stepName="severity" label="Analyse de Sévérité (XGBoost)" />
                                        <StepItem status={status} stepName="georeferencing" label="Géo-Indexation (PostGIS)" />
                                        <StepItem status={status} stepName="done" label="Finalisation du Rapport" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Right Panel */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="lg:col-span-8 space-y-8"
                            >
                                {/* Results Viewport */}
                                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden min-h-[600px] flex flex-col">
                                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary-500 animate-ping"></div>
                                            <h2 className="text-xl font-bold">Rendu de l'Inspection</h2>
                                        </div>
                                        {result && (
                                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20">
                                                <CheckCircle size={14} /> {result.detection_count} Anomalies Détectées
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col gap-8">
                                        {!result ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50 p-12">
                                                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                    <LayoutDashboard size={48} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">Aucune donnée</h3>
                                                    <p className="text-sm max-w-xs mx-auto">Lancez une analyse pour visualiser les défauts sur la carte et l'image annotée.</p>
                                                </div>
                                                <div className="flex-1 w-full mt-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                                    <AnalysisMap defects={[]} userLocation={manualGps} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                {/* Annotated Image */}
                                                <div className="group relative bg-black dark:bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video max-h-[500px] border border-slate-200 dark:border-slate-800">
                                                    <img
                                                        src={`data:image/jpeg;base64,${result.annotated_image_b64}`}
                                                        alt="Result"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold text-white/90 border border-white/10">
                                                        ANALYSE VISION IA v8.0
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                                    {/* Severity Breakdown */}
                                                    <div className="md:col-span-2 space-y-4">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <ThermometerSun size={14} /> Sévérité par Objet
                                                        </h4>
                                                        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {severityResult ? severityResult.map((det, idx) => (
                                                                <motion.div
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: idx * 0.05 }}
                                                                    key={idx}
                                                                    className={`p-4 rounded-2xl border flex justify-between items-center ${getSeverityColor(det.severity_level)}`}
                                                                >
                                                                    <div className="space-y-0.5">
                                                                        <div className="font-bold text-sm tracking-tight">{det.class_name}</div>
                                                                        <div className="text-[10px] opacity-70 font-medium uppercase">Score: {det.severity_score}%</div>
                                                                    </div>
                                                                    <div className="text-[10px] font-black px-2 py-1 bg-white/40 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                                                                        {det.severity_level}
                                                                    </div>
                                                                </motion.div>
                                                            )) : (
                                                                <div className="text-xs text-slate-400 italic py-4">Calcul de sévérité en attente...</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Minimap */}
                                                    <div className="md:col-span-3 space-y-4">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <MapPin size={14} /> Localisation PostGIS
                                                        </h4>
                                                        <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                                                            <AnalysisMap defects={geoResult ? geoResult.anomalies : []} userLocation={manualGps} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* GeoRef Details */}
                                                {geoResult && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-primary-500/5 dark:bg-primary-500/10 p-6 rounded-[2rem] border border-primary-500/20"
                                                    >
                                                        <h4 className="font-bold text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2 text-sm">
                                                            <Sparkles size={16} /> Rapport Micro-Service GéoRef
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {geoResult.anomalies.map((anom) => (
                                                                <div key={anom.anomaly_id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-primary-500/10 text-[11px] shadow-sm flex flex-col gap-1">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{anom.class_name}</span>
                                                                    <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                                                                        <Settings2 size={10} /> {anom.road_segment_id}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Priority Plan Section (Below Results) */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none"
                                >
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                                <ListOrdered size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold">Plan d'Intervention Prioritaire</h2>
                                                <p className="text-xs text-slate-400 font-medium">Algorithme de priorisation multicritère intelligent.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Rang</th>
                                                    <th className="px-6 py-4">ID Tronçon</th>
                                                    <th className="px-6 py-4">Score Priorité</th>
                                                    <th className="px-6 py-4">Intensité Défauts</th>
                                                    <th className="px-6 py-4">Indicateur Trafic</th>
                                                    <th className="px-6 py-4 text-center">Urgence</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {priorityList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-6 py-12 text-center">
                                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                                <AlertCircle size={32} />
                                                                <span className="text-sm font-medium">Synchronisation des données prioritaires...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    priorityList.slice(0, 10).map((item, idx) => (
                                                        <tr key={item.segment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                            <td className="px-6 py-4 font-black text-primary-500">#{(idx + 1).toString().padStart(2, '0')}</td>
                                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100">{item.segment_id}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2 font-bold text-sm">
                                                                    {item.priority_score.toFixed(1)}
                                                                    <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${item.priority_score}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-medium text-sm">{item.defect_count} <span className="text-[10px] text-slate-400 ml-1">items</span></td>
                                                            <td className="px-6 py-4">
                                                                <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                                    <div className={`h-full rounded-full ${item.traffic_score > 70 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${item.traffic_score}%` }}></div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {item.priority_score > 70 ? (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-red-500 text-white shadow-lg shadow-red-500/20">CRITIQUE</span>
                                                                ) : item.priority_score > 40 ? (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-yellow-500 text-white shadow-lg shadow-yellow-500/20">MODÉRÉ</span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">SUIVI</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error Notification Toast */}
            <AnimatePresence>
                {backendError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-600 text-white rounded-3xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md border border-red-500"
                    >
                        <AlertCircle className="shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold leading-tight">Erreur Service</p>
                            <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{backendError}</p>
                        </div>
                        <button onClick={() => setBackendError(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <Settings2 size={16} className="rotate-45" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StepItem({ status, stepName, label }) {
    const steps = ["idle", "analyzing", "severity", "georeferencing", "done"];
    const currentIndex = steps.indexOf(status === "error" ? "done" : status);
    const stepIndex = steps.indexOf(stepName);

    let state = "waiting";
    if (currentIndex > stepIndex) state = "completed";
    if (currentIndex === stepIndex) state = "current";
    if (status === "done" && stepName === "done") state = "completed";

    return (
        <div className="flex items-center gap-4 group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${state === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                state === 'current' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40 animate-pulse' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                }`}>
                {state === 'completed' ? <CheckCircle size={18} /> :
                    state === 'current' ? <Loader2 size={18} className="animate-spin" /> :
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />}
            </div>
            <div className="flex flex-col">
                <span className={`text-xs font-bold transition-all duration-300 ${state === 'current' ? 'text-primary-600 dark:text-primary-400' :
                    state === 'completed' ? 'text-slate-700 dark:text-slate-200' :
                        'text-slate-400 group-hover:text-slate-500'
                    }`}>{label}</span>
                <span className="text-[9px] uppercase tracking-tighter text-slate-400 font-medium">
                    {state === 'completed' ? 'Opération Succès' : state === 'current' ? 'Traitement actif' : 'En attente'}
                </span>
            </div>
        </div>
    );
}
