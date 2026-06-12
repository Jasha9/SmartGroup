'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleProvider({ children }) {
  const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientId = String(rawClientId).trim().replace(/^['\"]|['\"]$/g, '');

  if (!clientId) {
    console.error(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined. Add it to client/.env.local and restart the dev server.'
    );
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
