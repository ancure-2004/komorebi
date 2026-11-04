import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import Providers from "@/components/Providers";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Komorebi 木漏れ日",
  description: "Aesthetic split-day timetable, focus sanctuary and LDR companion",
  applicationName: "Komorebi",
  appleWebApp: {
    capable: true,
    title: "Komorebi",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7D9D8B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("komorebi:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-cream text-ink dark:bg-mocha dark:text-cream font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
