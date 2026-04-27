import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { PatientModel, SessionModel } from './models.js';
import { buildAnomalies } from './domain/anomaly.js';
import type { Patient, ScheduleItem, ScheduleResponse, SessionStatus } from '../../shared/types.js';

type StoredPatient = Omit<Patient, 'id'> & {
  _id: unknown;
};

type SessionLean = {
  _id: unknown;
  patientId: string;
  unitId: string;
  scheduledAt: string;
  machineId: string;
  status: SessionStatus;
  preWeightKg: number | null;
  postWeightKg: number | null;
  preSystolicBp: number | null;
  postSystolicBp: number | null;
  durationMinutes: number | null;
  notes: string;
  anomalies: ScheduleItem['anomalies'];
  createdAt: Date;
  updatedAt: Date;
};

function toDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function toPatientDto(patient: StoredPatient): Patient {
  return {
    id: String(patient._id),
    medicalRecordNumber: patient.medicalRecordNumber,
    name: patient.name,
    unitId: patient.unitId,
    dryWeightKg: patient.dryWeightKg,
    age: patient.age,
    sex: patient.sex,
    accessType: patient.accessType
  };
}

function toScheduleItem(session: SessionLean, patient: StoredPatient): ScheduleItem {
  return {
    id: String(session._id),
    patientId: session.patientId,
    unitId: session.unitId,
    scheduledAt: session.scheduledAt,
    machineId: session.machineId,
    status: session.status,
    preWeightKg: session.preWeightKg,
    postWeightKg: session.postWeightKg,
    preSystolicBp: session.preSystolicBp,
    postSystolicBp: session.postSystolicBp,
    durationMinutes: session.durationMinutes,
    notes: session.notes,
    anomalies: session.anomalies,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    patient: toPatientDto(patient)
  };
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request: Request, response: Response) => {
    response.json({ ok: true });
  });

  app.get('/api/schedule/today', async (request: Request, response: Response) => {
    const unitId = typeof request.query.unitId === 'string' ? request.query.unitId : 'unit-1';
    const anomaliesOnly = request.query.anomaliesOnly === 'true';
    const date = toDateKey();

    const patients = (await PatientModel.find({ unitId }).sort({ name: 1 }).lean()) as unknown as StoredPatient[];
    const sessions = (await SessionModel.find({ unitId }).sort({ scheduledAt: 1 }).lean()) as unknown as SessionLean[];

    const patientLookup = new Map(patients.map((patient) => [String(patient._id), patient]));
    const scheduleItems = sessions
      .map((session) => {
        const patient = patientLookup.get(session.patientId);
        return patient ? toScheduleItem(session, patient) : null;
      })
      .filter((item): item is ScheduleItem => item !== null);

    const filteredSessions = anomaliesOnly
      ? scheduleItems.filter((item) => item.anomalies.length > 0)
      : scheduleItems;

    const summary = scheduleItems.reduce<ScheduleResponse['summary']>(
      (accumulator, item) => ({
        total: accumulator.total + 1,
        anomalies: accumulator.anomalies + (item.anomalies.length > 0 ? 1 : 0),
        inProgress: accumulator.inProgress + (item.status === 'in_progress' ? 1 : 0),
        completed: accumulator.completed + (item.status === 'completed' ? 1 : 0)
      }),
      { total: 0, anomalies: 0, inProgress: 0, completed: 0 }
    );

    const payload: ScheduleResponse = {
      unitId,
      date,
      summary,
      sessions: filteredSessions
    };

    response.json(payload);
  });

  app.post('/api/patients', async (request: Request, response: Response) => {
    const body = request.body as {
      medicalRecordNumber?: string;
      name?: string;
      unitId?: string;
      dryWeightKg?: number;
      age?: number;
      sex?: 'female' | 'male' | 'other';
      accessType?: 'fistula' | 'graft' | 'catheter';
    };

    if (!body.medicalRecordNumber || !body.name || !body.unitId || typeof body.dryWeightKg !== 'number') {
      response.status(400).json({ message: 'medicalRecordNumber, name, unitId, and dryWeightKg are required.' });
      return;
    }

    const patient = await PatientModel.create({
      medicalRecordNumber: body.medicalRecordNumber,
      name: body.name,
      unitId: body.unitId,
      dryWeightKg: body.dryWeightKg,
      age: body.age ?? 0,
      sex: body.sex ?? 'other',
      accessType: body.accessType ?? 'fistula'
    });

    response.status(201).json({
      id: String(patient._id),
      medicalRecordNumber: patient.medicalRecordNumber,
      name: patient.name,
      unitId: patient.unitId,
      dryWeightKg: patient.dryWeightKg,
      age: patient.age,
      sex: patient.sex,
      accessType: patient.accessType
    });
  });

  app.post('/api/sessions', async (request: Request, response: Response) => {
    const body = request.body as {
      patientId?: string;
      unitId?: string;
      scheduledAt?: string;
      machineId?: string;
      status?: SessionStatus;
      preWeightKg?: number | null;
      postWeightKg?: number | null;
      preSystolicBp?: number | null;
      postSystolicBp?: number | null;
      durationMinutes?: number | null;
      notes?: string;
    };

    if (!body.patientId || !body.unitId || !body.scheduledAt || !body.machineId) {
      response.status(400).json({ message: 'patientId, unitId, scheduledAt, and machineId are required.' });
      return;
    }

    const patient = (await PatientModel.findById(body.patientId).lean()) as unknown as StoredPatient | null;
    if (!patient) {
      response.status(404).json({ message: 'Patient not found.' });
      return;
    }

    const anomalies = buildAnomalies({
      dryWeightKg: patient.dryWeightKg,
      preWeightKg: body.preWeightKg,
      postSystolicBp: body.postSystolicBp,
      durationMinutes: body.durationMinutes
    });

    const session = await SessionModel.create({
      patientId: body.patientId,
      unitId: body.unitId,
      scheduledAt: body.scheduledAt,
      machineId: body.machineId,
      status: body.status ?? 'not_started',
      preWeightKg: body.preWeightKg ?? null,
      postWeightKg: body.postWeightKg ?? null,
      preSystolicBp: body.preSystolicBp ?? null,
      postSystolicBp: body.postSystolicBp ?? null,
      durationMinutes: body.durationMinutes ?? null,
      notes: body.notes ?? '',
      anomalies
    });

    response.status(201).json(session);
  });

  app.patch('/api/sessions/:id/notes', async (request: Request, response: Response) => {
    const body = request.body as { notes?: string };
    const notes = body.notes ?? '';

    const session = await SessionModel.findByIdAndUpdate(request.params.id, { notes }, { new: true });

    if (!session) {
      response.status(404).json({ message: 'Session not found.' });
      return;
    }

    response.json(session);
  });

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ message: 'Route not found.' });
  });

  return app;
}
