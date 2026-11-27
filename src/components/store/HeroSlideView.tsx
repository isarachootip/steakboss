"use client";

import Link from "next/link";
import type { HeroSlideDto } from "@/schemas/promo.schema";
import { formatBaht } from "@/lib/format";

function isExternalUrl(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function HeroSlideView({
  slide,
  freeShipThreshold,
}: {
  slide: HeroSlideDto;
  freeShipThreshold: number;
}) {
  if (slide.mode === "IMAGE_BANNER") {
    const content = (
      <div className="relative w-full min-h-[56vh] sm:min-h-[72vh] flex items-center justify-center overflow-hidden bg-[#0d0b0a]">
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>
    );

    if (!slide.linkHref) return content;
    if (isExternalUrl(slide.linkHref)) {
      return (
        <a
          href={slide.linkHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={slide.title}
          className="block w-full focus:outline-none"
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={slide.linkHref}
        aria-label={slide.title}
        className="block w-full focus:outline-none"
      >
        {content}
      </Link>
    );
  }

  const headlineLines = slide.headline.split(/\r?\n/).filter(Boolean);

  return (
    <div className="relative min-h-[72vh] flex items-end overflow-hidden bg-[#0d0b0a]">
      <img
        src={slide.imageUrl}
        alt={slide.title}
        className="absolute inset-0 w-full h-full object-cover object-[70%_50%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b0a]/95 via-[#0d0b0a]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b0a]/90 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 space-y-5">
        {slide.eyebrow && (
          <p className="font-display text-xl sm:text-2xl text-sb-pink2 font-semibold">
            {slide.eyebrow}
          </p>
        )}
        {headlineLines.length > 0 && (
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl leading-[1.05]">
            {headlineLines.map((line, idx) => (
              <span key={idx}>
                {idx > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
        )}
        {slide.subheadline && (
          <p className="max-w-lg text-base sm:text-lg text-[#e9ddd5]">
            {slide.subheadline}
          </p>
        )}
        {(slide.primaryCtaLabel || slide.secondaryCtaLabel) && (
          <div className="flex flex-wrap gap-3">
            {slide.primaryCtaLabel && slide.primaryCtaHref && (
              <Link href={slide.primaryCtaHref} className="sb-btn">
                {slide.primaryCtaLabel}
              </Link>
            )}
            {slide.secondaryCtaLabel && slide.secondaryCtaHref && (
              <Link href={slide.secondaryCtaHref} className="sb-btn-ghost">
                {slide.secondaryCtaLabel}
              </Link>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold pt-2">
          {slide.badges.map((badge, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-sb-pink" /> {badge}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <i className="w-2 h-2 rounded-full bg-sb-pink" /> ส่งฟรีเมื่อครบ{" "}
            {formatBaht(freeShipThreshold)}
          </span>
        </div>
      </div>

      {slide.packCardImgUrl && (
        <div className="hidden md:block absolute right-8 bottom-12 z-10 w-44 bg-[#f1eeea] rounded-2xl p-2 shadow-2xl rotate-3">
          <img
            src={slide.packCardImgUrl}
            alt={slide.packCardCaption || slide.title}
            className="rounded-xl w-full"
          />
          {slide.packCardCaption && (
            <p className="font-display font-bold text-xs text-[#1a1205] text-center pt-1.5">
              {slide.packCardCaption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
