"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { PageMetadata } from "@/components/app/page-metadata";
import { ProductTour } from "@/components/onboarding/product-tour";
import { NotificationProvider } from "@/components/notifications/notification-center";
import { CookieNotice } from "@/components/privacy/cookie-notice";
import { ProfileProvider } from "@/components/profile/profile-provider";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";
import { PageTransition } from "@/components/ui/page-transition";

function AppToaster() {
  const { preferences } = useTheme();

  return (
    <Toaster
      closeButton
      position="bottom-right"
      duration={5000}
      theme={preferences.mode}
      toastOptions={{
        classNames: {
          toast: "pierphish-sonner-toast",
          title: "pierphish-sonner-title",
          description: "pierphish-sonner-description",
        },
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="pierphish-theme-mode"
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PageMetadata />
          <AuthProvider>
            <ProfileProvider>
              <ProductTour />
              <NotificationProvider>
                <PageTransition>
                  {children}
                  <CookieNotice />
                </PageTransition>
              </NotificationProvider>
            </ProfileProvider>
          </AuthProvider>
          <AppToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
