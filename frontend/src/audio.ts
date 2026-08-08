/**
 * Placeholder audio for the practice player.
 *
 * There's no real recording pipeline yet, so each song maps to a short
 * (16s), seamlessly-looping synthesized pad in assets/audio/ — generated
 * locally (sine-wave chords, no samples), not a real recording. Each loop
 * actually cycles through that song's declared chord progression (see
 * mockData's `progression`), split into equal segments across the 16s with
 * a short crossfade at each chord change, so what's audible matches the
 * chord highlighted in the progression strip. The player loops it under
 * the hood while driving a full-length virtual timeline from the song's
 * declared duration, so play/pause/seek/skip all behave like a real track.
 */
export const PAD_LOOP_DURATION_SEC = 16;

export const SONG_AUDIO: Record<string, number> = {
  'song-wonderwall': require('../assets/audio/song-wonderwall.m4a'),
  'song-blackbird': require('../assets/audio/song-blackbird.m4a'),
  'song-someone': require('../assets/audio/song-someone.m4a'),
  'song-redemption': require('../assets/audio/song-redemption.m4a'),
  'song-creep': require('../assets/audio/song-creep.m4a'),
  'song-tears': require('../assets/audio/song-tears.m4a'),
};
