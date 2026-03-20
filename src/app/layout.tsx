
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'MIT Art, Design & Technology',
  description: 'A smart school bus transportation solution for MIT ADT University.',
  icons: {
    icon: 'https://i.postimg.cc/zBM9Pvy2/cropped-circle-image.png',
    shortcut: 'https://i.postimg.cc/zBM9Pvy2/cropped-circle-image.png',
    apple: 'https://i.postimg.cc/zBM9Pvy2/cropped-circle-image.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://i.postimg.cc/zBM9Pvy2/cropped-circle-image.png" type="image/png" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
