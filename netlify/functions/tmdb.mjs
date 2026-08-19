const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const GENRE_IDS = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

class TmdbRequestError extends Error {
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

const getCredentials = () => ({
  apiKey: process.env.TMDB_API_Key?.trim(),
  accessToken: process.env.TMDB_Read_Access_Token?.trim(),
});

const requestTmdb = async (path, params = {}) => {
  const { apiKey, accessToken } = getCredentials();
  if (!apiKey && !accessToken) {
    throw new TmdbRequestError('TMDB credentials are not configured for Netlify Functions.', 503);
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = { Accept: 'application/json' };
  if (accessToken) {
    headers.Authorization = accessToken.startsWith('Bearer ')
      ? accessToken
      : `Bearer ${accessToken}`;
  } else {
    url.searchParams.set('api_key', apiKey);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    throw new TmdbRequestError(`TMDB request failed with status ${response.status}.`, status);
  }
  return response.json();
};

const mediaTypeFromParam = (value) => value === 'tv' ? 'tv' : 'movie';

const boundedPage = (value) => {
  const page = Number.parseInt(value || '1', 10);
  return Number.isFinite(page) ? Math.min(20, Math.max(1, page)) : 1;
};

const resolveTmdbId = async (rawId, requestedType) => {
  const id = String(rawId || '').trim();
  if (/^\d+$/.test(id)) return { id, type: mediaTypeFromParam(requestedType) };
  if (!/^tt\d+$/.test(id)) throw new TmdbRequestError('A numeric TMDB ID or IMDb ID is required.', 400);

  const found = await requestTmdb(`/find/${encodeURIComponent(id)}`, {
    external_source: 'imdb_id',
  });
  const requested = mediaTypeFromParam(requestedType);
  const primary = requested === 'tv' ? found.tv_results?.[0] : found.movie_results?.[0];
  const fallback = found.movie_results?.[0] || found.tv_results?.[0];
  const match = primary || fallback;
  if (!match) throw new TmdbRequestError('TMDB could not resolve this external ID.', 404);

  return {
    id: String(match.id),
    type: match.media_type || (found.tv_results?.includes(match) ? 'tv' : 'movie'),
  };
};

const handleAction = async (url) => {
  const action = url.searchParams.get('action');
  const type = mediaTypeFromParam(url.searchParams.get('type'));
  const page = boundedPage(url.searchParams.get('page'));

  if (action === 'trending') {
    return requestTmdb(`/trending/${type}/week`, { language: 'en-US', page });
  }

  if (action === 'top-rated') {
    return requestTmdb(`/${type}/top_rated`, { language: 'en-US', page });
  }

  if (action === 'popular') {
    return requestTmdb(`/${type}/popular`, { language: 'en-US', page });
  }

  if (action === 'latest') {
    const today = new Date().toISOString().slice(0, 10);
    return requestTmdb('/discover/movie', {
      include_adult: false,
      include_video: false,
      language: 'en-US',
      page,
      sort_by: 'primary_release_date.desc',
      'primary_release_date.lte': today,
      'vote_count.gte': 20,
    });
  }

  if (action === 'search') {
    const query = url.searchParams.get('query')?.trim();
    if (!query || query.length > 120) throw new TmdbRequestError('A search query of 1-120 characters is required.', 400);
    const requestedType = url.searchParams.get('type');
    const endpoint = requestedType === 'movie' || requestedType === 'tv'
      ? `/search/${requestedType}`
      : '/search/multi';
    return requestTmdb(endpoint, {
      query,
      include_adult: false,
      language: 'en-US',
      page,
    });
  }

  if (action === 'discover') {
    const genre = url.searchParams.get('genre');
    const year = url.searchParams.get('year');
    const minRating = Number.parseFloat(url.searchParams.get('minRating'));
    return requestTmdb(`/discover/${type}`, {
      include_adult: false,
      include_video: false,
      language: 'en-US',
      page,
      sort_by: 'popularity.desc',
      with_genres: genre && genre !== 'All' ? GENRE_IDS[genre] : undefined,
      [type === 'tv' ? 'first_air_date_year' : 'primary_release_year']:
        year && year !== 'All' && /^\d{4}$/.test(year) ? year : undefined,
      'vote_average.gte': Number.isFinite(minRating) ? minRating : undefined,
      'vote_count.gte': 20,
    });
  }

  if (action === 'details') {
    const resolved = await resolveTmdbId(url.searchParams.get('id'), type);
    const [details, watchProviders] = await Promise.all([
      requestTmdb(`/${resolved.type}/${resolved.id}`, {
        language: 'en-US',
        append_to_response: 'credits,videos,external_ids,similar',
      }),
      requestTmdb(`/${resolved.type}/${resolved.id}/watch/providers`),
    ]);
    return {
      ...details,
      resolved_media_type: resolved.type,
      watch_providers: watchProviders,
    };
  }

  if (action === 'season') {
    const resolved = await resolveTmdbId(url.searchParams.get('id'), 'tv');
    const season = Number.parseInt(url.searchParams.get('season') || '1', 10);
    if (!Number.isFinite(season) || season < 0 || season > 100) {
      throw new TmdbRequestError('A valid season number is required.', 400);
    }
    return requestTmdb(`/tv/${resolved.id}/season/${season}`, { language: 'en-US' });
  }

  if (action === 'status') {
    const { apiKey, accessToken } = getCredentials();
    return { configured: Boolean(apiKey || accessToken) };
  }

  throw new TmdbRequestError('Unsupported TMDB action.', 400);
};

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

  try {
    const data = await handleAction(new URL(request.url));
    return json(data, 200, 300);
  } catch (error) {
    const status = error instanceof TmdbRequestError ? error.status : 500;
    if (status >= 500) console.error('TMDB proxy error:', error.message);
    return json({ error: error.message || 'TMDB request failed.' }, status);
  }
};

export const config = {
  path: '/api/tmdb',
};
