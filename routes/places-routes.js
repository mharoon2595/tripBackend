const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const fileUpload = require("../middleware/fileUpload");
const checkAuth = require("../middleware/auth");

const {
  getPlaceByID,
  getPlacesbyUserID,
  createPlace,
  editPlace,
  deletePlace,
} = require("../controller/places-controller");

router.get("/user/:uid", getPlacesbyUserID);
router.get("/:pid", getPlaceByID);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 10 }),
    check("address").not().isEmpty(),
  ],
  createPlace
);
router.patch("/:pid", editPlace);
router.delete("/:pid", deletePlace);

module.exports = router;
