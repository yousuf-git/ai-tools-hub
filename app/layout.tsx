import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Archivo drives both body and display via its weight axis (Swiss grotesque).
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AI Forge — An AI Workbench for Freelance Developers",
  description: "A platform of AI tools for freelance developers: score a résumé against any job description, build one tailored to it, and write or grade the proposals that win the contract. Powered by Google Gemini.",
  keywords: ["AI tools", "resume analyzer", "proposal writer", "Upwork", "AI assistant", "Gemini AI"],
  authors: [{ name: "AI Forge" }],
  creator: "AI Forge",
  metadataBase: new URL('https://toolshub.yousuf-dev.com/'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://toolshub.yousuf-dev.com/',
    title: 'AI Forge - Your Personal AI Assistant Platform',
    description: 'A modern platform for AI-powered tools including resume analysis, Proposal writing, and more.',
    siteName: 'AI Forge',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Forge - Your Personal AI Assistant Platform',
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
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${plexMono.variable}`}>
      <body className={archivo.className}>
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
