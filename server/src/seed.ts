import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from './db.js';
import { PatientModel, SessionModel } from './models.js';
import { buildAnomalies } from './domain/anomaly.js';

async function seed() {
  await connectToDatabase();

  await SessionModel.deleteMany({});
  await PatientModel.deleteMany({});

  const patients = await PatientModel.insertMany([
    {
      medicalRecordNumber: 'MRN-1001',
      name: 'Ava Brooks',
      unitId: 'unit-1',
      dryWeightKg: 68,
      age: 61,
      sex: 'female',
      accessType: 'fistula'
    },
    {
      medicalRecordNumber: 'MRN-1002',
      name: 'Daniel Okafor',
      unitId: 'unit-1',
      dryWeightKg: 74,
      age: 55,
      sex: 'male',
      accessType: 'catheter'
    },
    {
      medicalRecordNumber: 'MRN-1003',
      name: 'Leila Hassan',
      unitId: 'unit-1',
      dryWeightKg: 59,
      age: 47,
      sex: 'female',
      accessType: 'graft'
    },
    {
      medicalRecordNumber: 'MRN-2001',
      name: 'Noah Chen',
      unitId: 'unit-2',
      dryWeightKg: 82,
      age: 70,
      sex: 'male',
      accessType: 'fistula'
    }
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const sessionSeeds = [
    {
      patientId: String(patients[0]._id),
      unitId: 'unit-1',
      scheduledAt: `${today}T07:30:00.000Z`,
      machineId: 'M-01',
      status: 'completed',
      preWeightKg: 70.2,
      postWeightKg: 68.9,
      preSystolicBp: 168,
      postSystolicBp: 156,
      durationMinutes: 232,
      notes: 'Tolerated treatment well.'
    },
    {
      patientId: String(patients[1]._id),
      unitId: 'unit-1',
      scheduledAt: `${today}T09:00:00.000Z`,
      machineId: 'M-02',
      status: 'in_progress',
      preWeightKg: 78.6,
      postWeightKg: null,
      preSystolicBp: 176,
      postSystolicBp: 182,
      durationMinutes: 272,
      notes: 'Watch blood pressure closely.'
    },
    {
      patientId: String(patients[2]._id),
      unitId: 'unit-1',
      scheduledAt: `${today}T10:30:00.000Z`,
      machineId: 'M-03',
      status: 'not_started',
      preWeightKg: null,
      postWeightKg: null,
      preSystolicBp: null,
      postSystolicBp: null,
      durationMinutes: 240,
      notes: 'Awaiting transport.'
    }
  ];

  const sessions = sessionSeeds.map((seedItem) => ({
    ...seedItem,
    anomalies: buildAnomalies({
      dryWeightKg: patients.find((patient) => String(patient._id) === seedItem.patientId)?.dryWeightKg ?? 0,
      preWeightKg: seedItem.preWeightKg,
      postSystolicBp: seedItem.postSystolicBp,
      durationMinutes: seedItem.durationMinutes
    })
  }));

  await SessionModel.insertMany(sessions);

  console.log('Seed complete.');
  await disconnectFromDatabase();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectFromDatabase();
  process.exit(1);
});