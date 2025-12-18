import axios from 'axios';

const DETECTION_API_URL = 'http://127.0.0.1:8088';
const GEOREF_API_URL = 'http://127.0.0.1:8081';
const SEVERITY_API_URL = 'http://127.0.0.1:8083';
const DASHBOARD_STATS_API_URL = 'http://127.0.0.1:8084';
const EXPORT_API_BASE_URL = 'http://127.0.0.1:8082';
const PRIORITY_API_BASE_URL = 'http://127.0.0.1:3000';

// --- AXIOS INSTANCES ---
const detectionApi = axios.create({ baseURL: DETECTION_API_URL });
const georefApi = axios.create({ baseURL: GEOREF_API_URL });
const severityApi = axios.create({ baseURL: SEVERITY_API_URL });
const dashboardApi = axios.create({ baseURL: DASHBOARD_STATS_API_URL });
const priorityApi = axios.create({ baseURL: PRIORITY_API_BASE_URL });


// --- DETECTION SERVICE (8088) ---
export const checkHealth = async () => {
    try {
        const response = await detectionApi.get('/health');
        return response.data;
    } catch (error) {
        console.error("Health Check Failed:", error);
        return { status: 'error', model_loaded: false };
    }
};

export const detectDefects = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await detectionApi.post('/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getHistory = async () => {
    // MinIO History (stored in Detection Service)
    const response = await detectionApi.get('/results');
    return response.data;
};

// --- GEOREF SERVICE (8081) ---
export const georeferenceDetections = async (filename, gpsData, detections) => {
    const payload = {
        image_filename: filename,
        gps_data: gpsData,
        detections: detections
    };
    const response = await georefApi.post('/georef', payload);
    return response.data;
};

export const getGeoHistory = async () => {
    try {
        const response = await georefApi.get('/georef/history');
        return response.data;
    } catch (error) {
        console.error("Geo History Error:", error);
        return [];
    }
};

export const resolveCoordinates = async (lat, lon) => {
    try {
        const response = await georefApi.get('/georef/resolve', {
            params: { lat, lon }
        });
        return response.data; // { road_name: "..." }
    } catch (error) {
        console.warn("Resolve Coordinates Error:", error);
        return { road_name: "Zone Inconnue" };
    }
};

// --- SEVERITY SERVICE (8083) ---
export const calculateSeverity = async (detections) => {
    const response = await severityApi.post('/severity/compute', detections);
    return response.data;
};

// --- DASHBOARD SERVICE (8084) ---
export const getDashboardStats = async () => {
    try {
        const response = await dashboardApi.get('/dashboard-stats');
        return response.data;
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return null;
    }
};

// --- EXPORT SERVICE (8082) ---
export const getExportMapUrl = () => `${EXPORT_API_BASE_URL}/export/map`;
export const getExportKmlUrl = () => `${EXPORT_API_BASE_URL}/export/kml`;
export const getWfsUrl = () => `${EXPORT_API_BASE_URL}/wfs`;

// --- PRIORITY SERVICE (3000) ---
export const getPriorities = async () => {
    try {
        const response = await priorityApi.get('/priority/list', { timeout: 2000 });
        return response.data;
    } catch (error) {
        console.warn("Priority API unreachable.");
        return [];
    }
};

export default detectionApi;

