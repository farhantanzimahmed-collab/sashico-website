"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const displayImages = images.length > 0 ? images : [];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4">
      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[600px] sm:w-20 flex-shrink-0">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 overflow-hidden bg-brand-gray-50 rounded-lg transition-all duration-200",
                activeIdx === idx
                  ? "ring-1 ring-black"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={getImageUrl(img)}
                alt={`${productName} view ${idx + 1}`}
                fill
                sizes="80px"
                loading="lazy"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="flex-1">
        <div
          className={cn(
            "relative aspect-[3/4] bg-brand-gray-50 overflow-hidden rounded-lg cursor-zoom-in",
            zoomed && "cursor-zoom-out"
          )}
          onClick={() => setZoomed(!zoomed)}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setZoomed(false)}
        >
          {displayImages.length > 0 ? (
            <Image
              src={getImageUrl(displayImages[activeIdx])}
              alt={`${productName} - image ${activeIdx + 1}`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className={cn(
                "object-contain transition-transform duration-200",
                zoomed && "scale-150"
              )}
              style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-100">
              <p className="display-heading text-4xl text-brand-gray-200 tracking-[0.3em]">SCO</p>
            </div>
          )}

          {/* Zoom hint */}
          {!zoomed && displayImages.length > 0 && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn className="h-4 w-4 text-brand-gray-500" />
            </div>
          )}

          {/* Navigation arrows */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-lg hover:bg-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-lg hover:bg-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Image counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <p className="text-2xs font-medium text-black">
                {activeIdx + 1} / {displayImages.length}
              </p>
            </div>
          )}
        </div>

        {/* Dot indicators */}
        {displayImages.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {displayImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  activeIdx === idx
                    ? "w-6 bg-black"
                    : "w-2 bg-brand-gray-300 hover:bg-brand-gray-500"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
