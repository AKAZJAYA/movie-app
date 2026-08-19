const WATCH_API_BASE_URL = 'https://imdb.iamidiotareyoutoo.com';

class WatchOptionsError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const json = (body, status = 200, cacheSeconds = 0) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': cacheSeconds > 0
      ? `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`
      : 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  },
});

const normalizeRegion = (value) => {
  const region = String(value || 'LK').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(region) ? region : 'LK';
};

const qualityFromType = (type) => {
  const normalized = String(type || '').toUpperCase();
  if (normalized.includes('4K')) return '4K';
  if (normalized.includes('HD')) return 'HD';
  if (normalized.includes('SD')) return 'SD';
  return '';
};

const methodFromType = (type) => {
  const normalized = String(type || '').toUpperCase();
  if (normalized.startsWith('FLATRATE')) return 'subscription';
  if (normalized.startsWith('RENT')) return 'rent';
  if (normalized.startsWith('BUY')) return 'buy';
  if (normalized.startsWith('FREE')) return 'free';
  if (normalized.startsWith('ADS')) return 'ads';
  return '';
};

const normalizeOffers = (offers) => {
  const byDestination = new Map();

  (Array.isArray(offers) ? offers : []).forEach((offer) => {
    const method = methodFromType(offer?.type);
    if (!method || !offer?.name || !offer?.url) return;

    let destination;
    try {
      destination = new URL(offer.url);
    } catch {
      return;
    }
    if (destination.protocol !== 'https:' && destination.protocol !== 'http:') return;

    const key = `${offer.name}|${destination.href}`;
    const current = byDestination.get(key) || {
      name: offer.name,
      url: destination.href,
      methods: [],
      qualities: [],
    };
    const quality = qualityFromType(offer.type);
    if (!current.methods.includes(method)) current.methods.push(method);
    if (quality && !current.qualities.includes(quality)) current.qualities.push(quality);
    byDestination.set(key, current);
  });

  const methodRank = { subscription: 0, free: 1, ads: 2, rent: 3, buy: 4 };
  const qualityRank = { '4K': 0, HD: 1, SD: 2 };
  return [...byDestination.values()].sort((left, right) => {
    const methodDifference = Math.min(...left.methods.map((method) => methodRank[method] ?? 9))
      - Math.min(...right.methods.map((method) => methodRank[method] ?? 9));
    if (methodDifference !== 0) return methodDifference;
    return Math.min(...left.qualities.map((quality) => qualityRank[quality] ?? 9), 9)
      - Math.min(...right.qualities.map((quality) => qualityRank[quality] ?? 9), 9);
  });
};

const selectTitle = (items, { title, type, tmdbId, imdbId }) => {
  const candidates = (Array.isArray(items) ? items : []).filter((item) => {
    if (type === 'tv') return item?.type === 'SHOW';
    if (type === 'movie') return item?.type === 'MOVIE';
    return true;
  });

  return candidates.find((item) => tmdbId && String(item.tmdbId) === String(tmdbId))
    || candidates.find((item) => imdbId && item.imdbId === imdbId)
    || candidates.find((item) => item.title?.trim().toLowerCase() === title.toLowerCase())
    || candidates[0]
    || null;
};

const fetchWatchOptions = async ({ title, type, tmdbId, imdbId, region }) => {
  const upstreamUrl = new URL('/justwatch', WATCH_API_BASE_URL);
  upstreamUrl.searchParams.set('q', title);
  upstreamUrl.searchParams.set('L', `en_${region}`);

  const response = await fetch(upstreamUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) {
    throw new WatchOptionsError(`Watch-provider request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload?.ok || !Array.isArray(payload.description)) {
    throw new WatchOptionsError('The watch-provider service returned an invalid response.');
  }

  const match = selectTitle(payload.description, { title, type, tmdbId, imdbId });
  if (!match) return { region, title: null, offers: [], source: 'fmdb-justwatch' };

  return {
    region,
    title: {
      name: match.title || title,
      year: match.year || null,
      tmdb_id: match.tmdbId ? String(match.tmdbId) : '',
      imdb_id: match.imdbId || '',
      justwatch_url: match.url || '',
    },
    offers: normalizeOffers(match.offers),
    source: 'fmdb-justwatch',
  };
};

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

  try {
    const url = new URL(request.url);
    const title = url.searchParams.get('title')?.trim();
    if (!title || title.length > 120) {
      throw new WatchOptionsError('A title of 1-120 characters is required.', 400);
    }

    const typeParam = url.searchParams.get('type');
    const type = typeParam === 'tv' || typeParam === 'movie' ? typeParam : '';
    const result = await fetchWatchOptions({
      title,
      type,
      tmdbId: url.searchParams.get('tmdbId')?.trim() || '',
      imdbId: url.searchParams.get('imdbId')?.trim() || '',
      region: normalizeRegion(url.searchParams.get('region')),
    });
    return json(result, 200, 1800);
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError';
    const status = error instanceof WatchOptionsError ? error.status : 502;
    if (status >= 500) console.error('Watch-options proxy error:', error.message);
    return json({ error: isTimeout ? 'The watch-provider service timed out.' : error.message }, status);
  }
};

export const config = {
  path: '/api/watch-options',
};
