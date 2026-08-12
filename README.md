# Studio 9060

A private, installable photo booth that runs entirely in the browser. Studio 9060 captures a three-photo strip or four-photo grid and records the five-second moments before every shot. It generates a JPEG strip and MP4 reel locally, without accounts, uploads, databases, or server processing.

## Run locally

Camera access requires `localhost` or HTTPS.

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. The build includes the FFmpeg JavaScript and WebAssembly files so video processing continues to work after the PWA is installed and cached.

## Browser notes

- Use a recent version of Safari on iOS or Chrome on Android.
- The first visit needs a network connection to install the app shell. Later sessions work offline.
- Native file sharing depends on the browser's Web Share API support. Download links are always shown as a fallback.
- MP4 creation is CPU and memory intensive. Keeping other browser tabs closed improves reliability on older phones.
- Camera permission and PWA installation require HTTPS in production.

## Privacy

All photos and recordings remain in volatile browser memory until saved or shared. Resetting the session releases generated files. Studio 9060 includes no analytics, database, cloud storage, or upload endpoint.
