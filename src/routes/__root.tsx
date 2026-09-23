import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { WishlistProvider } from "@/lib/wishlist";
import { CampusProvider } from "@/lib/campus";
import { AuthProvider } from "@/lib/auth";
import { CatalogProvider, useCatalog } from "@/lib/catalog";
import { ItemRequestsProvider } from "@/lib/item-requests-catalog";
import { BackToTop } from "@/components/back-to-top";
import { PublicProfileSync } from "@/components/public-profile-sync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CampusKart MGM - The Trusted Marketplace for MGM College" },
      {
        name: "description",
        content:
          "Buy, sell, rent and exchange books, gadgets, notes and essentials with verified students across MGM College.",
      },
      { name: "author", content: "CampusKart MGM" },
      { property: "og:title", content: "CampusKart MGM - Student Marketplace for MGM College" },
      {
        property: "og:description",
        content: "Buy, sell, rent and exchange resources with verified students across MGM College.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function WishlistBridge({ children }: { children: ReactNode }) {
  const { products } = useCatalog();
  return <WishlistProvider products={products}>{children}</WishlistProvider>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogProvider>
        <ItemRequestsProvider>
          <ThemeProvider>
            <CampusProvider>
              <AuthProvider>
                <PublicProfileSync />
                <WishlistBridge>
                  <Outlet />
                  <BackToTop />
                  <Toaster />
                </WishlistBridge>
              </AuthProvider>
            </CampusProvider>
          </ThemeProvider>
        </ItemRequestsProvider>
      </CatalogProvider>
    </QueryClientProvider>
  );
}
