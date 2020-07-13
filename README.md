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

## License

MIT (c) Phil Nash 2020
