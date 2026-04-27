import { clinicalAssumptions, type Anomaly } from '../../../shared/index.js';

type ClinicalSnapshot = {
  dryWeightKg: number;
  preWeightKg?: number | null;
  postSystolicBp?: number | null;
  durationMinutes?: number | null;
};

export function buildAnomalies(snapshot: ClinicalSnapshot): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (typeof snapshot.preWeightKg === 'number') {
    const weightGain = snapshot.preWeightKg - snapshot.dryWeightKg;
    const percentGain = (weightGain / snapshot.dryWeightKg) * 100;

    if (
      weightGain > clinicalAssumptions.interdialyticWeightGainKg ||
      percentGain > clinicalAssumptions.interdialyticWeightGainPercent
    ) {
      anomalies.push({
        code: 'WEIGHT_GAIN',
        label: 'Excess interdialytic weight gain',
        detail: `${weightGain.toFixed(1)} kg (${percentGain.toFixed(1)}%) above dry weight`
      });
    }
  }

  if (
    typeof snapshot.postSystolicBp === 'number' &&
    snapshot.postSystolicBp >= clinicalAssumptions.postDialysisSystolicBpMmHg
  ) {
    anomalies.push({
      code: 'HIGH_POST_BP',
      label: 'High post-dialysis systolic BP',
      detail: `${snapshot.postSystolicBp} mmHg`
    });
  }

  if (typeof snapshot.durationMinutes === 'number') {
    const lowerBound = clinicalAssumptions.targetDurationMinutes - clinicalAssumptions.durationToleranceMinutes;
    const upperBound = clinicalAssumptions.targetDurationMinutes + clinicalAssumptions.durationToleranceMinutes;

    if (snapshot.durationMinutes < lowerBound || snapshot.durationMinutes > upperBound) {
      anomalies.push({
        code: 'DURATION_OUT_OF_RANGE',
        label: 'Abnormal session duration',
        detail: `${snapshot.durationMinutes} min vs target ${clinicalAssumptions.targetDurationMinutes} ± ${clinicalAssumptions.durationToleranceMinutes}`
      });
    }
  }

  return anomalies;
}