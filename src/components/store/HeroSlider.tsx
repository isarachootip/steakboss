"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlideDto } from "@/schemas/promo.schema";
import { HeroSlideView } from "./HeroSlideView";

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

export function HeroSlider({
  slides,
  freeShipThreshold,
}: {
  slides: readonly HeroSlideDto[];
  freeShipThreshold: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, goNext]);

  if (count === 0) return null;

  const currentSlide = slides[safeIndex]!;

  function handleTouchStart(e: React.TouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLElement>) {
    const startX = touchStartX.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    touchStartX.current = null;
    setPaused(false);
    if (startX === null || endX === null) return;
    const delta = startX - endX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) goNext();
    else goPrev();
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="แบนเนอร์โปรโมชันหน้าแรก"
      className="relative overflow-hidden bg-[#0d0b0a] group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <HeroSlideView
        key={currentSlide.id}
        slide={currentSlide}
        freeShipThreshold={freeShipThreshold}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="สไลด์ก่อนหน้า"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="สไลด์ถัดไป"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10"
            role="tablist"
            aria-label="เลือกสไลด์"
          >
            {slides.map((slide, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`สไลด์ที่ ${idx + 1}: ${slide.title}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? "w-7 bg-sb-pink"
                      : "w-2 bg-white/45 hover:bg-white/75"
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
