/**
 * API layer — now wired to the real FastAPI backend.
 *
 * Set EXPO_PUBLIC_API_BASE to point at your API (defaults to local dev).
 *
 * Wired to real endpoints:
 *   login/register        -> POST /login, POST /users/
 *   getProfile            -> GET /me
 *   analyzeRecording      -> POST /analyze (multipart upload)
 *   listAnalyses          -> GET /practice/sessions (+ detail fetch)
 *
 * Still mock (no backend equivalent yet — song catalog & social feed are
 * planned): listSongs, getSong, listPerformances, toggleLike.
 *
 * Every real call falls back to mock data if the API is unreachable, so the
 * UI (and Playwright tests) keep working offline.
 */
import {
  songs,
  performances as mockPerformances,
  analysisResults,
  currentUser,
  getSongById,
  type Song,
  type Performance,
  type AnalysisResult,
  type UserProfile,
  type Instrument,
} from './mockData';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Token storage.
// Uses expo-secure-store (encrypted keychain) on native when installed;
// falls back to in-memory only. NOTE: never persist JWTs in AsyncStorage or
// localStorage — both are readable by any JS running in the app context.
// ---------------------------------------------------------------------------

let memoryToken: string | null = null;
let secureStore: any = null;
try {
  // Optional dependency: `npx expo install expo-secure-store`
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  secureStore = require('expo-secure-store');
} catch {
  secureStore = null;
}

const TOKEN_KEY = 'mpc_access_token';

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (secureStore?.setItemAsync) {
    try {
      if (token) await secureStore.setItemAsync(TOKEN_KEY, token);
      else await secureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* keychain unavailable (e.g. web) — memory only */
    }
  }
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  if (secureStore?.getItemAsync) {
    try {
      memoryToken = await secureStore.getItemAsync(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
  return memoryToken;
}

export async function logout(): Promise<void> {
  await setToken(null);
}

// ---------------------------------------------------------------------------
// Fetch helper — attaches the Bearer token, clears it on 401.
// ---------------------------------------------------------------------------

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) await setToken(null); // token expired/revoked
  return res;
}

async function apiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth — real backend, mock fallback when API is unreachable.
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<{ token: string }> {
  if (!email || !password) throw new Error('Invalid credentials');
  if (await apiAvailable()) {
    const body = new URLSearchParams({ username: email, password });
    const res = await request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (res.status === 429) throw new Error('Too many attempts — try again in a minute.');
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    await setToken(data.token);
    return { token: data.token };
  }
  await delay(400); // offline demo mode
  return { token: 'mock-jwt-token' };
}

export async function register(email: string, password: string): Promise<{ token: string }> {
  if (!email || !password) throw new Error('Missing fields');
  if (await apiAvailable()) {
    const res = await request('/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Could not create account');
    }
    return login(email, password); // auto-login after registration
  }
  await delay(500);
  return { token: 'mock-jwt-token' };
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (await apiAvailable()) {
    await request('/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return; // always 202 — never reveals whether the account exists
  }
  await delay(400);
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  if (await apiAvailable()) {
    const res = await request('/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Reset link is invalid or expired.');
    }
    return;
  }
  await delay(400);
}

export async function getProfile(): Promise<UserProfile> {
  if (await apiAvailable()) {
    const res = await request('/me');
    if (res.ok) {
      const me = await res.json();
      // Backend only stores id/email today — merge onto the richer mock
      // profile shape until profiles ship server-side.
      return { ...currentUser, id: String(me.id), handle: `@${me.email.split('@')[0]}` };
    }
  }
  await delay(200);
  return currentUser;
}

// ---------------------------------------------------------------------------
// Analysis — real pipeline via POST /analyze.
// ---------------------------------------------------------------------------

interface BackendSession {
  session_id: string;
  created_at: string;
  instrument: string;
  exercise_name?: string | null;
  duration_sec: number;
  scores: {
    timing_consistency: number | null;
    tempo_stability: number | null;
    pitch_stability: number | null;
    dynamics_control: number | null;
    overall: number;
  };
  feedback_items?: { message: string }[];
  features?: {
    onsets?: number[];
    pitch_curve?: (number | null)[];
    pitch_times?: number[];
  };
}

function toAnalysisResult(s: BackendSession, fileName: string): AnalysisResult {
  const pitchSeries: { t: number; cents: number }[] = [];
  const curve = s.features?.pitch_curve ?? [];
  const times = s.features?.pitch_times ?? [];
  const voiced = curve.filter((v): v is number => v != null && v > 0);
  if (voiced.length) {
    const median = [...voiced].sort((a, b) => a - b)[Math.floor(voiced.length / 2)];
    curve.forEach((v, i) => {
      if (v != null && v > 0 && times[i] != null) {
        pitchSeries.push({ t: times[i], cents: +(1200 * Math.log2(v / median)).toFixed(1) });
      }
    });
  }

  const onsets = s.features?.onsets ?? [];
  const onsetSeries: { t: number; deviationMs: number }[] = [];
  if (onsets.length > 2) {
    const intervals = onsets.slice(1).map((t, i) => t - onsets[i]);
    const med = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    intervals.forEach((iv, i) => {
      onsetSeries.push({ t: onsets[i + 1], deviationMs: Math.round((iv - med) * 1000) });
    });
  }

  return {
    id: s.session_id,
    fileName,
    instrument: (s.instrument as Instrument) ?? 'Vocals',
    createdAt: s.created_at,
    durationSec: Math.round(s.duration_sec),
    scores: {
      pitchAccuracy: Math.round(s.scores.pitch_stability ?? 0),
      timingConsistency: Math.round(s.scores.timing_consistency ?? 0),
      vocalStability: Math.round(s.scores.dynamics_control ?? 0),
      overall: Math.round(s.scores.overall),
    },
    feedback: (s.feedback_items ?? []).map((f) => f.message),
    pitchSeries,
    onsetSeries,
  };
}

/**
 * Uploads a recording to POST /analyze. Pass `file` (from expo-document-picker
 * / expo-av recording: { uri, name, mimeType } or a web File/Blob) to run the
 * real pipeline; without a file it falls back to a simulated result so the
 * screen stays demoable.
 */
export async function analyzeRecording(input: {
  fileName: string;
  instrument: AnalysisResult['instrument'];
  songId?: string;
  file?: { uri: string; name?: string; mimeType?: string } | Blob;
}): Promise<AnalysisResult> {
  if (input.file && (await apiAvailable())) {
    const form = new FormData();
    if (input.file instanceof Blob) {
      form.append('file', input.file, input.fileName);
    } else {
      // React Native FormData file object
      form.append('file', {
        uri: input.file.uri,
        name: input.file.name ?? input.fileName,
        type: input.file.mimeType ?? 'audio/wav',
      } as any);
    }
    form.append('instrument', input.instrument);
    if (input.songId) form.append('exercise_name', input.songId);

    const res = await request('/analyze', { method: 'POST', body: form });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Analysis failed');
    }
    return toAnalysisResult(await res.json(), input.fileName);
  }

  // Offline / no-file demo mode (used by Playwright flows).
  await delay(1600);
  const base = analysisResults[0];
  const jitter = () => Math.round(60 + Math.random() * 35);
  const pitch = jitter();
  const timing = jitter();
  const stability = input.instrument === 'Vocals' ? jitter() : 0;
  const overall = Math.round(
    stability > 0 ? (pitch + timing + stability) / 3 : (pitch + timing) / 2,
  );
  return {
    ...base,
    id: `analysis-${Date.now()}`,
    fileName: input.fileName,
    instrument: input.instrument,
    songId: input.songId,
    createdAt: new Date().toISOString(),
    scores: { pitchAccuracy: pitch, timingConsistency: timing, vocalStability: stability, overall },
    feedback: [
      pitch > 85
        ? 'Strong intonation — your pitch tracking stays within a tight band.'
        : 'Pitch drifts during sustained notes; aim for steadier breath support.',
      timing > 85
        ? 'Timing is locked in with the beat.'
        : 'Timing wanders in places — practice with a metronome at the target tempo.',
      stability > 0 && stability < 75
        ? 'Vocal stability dips on long held vowels; keep airflow consistent.'
        : 'Nice control overall — keep building on this.',
    ],
  };
}

export async function listAnalyses(): Promise<AnalysisResult[]> {
  if (await apiAvailable()) {
    const res = await request('/practice/sessions/');
    if (res.ok) {
      const summaries: { session_id: string }[] = await res.json();
      const details = await Promise.all(
        summaries.slice(0, 20).map(async (s) => {
          const d = await request(`/practice/sessions/${s.session_id}`);
          return d.ok ? ((await d.json()) as BackendSession) : null;
        }),
      );
      const real = details
        .filter((d): d is BackendSession => d !== null)
        .map((d) => toAnalysisResult(d, d.exercise_name ?? 'recording.wav'));
      if (real.length) return real;
    }
  }
  await delay(260);
  return analysisResults;
}

// ---------------------------------------------------------------------------
// Song catalog + social feed — mock until the backend grows these features
// (planned: SoundCloud-style /{username}/{audio} URLs, follows, privacy).
// ---------------------------------------------------------------------------

export async function listSongs(query?: string): Promise<Song[]> {
  await delay(280);
  if (!query) return songs;
  const q = query.toLowerCase();
  return songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genres.some((g) => g.toLowerCase().includes(q)),
  );
}

export async function getSong(id: string): Promise<Song | undefined> {
  await delay(220);
  return getSongById(id);
}

export async function listPerformances(): Promise<Performance[]> {
  await delay(320);
  return mockPerformances;
}

export async function toggleLike(perfId: string, liked: boolean): Promise<{ liked: boolean }> {
  // Real backend equivalent: POST /votes { session_id, dir } — the feed
  // itself is still mock, so likes stay local for now.
  await delay(120);
  return { liked };
}
