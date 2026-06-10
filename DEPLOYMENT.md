# SmartGroup Deployment Guide (Vercel + External API)

This project is split into:
- Frontend: Next.js app in client (deploy to Vercel)
- Backend: Express API in server (deploy to Render/Railway/Fly or another Node host)

## 1) Backend Deployment (required first)

Deploy the server folder to your backend host.

Required backend environment variables:
- NODE_ENV=production
- PORT=5000 (or provider default)
- DATABASE_URL=your_production_database_url
- JWT_SECRET=your_strong_secret
- GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
- OPENAI_API_KEY=your_openai_api_key
- CLIENT_URL=https://smart-group-six.vercel.app
- CLIENT_URLS=https://smart-group-six.vercel.app
- ALLOW_VERCEL_PREVIEWS=true

After deploy, copy your backend public URL, for example:
- https://smartgroup-api.onrender.com

Health check:
- GET https://your-backend-domain/api/health

## 2) Vercel Frontend Deployment

In Vercel project settings:
- Root Directory: client
- Framework Preset: Next.js

Set frontend environment variables in Vercel:
- BACKEND_URL=https://your-backend-domain
- NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

Optional:
- NEXT_PUBLIC_API_URL (leave unset when using proxy rewrites)

Why leave NEXT_PUBLIC_API_URL unset:
- The app defaults to same-origin /api in production.
- next.config.js rewrites /api/* -> BACKEND_URL/api/*.
- This avoids browser CORS complexity and keeps frontend calls stable.

## 3) Google OAuth Setup

In Google Cloud OAuth client configuration, add:

Authorized JavaScript origins:
- https://smart-group-six.vercel.app

Authorized redirect URIs:
- If your current flow uses popup credential only, no redirect URI is required.
- If you later add redirect flow, add your callback URLs explicitly.

## 4) Verify After Deployment

1. Open https://smart-group-six.vercel.app
2. Sign in with Google
3. Confirm dashboard data loads
4. Open My Tasks and verify task loading
5. Run one action (Start Task or Mark Done)
6. Open comments modal and post a comment

## 5) Troubleshooting

If login works but API requests fail:
- Confirm BACKEND_URL is set in Vercel and redeploy.
- Confirm backend health endpoint responds.
- Confirm backend CORS env includes smart-group-six.vercel.app.

If auth appears to reset between requests:
- Ensure backend is HTTPS.
- Ensure NODE_ENV=production on backend so secure/sameSite cookie flags are used.

If preview deployments fail API auth:
- Keep ALLOW_VERCEL_PREVIEWS=true on backend.
- Or add specific preview domains into CLIENT_URLS.
