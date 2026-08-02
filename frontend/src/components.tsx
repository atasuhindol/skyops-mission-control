import { useEffect, useState } from 'react';
import { fetchFleetHealth, fetchDrones } from '../api';
import { FleetHealth, Drone } from '../types';

export function FleetOverview() {
  const [health, setHealth] = useState<FleetHealth | null>(null);

  useEffect(() => {
    fetchFleetHealth()
      .then((data) => setHealth(data))
      .catch((err) => console.error('Failed to fetch fleet health:', err));
  }, []);

  if (!health) {
    return <div style={{ padding: '20px' }}>Loading fleet data...</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
      }}
    >
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Drones</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f766e' }}>{health.totalDrones}</div>
      </div>

      {Object.entries(health.breakdownByStatus).map(([status, count]) => (
        <div key={status} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{status}</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb' }}>{count}</div>
        </div>
      ))}

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Avg Flight Hours</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>{health.averageFlightHoursPerDrone.toFixed(1)}</div>
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Missions Next 24h</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#ea580c' }}>{health.missionsInNext24Hours}</div>
      </div>
    </div>
  );
}

export function MaintenanceAlerts() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrones(1, 100)
      .then((data) => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const maintenanceDue = (data.items || []).filter((drone: Drone) => {
          if (drone.totalFlightHours >= 50) return true;
          if (drone.nextMaintenanceDueDate) {
            const dueDate = new Date(drone.nextMaintenanceDueDate);
            return dueDate <= sevenDaysFromNow;
          }
          return false;
        });

        setDrones(maintenanceDue);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch drones:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading maintenance data...</div>;
  }

  const now = new Date();
  const overdue = drones.filter((drone) => {
    if (drone.nextMaintenanceDueDate) {
      return new Date(drone.nextMaintenanceDueDate) < now;
    }
    return false;
  });

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginTop: 0 }}>Maintenance Alerts</h3>

      {drones.length === 0 ? (
        <p style={{ color: '#666' }}>No maintenance alerts</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Drone</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Flight Hours</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Next Maintenance</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {drones.map((drone) => {
              const isOverdue = overdue.some((d) => d.id === drone.id);
              const alertColor = isOverdue ? '#dc2626' : '#ea580c';
              return (
                <tr key={drone.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 0', fontWeight: '500' }}>{drone.identifier}</td>
                  <td style={{ padding: '12px 0' }}>{drone.totalFlightHours}h</td>
                  <td style={{ padding: '12px 0' }}>
                    {drone.nextMaintenanceDueDate ? new Date(drone.nextMaintenanceDueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: alertColor, color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {isOverdue ? 'OVERDUE' : 'DUE SOON'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function MissionViewWidget() {
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    fetchFleetHealth()
      .then(() => {
        // Fetch missions after getting health - this is a simple fetch for upcoming missions
        return fetch('http://localhost:3000/api/fleet/missions?limit=6')
          .then((res) => res.json())
          .then((data) => {
            setMissions(data.items || []);
          });
      })
      .catch((err) => console.error('Failed to fetch missions:', err));
  }, []);

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginTop: 0 }}>Upcoming & Recent Missions</h3>

      {missions.length === 0 ? (
        <p style={{ color: '#666' }}>No missions scheduled</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Mission</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600' }}>Scheduled Start</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((mission) => (
              <tr key={mission.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 0', fontWeight: '500' }}>{mission.name}</td>
                <td style={{ padding: '12px 0' }}>{mission.type}</td>
                <td style={{ padding: '12px 0' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    {mission.status}
                  </span>
                </td>
                <td style={{ padding: '12px 0' }}>{new Date(mission.scheduledStart).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function DroneDetailComponent({ droneId }: { droneId: string }) {
  const [drone, setDrone] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:3000/api/fleet/drones/${droneId}`)
      .then((res) => res.json())
      .then((data) => setDrone(data))
      .catch((err) => console.error('Failed to fetch drone:', err));
  }, [droneId]);

  if (!drone) {
    return <div style={{ padding: '20px' }}>Loading drone details...</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Drone Information</h3>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600', width: '40%' }}>Identifier:</td>
              <td style={{ padding: '8px 0' }}>{drone.identifier}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Serial Number:</td>
              <td style={{ padding: '8px 0' }}>{drone.serialNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Model:</td>
              <td style={{ padding: '8px 0' }}>{drone.model}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Status:</td>
              <td style={{ padding: '8px 0' }}>{drone.status}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Flight Hours:</td>
              <td style={{ padding: '8px 0' }}>{drone.totalFlightHours}h</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Last Maintenance:</td>
              <td style={{ padding: '8px 0' }}>{drone.lastMaintenanceDate ? new Date(drone.lastMaintenanceDate).toLocaleDateString() : '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: '600' }}>Next Maintenance Due:</td>
              <td style={{ padding: '8px 0' }}>{drone.nextMaintenanceDueDate ? new Date(drone.nextMaintenanceDueDate).toLocaleDateString() : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Mission History</h3>
        {drone.missions && drone.missions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {drone.missions.map((mission: any) => (
                <tr key={mission.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0' }}>{mission.name}</td>
                  <td style={{ padding: '8px 0' }}>{mission.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666' }}>No missions</p>
        )}
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Maintenance History</h3>
        {drone.maintenanceLogs && drone.maintenanceLogs.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {drone.maintenanceLogs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0' }}>{log.type}</td>
                  <td style={{ padding: '8px 0' }}>{new Date(log.datePerformed).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666' }}>No maintenance records</p>
        )}
      </div>
    </div>
  );
}
