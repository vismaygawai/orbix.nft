import React, { useState, useRef, useEffect } from "react";

interface LazyMediaProps {
  src: string;
  alt: string;
  isVideo: boolean;
  poster?: string;
}

const FALLBACK_POSTER = "/videos/nft1_poster.webp";

/**
 * Lazily mounts video or image NFT media when entering the viewport,
 * falling back to a local poster asset if external media fails to load.
 */
export function LazyMedia({ src, alt, isVideo, poster = FALLBACK_POSTER }: LazyMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const safeSrc = src || poster;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {isVideo && safeSrc !== poster ? (
        isVisible ? (
          <video
            src={safeSrc}
            poster={poster}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-navy-900/60 animate-pulse" />
        )
      ) : (
        <img
          src={safeSrc}
          alt={alt}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = poster;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </div>
  );
}
