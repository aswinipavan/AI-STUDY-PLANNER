import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Study Planner",
  description: "Your intelligent academic companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>
          <AuthProvider>
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
