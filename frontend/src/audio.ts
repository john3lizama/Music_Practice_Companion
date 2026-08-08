/**
 * Placeholder audio for the practice player.
 *
 * There's no real recording pipeline yet, so each song maps to one of a
 * handful of short (16s), seamlessly-looping synthesized pad tracks in
 * assets/audio/ — generated locally (sine-wave chords, no samples), not
 * real recordings. The player loops the pad under the hood while driving a
 * full-length virtual timeline from the song's declared duration, so play/
 * pause/seek/skip all behave like a real track.
 */
export type PadKey = 'pad-warm' | 'pad-bright' | 'pad-minor' | 'pad-mellow';

export const PAD_LOOP_DURATION_SEC = 16;

export const PAD_ASSETS: Record<PadKey, number> = {
  'pad-warm': require('../assets/audio/pad-warm.m4a'),
  'pad-bright': require('../assets/audio/pad-bright.m4a'),
  'pad-minor': require('../assets/audio/pad-minor.m4a'),
  'pad-mellow': require('../assets/audio/pad-mellow.m4a'),
};
