const prisma = require("../config/prisma");
const HttpError = require("../utils/httpError");
const { PREFERENCE_TYPES, parsePagination } = require("../utils/validation");
const { toSummary, summarySelect } = require("./media.service");

// 404 instead of a foreign-key error when the title does not exist
async function ensureMediaExists(mediaId) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw new HttpError(404, "Media not found");
}

function paginated(items, total, page, limit) {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

// ── Likes / dislikes ──

function parsePreferenceType(value) {
  const type = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!PREFERENCE_TYPES.includes(type)) {
    throw new HttpError(400, "Validation failed", { type: "type must be LIKE or DISLIKE" });
  }
  return type;
}

// Sets the user's verdict, replacing an earlier one (a user has at most one per title)
async function setPreference(userId, mediaId, body) {
  const preferenceType = parsePreferenceType(body.type);
  await ensureMediaExists(mediaId);
  const row = await prisma.userPreference.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    update: { preferenceType },
    create: { userId, mediaId, preferenceType },
    select: { preferenceType: true, updatedAt: true },
  });
  return { mediaId, preference: row.preferenceType, updatedAt: row.updatedAt };
}

// Idempotent: removing a verdict that does not exist is not an error
async function removePreference(userId, mediaId) {
  await prisma.userPreference.deleteMany({ where: { userId, mediaId } });
}

async function listPreferences(userId, query) {
  const type = typeof query.type === "string" && query.type ? parsePreferenceType(query.type) : null;
  const { page, limit, skip } = parsePagination(query);
  const where = { userId, ...(type && { preferenceType: type }) };

  const [total, rows] = await prisma.$transaction([
    prisma.userPreference.count({ where }),
    prisma.userPreference.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip,
      take: limit,
      select: { preferenceType: true, updatedAt: true, media: { select: summarySelect } },
    }),
  ]);

  const items = rows.map((r) => ({
    ...toSummary(r.media),
    preference: r.preferenceType,
    preferenceUpdatedAt: r.updatedAt,
  }));
  return paginated(items, total, page, limit);
}

// ── Library (saved titles) ──

// Idempotent: saving an already-saved title keeps the original savedAt
async function saveMedia(userId, mediaId) {
  await ensureMediaExists(mediaId);
  const row = await prisma.userSavedMedia.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    update: {},
    create: { userId, mediaId },
    select: { savedAt: true },
  });
  return { mediaId, saved: true, savedAt: row.savedAt };
}

async function unsaveMedia(userId, mediaId) {
  await prisma.userSavedMedia.deleteMany({ where: { userId, mediaId } });
}

async function listLibrary(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const where = { userId };

  const [total, rows] = await prisma.$transaction([
    prisma.userSavedMedia.count({ where }),
    prisma.userSavedMedia.findMany({
      where,
      orderBy: [{ savedAt: "desc" }, { id: "asc" }],
      skip,
      take: limit,
      select: { savedAt: true, media: { select: summarySelect } },
    }),
  ]);

  const items = rows.map((r) => ({ ...toSummary(r.media), savedAt: r.savedAt }));
  return paginated(items, total, page, limit);
}

module.exports = {
  ensureMediaExists,
  setPreference,
  removePreference,
  listPreferences,
  saveMedia,
  unsaveMedia,
  listLibrary,
};
