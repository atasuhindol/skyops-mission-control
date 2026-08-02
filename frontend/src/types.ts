export type DroneModel = 'PHANTOM_4' | 'MATRICE_300' | 'MAVIC_3_ENTERPRISE';
export type DroneStatus = 'AVAILABLE' | 'IN_MISSION' | 'MAINTENANCE' | 'RETIRED';
export type MissionType = 'WIND_TURBINE_INSPECTION' | 'SOLAR_PANEL_SURVEY' | 'POWER_LINE_PATROL';
export type MissionStatus = 'PLANNED' | 'PRE_FLIGHT_CHECK' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';

export interface Drone {
  id: string;
  identifier: string;
  serialNumber: string;
  model: DroneModel;
  status: DroneStatus;
  totalFlightHours: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDueDate: string | null;
  registrationTimestamp: string;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  status: MissionStatus;
  pilotName: string;
  siteLocation: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  flightHoursLogged: number;
  abortReason: string | null;
  drone: Drone | null;
}

export interface MaintenanceLog {
  id: string;
  type: string;
  technicianName: string;
  notes: string | null;
  datePerformed: string;
  flightHoursAtMaintenance: number;
  drone: Drone;
}

export interface FleetHealth {
  totalDrones: number;
  breakdownByStatus: Record<string, number>;
  overdueMaintenance: Array<{
    id: string;
    identifier: string;
    serialNumber: string;
    nextMaintenanceDueDate: string | null;
  }>;
  missionsInNext24Hours: number;
  averageFlightHoursPerDrone: number;
}
