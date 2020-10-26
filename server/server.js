const { join } = require("path");
const express = require("express");
const logger = require("pino")();
const expressLogger = require("express-pino-logger")({
  logger,
});
const tokensController = require("./controllers/tokensController");
const recordingsController = require("./controllers/recordingsController");
const app = express();

app.use(expressLogger);
app.use(express.static(join(__dirname, "..", "client", "dist")));

app.use("/tokens", tokensController);
app.use("/recordings", recordingsController);

module.exports = { app, logger };
