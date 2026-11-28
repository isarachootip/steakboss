"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlideDto } from "@/schemas/promo.schema";
import { HeroSlideView } from "./HeroSlideView";

const AUTOPLAY_MS = 5500;
const SLIDE_DURATION_MS = 850;
const SWIPE_THRESHOLD_PX = 40;

export function HeroSlider({
  slides,
  freeShipThreshold,
}: {
  slides: readonly HeroSlideDto[];
  freeShipThreshold: number;
}) {
  const count = slides.length;
  const [trackIndex, setTrackIndex] = useState(count > 1 ? 1 : 0);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Build infinite loop track: [lastClone, ...slides, firstClone]
  const trackSlides =
    count > 1 ? [slides[count - 1]!, ...slides, slides[0]!] : [...slides];

  const activeIndex =
    count <= 1
      ? 0
      : trackIndex === 0
        ? count - 1
        : trackIndex === count + 1
          ? 0
          : trackIndex - 1;

  const snapIfClone = useCallback(() => {
    isAnimatingRef.current = false;
    if (count <= 1) return;
    if (trackIndex === count + 1) {
      setAnimated(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      setAnimated(false);
      setTrackIndex(count);
    }
  }, [count, trackIndex]);

  useEffect(() => {
    if (!animated) {
      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimated(true));
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [animated]);

  useEffect(() => {
    function handleVisibility() {
      setTabHidden(document.hidden);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Fallback unlock + clone snap in case transitionend is skipped (reduced motion / tab switch)
  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setTimeout(snapIfClone, SLIDE_DURATION_MS + 100);
    return () => window.clearTimeout(timer);
  }, [count, trackIndex, snapIfClone]);

  const goNext = useCallback(() => {
    if (count <= 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setAnimated(true);
    setTrackIndex((prev) => (prev >= count + 1 ? 1 : prev + 1));
  }, [count]);

  const goPrev = useCallback(() => {
    if (count <= 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setAnimated(true);
    setTrackIndex((prev) => (prev <= 0 ? count : prev - 1));
  }, [count]);

  const goToSlide = useCallback(
    (slideIdx: number) => {
      if (count <= 1) return;
      isAnimatingRef.current = false;
      setAnimated(true);
      setTrackIndex(slideIdx + 1);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused || tabHidden) return;
    const timer = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, tabHidden, goNext]);

  if (count === 0) return null;

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
      <div
        className="flex items-stretch will-change-transform motion-reduce:transition-none"
        style={{
          transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
          transition: animated
            ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) snapIfClone();
        }}
      >
        {trackSlides.map((slide, idx) => (
          <div key={`${slide.id}-${idx}`} className="w-full shrink-0">
            <HeroSlideView
              slide={slide}
              freeShipThreshold={freeShipThreshold}
            />
          </div>
        ))}
      </div>

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
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`สไลด์ที่ ${idx + 1}: ${slide.title}`}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
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
