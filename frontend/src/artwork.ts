/**
 * Real album artwork — even while the catalog itself is mock data.
 *
 * Uses the iTunes Search API: free, no API key, CORS-enabled, so it works
 * from Expo web and native alike. We look a song up by "artist title", take
 * the 100x100 artwork URL Apple returns, and rewrite it to 600x600 (Apple's
 * CDN serves any size via the filename).
 *
 * This is exactly how tab/chord sites render song headers: metadata you own,
 * artwork hot-linked from a licensed provider's CDN. When the real backend
 * catalog ships, persist `artwork_url` on the songs table at ingest time
 * instead of looking it up client-side on every session.
 */
import { useEffect, useState } from 'react';

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export async function fetchArtwork(title: string, artist: string): Promise<string | null> {
  const key = `${artist}::${title}`.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  if (pending.has(key)) return pending.get(key)!;

  const promise = (async () => {
    try {
      const term = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const raw: string | undefined = data?.results?.[0]?.artworkUrl100;
      const url = raw ? raw.replace('100x100bb', '600x600bb') : null;
      cache.set(key, url);
      return url;
    } catch {
      cache.set(key, null); // offline — fall back to the gradient cover
      return null;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
}

/** Hook: resolves to an artwork URL or null (gradient fallback). */
export function useArtwork(title: string, artist: string): string | null {
  const [url, setUrl] = useState<string | null>(
    cache.get(`${artist}::${title}`.toLowerCase()) ?? null,
  );
  useEffect(() => {
    let active = true;
    fetchArtwork(title, artist).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [title, artist]);
  return url;
}
