const { Router } = require("express");
const media = require("../controllers/media.controller");

const router = Router();

router.use("/auth", require("./auth.routes"));
router.use("/media", require("./media.routes"));
router.use("/me", require("./me.routes"));
router.use("/collections", require("./collections.routes"));
router.get("/genres", media.listGenres);

module.exports = router;
