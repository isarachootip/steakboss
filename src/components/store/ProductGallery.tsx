"use client";

import { useState } from "react";

export function ProductGallery({
  name,
  images,
}: {
  name: string;
  images: Array<{ label: string; src: string }>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="space-y-3">
      <div className="rounded-3xl overflow-hidden aspect-square bg-black border border-sb-line">
        <img
          src={images[activeIdx]?.src ?? images[0]?.src}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="flex gap-3">
        {images.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition ${
              activeIdx === i ? "border-sb-pink" : "border-sb-line opacity-70"
            }`}
          >
            <img src={g.src} alt={g.label} className="w-full h-full object-cover object-top" />
          </button>
        ))}
      </div>
    </div>
  );
}
