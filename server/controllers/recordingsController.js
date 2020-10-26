const { createWriteStream } = require("fs");
const { join, resolve } = require("path");
const { Router } = require("express");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

const liveRecordings = new Map();

router.post("/", upload.single("video-part"), (req, res) => {
  const key = `${req.body.identity}-${req.body.timeStarted}`;
  let fileStream;
  if (liveRecordings.has(key)) {
    fileStream = liveRecordings.get(key);
  } else {
    const path = resolve(join(__dirname, "..", "..", "recordings"));
    fileStream = createWriteStream(join(path, `${key}.webm`));
    liveRecordings.set(key, fileStream);
  }
  if (req.file) {
    fileStream.write(req.file.buffer);
  } else {
    fileStream.end();
    liveRecordings.delete(key);
  }
  res.status(201).send();
});

module.exports = router;
