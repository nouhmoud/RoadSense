import { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, MapPin, Loader2, ThermometerSun, ListOrdered, LayoutDashboard, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectDefects, georeferenceDetections, calculateSeverity, getPriorities } from '../services/api';
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

    // View Mode: 'upload' or 'global'
    const [viewMode, setViewMode] = useState('upload');

    useEffect(() => {
        // Fetch priorities on mount (or could be refreshed)
        getPriorities().then(data => setPriorityList(data));
    }, [result]); // Refresh when result changes (new defects might affect priorities)

    // Dummy GPS for demo if image has no GPS
    const [manualGps, setManualGps] = useState({ lat: 43.501, lng: 1.001 });

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

            // Try to extract GPS from image
            const gps = await extractGpsFromImage(selected);
            if (gps) {
                setManualGps(gps);
            }
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setLoading(true);
        setStatus("analyzing");
        setBackendError(null);

        try {
            // 1. Detect
            const detectionData = await detectDefects(file);
            setResult(detectionData);

            let currentDetections = detectionData.detections;

            if (currentDetections && currentDetections.length > 0) {
                // 2. Compute Severity
                setStatus("severity");
                try {
                    const severityData = await calculateSeverity(currentDetections);
                    setSeverityResult(severityData);
                    currentDetections = severityData; // Use enriched data for georef
                } catch (sevErr) {
                    console.error("Severity Error:", sevErr);
                }

                // 3. Georeference
                setStatus("georeferencing");

                // Use manual GPS or extract from EXIF (omitted for brevity, using manual)
                const gpsData = {
                    latitude: parseFloat(manualGps.lat) || 0,
                    longitude: parseFloat(manualGps.lng) || 0
                };

                try {
                    const geoData = await georeferenceDetections(
                        detectionData.filename,
                        gpsData,
                        currentDetections
                    );
                    setGeoResult(geoData);
                } catch (geoErr) {
                    console.error("GeoRef Error:", geoErr);
                    // We don't fail the whole process if georef fails, just log it
                }
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
            case 'CRITIQUE': return 'text-red-600 bg-red-100 border-red-200';
            case 'ÉLEVÉ': return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'MOYEN': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            default: return 'text-green-600 bg-green-100 border-green-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* View Toggle */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
                    <p className="text-gray-500">Analysez des images ou visualisez l'état du réseau.</p>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('upload')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'upload' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ImageIcon size={18} /> Analyse d'Image
                    </button>
                    <button
                        onClick={() => setViewMode('global')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'global' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LayoutDashboard size={18} /> Vue Globale
                    </button>
                </div>
            </div>

            {viewMode === 'global' ? (
                <GlobalDashboard />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Upload & Control */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Upload size={20} className="text-primary-600" /> Charger une Image
                            </h2>

                            <div className="relative group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/webp, image/jfif"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                />
                                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${file ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                                    }`}>
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded shadow-sm object-contain" />
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                <Upload size={24} />
                                            </div>
                                            <p className="text-sm text-gray-600">Cliquez ou glissez pour charger (JPG, PNG, WebP, JFIF)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* GPS Input (Simulation) */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Simulation GPS</h3>
                                <div className="flex gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Lat</label>
                                        <input
                                            type="text"
                                            value={manualGps.lat}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "" || val === "-" || !isNaN(parseFloat(val))) {
                                                    setManualGps({ ...manualGps, lat: val });
                                                }
                                            }}
                                            className="w-full text-sm border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Long</label>
                                        <input
                                            type="text"
                                            value={manualGps.lng}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "" || val === "-" || !isNaN(parseFloat(val))) {
                                                    setManualGps({ ...manualGps, lng: val });
                                                }
                                            }}
                                            className="w-full text-sm border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!file || loading}
                                className={`mt-6 w-full py-2.5 px-4 rounded-lg font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${!file || loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 active:scale-[98%]'
                                    }`}
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Traitement cour...</>
                                ) : (
                                    "Lancer l'Analyse"
                                )}
                            </button>

                            {backendError && (
                                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    {backendError}
                                </div>
                            )}
                        </div>

                        {/* Status Steps */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-semibold text-gray-500 mb-4">Progression de l'Analyse</h3>
                            <div className="space-y-4">
                                <StepItem status={status} stepName="analyzing" label="Détection YOLOv8" />
                                <StepItem status={status} stepName="severity" label="Calcul de Sévérité (IA)" />
                                <StepItem status={status} stepName="georeferencing" label="Géo-Référencement (PostGIS)" />
                                <StepItem status={status} stepName="done" label="Visualisation" />
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Results & Map */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Result Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col overflow-hidden">
                            <div className="border-b border-gray-100 p-4 bg-gray-50 flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900">Résultats</h2>
                                {result && (
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                        <CheckCircle size={12} /> {result.detection_count} Anomalies
                                    </span>
                                )}
                            </div>

                            <div className="p-6 flex-1 relative bg-gray-100/50">
                                {!result ? (
                                    <div className="h-full flex flex-col">
                                        {/* Always show map, even before results, to visualize user location */}
                                        <div className="flex-1 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Aperçu Localisation</p>
                                            <AnalysisMap defects={[]} userLocation={manualGps} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 h-full flex flex-col">
                                        {/* Annotated Image */}
                                        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 min-h-[400px] max-h-[700px] flex flex-col">
                                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase flex justify-between items-center">
                                                Image Annotée
                                                <span className="text-[10px] normal-case font-normal italic">Détection YOLOv8</span>
                                            </p>
                                            <div className="flex-1 overflow-hidden rounded bg-black flex items-center justify-center">
                                                <img
                                                    src={`data:image/jpeg;base64,${result.annotated_image_b64}`}
                                                    alt="Result"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        </div>

                                        {/* Severity & Map Details */}
                                        <div className="flex gap-4 flex-col lg:flex-row">
                                            {/* Severity List */}
                                            {severityResult && (
                                                <div className="flex-1 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                        <ThermometerSun size={16} /> Analyse Sévérité
                                                    </h4>
                                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                        {severityResult.map((det, idx) => (
                                                            <div key={idx} className={`p-2 rounded border text-xs flex justify-between items-center ${getSeverityColor(det.severity_level)}`}>
                                                                <div>
                                                                    <span className="font-bold">{det.class_name}</span>
                                                                    <div className="text-[10px] opacity-75">Score: {det.severity_score}/100</div>
                                                                </div>
                                                                <span className="font-bold px-1.5 py-0.5 bg-white/50 rounded">{det.severity_level}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Map Preview */}
                                            <div className="flex-1 min-h-[200px] bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Carte PostGIS</p>
                                                <AnalysisMap defects={geoResult ? geoResult.anomalies : []} userLocation={manualGps} />
                                            </div>
                                        </div>

                                        {/* GeoRef Result */}
                                        {geoResult && (
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-auto">
                                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <MapPin size={16} /> Données Sauvées (PostGIS)
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {geoResult.anomalies.map((anom) => (
                                                        <div key={anom.anomaly_id} className="bg-white p-2 rounded border border-blue-200 text-xs shadow-sm">
                                                            <span className="font-bold">{anom.class_name}</span> sur <span className="font-mono bg-gray-100 px-1">{anom.road_segment_id}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Priority Intervention Plan (Full Width) */}
                    <div className="col-span-1 lg:col-span-12 mt-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <ListOrdered size={20} className="text-primary-600" /> Plan d'Intervention Prioritaire
                            </h2>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-2 rounded-l-lg">Rang</th>
                                            <th className="px-4 py-2">Tronçon</th>
                                            <th className="px-4 py-2">Priorité</th>
                                            <th className="px-4 py-2">Nb Défauts</th>
                                            <th className="px-4 py-2">Trafic</th>
                                            <th className="px-4 py-2 rounded-r-lg">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {priorityList.length === 0 ? (
                                            <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                                Aucune donnée ou service indisponible. <br />
                                                <span className="text-xs">Assurez-vous que le service de priorité est lancé (port 3000).</span>
                                            </td></tr>
                                        ) : (
                                            priorityList.map((item, idx) => (
                                                <tr key={item.segment_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-primary-600">#{idx + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-gray-600">{item.segment_id}</td>
                                                    <td className="px-4 py-3 font-bold">{item.priority_score.toFixed(1)}</td>
                                                    <td className="px-4 py-3">{item.defect_count}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.traffic_score}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.priority_score > 70 ? (
                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">IMMÉDIAT</span>
                                                        ) : item.priority_score > 40 ? (
                                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">PLANIFIÉ</span>
                                                        ) : (
                                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">SURVEILLER</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StepItem({ status, stepName, label }) {
    // idle -> analyzing -> severity -> georeferencing -> done
    const steps = ["idle", "analyzing", "severity", "georeferencing", "done"];
    const currentIndex = steps.indexOf(status === "error" ? "done" : status); // treat error as end for visualization
    const stepIndex = steps.indexOf(stepName);

    let state = "waiting"; // waiting, current, completed
    if (currentIndex > stepIndex) state = "completed";
    if (currentIndex === stepIndex) state = "current";
    if (status === "done" && stepName === "done") state = "completed";

    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${state === 'completed' ? 'bg-green-100 text-green-600' :
                state === 'current' ? 'bg-primary-100 text-primary-600 animate-pulse' :
                    'bg-gray-100 text-gray-400'
                }`}>
                {state === 'completed' ? <CheckCircle size={16} /> :
                    state === 'current' ? <Loader2 size={16} className="animate-spin" /> :
                        <div className="w-2 h-2 rounded-full bg-gray-300" />}
            </div>
            <span className={`text-sm ${state === 'current' ? 'font-semibold text-gray-900' :
                state === 'completed' ? 'text-gray-700' :
                    'text-gray-400'
                }`}>{label}</span>
        </div>
    );
}
