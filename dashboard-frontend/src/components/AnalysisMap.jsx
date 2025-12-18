import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Target } from 'lucide-react';
import L from 'leaflet';
import { useState, useEffect } from 'react';

// Fix Leaflet default icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function AnalysisMap({ defects, userLocation }) {
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const defaultCenter = [43.5, 1.0]; // Re-center on demo area
    let center = defaultCenter;
    if (userLocation && userLocation.lat && userLocation.lng) {
        center = [parseFloat(userLocation.lat), parseFloat(userLocation.lng)];
    } else if (defects && defects.length > 0) {
        center = [defects[0].latitude, defects[0].longitude];
    }

    const tileUrl = isDarkMode
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    return (
        <div className="h-full w-full relative group">
            <MapContainer
                center={center}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', borderRadius: '1.5rem', background: isDarkMode ? '#1e293b' : '#f8fafc' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={tileUrl}
                />

                {userLocation && userLocation.lat && userLocation.lng && (
                    <Marker position={[parseFloat(userLocation.lat), parseFloat(userLocation.lng)]}>
                        <Popup>
                            <div className="dark:text-slate-200">
                                <p className="text-[10px] font-bold text-primary-500 uppercase">Position Actuelle</p>
                                <p className="text-xs font-semibold">Analyse du point de capture</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {defects && defects.map((defect, idx) => (
                    <Marker
                        key={idx}
                        position={[defect.latitude, defect.longitude]}
                    >
                        <Popup>
                            <div className="p-1">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${defect.severity_level === 'CRITIQUE' ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'}`}>
                                    {defect.class_name}
                                </span>
                                <div className="mt-2 text-[10px] text-slate-500 font-mono">
                                    ID: {defect.road_segment_id || 'N/A'}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay indicators for premium feel */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {defects.length} Anomalies
                </div>
            </div>
        </div>
    );
}
