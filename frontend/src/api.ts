import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export const fetchFleetHealth = () => api.get('/fleet/fleet-health').then((res) => res.data);
export const fetchDrones = (page = 1, limit = 8, search = '') =>
  api.get('/fleet/drones', { params: { page, limit, search } }).then((res) => res.data);
export const fetchDroneDetail = (id: string) => api.get(`/fleet/drones/${id}`).then((res) => res.data);
export const createDrone = (payload: Record<string, unknown>) => api.post('/fleet/drones', payload).then((res) => res.data);
export const fetchMissions = (page = 1, limit = 8) => api.get('/fleet/missions', { params: { page, limit } }).then((res) => res.data);
export const createMission = (payload: Record<string, unknown>) => api.post('/fleet/missions', payload).then((res) => res.data);
export const createMaintenanceLog = (payload: Record<string, unknown>) => api.post('/fleet/maintenance-logs', payload).then((res) => res.data);
