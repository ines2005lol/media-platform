const { Router } = require("express");
const library = require("../controllers/library.controller");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// The signed-in user's own lists
router.use(requireAuth);

router.get("/library", library.listLibrary);
router.get("/preferences", library.listPreferences);

module.exports = router;
