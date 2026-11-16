const { Router } = require("express");
const media = require("../controllers/media.controller");
const library = require("../controllers/library.controller");
const { optionalAuth, requireAuth } = require("../middleware/auth");

const router = Router();

// Browsing is public; a signed-in user also gets their own like/save state on details
router.get("/", media.list);
router.get("/:id", optionalAuth, media.getById);

// Like / dislike a title
router.put("/:id/preference", requireAuth, library.setPreference);
router.delete("/:id/preference", requireAuth, library.removePreference);

// Save a title to the library
router.put("/:id/save", requireAuth, library.save);
router.delete("/:id/save", requireAuth, library.unsave);

module.exports = router;
