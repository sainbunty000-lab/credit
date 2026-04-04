# Capital Analytics

A professional financial analysis platform built with [Expo](https://expo.dev) and React Native.

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a

   - [development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go)

## Deployment

### Frontend — Vercel

The web build is deployed via [Vercel](https://vercel.com). Configuration is in `vercel.json`.

```bash
npm run build:web   # expo export -p web  →  dist/
```

Set the `EXPO_PUBLIC_API_URL` environment variable in the Vercel project settings to point at the Railway backend (defaults to `https://perfect-backend-production-8ad7.up.railway.app`).

### Backend — Railway

The API server is deployed via [Railway](https://railway.app). Set the `EXPO_PUBLIC_API_URL` environment variable on Vercel to the Railway service URL shown in your Railway project dashboard.

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://expo.github.io/router/docs)
