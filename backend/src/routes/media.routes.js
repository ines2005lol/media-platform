const { Router } = require("express");
const media = require("../controllers/media.controller");
const { optionalAuth } = require("../middleware/auth");

const router = Router();

// Browsing is public; a signed-in user also gets their own like/save state on details
router.get("/", media.list);
router.get("/:id", optionalAuth, media.getById);

module.exports = router;
