const prisma = require("../config/prisma");
const HttpError = require("../utils/httpError");
const { MEDIA_TYPES, isUuid, parsePagination } = require("../utils/validation");

// ── Serialisers: shape DB rows into API responses ──

// DATE columns come back as Date objects at UTC midnight; send "YYYY-MM-DD"
function formatDate(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

const summarySelect = {
  id: true,
  title: true,
  type: true,
  releaseDate: true,
  posterUrl: true,
  genres: { select: { genre: { select: { id: true, name: true } } } },
};

function toSummary(media) {
  return {
    id: media.id,
    title: media.title,
    type: media.type,
    releaseDate: formatDate(media.releaseDate),
    posterUrl: media.posterUrl,
    genres: media.genres.map((g) => g.genre).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ── Queries ──

function buildWhere({ search, type, genre }) {
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type) where.type = type;
  if (genre) {
    // Accept a genre id or a genre name
    where.genres = {
      some: isUuid(genre)
        ? { genreId: genre }
        : { genre: { name: { equals: genre, mode: "insensitive" } } },
    };
  }
  return where;
}

const SORTS = {
  title: [{ title: "asc" }],
  newest: [{ releaseDate: { sort: "desc", nulls: "last" } }, { title: "asc" }],
  oldest: [{ releaseDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
};

async function listMedia(query) {
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  const type = typeof query.type === "string" ? query.type.toUpperCase() : "";
  const genre = typeof query.genre === "string" ? query.genre.trim() : "";
  const sort = SORTS[query.sort] ? query.sort : "title";

  if (type && !MEDIA_TYPES.includes(type)) {
    throw new HttpError(400, "type must be MOVIE or TV_SHOW");
  }

  const { page, limit, skip } = parsePagination(query);
  const where = buildWhere({ search, type, genre });

  const [total, rows] = await prisma.$transaction([
    prisma.media.count({ where }),
    prisma.media.findMany({ where, select: summarySelect, orderBy: SORTS[sort], skip, take: limit }),
  ]);

  return {
    items: rows.map(toSummary),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getMediaById(id, userId) {
  const media = await prisma.media.findUnique({
    where: { id },
    include: {
      movieDetails: true,
      tvShowDetails: true,
      genres: { select: { genre: { select: { id: true, name: true } } } },
    },
  });
  if (!media) throw new HttpError(404, "Media not found");

  const result = {
    ...toSummary(media),
    description: media.description,
    movieDetails: media.movieDetails ? { duration: media.movieDetails.duration } : null,
    tvShowDetails: media.tvShowDetails
      ? {
          numberOfSeasons: media.tvShowDetails.numberOfSeasons,
          numberOfEpisodes: media.tvShowDetails.numberOfEpisodes,
        }
      : null,
  };

  // The signed-in user's own state for this title
  if (userId) {
    const [preference, saved, collections] = await Promise.all([
      prisma.userPreference.findUnique({
        where: { userId_mediaId: { userId, mediaId: id } },
        select: { preferenceType: true },
      }),
      prisma.userSavedMedia.findUnique({
        where: { userId_mediaId: { userId, mediaId: id } },
        select: { savedAt: true },
      }),
      prisma.collectionMedia.findMany({
        where: { mediaId: id, collection: { userId } },
        select: { collectionId: true },
      }),
    ]);
    result.viewer = {
      preference: preference ? preference.preferenceType : null,
      saved: Boolean(saved),
      collectionIds: collections.map((c) => c.collectionId),
    };
  }

  return result;
}

async function listGenres() {
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { media: true } } },
  });
  return genres.map((g) => ({ id: g.id, name: g.name, mediaCount: g._count.media }));
}

module.exports = { listMedia, getMediaById, listGenres, toSummary, summarySelect };
