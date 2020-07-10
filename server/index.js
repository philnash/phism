const { join } = require("path");
const express = require("express");
const pino = require("pino")();
const expressLogger = require("express-pino-logger")({
  logger: pino,
});
const app = express();

const config = require("./config");

app.use(expressLogger);
app.use(express.static(join(__dirname, "..", "client", "dist")));

app.listen(config.port, () => {
  pino.info(`Listening on localhost:${config.port}`);
});
