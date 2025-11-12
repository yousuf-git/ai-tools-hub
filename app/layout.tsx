import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Tools Hub - Your Personal AI Assistant Platform",
  description: "A modern platform for AI-powered tools including resume analysis, Upwork proposal writing, and more. Powered by Google Gemini AI.",
  keywords: ["AI tools", "resume analyzer", "proposal writer", "Upwork", "AI assistant", "Gemini AI"],
  authors: [{ name: "AI Tools Hub" }],
  creator: "AI Tools Hub",
  metadataBase: new URL('https://tools-hub.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tools-hub.vercel.app',
    title: 'AI Tools Hub - Your Personal AI Assistant Platform',
    description: 'A modern platform for AI-powered tools including resume analysis, Upwork proposal writing, and more.',
    siteName: 'AI Tools Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Tools Hub - Your Personal AI Assistant Platform',
    description: 'A modern platform for AI-powered tools including resume analysis, Upwork proposal writing, and more.',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
