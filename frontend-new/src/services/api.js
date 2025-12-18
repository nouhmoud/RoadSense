import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8088';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const checkHealth = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error("Health Check Failed:", error);
        return { status: 'error', model_loaded: false };
    }
};

export const detectDefects = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    // Upload image to /detect api
    // This endpoint returns detection results AND uploads to MinIO
    const response = await api.post('/detect', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getHistory = async () => {
    const response = await api.get('/results');
    return response.data; // { status: 'success', count: ..., results: [...] }
};

export const georeferenceDetections = async (filename, gpsData, detections) => {
    // gpsData: { latitude: float, longitude: float }
    // detections: [ { box, confidence, class_name }, ... ]

    const payload = {
        image_filename: filename,
        gps_data: gpsData,
        detections: detections
    };

    const response = await api.post('/georef', payload);
    return response.data;
};

export const getGeoHistory = async () => {
    try {
        const response = await api.get('/georef/history');
        return response.data;
    } catch (error) {
        console.error("Geo History Error:", error);
        return [];
    }
};

export const calculateSeverity = async (detections) => {
    // detections: List of detection objects
    const response = await api.post('/severity/compute', detections);
    return response.data; // Returns list of detections enriched with severity_score and severity_level
};


const EXPORT_API_BASE_URL = 'http://127.0.0.1:8082'; // ExportSIG Service


export const getExportMapUrl = () => {
    return `${EXPORT_API_BASE_URL}/export/map`;
};

export const getExportKmlUrl = () => {
    return `${EXPORT_API_BASE_URL}/export/kml`;
};

export const getWfsUrl = () => {
    return `${EXPORT_API_BASE_URL}/wfs`;
};

const PRIORITY_API_BASE_URL = 'http://127.0.0.1:3000';

const priorityApi = axios.create({
    baseURL: PRIORITY_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getPriorities = async () => {
    try {
        // Add a short timeout (e.g., 2000ms) to fail fast if service is down
        const response = await priorityApi.get('/priority/list', { timeout: 2000 });
        return response.data;
    } catch (error) {
        console.warn("Priority API unreachable (likely service not started).");
        return [];
    }
};

export default api;
