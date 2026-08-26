import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeApplier } from "@/components/providers/ThemeApplier";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Display face for headings. Self-hosted alongside Inter so the app makes no
// request to fonts.googleapis.com on first paint.
const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Study Planner",
  description: "Your intelligent academic companion",
};

/**
 * Resolves the theme while the browser is still parsing the document, so the
 * first frame is already correct. Applying it from an effect instead — which is
 * what the app did — repainted after hydration and dark-mode users saw a white
 * flash on every hard load.
 *
 * Reads the same store the app writes (zustand's persisted `theme-storage`),
 * falls back to the pre-store `theme` key, then to the OS setting. Wrapped in
 * try/catch because storage can be unavailable in private browsing.
 */
const THEME_SCRIPT = `(function(){try{var s=null,r=localStorage.getItem("theme-storage");if(r){s=(JSON.parse(r).state||{}).theme||null}if(s===null){s=localStorage.getItem("theme")}var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the script below edits this element's class list
    // before React hydrates, so the DOM legitimately differs from the markup.
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            {/* Keeps the class in step with the store once the app is running */}
            <ThemeApplier />
            <OfflineBanner />
            <ToastProvider>
              <OnboardingProvider>
                {children}
              </OnboardingProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
