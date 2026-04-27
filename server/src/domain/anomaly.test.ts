import { describe, expect, it } from 'vitest';
import { buildAnomalies } from './anomaly.js';

describe('buildAnomalies', () => {
  it('flags weight gain, high BP, and abnormal duration', () => {
    const anomalies = buildAnomalies({
      dryWeightKg: 68,
      preWeightKg: 72,
      postSystolicBp: 188,
      durationMinutes: 300
    });

    expect(anomalies.map((entry) => entry.code)).toEqual([
      'WEIGHT_GAIN',
      'HIGH_POST_BP',
      'DURATION_OUT_OF_RANGE'
    ]);
  });

  it('returns no anomalies for values inside range', () => {
    const anomalies = buildAnomalies({
      dryWeightKg: 70,
      preWeightKg: 71.5,
      postSystolicBp: 155,
      durationMinutes: 240
    });

    expect(anomalies).toEqual([]);
  });
});