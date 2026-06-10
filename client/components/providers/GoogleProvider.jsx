'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleProvider({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    console.error(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined. Add it to client/.env.local and restart the dev server.'
    );
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
