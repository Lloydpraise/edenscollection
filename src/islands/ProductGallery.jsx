// Product photos: large view with thumbnails, swipe on touch and a zoom-on-hover lens on desktop.
import { useRef, useState } from "react";

export default function ProductGallery({ images, alt, dark = false }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(null);
  const touch = useRef(null);
  const go = (i) => setIndex((i + images.length) % images.length);

  return (
    <div className={`gallery${dark ? " is-dark" : ""}`}>
      <div
        className={`gallery-stage${zoom ? " zooming" : ""}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : `${alt}, view ${i + 1}`}
            className={i === index ? "active" : ""}
            style={zoom && i === index ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
            width="600"
            height="750"
          />
        ))}
        {images.length > 1 && (
          <>
            <button type="button" className="gallery-nav prev" onClick={() => go(index - 1)} aria-label="Previous photo">‹</button>
            <button type="button" className="gallery-nav next" onClick={() => go(index + 1)} aria-label="Next photo">›</button>
            <span className="gallery-count">{index + 1} / {images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, i) => (
            <button type="button" key={src} className={i === index ? "active" : ""} onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
