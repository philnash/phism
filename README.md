# Phism

A video collaboration app.

## Running the application

Clone the application:

```bash
git clone https://github.com/philnash/phism.git
cd phism
```

Install the dependencies:

```bash
npm install
```

Copy the `.env.example` file to `.env`.

```bash
cp .env.example .env
```

Fill in your Twilio Account SID and an [API Key and Secret that you can generate in the Twilio console](https://www.twilio.com/console/video/project/api-keys) in the `.env` file.

Run the dev server:

```bash
npm start
```

## Todo/ideas

- [x] Choose and switch camera and microphone
- [x] Join a room
- [x] Disconnect from room
- [x] Screen sharing
- [x] Emoji reactions 👎👍⏪⏩☕😂👏❤️⏰✋✅❌🤦
- [ ] Muting yourself and hiding video
- [ ] Dominant speaker detection
- [ ] Breakout rooms
- [ ] Chat (Twilio Programmable Chat)
- [ ] Live captions (Web Speech API)
- [ ] Virtual background ([TensorFlow.js](https://blog.tensorflow.org/2019/11/updated-bodypix-2.html))

https://hihayk.github.io/scale/#4/6/50/80/-51/60/20/14/663399/102/51/153/d-1

## License

MIT (c) Phil Nash 2020
