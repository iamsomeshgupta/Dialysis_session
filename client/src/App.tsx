import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getSchedule, createSession, updateSessionNotes } from './api.js';
import type { ScheduleItem, ScheduleResponse, SessionStatus } from '@shared/types';

const unitOptions = ['unit-1', 'unit-2'];
const statusOptions: SessionStatus[] = ['not_started', 'in_progress', 'completed'];

const emptyDraft = {
  patientId: '',
  unitId: 'unit-1',
  scheduledAt: '',
  machineId: '',
  status: 'not_started' as SessionStatus,
  preWeightKg: '',
  postWeightKg: '',
  preSystolicBp: '',
  postSystolicBp: '',
  durationMinutes: '',
  notes: ''
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function numberOrNull(value: string) {
  return value.trim() === '' ? null : Number(value);
}

function statusLabel(status: SessionStatus) {
  return status.replaceAll('_', ' ');
}

function SessionCard({
  item,
  selected,
  onSelect
}: {
  item: ScheduleItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`session-card ${selected ? 'selected' : ''}`} onClick={onSelect} type="button">
      <div className="session-card__top">
        <div>
          <div className="session-card__time">{formatTime(item.scheduledAt)}</div>
          <div className="session-card__name">{item.patient.name}</div>
        </div>
        <span className={`status-pill status-${item.status}`}>{statusLabel(item.status)}</span>
      </div>

      <div className="session-card__meta">
        <span>MRN {item.patient.medicalRecordNumber}</span>
        <span>Machine {item.machineId}</span>
        <span>Dry {item.patient.dryWeightKg.toFixed(1)} kg</span>
      </div>

      <div className="vitals-grid">
        <div>
          <span>Pre weight</span>
          <strong>{item.preWeightKg ?? '—'} kg</strong>
        </div>
        <div>
          <span>Post BP</span>
          <strong>{item.postSystolicBp ?? '—'} mmHg</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{item.durationMinutes ?? '—'} min</strong>
        </div>
      </div>

      <div className="session-card__footer">
        {item.anomalies.length > 0 ? (
          <div className="anomaly-list">
            {item.anomalies.map((anomaly) => (
              <span key={anomaly.code} className="anomaly-chip">
                {anomaly.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="muted">No anomaly flagged</span>
        )}
      </div>
    </button>
  );
}

export default function App() {
  const [unitId, setUnitId] = useState('unit-1');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [noteDraft, setNoteDraft] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getSchedule(unitId, anomaliesOnly)
      .then((data: ScheduleResponse) => {
        if (!active) {
          return;
        }

        setSchedule(data);
        setSelectedSessionId((currentSelected) => {
          if (currentSelected && data.sessions.some((session: ScheduleItem) => session.id === currentSelected)) {
            return currentSelected;
          }
          return data.sessions[0]?.id ?? null;
        });
        setDraft((currentDraft) => ({
          ...currentDraft,
          unitId,
          patientId: data.sessions[0]?.patientId ?? currentDraft.patientId
        }));
      })
      .catch((fetchError: Error) => {
        if (active) {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [unitId, anomaliesOnly]);

  const selectedSession = schedule?.sessions.find((session: ScheduleItem) => session.id === selectedSessionId) ?? null;

  useEffect(() => {
    if (selectedSession) {
      setNoteDraft(selectedSession.notes);
    }
  }, [selectedSession?.id]);

  const patientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    schedule?.sessions.forEach((session: ScheduleItem) => {
      if (!seen.has(session.patientId)) {
        seen.set(session.patientId, `${session.patient.name} (${session.patient.medicalRecordNumber})`);
      }
    });
    return Array.from(seen.entries());
  }, [schedule]);

  async function handleAddSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionMessage('');

    try {
      await createSession({
        patientId: draft.patientId,
        unitId: draft.unitId,
        scheduledAt: draft.scheduledAt,
        machineId: draft.machineId,
        status: draft.status,
        preWeightKg: numberOrNull(draft.preWeightKg),
        postWeightKg: numberOrNull(draft.postWeightKg),
        preSystolicBp: numberOrNull(draft.preSystolicBp),
        postSystolicBp: numberOrNull(draft.postSystolicBp),
        durationMinutes: numberOrNull(draft.durationMinutes),
        notes: draft.notes
      });

      setActionMessage('Session added. Refreshing schedule...');
      const refreshed = await getSchedule(unitId, anomaliesOnly);
      setSchedule(refreshed);
      setSelectedSessionId(refreshed.sessions[0]?.id ?? null);
      setDraft((currentDraft) => ({
        ...emptyDraft,
        unitId: currentDraft.unitId,
        patientId: refreshed.sessions[0]?.patientId ?? currentDraft.patientId,
        scheduledAt: currentDraft.scheduledAt
      }));
    } catch (sessionError) {
      setActionMessage(sessionError instanceof Error ? sessionError.message : 'Unable to add session.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!selectedSession) {
      return;
    }

    setSaving(true);
    setActionMessage('');

    try {
      await updateSessionNotes(selectedSession.id, noteDraft);
      const refreshed = await getSchedule(unitId, anomaliesOnly);
      setSchedule(refreshed);
      setSelectedSessionId(selectedSession.id);
      setActionMessage('Notes saved.');
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'Unable to save notes.');
    } finally {
      setSaving(false);
    }
  }

  const summary = schedule?.summary ?? { total: 0, anomalies: 0, inProgress: 0, completed: 0 };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Jano Health · Dialysis Workflow</p>
          <h1>Dialysis session intake and anomaly dashboard</h1>
          <p className="hero__lede">
            A focused nursing view for same-day treatment tracking, clinical anomaly surfacing, and fast note updates.
          </p>
        </div>

        <div className="hero__panel">
          <div className="metric-card">
            <span>Sessions</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="metric-card danger">
            <span>Flagged</span>
            <strong>{summary.anomalies}</strong>
          </div>
          <div className="metric-card">
            <span>In progress</span>
            <strong>{summary.inProgress}</strong>
          </div>
          <div className="metric-card">
            <span>Completed</span>
            <strong>{summary.completed}</strong>
          </div>
        </div>
      </section>

      <section className="controls">
        <label>
          Unit
          <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            {unitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={anomaliesOnly}
            onChange={(event) => setAnomaliesOnly(event.target.checked)}
          />
          Only show patients with anomalies
        </label>

        <button className="ghost-button" type="button" onClick={() => getSchedule(unitId, anomaliesOnly).then(setSchedule)}>
          Refresh
        </button>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {actionMessage ? <div className="alert info">{actionMessage}</div> : null}

      <section className="grid">
        <div className="board">
          <div className="board__header">
            <div>
              <h2>Today's schedule</h2>
              <p>{schedule ? `${schedule.sessions.length} visible sessions for ${schedule.unitId}` : 'Loading schedule...'}</p>
            </div>
            {loading ? <span className="loading-dot">Loading</span> : null}
          </div>

          <div className="session-list">
            {schedule?.sessions.length ? (
              schedule.sessions.map((item: ScheduleItem) => (
                <SessionCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedSessionId}
                  onSelect={() => setSelectedSessionId(item.id)}
                />
              ))
            ) : loading ? (
              <div className="empty-state">Loading dashboard data...</div>
            ) : (
              <div className="empty-state">No sessions found for this unit.</div>
            )}
          </div>
        </div>

        <aside className="side-column">
          <form className="panel" onSubmit={handleAddSession}>
            <div className="panel__header">
              <h2>Add Session</h2>
              <p>Use the current schedule patients to create a new intake record.</p>
            </div>

            <label>
              Patient
              <select
                value={draft.patientId}
                onChange={(event) => setDraft((current) => ({ ...current, patientId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select a patient
                </option>
                {patientOptions.map(([patientId, label]) => (
                  <option key={patientId} value={patientId}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="split-fields">
              <label>
                Unit
                <select
                  value={draft.unitId}
                  onChange={(event) => setDraft((current) => ({ ...current, unitId: event.target.value }))}
                >
                  {unitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Machine
                <input
                  value={draft.machineId}
                  onChange={(event) => setDraft((current) => ({ ...current, machineId: event.target.value }))}
                  placeholder="M-04"
                  required
                />
              </label>
            </div>

            <div className="split-fields">
              <label>
                Scheduled at
                <input
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={(event) => setDraft((current) => ({ ...current, scheduledAt: event.target.value }))}
                  required
                />
              </label>
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as SessionStatus }))}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="split-fields">
              <label>
                Pre weight
                <input
                  value={draft.preWeightKg}
                  onChange={(event) => setDraft((current) => ({ ...current, preWeightKg: event.target.value }))}
                  placeholder="72.4"
                  inputMode="decimal"
                />
              </label>
              <label>
                Post weight
                <input
                  value={draft.postWeightKg}
                  onChange={(event) => setDraft((current) => ({ ...current, postWeightKg: event.target.value }))}
                  placeholder="69.1"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="split-fields">
              <label>
                Pre SBP
                <input
                  value={draft.preSystolicBp}
                  onChange={(event) => setDraft((current) => ({ ...current, preSystolicBp: event.target.value }))}
                  placeholder="166"
                  inputMode="numeric"
                />
              </label>
              <label>
                Post SBP
                <input
                  value={draft.postSystolicBp}
                  onChange={(event) => setDraft((current) => ({ ...current, postSystolicBp: event.target.value }))}
                  placeholder="182"
                  inputMode="numeric"
                />
              </label>
            </div>

            <label>
              Duration
              <input
                value={draft.durationMinutes}
                onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                placeholder="240"
                inputMode="numeric"
              />
            </label>

            <label>
              Notes
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Brief nurse note..."
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add session'}
            </button>
          </form>

          <section className="panel">
            <div className="panel__header">
              <h2>Session Notes</h2>
              <p>Edit the note for the selected session.</p>
            </div>

            {selectedSession ? (
              <>
                <div className="session-summary">
                  <strong>{selectedSession.patient.name}</strong>
                  <span>{selectedSession.machineId}</span>
                  <span>{selectedSession.anomalies.length} anomaly flag(s)</span>
                </div>
                <textarea rows={6} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                <button className="primary-button" type="button" onClick={handleSaveNotes} disabled={saving}>
                  {saving ? 'Saving...' : 'Save notes'}
                </button>
              </>
            ) : (
              <div className="empty-state compact">Select a session to edit notes.</div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}