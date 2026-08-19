const DEFAULT_CATALOG_URL = '/streams.json';

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;

  const sources = Array.isArray(entry.sources)
    ? entry.sources.filter((source) => source?.url && source?.label)
    : [];

  if (sources.length === 0) return null;

  return {
    ...entry,
    sources,
    captions: Array.isArray(entry.captions) ? entry.captions : [],
  };
};

export const getStreamKey = ({ type, id, season, episode }) => {
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  if (mediaType === 'tv') {
    return `${mediaType}:${id}:${season || 1}:${episode || 1}`;
  }
  return `${mediaType}:${id}`;
};

export const getStreamEntry = async ({ type, id, season, episode, signal }) => {
  const catalogUrl = import.meta.env.VITE_STREAM_CATALOG_URL || DEFAULT_CATALOG_URL;

  try {
    const response = await fetch(catalogUrl, {
      signal,
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const catalog = await response.json();
      const key = getStreamKey({ type, id, season, episode });
      return normalizeEntry(catalog[key]);
    }
  } catch {
    // If streams.json is not available, return null
  }

  return null;
};

export const isHlsSource = (source) => (
  source?.type === 'application/vnd.apple.mpegurl'
  || source?.url?.split('?')[0].toLowerCase().endsWith('.m3u8')
);

export const qualityLabelFromHeight = (height) => {
  if (!height) return 'Unknown';
  if (height >= 2160) return '4K Ultra HD';
  if (height >= 1440) return '2K QHD';
  if (height >= 1080) return '1080p FHD';
  return `${height}p`;
};
