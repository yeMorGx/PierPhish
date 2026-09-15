import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { NotificationProvider } from "@/components/notifications/notification-center";
import { ProfileProvider } from "@/components/profile/profile-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PageTransition } from "@/components/ui/page-transition";

export const metadata: Metadata = {
  title: "PierPhish",
  description: "Visão operacional de risco humano e campanhas de segurança.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ProfileProvider>
                <PageTransition>{children}</PageTransition>
              </ProfileProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
