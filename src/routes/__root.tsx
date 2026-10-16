import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Cette page n'a pas pu se charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">Une erreur est survenue. Réessayez ou revenez à l'accueil.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Réessayer
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { name: "theme-color", content: "#0f172a" },
      { name: "color-scheme", content: "dark light" },
      { title: "BUP — Data room virtuelle sécurisée (Business Up)" },
      { name: "description", content: "BUP (Business Up) est la plateforme souveraine de data room virtuelle sécurisée pour vos levées de fonds, audits M&A, due diligence et cessions avec traçabilité intégrale." },
      { name: "keywords", content: "BUP, Business Up, data room, data room virtuelle, VDR, due diligence, levée de fonds, M&A, audit sécurisé, partage confidentiel, chiffrement AES-256" },
      { name: "author", content: "BUP (Business Up)" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BUP — Business Up" },
      { property: "og:title", content: "BUP — Data room virtuelle sécurisée (Business Up)" },
      { property: "og:description", content: "Plateforme souveraine de data room sécurisée pour levées de fonds, due diligence et cessions. Partagez vos documents sous scellé avec traçabilité complète." },
      { property: "og:image", content: "/og-image.png" },
      { property: "og:image:secure_url", content: "/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "611" },
      { property: "og:image:height", content: "381" },
      { property: "og:image:alt", content: "BUP (Business Up) — Data room virtuelle sécurisée" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@bup_dataroom" },
      { name: "twitter:title", content: "BUP — Data room virtuelle sécurisée (Business Up)" },
      { name: "twitter:description", content: "Plateforme souveraine de data room sécurisée pour levées de fonds, due diligence et cessions. Traçabilité complète et chiffrement bancaire." },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:image:alt", content: "BUP Data Room Aperçu Web" },
    ],
    links: [
      { rel: "canonical", href: "https://found-office.lovable.app/" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      ...(appCss ? [{ rel: "stylesheet", href: appCss }] : []),
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=2" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png?v=2" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png?v=2" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icone-256.png?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              "name": "BUP",
              "alternateName": "Business Up Data Room",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Plateforme souveraine de data room virtuelle sécurisée pour opérations financières, due diligence, fusions-acquisitions et levées de fonds.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              },
              "featureList": [
                "Chiffrement AES-256",
                "Journal d'audit certifié",
                "Gestion granulaire des droits d'accès",
                "Consultation sous scellé numérique",
                "Visionneuse web de documents intégrée"
              ]
            },
            {
              "@type": "Organization",
              "name": "BUP (Business Up)",
              "url": "https://found-office.lovable.app",
              "logo": "https://found-office.lovable.app/logo-bup.png"
            }
          ]
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
