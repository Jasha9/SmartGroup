# SmartGroup
SmartGroup is an AI-powered student collaboration and accountability platform designed to reduce social loafing in group projects through AI task planning, real-time collaboration, contribution tracking, and transparent task management using the PERN stack.

## Local development setup

1. Copy the server env example:
   - `cp server/.env.example server/.env`
2. Copy the client env example:
   - `cp client/.env.example client/.env.local`
3. In Google Cloud Console, register your app origin:
   - `Authorized JavaScript origins`: `http://localhost:3000`
4. Restart the client dev server after setting `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Google OAuth setup

The app uses `@react-oauth/google` on the client and verifies tokens on the server. Make sure the Google OAuth client is configured with:

- `Authorized JavaScript origins`: `http://localhost:3000`
- `Client ID` set in `client/.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `Client ID` set in `server/.env` as `GOOGLE_CLIENT_ID`

If you see `origin_mismatch`, the browser origin is not registered in your Google Cloud OAuth client settings.
