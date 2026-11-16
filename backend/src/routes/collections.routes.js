const { Router } = require("express");
const collections = require("../controllers/collections.controller");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// Collections are private: every route needs a signed-in user
router.use(requireAuth);

router.get("/", collections.list);
router.post("/", collections.create);
router.get("/:id", collections.getById);
router.patch("/:id", collections.update);
router.delete("/:id", collections.remove);
router.put("/:id/items/:mediaId", collections.addItem);
router.delete("/:id/items/:mediaId", collections.removeItem);

module.exports = router;
