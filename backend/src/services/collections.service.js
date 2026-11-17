const prisma = require("../config/prisma");
const HttpError = require("../utils/httpError");
const { throwIfErrors } = require("../utils/validation");
const { toSummary, summarySelect } = require("./media.service");
const { ensureMediaExists } = require("./library.service");

const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;
const PREVIEW_POSTERS = 4;

// ── Validation ──

// `partial` is used for PATCH: only the fields that are present are checked
function validateCollection(body, { partial = false } = {}) {
  const data = {};
  const errors = {};

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > NAME_MAX) {
      errors.name = `Name must be 1-${NAME_MAX} characters`;
    } else {
      data.name = name;
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.description = "Description must be text";
    } else if (body.description.trim().length > DESCRIPTION_MAX) {
      errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
    } else {
      data.description = body.description.trim() || null; // empty string clears it
    }
  } else if (body.description === null) {
    data.description = null;
  }

  throwIfErrors(errors);
  if (partial && Object.keys(data).length === 0) {
    throw new HttpError(400, "Nothing to update: send name and/or description");
  }
  return data;
}

// Friendly 409 for duplicates (case-insensitive); the unique index still guards exact races
async function ensureNameAvailable(userId, name, exceptId) {
  const clash = await prisma.collection.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId && { NOT: { id: exceptId } }),
    },
    select: { id: true },
  });
  if (clash) {
    throw new HttpError(409, "Collection already exists", {
      name: "You already have a collection with this name",
    });
  }
}

// Other users' collections answer 404, so their existence is not revealed. 
//It doesn't just check whether the collection exists. It checks whether it belongs to the authenticated user.
//A creat collection ID 12, B try to modify collection ID 12. -> 404
// authorization ! Are you allowed to perform this action? 

async function findOwnCollection(userId, collectionId) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });
  if (!collection) throw new HttpError(404, "Collection not found");
  return collection;
}

// ── Serialisers ──

const collectionFields = { id: true, name: true, description: true, createdAt: true, updatedAt: true };

function toCollection(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row._count.items,
  };
}

// ── Collections ──

async function listCollections(userId) {
  const rows = await prisma.collection.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      ...collectionFields,
      _count: { select: { items: true } },
      // A few recent titles, so the list can show a preview
      items: {
        orderBy: { addedAt: "desc" },
        take: PREVIEW_POSTERS,
        select: { media: { select: { id: true, title: true, posterUrl: true } } },
      },
    },
  });
  return rows.map((row) => ({ ...toCollection(row), preview: row.items.map((i) => i.media) }));
}

async function createCollection(userId, body) {
  const data = validateCollection(body);
  await ensureNameAvailable(userId, data.name);
  const row = await prisma.collection.create({
    data: { ...data, userId },
    select: { ...collectionFields, _count: { select: { items: true } } },
  });
  return toCollection(row);
}

async function getCollection(userId, collectionId) {
  const row = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: {
      ...collectionFields,
      _count: { select: { items: true } },
      items: {
        orderBy: [{ addedAt: "desc" }, { mediaId: "asc" }],
        select: { addedAt: true, media: { select: summarySelect } },
      },
    },
  });
  if (!row) throw new HttpError(404, "Collection not found");
  return {
    ...toCollection(row),
    items: row.items.map((i) => ({ ...toSummary(i.media), addedAt: i.addedAt })),
  };
}

async function updateCollection(userId, collectionId, body) {
  await findOwnCollection(userId, collectionId);
  const data = validateCollection(body, { partial: true });
  if (data.name) await ensureNameAvailable(userId, data.name, collectionId);
  const row = await prisma.collection.update({
    where: { id: collectionId },
    data,
    select: { ...collectionFields, _count: { select: { items: true } } },
  });
  return toCollection(row);
}

async function deleteCollection(userId, collectionId) {
  await findOwnCollection(userId, collectionId);
  await prisma.collection.delete({ where: { id: collectionId } });
}

// ── Items ──

// Idempotent: adding a title that is already in the collection keeps its addedAt
async function addItem(userId, collectionId, mediaId) {
  await findOwnCollection(userId, collectionId);
  await ensureMediaExists(mediaId);
  const [item] = await prisma.$transaction([
    prisma.collectionMedia.upsert({
      where: { collectionId_mediaId: { collectionId, mediaId } },
      update: {},
      create: { collectionId, mediaId },
      select: { addedAt: true },
    }),
    // Bump updatedAt so recently used collections sort first
    prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } }),
  ]);
  return { collectionId, mediaId, addedAt: item.addedAt };
}

async function removeItem(userId, collectionId, mediaId) {
  await findOwnCollection(userId, collectionId);
  const { count } = await prisma.collectionMedia.deleteMany({ where: { collectionId, mediaId } });
  if (count > 0) {
    await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
  }
}

module.exports = {
  listCollections,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addItem,
  removeItem,
};
