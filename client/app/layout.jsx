import './globals.css';
import { Inter } from 'next/font/google';
import ThemeProvider from '@/components/theme/ThemeProvider';
import GoogleProvider from '@/components/providers/GoogleProvider';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SmartGroup',
  description: 'AI-powered accountability for student group projects',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleProvider>
          <AuthProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
