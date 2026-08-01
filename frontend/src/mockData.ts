/**
 * Mock data for the Music Practice Companion.
 *
 * These shapes mirror the "canonical song graph" vision: songs, notation
 * revisions, practice sessions, audio-analysis results, performances, and users
 * all key back to the same song entities. Swap these for live API calls later
 * (see src/api.ts).
 */

export type Instrument = 'Guitar' | 'Vocals' | 'Piano' | 'Bass';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Notation {
  id: string;
  type: 'Tab' | 'Chords' | 'Sheet';
  contributor: string;
  rating: number; // 0-5
  votes: number;
  verified: boolean;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  key: string;
  bpm: number;
  durationSec: number;
  difficulty: Difficulty;
  instruments: Instrument[];
  genres: string[];
  coverGradient: [string, string];
  plays: number;
  learners: number;
  notations: Notation[];
  // A tiny chord-progression snippet used by the practice player UI.
  progression: { label: string; chord: string }[];
}

export interface AnalysisResult {
  id: string;
  songId?: string;
  fileName: string;
  instrument: Instrument;
  createdAt: string;
  durationSec: number;
  scores: {
    pitchAccuracy: number; // 0-100
    timingConsistency: number; // 0-100
    vocalStability: number; // 0-100
    overall: number; // 0-100
  };
  feedback: string[];
  // Sampled pitch contour for the plot (semitone offset from target, by time).
  pitchSeries: { t: number; cents: number }[];
  // Onset timing deviations in ms for the timing plot.
  onsetSeries: { t: number; deviationMs: number }[];
}

export interface Performance {
  id: string;
  user: { id: string; name: string; handle: string; avatarGradient: [string, string] };
  songId: string;
  songTitle: string;
  artist: string;
  caption: string;
  instrument: Instrument;
  overallScore: number;
  likes: number;
  comments: number;
  liked: boolean;
  postedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarGradient: [string, string];
  followers: number;
  following: number;
  streakDays: number;
  minutesPracticed: number;
  songsLearned: number;
  badges: { id: string; label: string; icon: string }[];
}

const grad = (a: string, b: string): [string, string] => [a, b];

export const songs: Song[] = [
  {
    id: 'song-wonderwall',
    title: 'Wonderwall',
    artist: 'Oasis',
    album: "(What's the Story) Morning Glory?",
    year: 1995,
    key: 'F#m',
    bpm: 87,
    durationSec: 258,
    difficulty: 'Beginner',
    instruments: ['Guitar', 'Vocals'],
    genres: ['Rock', 'Britpop'],
    coverGradient: grad('#7C3AED', '#2563EB'),
    plays: 184203,
    learners: 12840,
    progression: [
      { label: 'I', chord: 'Em7' },
      { label: 'IV', chord: 'G' },
      { label: 'V', chord: 'Dsus4' },
      { label: 'ii', chord: 'A7sus4' },
    ],
    notations: [
      { id: 'n1', type: 'Chords', contributor: 'rhythmcat', rating: 4.8, votes: 2103, verified: true, updatedAt: '2026-04-12' },
      { id: 'n2', type: 'Tab', contributor: 'sixstring_sam', rating: 4.5, votes: 880, verified: true, updatedAt: '2026-03-01' },
      { id: 'n3', type: 'Sheet', contributor: 'maestro_k', rating: 4.1, votes: 240, verified: false, updatedAt: '2026-01-22' },
    ],
  },
  {
    id: 'song-blackbird',
    title: 'Blackbird',
    artist: 'The Beatles',
    album: 'The Beatles (White Album)',
    year: 1968,
    key: 'G',
    bpm: 96,
    durationSec: 138,
    difficulty: 'Intermediate',
    instruments: ['Guitar', 'Vocals'],
    genres: ['Folk', 'Rock'],
    coverGradient: grad('#A855F7', '#EC4899'),
    plays: 142880,
    learners: 9920,
    progression: [
      { label: 'I', chord: 'G' },
      { label: 'vi', chord: 'Am7' },
      { label: 'I/B', chord: 'G/B' },
      { label: 'IV', chord: 'C' },
    ],
    notations: [
      { id: 'n4', type: 'Tab', contributor: 'fingerstyle_fi', rating: 4.9, votes: 3401, verified: true, updatedAt: '2026-05-02' },
      { id: 'n5', type: 'Sheet', contributor: 'maestro_k', rating: 4.6, votes: 612, verified: true, updatedAt: '2026-02-18' },
    ],
  },
  {
    id: 'song-someone',
    title: 'Someone Like You',
    artist: 'Adele',
    album: '21',
    year: 2011,
    key: 'A',
    bpm: 67,
    durationSec: 285,
    difficulty: 'Intermediate',
    instruments: ['Piano', 'Vocals'],
    genres: ['Pop', 'Soul'],
    coverGradient: grad('#6366F1', '#8B5CF6'),
    plays: 233110,
    learners: 18402,
    progression: [
      { label: 'I', chord: 'A' },
      { label: 'V', chord: 'E/G#' },
      { label: 'vi', chord: 'F#m' },
      { label: 'IV', chord: 'D' },
    ],
    notations: [
      { id: 'n6', type: 'Sheet', contributor: 'keys_by_kai', rating: 4.7, votes: 1990, verified: true, updatedAt: '2026-04-29' },
      { id: 'n7', type: 'Chords', contributor: 'rhythmcat', rating: 4.3, votes: 720, verified: false, updatedAt: '2026-03-15' },
    ],
  },
  {
    id: 'song-redemption',
    title: 'Redemption Song',
    artist: 'Bob Marley',
    album: 'Uprising',
    year: 1980,
    key: 'G',
    bpm: 76,
    durationSec: 228,
    difficulty: 'Beginner',
    instruments: ['Guitar', 'Vocals'],
    genres: ['Reggae', 'Folk'],
    coverGradient: grad('#10B981', '#7C3AED'),
    plays: 98220,
    learners: 7430,
    progression: [
      { label: 'I', chord: 'G' },
      { label: 'V', chord: 'D' },
      { label: 'vi', chord: 'Em' },
      { label: 'IV', chord: 'C' },
    ],
    notations: [
      { id: 'n8', type: 'Chords', contributor: 'island_strings', rating: 4.6, votes: 1120, verified: true, updatedAt: '2026-04-01' },
    ],
  },
  {
    id: 'song-creep',
    title: 'Creep',
    artist: 'Radiohead',
    album: 'Pablo Honey',
    year: 1992,
    key: 'G',
    bpm: 92,
    durationSec: 238,
    difficulty: 'Beginner',
    instruments: ['Guitar', 'Vocals', 'Bass'],
    genres: ['Alt Rock'],
    coverGradient: grad('#8B5CF6', '#0EA5E9'),
    plays: 176540,
    learners: 14110,
    progression: [
      { label: 'I', chord: 'G' },
      { label: 'III', chord: 'B' },
      { label: 'IV', chord: 'C' },
      { label: 'iv', chord: 'Cm' },
    ],
    notations: [
      { id: 'n9', type: 'Chords', contributor: 'rhythmcat', rating: 4.7, votes: 1503, verified: true, updatedAt: '2026-05-10' },
      { id: 'n10', type: 'Tab', contributor: 'sixstring_sam', rating: 4.2, votes: 410, verified: false, updatedAt: '2026-02-02' },
    ],
  },
  {
    id: 'song-tears',
    title: 'Tears in Heaven',
    artist: 'Eric Clapton',
    album: 'Rush (Soundtrack)',
    year: 1992,
    key: 'A',
    bpm: 80,
    durationSec: 272,
    difficulty: 'Advanced',
    instruments: ['Guitar', 'Vocals'],
    genres: ['Rock', 'Acoustic'],
    coverGradient: grad('#F472B6', '#7C3AED'),
    plays: 88130,
    learners: 5210,
    progression: [
      { label: 'I', chord: 'A' },
      { label: 'V/vii', chord: 'E/G#' },
      { label: 'vi', chord: 'F#m' },
      { label: 'I/V', chord: 'A/E' },
    ],
    notations: [
      { id: 'n11', type: 'Tab', contributor: 'fingerstyle_fi', rating: 4.8, votes: 2210, verified: true, updatedAt: '2026-04-20' },
    ],
  },
];

function buildPitchSeries(spread: number): { t: number; cents: number }[] {
  const out: { t: number; cents: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const t = +(i * 0.25).toFixed(2);
    const wobble = Math.sin(i / 4) * spread + (Math.random() - 0.5) * spread * 0.8;
    out.push({ t, cents: +wobble.toFixed(1) });
  }
  return out;
}

function buildOnsetSeries(spread: number): { t: number; deviationMs: number }[] {
  const out: { t: number; deviationMs: number }[] = [];
  for (let i = 0; i < 24; i++) {
    out.push({
      t: +(i * 0.5).toFixed(2),
      deviationMs: +((Math.random() - 0.5) * spread * 2).toFixed(0),
    });
  }
  return out;
}

export const analysisResults: AnalysisResult[] = [
  {
    id: 'analysis-1',
    songId: 'song-wonderwall',
    fileName: 'wonderwall_take_4.wav',
    instrument: 'Vocals',
    createdAt: '2026-06-12T18:24:00Z',
    durationSec: 47,
    scores: { pitchAccuracy: 82, timingConsistency: 74, vocalStability: 68, overall: 75 },
    feedback: [
      'Pitch is generally stable but drifts flat during sustained notes in the chorus.',
      'Timing inconsistency detected around bar 12 — try practicing with a metronome at 87 BPM.',
      'Vocal stability dips on long held vowels; support with steadier breath.',
    ],
    pitchSeries: buildPitchSeries(18),
    onsetSeries: buildOnsetSeries(40),
  },
  {
    id: 'analysis-2',
    songId: 'song-blackbird',
    fileName: 'blackbird_fingerpick.wav',
    instrument: 'Guitar',
    createdAt: '2026-06-09T09:05:00Z',
    durationSec: 62,
    scores: { pitchAccuracy: 91, timingConsistency: 88, vocalStability: 0, overall: 89 },
    feedback: [
      'Excellent intonation — fretting is clean and in tune throughout.',
      'Timing is tight; minor rushing on the descending run.',
      'Great dynamic control on the picking hand.',
    ],
    pitchSeries: buildPitchSeries(8),
    onsetSeries: buildOnsetSeries(18),
  },
];

export const performances: Performance[] = [
  {
    id: 'perf-1',
    user: { id: 'u2', name: 'Maya Chen', handle: '@mayaplays', avatarGradient: grad('#A855F7', '#EC4899') },
    songId: 'song-someone',
    songTitle: 'Someone Like You',
    artist: 'Adele',
    caption: 'Finally nailed the bridge after 3 weeks 🙌 Pitch score up 14 points!',
    instrument: 'Vocals',
    overallScore: 88,
    likes: 342,
    comments: 28,
    liked: false,
    postedAt: '2026-06-13T20:11:00Z',
  },
  {
    id: 'perf-2',
    user: { id: 'u3', name: 'Diego Ramos', handle: '@diegostrings', avatarGradient: grad('#10B981', '#6366F1') },
    songId: 'song-blackbird',
    songTitle: 'Blackbird',
    artist: 'The Beatles',
    caption: 'Fingerstyle run-through. Slowed the loop to 70% and it finally clicked.',
    instrument: 'Guitar',
    overallScore: 92,
    likes: 511,
    comments: 41,
    liked: true,
    postedAt: '2026-06-13T14:48:00Z',
  },
  {
    id: 'perf-3',
    user: { id: 'u4', name: 'Priya Nair', handle: '@priyakeys', avatarGradient: grad('#6366F1', '#8B5CF6') },
    songId: 'song-creep',
    songTitle: 'Creep',
    artist: 'Radiohead',
    caption: 'That Cm chord change still gets me but progress is progress.',
    instrument: 'Piano',
    overallScore: 79,
    likes: 198,
    comments: 16,
    liked: false,
    postedAt: '2026-06-12T22:30:00Z',
  },
  {
    id: 'perf-4',
    user: { id: 'u5', name: 'Sam Okafor', handle: '@sixstring_sam', avatarGradient: grad('#F472B6', '#7C3AED') },
    songId: 'song-tears',
    songTitle: 'Tears in Heaven',
    artist: 'Eric Clapton',
    caption: 'Advanced fingerpicking is no joke. 40 days streak though 🔥',
    instrument: 'Guitar',
    overallScore: 85,
    likes: 423,
    comments: 33,
    liked: false,
    postedAt: '2026-06-11T11:02:00Z',
  },
];

export const currentUser: UserProfile = {
  id: 'u1',
  name: 'John Lizama',
  handle: '@johnlizama',
  bio: 'CS @ GMU · learning guitar & vocals · building this app 🎶',
  avatarGradient: grad('#7C3AED', '#22D3EE'),
  followers: 1284,
  following: 312,
  streakDays: 23,
  minutesPracticed: 5840,
  songsLearned: 17,
  badges: [
    { id: 'b1', label: '30-Day Streak', icon: 'flame' },
    { id: 'b2', label: 'Pitch Perfect', icon: 'musical-notes' },
    { id: 'b3', label: 'First Performance', icon: 'mic' },
    { id: 'b4', label: 'Top Contributor', icon: 'ribbon' },
  ],
};

export function getSongById(id: string): Song | undefined {
  return songs.find((s) => s.id === id);
}
