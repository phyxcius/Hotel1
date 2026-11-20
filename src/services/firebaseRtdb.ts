import type { AgencyGroup, PMSState, Purchase, Stay } from '../types/pms';

export const DEFAULT_FIREBASE_RTDB_URL = 'https://hotel1-a87e6-default-rtdb.firebaseio.com';
const DB_NODE = 'hotel_pms/v1';

interface FirebaseEnvelope {
  state: PMSState;
  updatedAt: string;
  updatedByClientId: string;
}

export const CLIENT_SESSION_ID = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function sanitizeRtdbUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || DEFAULT_FIREBASE_RTDB_URL).trim();
  return trimmed.replace(/\/+$/, '');
}

export function normalizeArray<T>(val: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === 'object') {
    return Object.values(val as Record<string, T>);
  }
  return fallback;
}

/**
 * Firebase Realtime Database omits empty arrays when storing JSON.
 * Reconstruct missing array fields safely against INITIAL_PMS_STATE defaults.
 */
export function hydrateStateFromSnapshot(raw: unknown, defaults: PMSState): PMSState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = ('state' in (raw as Record<string, unknown>)
    ? (raw as FirebaseEnvelope).state
    : raw) as Partial<PMSState> | undefined;

  if (!candidate || typeof candidate !== 'object' || !candidate.config) {
    return null;
  }

  const stays = normalizeArray<Stay>(candidate.stays, []).map((s) => ({
    ...s,
    invitados: normalizeArray(s.invitados, []),
    consumptions: normalizeArray(s.consumptions, []),
    renewals: normalizeArray(s.renewals, []),
    payments: normalizeArray(s.payments, []),
  }));

  const roomTypes = normalizeArray(candidate.roomTypes, defaults.roomTypes).map((rt) => ({
    ...rt,
    serviciosIncluidos: normalizeArray(rt.serviciosIncluidos, []),
  }));

  const purchases = normalizeArray<Purchase>(candidate.purchases, []).map((p) => ({
    ...p,
    items: normalizeArray(p.items, []),
  }));

  const users = normalizeArray(candidate.users, defaults.users).map((u) => ({
    ...u,
    accesos: normalizeArray(u.accesos, []),
  }));

  return {
    ...defaults,
    ...candidate,
    config: {
      ...defaults.config,
      ...candidate.config,
      logo: candidate.config.logo?.startsWith('/assets/aistudio/')
        ? `.${candidate.config.logo}`
        : candidate.config.logo || defaults.config.logo,
      firebaseRtdbUrl: candidate.config.firebaseRtdbUrl || DEFAULT_FIREBASE_RTDB_URL,
      coloresEstado: {
        ...defaults.config.coloresEstado,
        ...(candidate.config.coloresEstado || {}),
      },
      paymentMethods: normalizeArray(candidate.config.paymentMethods, defaults.config.paymentMethods),
      shifts: normalizeArray(candidate.config.shifts, defaults.config.shifts),
      sunatCodesSeleccionados: normalizeArray(
        candidate.config.sunatCodesSeleccionados,
        defaults.config.sunatCodesSeleccionados
      ),
      theme: {
        ...defaults.config.theme,
        ...(candidate.config.theme || {}),
      },
      reservaWebDesign: {
        ...defaults.config.reservaWebDesign,
        ...(candidate.config.reservaWebDesign || {}),
      },
    },
    roomTypes,
    rooms: normalizeArray(candidate.rooms, defaults.rooms),
    guests: normalizeArray(candidate.guests, []),
    agencies: normalizeArray(candidate.agencies, []),
    agencyGroups: normalizeArray<AgencyGroup>(candidate.agencyGroups, []),
    personasNoGratas: normalizeArray(candidate.personasNoGratas, []),
    stays,
    reservations: normalizeArray(candidate.reservations, []),
    cleaningLogs: normalizeArray(candidate.cleaningLogs, []),
    maintenanceRecords: normalizeArray(candidate.maintenanceRecords, []),
    categories: normalizeArray(candidate.categories, defaults.categories),
    products: normalizeArray(candidate.products, []),
    purchases,
    stockMovements: normalizeArray(candidate.stockMovements, []),
    sales: normalizeArray(candidate.sales, []),
    cashCloses: normalizeArray(candidate.cashCloses, []),
    expenses: normalizeArray(candidate.expenses, []),
    bankDeposits: normalizeArray(candidate.bankDeposits, []),
    positions: normalizeArray(candidate.positions, defaults.positions),
    employees: normalizeArray(candidate.employees, []),
    attendanceLogs: normalizeArray(candidate.attendanceLogs, []),
    users,
    authCodes: normalizeArray(candidate.authCodes, defaults.authCodes),
    supportTickets: normalizeArray(candidate.supportTickets, []),
  };
}

export async function fetchFirebaseState(
  rtdbUrl: string,
  defaults: PMSState
): Promise<{ exists: boolean; state: PMSState | null; updatedAt?: string }> {
  const base = sanitizeRtdbUrl(rtdbUrl);
  const res = await fetch(`${base}/${DB_NODE}.json`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: No se pudo leer Firebase RTDB`);
  }

  const data = await res.json();
  if (data === null) {
    return { exists: false, state: null };
  }

  const envelope = data as Partial<FirebaseEnvelope>;
  const hydrated = hydrateStateFromSnapshot(data, defaults);
  return {
    exists: Boolean(hydrated),
    state: hydrated,
    updatedAt: typeof envelope.updatedAt === 'string' ? envelope.updatedAt : undefined,
  };
}

export async function saveFirebaseState(
  rtdbUrl: string,
  state: PMSState
): Promise<{ updatedAt: string }> {
  const base = sanitizeRtdbUrl(rtdbUrl);
  const updatedAt = new Date().toISOString();
  const payload: FirebaseEnvelope = {
    state,
    updatedAt,
    updatedByClientId: CLIENT_SESSION_ID,
  };

  const res = await fetch(`${base}/${DB_NODE}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errText || 'Error guardando en Firebase RTDB'}`);
  }

  return { updatedAt };
}

export async function testFirebaseConnection(rtdbUrl: string): Promise<{ ok: boolean; message: string }> {
  const base = sanitizeRtdbUrl(rtdbUrl);
  const res = await fetch(`${base}/.json?shallow=true`, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al conectar con ${base}`);
  }
  return { ok: true, message: `Conectado correctamente a ${base}` };
}

export function subscribeFirebaseState(
  rtdbUrl: string,
  defaults: PMSState,
  onRemoteState: (remoteState: PMSState, updatedAt: string) => void,
  onStreamError?: () => void
): () => void {
  if (typeof EventSource === 'undefined') {
    return () => {};
  }

  const base = sanitizeRtdbUrl(rtdbUrl);
  const source = new EventSource(`${base}/${DB_NODE}.json`);

  const handleEvent = (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data) as { path?: string; data?: unknown };
      if (!parsed || parsed.data == null) return;
      if (parsed.path === '/') {
        const env = parsed.data as Partial<FirebaseEnvelope>;
        if (env.updatedByClientId === CLIENT_SESSION_ID) return;
        const hydrated = hydrateStateFromSnapshot(parsed.data, defaults);
        if (hydrated) {
          onRemoteState(hydrated, env.updatedAt || new Date().toISOString());
        }
      }
    } catch {
      // ignore malformed stream events
    }
  };

  source.addEventListener('put', handleEvent as EventListener);
  source.onerror = () => {
    onStreamError?.();
  };

  return () => {
    source.close();
  };
}
