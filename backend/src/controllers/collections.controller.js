const collectionsService = require("../services/collections.service");
const { requireBody, requireUuid } = require("../utils/validation");

async function list(req, res) {
  res.json({ items: await collectionsService.listCollections(req.user.id) });
}

async function create(req, res) {
  const collection = await collectionsService.createCollection(req.user.id, requireBody(req.body));
  res.status(201).json(collection);
}

async function getById(req, res) {
  const id = requireUuid(req.params.id, "collection id");
  res.json(await collectionsService.getCollection(req.user.id, id));
}

async function update(req, res) {
  const id = requireUuid(req.params.id, "collection id");
  res.json(await collectionsService.updateCollection(req.user.id, id, requireBody(req.body)));
}

async function remove(req, res) {
  const id = requireUuid(req.params.id, "collection id");
  await collectionsService.deleteCollection(req.user.id, id);
  res.status(204).end();
}

async function addItem(req, res) {
  const id = requireUuid(req.params.id, "collection id");
  const mediaId = requireUuid(req.params.mediaId, "media id");
  res.json(await collectionsService.addItem(req.user.id, id, mediaId));
}

async function removeItem(req, res) {
  const id = requireUuid(req.params.id, "collection id");
  const mediaId = requireUuid(req.params.mediaId, "media id");
  await collectionsService.removeItem(req.user.id, id, mediaId);
  res.status(204).end();
}

module.exports = { list, create, getById, update, remove, addItem, removeItem };
