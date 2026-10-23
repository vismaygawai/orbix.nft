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
import { AptosWalletProvider } from "@/components/wallet/AptosWalletProvider";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-space px-4 text-cream">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-grotesk text-neon">404</h1>
        <h2 className="mt-4 text-2xl font-grotesk uppercase tracking-wide">Artifact Not Found</h2>
        <p className="mt-2 text-sm font-mono text-cream/60">
          This digital ocean artifact does not exist or has drifted past observable currents.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="orb-button inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-mono uppercase text-cream"
          >
            Return to Surface
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("[Orbix Application Error]:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-space px-4 text-cream">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-grotesk uppercase text-neon tracking-wide">
          Signal Interrupted
        </h1>
        <p className="mt-2 text-xs font-mono text-cream/70">
          An unexpected anomaly occurred. Check wallet connection or reload.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="orb-button px-4 py-2 text-xs font-mono rounded-xl text-cream"
          >
            Retry Connection
          </button>
          <a
            href="/"
            className="liquid-glass px-4 py-2 text-xs font-mono rounded-xl text-cream border border-white/10 hover:bg-white/10"
          >
            Return Home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Orbix.Nft — Beneath the Surface NFT Marketplace on Aptos" },
      {
        name: "description",
        content: "Aptos-powered NFT Marketplace for ocean artifacts and digital collectibles.",
      },
      { property: "og:title", content: "Orbix.Nft — Beneath the Surface" },
      {
        property: "og:description",
        content:
          "Decentralized NFT marketplace and auctions powered by Aptos Move smart contracts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Condiment&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-space text-cream selection:bg-neon/30 selection:text-cream overflow-x-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletProvider>
        <div className="min-h-screen flex flex-col bg-space text-cream relative overflow-x-hidden">
          <NavBar />
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
          <Toaster richColors position="top-right" theme="dark" />
        </div>
      </AptosWalletProvider>
    </QueryClientProvider>
  );
}
