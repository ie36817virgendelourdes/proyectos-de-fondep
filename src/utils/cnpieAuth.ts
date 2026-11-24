import type {AuthRole, AuthState, TeacherAccount} from '../types/cnpie';

const memoryFallbackStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryFallbackStore.has(key) ? (memoryFallbackStore.get(key) ?? null) : null;
    }
  },
  setItem(key: string, val: string): void {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      memoryFallbackStore.set(key, val);
    }
  },
};

export const STORAGE_KEY = 'cnpie_2027_projects_v4';
export const AUTH_KEY = 'cnpie_2027_auth_v1';
export const MAX_FREE_PROJECTS = 3;
export const FREE_TRIAL_DAYS = 2;
export const FREE_TRIAL_MS = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;

export function computeLicenseCode(username: string): string {
  const clean = (username || '').trim().toUpperCase();
  if (!clean) return '';
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  const salt = 'FONDEP_CNPIE_2027_PERU';
  const full = `${clean}::${salt}`;
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch * (i + 7);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const p1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  const p2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  return `CNPIE-${p1}-${p2}`;
}

export function generateTeacherPassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DOC-${num}`;
}

export function loadAuthState(): AuthState {
  try {
    const raw = safeStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        activeUser: parsed.activeUser || null,
        activeKey: parsed.activeKey || null,
        activeRole: parsed.activeRole || 'none',
        activeDisplayName: parsed.activeDisplayName || null,
        masterKey: parsed.masterKey || 'ADMIN2027',
        trialStartedAt:
          typeof parsed.trialStartedAt === 'number' && Number.isFinite(parsed.trialStartedAt)
            ? parsed.trialStartedAt
            : null,
        registeredTeachers: Array.isArray(parsed.registeredTeachers)
          ? (parsed.registeredTeachers as TeacherAccount[])
          : [],
        generatedCredentials: Array.isArray(parsed.generatedCredentials)
          ? parsed.generatedCredentials
          : [],
      };
    }
  } catch {
    // fallback default
  }
  return {
    activeUser: null,
    activeKey: null,
    activeRole: 'none',
    activeDisplayName: null,
    masterKey: 'ADMIN2027',
    trialStartedAt: null,
    registeredTeachers: [],
    generatedCredentials: [],
  };
}

export function saveAuthState(auth: AuthState): void {
  safeStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export interface TrialStatus {
  status: 'not_started' | 'active' | 'expired';
  remainingMs: number;
  remainingLabel: string;
  expiresAt: number | null;
}

export function getTrialStatus(auth: AuthState, now = Date.now()): TrialStatus {
  if (auth.trialStartedAt === null || typeof auth.trialStartedAt !== 'number') {
    return {
      status: 'not_started',
      remainingMs: FREE_TRIAL_MS,
      remainingLabel: '2 días libres (48 horas)',
      expiresAt: null,
    };
  }
  const expiresAt = auth.trialStartedAt + FREE_TRIAL_MS;
  const remainingMs = Math.max(0, expiresAt - now);
  if (remainingMs <= 0) {
    return {
      status: 'expired',
      remainingMs: 0,
      remainingLabel: 'Periodo libre de 2 días finalizado',
      expiresAt,
    };
  }
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;
  let remainingLabel = '';
  if (days > 0) {
    remainingLabel = `${days} día${days > 1 ? 's' : ''} y ${hours}h`;
  } else if (hours > 0) {
    remainingLabel = `${hours}h ${mins}m`;
  } else {
    remainingLabel = `${mins} min`;
  }
  return {
    status: 'active',
    remainingMs,
    remainingLabel,
    expiresAt,
  };
}

export function isAdminSession(auth: AuthState): boolean {
  if (!auth.activeUser || !auth.activeKey) return false;
  const u = auth.activeUser.trim().toUpperCase();
  return (u === 'ADMIN' || u === 'ADMINISTRADOR') && auth.activeKey === auth.masterKey;
}

export function isLicensedUser(auth: AuthState): boolean {
  if (!auth.activeUser || !auth.activeKey) return false;
  if (isAdminSession(auth)) return true;

  const cleanUser = auth.activeUser.trim().toLowerCase();
  const matchedTeacher = (auth.registeredTeachers || []).find(
    (t) => t.username.trim().toLowerCase() === cleanUser
  );
  if (matchedTeacher) {
    return matchedTeacher.active && matchedTeacher.password === auth.activeKey;
  }

  const expected = computeLicenseCode(auth.activeUser);
  return auth.activeKey.trim().toUpperCase() === expected;
}

export function hasAppAccess(auth: AuthState, now = Date.now()): boolean {
  if (isLicensedUser(auth)) return true;
  return getTrialStatus(auth, now).status === 'active';
}

export function authenticateUser(
  auth: AuthState,
  username: string,
  password: string
):
  | {ok: true; role: Exclude<AuthRole, 'none'>; displayName: string; nextAuth: AuthState}
  | {ok: false; error: string} {
  const u = username.trim();
  const p = password.trim();

  if (!u || !p) {
    return {ok: false, error: 'Ingresa tu usuario y contraseña para continuar.'};
  }

  // 1. Ingreso Administrador
  if ((u.toUpperCase() === 'ADMIN' || u.toUpperCase() === 'ADMINISTRADOR') && p === auth.masterKey) {
    return {
      ok: true,
      role: 'admin',
      displayName: 'Administrador',
      nextAuth: {
        ...auth,
        activeUser: 'ADMIN',
        activeKey: auth.masterKey,
        activeRole: 'admin',
        activeDisplayName: 'Administrador',
      },
    };
  }

  // 2. Ingreso Docentes registrados por el Administrador
  const teacher = (auth.registeredTeachers || []).find(
    (t) => t.username.trim().toLowerCase() === u.toLowerCase()
  );
  if (teacher) {
    if (!teacher.active) {
      return {
        ok: false,
        error: 'Este usuario docente ha sido desactivado. Consulta con el Administrador.',
      };
    }
    if (teacher.password === p) {
      return {
        ok: true,
        role: 'teacher',
        displayName: teacher.fullName || teacher.username,
        nextAuth: {
          ...auth,
          activeUser: teacher.username,
          activeKey: teacher.password,
          activeRole: 'teacher',
          activeDisplayName: teacher.fullName || teacher.username,
        },
      };
    }
    return {ok: false, error: 'Contraseña incorrecta para este docente.'};
  }

  // 3. Compatibilidad con claves determinísticas generadas anteriormente
  if (p.toUpperCase() === computeLicenseCode(u)) {
    return {
      ok: true,
      role: 'teacher',
      displayName: u,
      nextAuth: {
        ...auth,
        activeUser: u,
        activeKey: p.toUpperCase(),
        activeRole: 'teacher',
        activeDisplayName: u,
      },
    };
  }

  return {
    ok: false,
    error: 'Usuario o contraseña incorrectos. Solicita tu registro al Administrador.',
  };
}
