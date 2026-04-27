# API Documentation

## GET /api/schedule/today?unitId=unit-1&anomaliesOnly=true
Returns the active schedule for a unit, with each session enriched by patient data and anomaly flags.

Response fields:
- `unitId`
- `date`
- `sessions[]`
- `summary`

## POST /api/patients
Creates a patient.

Body:
- `medicalRecordNumber`
- `name`
- `unitId`
- `dryWeightKg`
- `age`
- `sex`
- `accessType`

## POST /api/sessions
Creates a session for a patient.

Body:
- `patientId`
- `unitId`
- `scheduledAt`
- `machineId`
- `status`
- `preWeightKg`
- `postWeightKg`
- `preSystolicBp`
- `postSystolicBp`
- `durationMinutes`
- `notes`

## PATCH /api/sessions/:id/notes
Updates the session notes.

Body:
- `notes`

## GET /health
Simple health check.
