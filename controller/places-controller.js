const HttpError = require("../models/http-error");
const v5 = require("uuid").v4;
const { validationResult } = require("express-validator");
const getCoordinates = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const user = require("../models/user");
const fs = require("fs");

const getPlacesbyUserID = async (req, res, next) => {
  const params = req.params.uid;
  console.log("user id--->", params);
  let places;
  try {
    places = await Place.find({ creator: params });
    console.log("PLACES FROM BACKEND-->", places);
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again later",
      500
    );
    return next(error);
  }

  if (!places) {
    return next(
      new HttpError("Could not find a user with the specified ID", 404)
    );
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlaceByID = async (req, res, next) => {
  const params = req.params.pid;

  let place;
  try {
    place = await Place.findById(params);
  } catch (err) {
    const error = new HttpError("ID mentioned not found", 500);
    return next(error);
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place with the specified ID", 404)
    );
  }
  console.log("PLACE FROM BACKEND-->", place);
  res.json({ place: place.toObject({ getters: true }) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("errors-->", errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordinates(address);
    console.log("cooordinatessss---->", coordinates);
  } catch (error) {
    return next(error);
  }
  const newPlace = new Place({
    title,
    description,
    location: coordinates,
    image: req.file.path,
    address,
    creator: req.userData.userId,
  });

  console.log("added place-->", newPlace);
  let user;

  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("User not found, please try again.");
    return next(error);
  }
  console.log("user---->", user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPlace.save({ session: sess });
    user.places.push(newPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating place failed, please try again.");
    return next(error);
  }
  res.status(201).json({ place: newPlace.toObject() });
};

const editPlace = async (req, res, next) => {
  const editedPlaces = req.body;
  const id = req.params.pid;
  let place;
  try {
    place = await Place.findById(id);
  } catch (err) {
    const error = new HttpError("ID mentioned not found", 500);
    return next(error);
  }
  console.log("creator id--->", place);

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place", 401));
  }

  const objectKeys = Object.keys(editedPlaces);

  for (let object of objectKeys) {
    place[object] = editedPlaces[object];
  }

  try {
    place.save();
  } catch (err) {
    const error = new HttpError(
      "Unable to add place, please check your input and try again."
    );
    return next(error);
  }

  res.status(201).json({ place: place.toObject() });
};

const deletePlace = async (req, res, next) => {
  const toBeDeleted = req.params.pid;

  let place;
  try {
    place = await Place.findById(toBeDeleted).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Place could not be deleted, please try again later",
      500
    );
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this place", 401));
  }

  let imageId = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    await place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Place could not be deleted, please try again later",
      500
    );
    return next(error);
  }

  fs.unlink(imageId, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place deleted" });
};

exports.getPlaceByID = getPlaceByID;
exports.getPlacesbyUserID = getPlacesbyUserID;
exports.createPlace = createPlace;
exports.editPlace = editPlace;
exports.deletePlace = deletePlace;
