import type { Anomaly } from './clinicalAssumptions.js';

export type SessionStatus = 'not_started' | 'in_progress' | 'completed';

export type Patient = {
  id: string;
  medicalRecordNumber: string;
  name: string;
  unitId: string;
  dryWeightKg: number;
  age: number;
  sex: 'female' | 'male' | 'other';
  accessType: 'fistula' | 'graft' | 'catheter';
};

export type Session = {
  id: string;
  patientId: string;
  unitId: string;
  scheduledAt: string;
  machineId: string;
  status: SessionStatus;
  preWeightKg?: number | null;
  postWeightKg?: number | null;
  preSystolicBp?: number | null;
  postSystolicBp?: number | null;
  durationMinutes?: number | null;
  notes: string;
  anomalies: Anomaly[];
  createdAt: string;
  updatedAt: string;
};

export type ScheduleItem = Session & {
  patient: Patient;
};

export type ScheduleResponse = {
  unitId: string;
  date: string;
  summary: {
    total: number;
    anomalies: number;
    inProgress: number;
    completed: number;
  };
  sessions: ScheduleItem[];
};
