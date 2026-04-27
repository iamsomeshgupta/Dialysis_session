export const clinicalAssumptions = {
  interdialyticWeightGainKg: 3,
  interdialyticWeightGainPercent: 5,
  postDialysisSystolicBpMmHg: 180,
  targetDurationMinutes: 240,
  durationToleranceMinutes: 30
} as const;

export type AnomalyCode =
  | 'WEIGHT_GAIN'
  | 'HIGH_POST_BP'
  | 'DURATION_OUT_OF_RANGE';

export type Anomaly = {
  code: AnomalyCode;
  label: string;
  detail: string;
};
