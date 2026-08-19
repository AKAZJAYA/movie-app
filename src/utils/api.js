import axios from 'axios';
import { blockbusterMovies, blockbusterTV } from '../data/blockbusterDb';

// OMDb provides metadata only. Use a key issued to the app owner.
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY?.trim();
const OMDB_BASE_URL = 'https://www.omdbapi.com';

// Axios instance for OMDb API
const omdbApi = axios.create({
  baseURL: OMDB_BASE_URL,
  timeout: 10000,
  params: OMDB_API_KEY ? { apikey: OMDB_API_KEY } : {},
});

// TMDB credentials remain inside the Netlify Function at /api/tmdb.
const tmdbApi = axios.create({
  baseURL: '/api/tmdb',
  timeout: 15000,
});

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const WATCH_REGION = (import.meta.env.VITE_WATCH_REGION || 'LK').toUpperCase();

const TMDB_GENRES = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Sci-Fi',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

const imageUrl = (path, size, fallback = '') => (
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : fallback
);

const normalizeWatchProviders = (watchProviders, region = WATCH_REGION) => {
  const regional = watchProviders?.results?.[region];
  if (!regional) return { link: '', providers: [], region };

  const byId = new Map();
  ['flatrate', 'free', 'ads', 'rent', 'buy'].forEach((method) => {
    (regional[method] || []).forEach((provider) => {
      const current = byId.get(provider.provider_id) || {
        id: provider.provider_id,
        name: provider.provider_name,
        logo_url: imageUrl(provider.logo_path, 'w92'),
        methods: [],
      };
      if (!current.methods.includes(method)) current.methods.push(method);
      byId.set(provider.provider_id, current);
    });
  });

  return {
    link: regional.link || '',
    providers: [...byId.values()],
    region,
  };
};

const tmdbTrailerUrl = (videos) => {
  const candidates = videos?.results?.filter((video) => video.site === 'YouTube') || [];
  const trailer = candidates.find((video) => video.official && video.type === 'Trailer')
    || candidates.find((video) => video.type === 'Trailer')
    || candidates[0];
  return trailer ? `https://www.youtube.com/embed/${trailer.key}` : '';
};

export const normalizeTmdbItem = (item, typeHint = '') => {
  if (!item || !item.id) return null;

  const type = item.resolved_media_type
    || item.media_type
    || typeHint
    || (item.first_air_date || item.name ? 'tv' : 'movie');
  if (type !== 'movie' && type !== 'tv') return null;

  const imdbId = item.external_ids?.imdb_id || item.imdb_id || '';
  const localMatch = [...blockbusterMovies, ...blockbusterTV]
    .find((entry) => String(entry.id) === String(item.id) || entry.imdb_id === imdbId);
  const releaseDate = item.release_date || item.first_air_date || '';
  const title = item.title || item.name || item.original_title || item.original_name || 'Untitled';
  const genres = item.genres?.map((genre) => genre.name)
    || item.genre_ids?.map((genreId) => TMDB_GENRES[genreId]).filter(Boolean)
    || [];
  const watch = normalizeWatchProviders(item.watch_providers);
  const runtime = item.runtime || item.episode_run_time?.[0];
  const trailerUrl = tmdbTrailerUrl(item.videos) || localMatch?.trailer_url || '';

  return {
    id: String(item.id),
    tmdb_id: item.id,
    imdb_id: imdbId,
    title,
    year: releaseDate ? releaseDate.slice(0, 4) : '',
    release_date: releaseDate,
    poster_url: imageUrl(item.poster_path, 'w500', localMatch?.poster_url),
    backdrop_url: imageUrl(item.backdrop_path, 'original', localMatch?.backdrop_url),
    rating: Number(item.vote_average || 0).toFixed(1),
    vote_count: item.vote_count || 0,
    genres: genres.length ? genres : [type === 'tv' ? 'TV Series' : 'Movie'],
    overview: item.overview || `Explore details, cast, and availability for ${title}.`,
    tagline: item.tagline || '',
    runtime: runtime ? `${runtime} min` : '',
    popularity: Number(item.popularity || 0).toFixed(1),
    type,
    trailer_url: trailerUrl,
    cast: (item.credits?.cast || []).slice(0, 14).map((person) => ({
      name: person.name,
      character: person.character || person.known_for_department || 'Cast',
      profile_path: imageUrl(person.profile_path, 'w185'),
    })),
    seasons: item.seasons || [],
    number_of_seasons: item.number_of_seasons || (type === 'tv' ? 1 : undefined),
    status: item.status || 'Released',
    similar: (item.similar?.results || [])
      .map((similar) => normalizeTmdbItem({ ...similar, media_type: type }, type))
      .filter(Boolean)
      .slice(0, 12),
    watch_providers: watch.providers,
    watch_provider_link: watch.link,
    watch_region: watch.region,
    data_source: 'tmdb',
  };
};

const fetchTmdbList = async (action, params = {}, typeHint = '') => {
  try {
    const response = await tmdbApi.get('', { params: { action, ...params } });
    if (!Array.isArray(response.data?.results)) return null;
    return response.data.results
      .map((item) => normalizeTmdbItem(item, typeHint))
      .filter(Boolean);
  } catch {
    return null;
  }
};

const cache = new Map();

/**
 * Curated IMDb IDs used when a metadata key is configured.
 */
const FEATURED_IMDB_MOVIES = [
  'tt15239678', // Dune: Part Two
  'tt0816692',  // Interstellar
  'tt15398776', // Oppenheimer
  'tt0848228',  // The Avengers
  'tt4154796',  // Avengers: Endgame
  'tt3896198',  // Guardians of the Galaxy Vol. 2
  'tt1877830',  // The Batman
  'tt1375666',  // Inception
  'tt0468569',  // The Dark Knight
  'tt1856101',  // Blade Runner 2049
  'tt9362722',  // Spider-Man: Across the Spider-Verse
  'tt1745960',  // Top Gun: Maverick
  'tt10366206', // John Wick: Chapter 4
  'tt6710474',  // Everything Everywhere All at Once
  'tt7286456',  // Joker
  'tt0109830',  // Forrest Gump
  'tt0110912',  // Pulp Fiction
  'tt0137523',  // Fight Club
  'tt0111161',  // The Shawshank Redemption
  'tt0120737',  // The Lord of the Rings: The Fellowship of the Ring
];

const FEATURED_IMDB_SERIES = [
  'tt0903747',  // Breaking Bad
  'tt0944947',  // Game of Thrones
  'tt4574334',  // Stranger Things
  'tt3581920',  // The Last of Us
  'tt1190634',  // The Boys
  'tt2788310',  // Shogun
  'tt8594324',  // Fallout
  'tt8772296',  // Euphoria
  'tt7660850',  // Succession
  'tt8111088',  // The Mandalorian
  'tt2560140',  // Attack on Titan
  'tt11198330', // House of the Dragon
  'tt6468322',  // Money Heist
  'tt7366338',  // Arcane
  'tt0460649',  // How I Met Your Mother
];

/**
 * Backdrop builder from Metahub / Unsplash
 */
export const getBackdropUrl = (imdbId, fallbackPoster = '') => {
  if (imdbId && imdbId.startsWith('tt')) {
    return `https://images.metahub.space/background/medium/${imdbId}/img`;
  }
  return fallbackPoster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=80';
};

/**
 * Normalize OMDb API response to unified NebulaFlix schema
 */
export const normalizeOmdbItem = (item) => {
  if (!item) return null;
  const isSeries = item.Type === 'series';
  const type = isSeries ? 'tv' : 'movie';
  const imdbId = item.imdbID || (item.id ? item.id.toString() : '');
  const title = item.Title || item.name || 'Untitled';
  const year = item.Year ? item.Year.split('–')[0].trim() : '';
  
  // Genres
  let genres = [];
  if (item.Genre) {
    genres = item.Genre.split(', ').map(g => g.trim());
  }
  if (genres.length === 0) genres = [isSeries ? 'TV Series' : 'Movie'];

  // Cast
  let cast = [];
  if (item.Actors && item.Actors !== 'N/A') {
    cast = item.Actors.split(', ').map(name => ({
      name: name.trim(),
      character: 'Lead Cast',
      profile_path: '',
    }));
  }

  // Poster with fallback
  let poster = item.Poster;
  if (!poster || poster === 'N/A') {
    poster = `https://images.metahub.space/poster/small/${imdbId}/img`;
  }

  // Backdrop
  const backdrop = `https://images.metahub.space/background/medium/${imdbId}/img`;

  // Ratings do not indicate the resolution or quality of a video source.
  const ratingValue = parseFloat(item.imdbRating && item.imdbRating !== 'N/A' ? item.imdbRating : '0');

  // Trailers map for blockbusters
  const localMatch = [...blockbusterMovies, ...blockbusterTV].find(x => x.imdb_id === imdbId || x.id === imdbId);
  const trailerUrl = localMatch?.trailer_url || `https://www.youtube.com/embed/Way9Dexny3w`;

  return {
    id: imdbId,
    imdb_id: imdbId,
    tmdb_id: localMatch?.tmdb_id || localMatch?.id,
    title,
    year,
    release_date: item.Released && item.Released !== 'N/A'
      ? item.Released
      : (year ? `${year}-01-01` : ''),
    poster_url: poster,
    backdrop_url: backdrop,
    rating: ratingValue > 0 ? ratingValue.toFixed(1) : '',
    vote_count: item.imdbVotes && item.imdbVotes !== 'N/A' ? item.imdbVotes : '',
    genres,
    overview: item.Plot && item.Plot !== 'N/A' 
      ? item.Plot 
      : `Explore details, cast, and availability for ${title}.`,
    tagline: item.Awards && item.Awards !== 'N/A' ? item.Awards : '',
    runtime: item.Runtime && item.Runtime !== 'N/A' ? item.Runtime : (localMatch?.runtime || ''),
    director: item.Director && item.Director !== 'N/A' ? item.Director : '',
    writer: item.Writer && item.Writer !== 'N/A' ? item.Writer : '',
    ratings: item.Ratings || [],
    box_office: item.BoxOffice && item.BoxOffice !== 'N/A' ? item.BoxOffice : '',
    popularity: localMatch?.popularity || '',
    type,
    trailer_url: trailerUrl,
    cast,
    seasons: [],
    number_of_seasons: isSeries ? (parseInt(item.totalSeasons) || undefined) : undefined,
    status: 'Released',
  };
};

/**
 * Fetch Full Details by IMDb ID using OMDb API
 */
export const getMovieByImdbId = async (imdbId) => {
  if (!imdbId) return null;
  const cacheKey = `omdb_id_${imdbId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const localMatch = [...blockbusterMovies, ...blockbusterTV]
    .find((item) => item.imdb_id === imdbId || item.id === imdbId);

  if (!OMDB_API_KEY) return localMatch || null;

  try {
    const response = await omdbApi.get('/', {
      params: {
        i: imdbId,
        plot: 'full',
      },
    });

    if (response.data && response.data.Response === 'True') {
      const normalized = normalizeOmdbItem(response.data);
      cache.set(cacheKey, normalized);
      return normalized;
    }
  } catch (error) {
    console.warn(`OMDb fetch failed for ${imdbId}`, error);
  }

  // Fallback to local blockbusters
  return localMatch || null;
};

/**
 * Search OMDb API by Title
 */
export const searchOmdb = async (query, page = 1, type = '') => {
  if (!query || !query.trim()) return [];
  const cleanType = type === 'tv' ? 'series' : (type === 'movie' ? 'movie' : '');
  const cacheKey = `omdb_search_${query.trim().toLowerCase()}_p${page}_t${cleanType}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const tmdbResults = await fetchTmdbList('search', {
    query: query.trim(),
    page,
    type: type === 'movie' || type === 'tv' ? type : undefined,
  }, type);
  if (tmdbResults) {
    cache.set(cacheKey, tmdbResults);
    return tmdbResults;
  }

  try {
    if (!OMDB_API_KEY) {
      const localItems = [...blockbusterMovies, ...blockbusterTV];
      const normalizedQuery = query.trim().toLowerCase();
      return localItems.filter((item) => {
        const matchesQuery = item.title?.toLowerCase().includes(normalizedQuery);
        const matchesType = !type || item.type === type;
        return matchesQuery && matchesType;
      });
    }
    const params = {
      s: query.trim(),
      page,
    };
    if (cleanType) params.type = cleanType;

    const response = await omdbApi.get('/', { params });

    if (response.data && response.data.Response === 'True' && response.data.Search) {
      // For each search result item, map to full normalized item
      const results = response.data.Search.map(item => normalizeOmdbItem(item)).filter(Boolean);
      cache.set(cacheKey, results);
      return results;
    }
  } catch (error) {
    console.warn(`OMDb Search failed for "${query}"`, error);
  }

  return [];
};

/**
 * Fetch curated movie metadata from OMDb.
 */
export const getTrending = async (mediaType = 'movie') => {
  const isSeries = mediaType === 'tv';
  const cacheKey = `omdb_trending_${mediaType}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const ids = isSeries ? FEATURED_IMDB_SERIES : FEATURED_IMDB_MOVIES;

  const tmdbResults = await fetchTmdbList('trending', { type: mediaType }, mediaType);
  if (tmdbResults?.length) {
    cache.set(cacheKey, tmdbResults);
    return tmdbResults;
  }

  try {
    // Fetch all featured items in parallel from OMDb
    const items = await Promise.all(
      ids.slice(0, 12).map(id => getMovieByImdbId(id))
    );
    const validItems = items.filter(Boolean);
    if (validItems.length > 0) {
      cache.set(cacheKey, validItems);
      return validItems;
    }
  } catch (error) {
    console.warn('OMDb trending fetch failed', error);
  }

  return isSeries ? blockbusterTV : blockbusterMovies;
};

/**
 * Fetch Top Rated Movies from OMDb
 */
export const getTopRatedMovies = async () => {
  const cacheKey = 'omdb_top_rated';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const tmdbResults = await fetchTmdbList('top-rated', { type: 'movie' }, 'movie');
  if (tmdbResults?.length) {
    cache.set(cacheKey, tmdbResults);
    return tmdbResults;
  }

  const topIds = [
    'tt0111161', // The Shawshank Redemption
    'tt0468569', // The Dark Knight
    'tt1375666', // Inception
    'tt0137523', // Fight Club
    'tt0109830', // Forrest Gump
    'tt0110912', // Pulp Fiction
    'tt0816692', // Interstellar
    'tt15239678',// Dune: Part Two
    'tt15398776',// Oppenheimer
    'tt0120737', // LOTR: Fellowship of the Ring
    'tt0167260', // LOTR: Return of the King
    'tt1856101', // Blade Runner 2049
  ];

  try {
    const items = await Promise.all(topIds.map(id => getMovieByImdbId(id)));
    const validItems = items.filter(Boolean);
    if (validItems.length > 0) {
      cache.set(cacheKey, validItems);
      return validItems;
    }
  } catch (error) {
    console.warn('OMDb top rated fetch failed', error);
  }

  return blockbusterMovies;
};

/**
 * Fetch Popular TV Shows from OMDb
 */
export const getPopularTVShows = async () => {
  const cacheKey = 'omdb_popular_tv';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const tmdbResults = await fetchTmdbList('popular', { type: 'tv' }, 'tv');
  if (tmdbResults?.length) {
    cache.set(cacheKey, tmdbResults);
    return tmdbResults;
  }

  try {
    const items = await Promise.all(FEATURED_IMDB_SERIES.map(id => getMovieByImdbId(id)));
    const validItems = items.filter(Boolean);
    if (validItems.length > 0) {
      cache.set(cacheKey, validItems);
      return validItems;
    }
  } catch (error) {
    console.warn('OMDb TV fetch failed', error);
  }

  return blockbusterTV;
};

/**
 * Discover / Category Query
 */
export const discoverMedia = async ({
  type = 'movie',
  genre = 'All',
  year = 'All',
  minRating = 'All',
} = {}) => {
  const cacheKey = `omdb_discover_${type}_${genre}_${year}_${minRating}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const tmdbResults = await fetchTmdbList('discover', {
    type,
    genre,
    year,
    minRating: minRating === 'All' ? undefined : minRating.replace('+', ''),
  }, type);
  if (tmdbResults) {
    cache.set(cacheKey, tmdbResults);
    return tmdbResults;
  }

  // Fetch full pool of items
  const basePool = await getTrending(type);
  
  const filtered = basePool.filter(item => {
    // Genre
    const matchesGenre = genre === 'All' || item.genres?.some(g => g.toLowerCase().includes(genre.toLowerCase()));
    
    // Year
    const matchesYear = year === 'All' || item.year.startsWith(year);

    // Rating
    const numRating = parseFloat(item.rating || '0.0');
    let matchesRating = true;
    if (minRating === '8.0+') matchesRating = numRating >= 8.0;
    else if (minRating === '7.0+') matchesRating = numRating >= 7.0;
    else if (minRating === '6.0+') matchesRating = numRating >= 6.0;

    return matchesGenre && matchesYear && matchesRating;
  });

  cache.set(cacheKey, filtered);
  return filtered;
};

/**
 * Get Media Details (Movie / TV)
 */
export const getMediaDetails = async (type, id) => {
  if (!id) return null;
  const cleanId = id.toString();

  const cacheKey = `tmdb_details_${type}_${cleanId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const response = await tmdbApi.get('', {
      params: { action: 'details', type: type || 'movie', id: cleanId },
    });
    const tmdbData = normalizeTmdbItem(response.data, type);
    if (tmdbData) {
      cache.set(cacheKey, tmdbData);
      return tmdbData;
    }
  } catch {
    // Local/OMDb metadata below keeps development and offline fallbacks working.
  }
  
  // If it's an IMDb ID or numeric ID, fetch from OMDb
  if (cleanId.startsWith('tt')) {
    const omdbData = await getMovieByImdbId(cleanId);
    if (omdbData) {
      // Add similar movies
      const allTrending = await getTrending(type || omdbData.type);
      omdbData.similar = allTrending.filter(x => x.id !== cleanId).slice(0, 6);
      return omdbData;
    }
  }

  // Fallback to local database or Cinemeta
  const fallbackList = [...blockbusterMovies, ...blockbusterTV];
  const localMatch = fallbackList.find(x => x.id === cleanId || x.imdb_id === cleanId);
  if (localMatch) {
    if (localMatch.imdb_id) {
      const omdbEnriched = await getMovieByImdbId(localMatch.imdb_id);
      if (omdbEnriched) return omdbEnriched;
    }
    return localMatch;
  }

  return null;
};

/**
 * Fetch TV Episodes
 */
export const getTVSeasonEpisodes = async (tvId, seasonNumber = 1) => {
  const tmdbCacheKey = `tmdb_season_${tvId}_${seasonNumber}`;
  if (cache.has(tmdbCacheKey)) return cache.get(tmdbCacheKey);

  try {
    const response = await tmdbApi.get('', {
      params: { action: 'season', type: 'tv', id: tvId, season: seasonNumber },
    });
    if (Array.isArray(response.data?.episodes)) {
      const episodes = response.data.episodes.map((episode) => ({
        episode_number: episode.episode_number,
        name: episode.name,
        title: `Episode ${episode.episode_number}: ${episode.name}`,
        overview: episode.overview || '',
        runtime: episode.runtime ? `${episode.runtime} min` : '',
        still_path: imageUrl(episode.still_path, 'w780'),
        air_date: episode.air_date,
        vote_average: episode.vote_average,
      }));
      cache.set(tmdbCacheKey, episodes);
      return episodes;
    }
  } catch {
    // OMDb fallback below supports IMDb IDs when the Netlify Function is absent.
  }

  // OMDb can provide episode metadata for IMDb series IDs.
  if (tvId && tvId.startsWith('tt')) {
    const cacheKey = `omdb_season_${tvId}_${seasonNumber}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      const response = await omdbApi.get('/', {
        params: {
          i: tvId,
          Season: seasonNumber,
        },
      });

      if (response.data && response.data.Episodes) {
        const episodes = response.data.Episodes.map(ep => ({
          episode_number: parseInt(ep.Episode) || 1,
          name: ep.Title,
          title: `Episode ${ep.Episode}: ${ep.Title}`,
          overview: `Episode ${ep.Episode}. IMDb rating: ${ep.imdbRating || 'N/A'}.`,
          runtime: '',
          still_path: `https://images.metahub.space/background/medium/${tvId}/img`,
          air_date: ep.Released,
          vote_average: ep.imdbRating && ep.imdbRating !== 'N/A' ? ep.imdbRating : null,
        }));
        cache.set(cacheKey, episodes);
        return episodes;
      }
    } catch (error) {
      console.warn(`OMDb Season fetch failed for ${tvId}`, error);
    }
  }

  return [];
};

/**
 * Latest feed
 */
export const getLatestMovies = async () => {
  const results = await fetchTmdbList('latest', { type: 'movie' }, 'movie');
  return results?.length ? results : getTrending('movie');
};

export const getLatestTVShows = async () => {
  const results = await fetchTmdbList('popular', { type: 'tv' }, 'tv');
  return results?.length ? results : getTrending('tv');
};
