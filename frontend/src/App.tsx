import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { FleetOverview, MaintenanceAlerts, MissionViewWidget, DroneDetailComponent } from './components';

const API_BASE = 'http://localhost:3000/api';

type Drone = {
  id: number;
  identifier: string;
  serialNumber: string;
  model: string;
  status: string;
  totalFlightHours: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDueDate: string | null;
  registrationTimestamp: string;
  missions?: Mission[];
  maintenanceLogs?: MaintenanceLog[];
};

type Mission = {
  id: number;
  name: string;
  type: string;
  status: string;
  pilotName: string;
  siteLocation: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  flightHoursLogged: number | null;
  abortReason: string | null;
  droneId: number;
  drone?: Drone;
};

type MaintenanceLog = {
  id: number;
  droneId: number;
  type: string;
  technicianName: string;
  notes: string | null;
  datePerformed: string;
  flightHoursAtMaintenance: number;
  drone?: Drone;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/drones" element={<DroneListPage />} />
      <Route path="/drones/:id" element={<DroneDetailPage />} />
      <Route path="/missions" element={<MissionListPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function DashboardPage() {
  return (
    <div className="page-shell">
      <nav className="top-nav">
        <h1>SkyOps Mission Control</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/drones">Drones</Link>
          <Link to="/missions">Missions</Link>
        </div>
      </nav>

      <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b', fontSize: '0.8rem', marginBottom: '8px' }}>Operations overview</p>
        <h2 style={{ marginTop: 0 }}>Fleet health at a glance</h2>
        <p>Monitor maintenance windows, mission load, and drone availability from a single control surface.</p>
      </section>

      <FleetOverview />

      <MaintenanceAlerts />

      <MissionViewWidget />

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        <Link to="/drones" style={{ padding: '12px 20px', background: '#2563eb', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>
          View All Drones
        </Link>
        <Link to="/missions" style={{ padding: '12px 20px', background: '#2563eb', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>
          Manage Missions
        </Link>
      </div>
    </div>
  );
}

function DroneListPage() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [form, setForm] = useState({ identifier: '', serialNumber: '', model: 'PHANTOM_4', status: 'AVAILABLE' });
  const navigate = useNavigate();

  const loadDrones = () => {
    fetch(`${API_BASE}/fleet/drones`).then((res) => res.json()).then((data) => setDrones(data.items ?? []));
  };

  useEffect(() => {
    loadDrones();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch(`${API_BASE}/fleet/drones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ identifier: '', serialNumber: '', model: 'PHANTOM_4', status: 'AVAILABLE' });
    loadDrones();
  };

  return (
    <div className="page-shell">
      <nav className="top-nav">
        <h1>Drone registry</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/drones">Drones</Link>
          <Link to="/missions">Missions</Link>
        </div>
      </nav>

      <section className="card">
        <h3>Create drone</h3>
        <form className="form-grid" onSubmit={submit}>
          <input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder="Identifier" />
          <input value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} placeholder="Serial number" />
          <select value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
            <option value="PHANTOM_4">PHANTOM_4</option>
            <option value="MATRICE_300">MATRICE_300</option>
            <option value="MAVIC_3_ENTERPRISE">MAVIC_3_ENTERPRISE</option>
          </select>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="IN_MISSION">IN_MISSION</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="RETIRED">RETIRED</option>
          </select>
          <button type="submit">Create drone</button>
        </form>
      </section>

      <section className="card">
        <h3>Fleet inventory</h3>
        <ul className="list-stack">
          {drones.map((drone) => (
            <li key={drone.id} className="list-item">
              <div>
                <strong>{drone.identifier}</strong>
                <div>{drone.serialNumber} · {drone.model}</div>
              </div>
              <div className="inline-actions">
                <span>{drone.status}</span>
                <button type="button" onClick={() => navigate(`/drones/${drone.id}`)}>View</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DroneDetailPage() {
  const params = useParams();
  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'ROUTINE_CHECK', technicianName: '', notes: '', datePerformed: '', flightHoursAtMaintenance: '0' });

  const submitMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await fetch(`${API_BASE}/fleet/maintenance-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ droneId: params.id, ...maintenanceForm, flightHoursAtMaintenance: Number(maintenanceForm.flightHoursAtMaintenance) }),
      });
      setMaintenanceForm({ type: 'ROUTINE_CHECK', technicianName: '', notes: '', datePerformed: '', flightHoursAtMaintenance: '0' });
      window.location.reload();
    } catch (error) {
      console.error('Failed to record maintenance:', error);
    }
  };

  return (
    <div className="page-shell">
      <nav className="top-nav">
        <h1>Drone Details</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/drones">Drones</Link>
          <Link to="/missions">Missions</Link>
        </div>
      </nav>

      {params.id && <DroneDetailComponent droneId={params.id} />}

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Log Maintenance</h3>
        <form className="form-grid" onSubmit={submitMaintenance}>
          <select value={maintenanceForm.type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })}>
            <option value="ROUTINE_CHECK">ROUTINE_CHECK</option>
            <option value="BATTERY_REPLACEMENT">BATTERY_REPLACEMENT</option>
            <option value="MOTOR_REPAIR">MOTOR_REPAIR</option>
            <option value="FIRMWARE_UPDATE">FIRMWARE_UPDATE</option>
            <option value="FULL_OVERHAUL">FULL_OVERHAUL</option>
          </select>
          <input value={maintenanceForm.technicianName} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, technicianName: event.target.value })} placeholder="Technician" />
          <input value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, notes: event.target.value })} placeholder="Notes" />
          <input type="datetime-local" value={maintenanceForm.datePerformed} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, datePerformed: event.target.value })} />
          <input type="number" value={maintenanceForm.flightHoursAtMaintenance} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, flightHoursAtMaintenance: event.target.value })} placeholder="Flight hours" />
          <button type="submit">Record Maintenance</button>
        </form>
      </div>
    </div>
  );
}

function MissionListPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [form, setForm] = useState({ name: '', type: 'WIND_TURBINE_INSPECTION', droneId: '', pilotName: '', siteLocation: '', plannedStart: '', plannedEnd: '' });

  const loadData = () => {
    Promise.all([fetch(`${API_BASE}/fleet/missions`).then((res) => res.json()), fetch(`${API_BASE}/fleet/drones`).then((res) => res.json())]).then(([missionData, droneData]) => {
      setMissions(missionData.items ?? []);
      setDrones(droneData.items ?? []);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch(`${API_BASE}/fleet/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, droneId: Number(form.droneId) }),
    });
    setForm({ name: '', type: 'WIND_TURBINE_INSPECTION', droneId: '', pilotName: '', siteLocation: '', plannedStart: '', plannedEnd: '' });
    loadData();
  };

  const transitionMission = async (missionId: number, status: string, abortReason?: string, flightHoursLogged?: number) => {
    await fetch(`${API_BASE}/fleet/missions/${missionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, abortReason, flightHoursLogged }),
    });
    loadData();
  };

  return (
    <div className="page-shell">
      <nav className="top-nav">
        <h1>Mission management</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/drones">Drones</Link>
          <Link to="/missions">Missions</Link>
        </div>
      </nav>

      <section className="card">
        <h3>Schedule mission</h3>
        <form className="form-grid" onSubmit={submit}>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Mission name" />
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="WIND_TURBINE_INSPECTION">WIND_TURBINE_INSPECTION</option>
            <option value="SOLAR_PANEL_SURVEY">SOLAR_PANEL_SURVEY</option>
            <option value="POWER_LINE_PATROL">POWER_LINE_PATROL</option>
          </select>
          <select value={form.droneId} onChange={(event) => setForm({ ...form, droneId: event.target.value })}>
            <option value="">Select drone</option>
            {drones.map((drone) => <option key={drone.id} value={drone.id}>{drone.identifier}</option>)}
          </select>
          <input value={form.pilotName} onChange={(event) => setForm({ ...form, pilotName: event.target.value })} placeholder="Pilot name" />
          <input value={form.siteLocation} onChange={(event) => setForm({ ...form, siteLocation: event.target.value })} placeholder="Site location" />
          <input type="datetime-local" value={form.plannedStart} onChange={(event) => setForm({ ...form, plannedStart: event.target.value })} />
          <input type="datetime-local" value={form.plannedEnd} onChange={(event) => setForm({ ...form, plannedEnd: event.target.value })} />
          <button type="submit">Schedule mission</button>
        </form>
      </section>

      <section className="card">
        <h3>Mission queue</h3>
        <ul className="list-stack">
          {missions.map((mission) => (
            <li key={mission.id} className="list-item">
              <div>
                <strong>{mission.name}</strong>
                <div>{mission.status} · {mission.type}</div>
              </div>
              <div className="inline-actions">
                <button type="button" onClick={() => transitionMission(mission.id, 'PRE_FLIGHT_CHECK')}>Pre-flight</button>
                <button type="button" onClick={() => transitionMission(mission.id, 'IN_PROGRESS')}>Start</button>
                <button type="button" onClick={() => transitionMission(mission.id, 'COMPLETED', undefined, 4)}>Complete</button>
                <button type="button" onClick={() => transitionMission(mission.id, 'ABORTED', 'Weather')}>Abort</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
