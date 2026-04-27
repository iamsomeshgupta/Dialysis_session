import type { ScheduleResponse, SessionStatus } from '@shared/types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getSchedule(unitId: string, anomaliesOnly: boolean) {
  const query = new URLSearchParams({ unitId, anomaliesOnly: String(anomaliesOnly) });
  return request<ScheduleResponse>(`/api/schedule/today?${query.toString()}`);
}

export function createSession(payload: {
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
}) {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateSessionNotes(sessionId: string, notes: string) {
  return request(`/api/sessions/${sessionId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes })
  });
}