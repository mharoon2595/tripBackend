const express = require("express");
const app = express();
const placesRoute = require("./routes/places-routes");
const usersRoute = require("./routes/users-routes");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const HttpError = require("./models/http-error");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(cors());
app.use(bodyParser.json({ extended: false }));

app.use("/uploads/images", express.static(path.join("uploads", "images")));
app.use("/api/places", placesRoute);
app.use("/api/users", usersRoute);

app.use((req, res, next) => {
  const error = new HttpError("Unsupported route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.inzlklw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("Connected to server!");
    app.listen(5000);
  })
  .catch((err) => console.log(err));
