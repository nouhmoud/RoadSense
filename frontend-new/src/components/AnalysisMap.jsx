import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet default icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function AnalysisMap({ defects, userLocation }) {
    // defects: array of { latitude, longitude, class_name, ... }
    // userLocation: { lat, lng } or null

    // Default center if no defects (Paris, roughly)
    const defaultCenter = [48.8566, 2.3522];

    // Determine center: User Location -> First Defect -> Default
    let center = defaultCenter;
    if (userLocation && userLocation.lat && userLocation.lng) {
        center = [userLocation.lat, userLocation.lng];
    } else if (defects && defects.length > 0) {
        center = [defects[0].latitude, defects[0].longitude];
    }

    return (
        <div className="h-full w-full rounded-lg overflow-hidden border border-gray-300 shadow-inner z-0">
            <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Location Marker (Blue/Distinct) */}
                {userLocation && userLocation.lat && userLocation.lng && (
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>
                            <div className="text-sm font-semibold text-blue-600">
                                Position Image / Utilisateur
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Defect Markers (Default Red) */}
                {defects && defects.map((defect) => (
                    <Marker
                        key={defect.anomaly_id}
                        position={[defect.latitude, defect.longitude]}
                    >
                        <Popup>
                            <div className="text-sm">
                                <span className="font-bold">{defect.class_name}</span><br />
                                Tronçon : {defect.road_segment_id}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
