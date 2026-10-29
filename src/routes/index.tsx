import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Mail, Twitter, Github, ChevronRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "orbix.nft — Beneath the Surface NFT Marketplace on Aptos" },
      {
        name: "description",
        content:
          "A collection of ocean artifacts fixed beyond tides and time on the Aptos blockchain.",
      },
      { property: "og:title", content: "orbix.nft — Beneath the Surface" },
      {
        property: "og:description",
        content: "A collection of ocean artifacts fixed beyond tides and time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preload", href: "/videos/hero_video_poster.webp", as: "image", type: "image/webp" },
    ],
  }),
  component: Index,
});

const HERO = "/videos/hero_video.mp4";
const HERO_POSTER = "/videos/hero_video_poster.webp";
const ABOUT = "/videos/about_video.mp4";
const ABOUT_POSTER = "/videos/about_video_poster.webp";
const CTA = "/videos/CTA_video.mp4";
const CTA_POSTER = "/videos/CTA_video_poster.webp";
const CARDS = [
  { src: "/videos/nft1.mp4", poster: "/videos/nft1_poster.webp", score: "8.7/10", tier: "Rare" },
  { src: "/videos/nft2.mp4", poster: "/videos/nft2_poster.webp", score: "9/10", tier: "Epic" },
  {
    src: "/videos/nft3.mp4",
    poster: "/videos/nft3_poster.webp",
    score: "8.2/10",
    tier: "Uncommon",
  },
];
const SOCIALS = [
  { Icon: Mail, label: "Email", href: "mailto:vismaygawai@gmail.com" },
  { Icon: Twitter, label: "Twitter", href: "https://x.com" },
  { Icon: Github, label: "GitHub", href: "https://github.com/vismaygawai/orbix.nft" },
];
const PAD = "max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16";
const ABOUT_TEXT =
  "A digital object fixed beyond tides and time. An exploration of depth, form, and silence in the ocean on the Aptos network.";

function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      loop
      muted
      playsInline
      preload="metadata"
    />
  );
}

function SocialButton({ Icon, label, href }: (typeof SOCIALS)[number]) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="liquid-glass rounded-[1.2rem] w-[52px] h-[52px] flex items-center justify-center text-cream border border-white/15 hover:border-white/30 hover:bg-white/15 hover:scale-105 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/20 outline-none shadow-lg shadow-black/20"
    >
      <Icon size={20} />
    </a>
  );
}

function Index() {
  return (
    <main className="bg-space text-cream overflow-x-hidden">
      <div className="noise-overlay fixed inset-0 z-50 pointer-events-none" aria-hidden />

      {/* HERO */}
      <section
        aria-label="Hero"
        className="relative min-h-[90vh] overflow-hidden flex items-center"
      >
        <video
          src={HERO}
          poster={HERO_POSTER}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Seamless bottom fade into About */}
        <div className="absolute inset-x-0 bottom-0 h-32 sm:h-48 bg-gradient-to-b from-transparent via-space/40 to-space pointer-events-none z-10" />

        {/* Social Buttons placed UP in the top-right corner */}
        <div className="hidden lg:flex flex-col gap-3 absolute top-6 sm:top-8 right-4 sm:right-6 md:right-10 lg:right-16 z-20">
          {SOCIALS.map((s) => (
            <SocialButton key={s.label} {...s} />
          ))}
        </div>

        <div className={`relative z-10 w-full ${PAD} py-12`}>
          <div className="flex flex-col justify-center min-h-[60vh] relative">
            <div className="relative max-w-[850px] lg:ml-20">
              <div className="sm:hidden mb-2">
                <span
                  aria-hidden="true"
                  className="font-condiment text-neon text-[24px] inline-block -rotate-2 opacity-95 normal-case"
                >
                  Aptos nft collection
                </span>
              </div>
              <h1 className="font-grotesk uppercase text-cream leading-[1.05] lg:leading-[0.98] text-[34px] sm:text-[60px] md:text-[75px] lg:text-[90px]">
                Beneath the surface
                <br />
                and ( its ) uncharted depths
              </h1>
              <span
                aria-hidden="true"
                className="hidden sm:inline-block font-condiment text-neon text-[36px] md:text-[48px] absolute -rotate-2 opacity-90 right-4 sm:right-10 top-[28%] normal-case pointer-events-none"
              >
                Aptos nft collection
              </span>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to="/market"
                  className="orb-button w-full sm:w-auto px-8 py-4 rounded-2xl font-mono text-sm font-bold uppercase tracking-wider text-cream flex items-center justify-center hover:scale-105 transition-transform text-center"
                >
                  <span>Explore Marketplace</span>
                </Link>

                <Link
                  to="/my-nfts"
                  className="liquid-glass w-full sm:w-auto px-8 py-4 rounded-2xl font-mono text-sm font-bold uppercase tracking-wider text-cream border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center text-center"
                >
                  <span>My Collection</span>
                </Link>
              </div>
            </div>

            <div className="flex lg:hidden justify-center gap-3 mt-8">
              {SOCIALS.map((s) => (
                <SocialButton key={s.label} {...s} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section aria-label="About" className="relative min-h-screen overflow-hidden">
        <LazyVideo
          src={ABOUT}
          poster={ABOUT_POSTER}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Seamless top fade from Hero */}
        <div className="absolute inset-x-0 top-0 h-32 sm:h-48 bg-gradient-to-b from-space via-space/40 to-transparent pointer-events-none z-10" />

        {/* Seamless bottom fade into Collection section */}
        <div className="absolute inset-x-0 bottom-0 h-28 sm:h-40 bg-gradient-to-b from-transparent to-space pointer-events-none z-10" />

        <div className={`relative z-10 ${PAD} py-16 md:py-24`}>
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            <h2 className="relative font-grotesk uppercase text-cream text-[32px] sm:text-[48px] md:text-[60px] leading-[1.1]">
              Hello!
              <br />
              I'm Orbix
              <span
                aria-hidden="true"
                className="font-condiment text-neon normal-case text-[28px] sm:text-[52px] md:text-[68px] absolute -rotate-1 right-0 sm:-right-16 -bottom-6 sm:-bottom-8 pointer-events-none"
              >
                Orbix
              </span>
            </h2>
            <div className="space-y-4 max-w-[340px]">
              <p className="font-mono text-[14px] md:text-[16px] uppercase text-cream leading-relaxed">
                {ABOUT_TEXT}
              </p>
              <Link
                to="/market"
                className="inline-flex items-center gap-2 text-neon font-mono text-xs uppercase tracking-wider hover:underline"
              >
                <span>View On-Chain Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COLLECTION HIGHLIGHT */}
      <section aria-labelledby="collection-heading" className="bg-space py-16 md:py-24">
        <div className={PAD}>
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-12">
            <h2
              id="collection-heading"
              className="font-grotesk uppercase text-cream text-[32px] sm:text-[48px] md:text-[60px] leading-[1.1]"
            >
              Collection of
              <span className="block ml-12 md:ml-24 lg:ml-32">
                <span aria-hidden="true" className="font-condiment text-neon normal-case">
                  Ocean
                </span>{" "}
                artifacts
              </span>
            </h2>
            <Link
              to="/market"
              className="inline-block hover:opacity-80 transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-white/20 outline-none"
            >
              <span className="flex items-center gap-3 font-grotesk uppercase text-cream">
                <span className="text-[32px] sm:text-[48px] md:text-[60px] leading-none">See</span>
                <span className="flex flex-col text-[20px] sm:text-[28px] md:text-[36px] leading-none">
                  <span>All</span>
                  <span>Artifacts</span>
                </span>
              </span>
              <span className="block bg-neon w-full h-[6px] sm:h-[8px] md:h-[10px] mt-2" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CARDS.map((c, i) => (
              <article
                key={i}
                className="liquid-glass rounded-[32px] p-[18px] group hover:bg-white/10 transition-colors duration-300"
              >
                <div className="relative pb-[100%] rounded-[24px] overflow-hidden">
                  <LazyVideo
                    src={c.src}
                    poster={c.poster}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 liquid-glass rounded-[20px] px-5 py-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-cream/70 font-mono uppercase">
                        Rarity Tier:
                      </span>
                      <span className="text-[16px] text-neon font-mono font-bold">
                        {c.tier} ({c.score})
                      </span>
                    </div>
                    <Link
                      to="/market"
                      aria-label={`View object ${i + 1}`}
                      className="orb-button w-12 h-12 rounded-full flex items-center justify-center text-cream hover:scale-110 transition-transform duration-200"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        aria-label="Call to action"
        className="relative overflow-hidden min-h-[460px] sm:min-h-0"
      >
        {/* Seamless top blend from Collection section */}
        <div className="absolute inset-x-0 top-0 h-28 sm:h-40 bg-gradient-to-b from-space to-transparent pointer-events-none z-10" />

        <LazyVideo
          src={CTA}
          poster={CTA_POSTER}
          className="w-full h-full min-h-[460px] sm:min-h-0 object-cover block"
        />

        {/* Seamless bottom blend into Footer */}
        <div className="absolute inset-x-0 bottom-0 h-28 sm:h-40 bg-gradient-to-b from-transparent to-space pointer-events-none z-10" />
        <div className="absolute inset-0 flex items-center">
          <div className="relative w-full px-4 sm:px-6 md:px-10 lg:pr-[20%] lg:pl-[15%] text-right">
            <h2 className="relative inline-block font-grotesk uppercase text-cream text-[20px] sm:text-[32px] md:text-[48px] lg:text-[60px] leading-[1.2]">
              <span
                aria-hidden="true"
                className="font-condiment text-neon normal-case text-[24px] sm:text-[36px] md:text-[48px] lg:text-[68px] absolute -top-[1.2em] left-0 -rotate-1"
              >
                Dive deep
              </span>
              <span className="block mb-3 sm:mb-6 md:mb-8 lg:mb-12">Dive in.</span>
              <span className="block">Reveal the depths.</span>
              <span className="block">Chart the unknown.</span>
              <span className="block">Follow the current.</span>
            </h2>

            <div className="mt-6 sm:mt-8">
              <Link
                to="/market"
                className="orb-button inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wider hover:scale-105 transition-transform"
              >
                <span>Enter Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
