import { useEffect, useState } from 'react';
import { getHistory, getGeoHistory, getExportMapUrl, getExportKmlUrl, getWfsUrl } from '../services/api';
import { Calendar, Image as ImageIcon, ExternalLink, Loader2, Database, MapPin, FileJson, Download, Globe, Link as LinkIcon } from 'lucide-react';
import AnalysisMap from '../components/AnalysisMap';

export default function History() {
    const [activeTab, setActiveTab] = useState('minio'); // 'minio' | 'postgis'

    // MinIO Data
    const [minioHistory, setMinioHistory] = useState([]);
    const [minioLoading, setMinioLoading] = useState(false);

    // PostGIS Data
    const [geoHistory, setGeoHistory] = useState([]);
    const [geoLoading, setGeoLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'minio') {
            fetchMinioHistory();
        } else {
            fetchGeoHistory();
        }
    }, [activeTab]);

    const fetchMinioHistory = async () => {
        setMinioLoading(true);
        try {
            const data = await getHistory();
            if (data.results) {
                setMinioHistory(data.results.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMinioLoading(false);
        }
    };

    const fetchGeoHistory = async () => {
        setGeoLoading(true);
        try {
            const data = await getGeoHistory();
            setGeoHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setGeoLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Explorateur de Données</h2>
                    <p className="text-sm text-gray-500">Visualisez le contenu des différents systèmes de stockage</p>
                </div>

                {/* Tabs */}
                <div className="bg-gray-100 p-1 rounded-lg inline-flex items-center">
                    <button
                        onClick={() => setActiveTab('minio')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'minio'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ImageIcon size={16} /> Stockage MinIO
                    </button>
                    <button
                        onClick={() => setActiveTab('postgis')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'postgis'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Database size={16} /> Base PostGIS
                    </button>
                </div>

                {activeTab === 'postgis' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(getExportMapUrl(), '_blank')}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                            title="Télécharger GeoJSON pour QGIS/ArcGIS"
                        >
                            <Download size={16} /> GeoJSON
                        </button>
                        <button
                            onClick={() => window.open(getExportKmlUrl(), '_blank')}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                            title="Télécharger KML pour Google Earth"
                        >
                            <Globe size={16} /> KML
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(getWfsUrl());
                                alert('Lien WFS copié ! Collez-le dans QGIS > Ajouter couche WFS.');
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                            title="Copier le lien WFS pour connexion live QGIS"
                        >
                            <LinkIcon size={16} /> Lien WFS
                        </button>
                    </div>
                )}
            </div>

            {/* Content: MinIO */}
            {activeTab === 'minio' && (
                <div>
                    {minioLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {minioHistory.map((item) => (
                                <div key={item.filename} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                                    <div className="h-48 overflow-hidden bg-gray-100 relative">
                                        <img
                                            src={item.url}
                                            alt={item.filename}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Image+Introuvable'; }}
                                        />
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm text-gray-700 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 truncate mb-1" title={item.filename}>{item.filename}</h3>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                            <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.last_modified).toLocaleDateString('fr-FR')}</div>
                                            <div className="flex items-center gap-1"><ImageIcon size={12} /> {(item.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {minioHistory.length === 0 && <p className="text-gray-500 col-span-full text-center py-12">Aucune image trouvée dans MinIO.</p>}
                        </div>
                    )}
                </div>
            )}

            {/* Content: PostGIS */}
            {activeTab === 'postgis' && (
                <div>
                    {geoLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-blue-50 text-blue-900 font-semibold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">ID Anomalie</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Confiance</th>
                                            <th className="px-6 py-3">Tronçon</th>
                                            <th className="px-6 py-3">Coordonnées (Lat, Lon)</th>
                                            <th className="px-6 py-3">Date/Heure</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {geoHistory.map((item) => (
                                            <tr key={item.anomaly_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.anomaly_id.substring(0, 8)}...</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{item.class_name}</td>
                                                <td className="px-6 py-4">{(item.confidence * 100).toFixed(1)}%</td>
                                                <td className="px-6 py-4 font-mono text-blue-600 bg-blue-50/50 rounded inline-block my-2 px-2 py-0.5">{item.road_segment_id}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={14} className="text-gray-400" />
                                                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{new Date(item.timestamp).toLocaleString('fr-FR')}</td>
                                            </tr>
                                        ))}
                                        {geoHistory.length === 0 && (
                                            <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucune anomalie trouvée dans PostGIS.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
