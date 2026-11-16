import { useEffect, useState } from 'react';

/**
 * Slot in the track page's left info column that receives the "Did You Hear
 * That?" and "Observation table" sections on desktop. Rendered by
 * ElementPage; TrackCard portals the sections there.
 */
export const TRACK_INFO_SLOT_ID = 'track-info-slot';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
