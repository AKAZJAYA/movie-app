import axios from 'axios';
import { blockbusterMovies, blockbusterTV } from '../data/blockbusterDb';

// User OMDb API Configuration
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY || 'c2818c48';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

// Cinemeta IMDb Stremio Official Catalog
const CINEMETA_BASE_URL = 'https://v3-cinemeta.strem.io';

// Axios instance for OMDb API
const omdbApi = axios.create({
  baseURL: OMDB_BASE_URL,
  timeout: 10000,
  params: {
    apikey: OMDB_API_KEY,
  },
});

const cinemetaApi = axios.create({
  baseURL: CINEMETA_BASE_URL,
  timeout: 10000,
});

const cache = new Map();

/**
 * Curated Top HD Masterpiece IMDb IDs
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
  const year = item.Year ? item.Year.split('–')[0].trim() : '2024';
  
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

  // Rating & Quality
  const ratingValue = parseFloat(item.imdbRating && item.imdbRating !== 'N/A' ? item.imdbRating : '7.8');
  const quality = ratingValue >= 8.0 ? '4K BLU-RAY' : '1080p BLU-RAY';

  // Trailers map for blockbusters
  const localMatch = [...blockbusterMovies, ...blockbusterTV].find(x => x.imdb_id === imdbId || x.id === imdbId);
  const trailerUrl = localMatch?.trailer_url || `https://www.youtube.com/embed/Way9Dexny3w`;

  return {
    id: imdbId,
    imdb_id: imdbId,
    tmdb_id: localMatch?.tmdb_id || localMatch?.id,
    title,
    year,
    release_date: item.Released !== 'N/A' ? item.Released : `${year}-01-01`,
    poster_url: poster,
    backdrop_url: backdrop,
    rating: ratingValue.toFixed(1),
    vote_count: item.imdbVotes && item.imdbVotes !== 'N/A' ? item.imdbVotes : '500,000+',
    genres,
    overview: item.Plot && item.Plot !== 'N/A' 
      ? item.Plot 
      : `Immerse yourself in ${title}, streaming in master 1080p / 4K Blu-ray audio & video on NebulaFlix.`,
    tagline: item.Awards && item.Awards !== 'N/A' ? item.Awards : '4K Ultra HD Blu-Ray Edition',
    runtime: item.Runtime && item.Runtime !== 'N/A' ? item.Runtime : '120 min',
    director: item.Director && item.Director !== 'N/A' ? item.Director : '',
    writer: item.Writer && item.Writer !== 'N/A' ? item.Writer : '',
    ratings: item.Ratings || [],
    box_office: item.BoxOffice && item.BoxOffice !== 'N/A' ? item.BoxOffice : '',
    popularity: '250.0',
    type,
    quality,
    trailer_url: trailerUrl,
    cast,
    seasons: [],
    number_of_seasons: isSeries ? (parseInt(item.totalSeasons) || 1) : 1,
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
  const localMatch = [...blockbusterMovies, ...blockbusterTV].find(x => x.imdb_id === imdbId || x.id === imdbId);
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

  try {
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
 * Fetch Curated High-Definition Blockbuster Movies from OMDb
 */
export const getTrending = async (mediaType = 'movie') => {
  const isSeries = mediaType === 'tv';
  const cacheKey = `omdb_trending_${mediaType}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const ids = isSeries ? FEATURED_IMDB_SERIES : FEATURED_IMDB_MOVIES;

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
  // If TV ID is an IMDb ID, we can query OMDb season episodes endpoint:
  // http://www.omdbapi.com/?i=tt0903747&Season=1&apikey=c2818c48
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
          overview: `Official Episode ${ep.Episode} streaming in master 1080p Blu-Ray quality. IMDb Rating: ${ep.imdbRating || '8.5'}.`,
          runtime: '50 min',
          still_path: `https://images.metahub.space/background/medium/${tvId}/img`,
          air_date: ep.Released,
          vote_average: ep.imdbRating || '8.5',
        }));
        cache.set(cacheKey, episodes);
        return episodes;
      }
    } catch (error) {
      console.warn(`OMDb Season fetch failed for ${tvId}`, error);
    }
  }

  // Fallback episodes
  return [
    { episode_number: 1, title: "Episode 1: Pilot", overview: "The start of an amazing journey in 4K HDR Blu-Ray.", runtime: "55 min" },
    { episode_number: 2, title: "Episode 2: Trajectory", overview: "Tension rises as critical anomalies are detected.", runtime: "50 min" },
    { episode_number: 3, title: "Episode 3: Resonance", overview: "A high-stakes encounter tests the crew's resolve.", runtime: "52 min" },
    { episode_number: 4, title: "Episode 4: Eclipse", overview: "Confronting revelations alter the mission's future.", runtime: "58 min" },
  ];
};

/**
 * Latest feed
 */
export const getLatestMovies = async () => {
  return getTrending('movie');
};

export const getLatestTVShows = async () => {
  return getTrending('tv');
};
