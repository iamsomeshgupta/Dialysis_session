import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const patientSchema = new Schema(
  {
    medicalRecordNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    unitId: { type: String, required: true, index: true },
    dryWeightKg: { type: Number, required: true },
    age: { type: Number, required: true },
    sex: { type: String, required: true, enum: ['female', 'male', 'other'] },
    accessType: { type: String, required: true, enum: ['fistula', 'graft', 'catheter'] }
  },
  {
    timestamps: true
  }
);

const sessionSchema = new Schema(
  {
    patientId: { type: String, required: true, index: true },
    unitId: { type: String, required: true, index: true },
    scheduledAt: { type: String, required: true, index: true },
    machineId: { type: String, required: true },
    status: { type: String, required: true, enum: ['not_started', 'in_progress', 'completed'], index: true },
    preWeightKg: { type: Number, default: null },
    postWeightKg: { type: Number, default: null },
    preSystolicBp: { type: Number, default: null },
    postSystolicBp: { type: Number, default: null },
    durationMinutes: { type: Number, default: null },
    notes: { type: String, default: '' },
    anomalies: { type: [Schema.Types.Mixed], default: [] }
  },
  {
    timestamps: true
  }
);

export type PatientRecord = InferSchemaType<typeof patientSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type SessionRecord = InferSchemaType<typeof sessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PatientModel = mongoose.models.Patient ?? mongoose.model('Patient', patientSchema);
export const SessionModel = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);