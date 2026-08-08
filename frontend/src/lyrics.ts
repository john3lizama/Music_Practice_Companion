/**
 * Placeholder lyrics for the practice player's Spotify-style lyrics panel.
 *
 * There's no licensed lyrics API wired up, so these are original filler
 * lines (not the real song's lyrics), timed out line-by-line across the
 * song's duration so the panel can highlight/auto-scroll to the current
 * line and seek on tap — same interaction model as Spotify's lyrics view.
 */
export interface LyricLine {
  time: number; // seconds into the song this line starts
  text: string;
}

function buildLyricLines(lines: string[], durationSec: number): LyricLine[] {
  const startOffset = Math.min(6, durationSec * 0.08);
  const endPad = Math.min(6, durationSec * 0.08);
  const usable = Math.max(1, durationSec - startOffset - endPad);
  const linePause = 0.6; // in "word slots", the gap held between lines

  const wordCounts = lines.map((l) => l.split(' ').length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const perWord = usable / (totalWords + (lines.length - 1) * linePause);

  const out: LyricLine[] = [];
  let t = startOffset;
  lines.forEach((line, li) => {
    out.push({ time: +t.toFixed(2), text: line });
    t += wordCounts[li] * perWord + perWord * linePause;
  });
  return out;
}

const LYRIC_LINES: Record<string, string[]> = {
  'song-wonderwall': [
    'Pick it up and let it ring',
    'Every chord a brand new thing',
    "Doesn't matter if you slip",
    'Catch the beat and let it flip',
    'Strum along however slow',
    'Watch the practice start to show',
    "One more verse before we're through",
    "This one's yours, we'll see it through",
  ],
  'song-blackbird': [
    'Fingers find the open string',
    'Quiet room, a gentle thing',
    "Take your time, there's no rush here",
    'Let the melody stay clear',
    'Every pause has its own place',
    'Play it soft, then find your pace',
    'Morning light, the notes take flight',
    'Hold this moment, hold it right',
  ],
  'song-someone': [
    'Sit down slow before the keys',
    'Let your hands move with such ease',
    'Every note a memory',
    'Play it back for you and me',
    'Soft the verse, then let it swell',
    'Something only you can tell',
    'Hold the chord a little longer',
    'Every practice makes you stronger',
  ],
  'song-redemption': [
    'Steady strum beneath the sun',
    'Every practice, one by one',
    'Lift the tune and let it breathe',
    'Simple chords are all you need',
    'Verse by verse the song will grow',
    'Take it easy, steady flow',
    'Sing it loud or sing it low',
    "This is yours, now let it show",
  ],
  'song-creep': [
    'Quiet verse before the noise',
    'Find the tension, find your voice',
    'Hold it back then let it go',
    'Every chord begins to grow',
    'Something raw in how you play',
    'Practice makes the doubt give way',
    'Turn it up when you feel right',
    "This one's yours to hold tonight",
  ],
  'song-tears': [
    'Gentle hands upon the strings',
    'Every note a quiet thing',
    'Take a breath before you start',
    'Play it straight from where you are',
    'Nothing here you have to prove',
    'Let the melody just move',
    'Soft goodbye within the sound',
    "Practice slow, and you'll be found",
  ],
};

const LYRICS_CACHE = new Map<string, LyricLine[]>();

export function getLyrics(songId: string, durationSec: number): LyricLine[] {
  const cacheKey = `${songId}:${durationSec}`;
  const cached = LYRICS_CACHE.get(cacheKey);
  if (cached) return cached;

  const lines = LYRIC_LINES[songId] ?? LYRIC_LINES['song-wonderwall'];
  const built = buildLyricLines(lines, durationSec);
  LYRICS_CACHE.set(cacheKey, built);
  return built;
}
