import React, { useState } from 'react';

export default function CustomerPhotoGallery({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer Photos</h2>
        <p className="text-gray-400 text-sm text-center py-4">No customer photos available</p>
      </div>
    );
  }

  function prev() {
    setLightboxIndex(i => (i - 1 + photos.length) % photos.length);
  }
  function next() {
    setLightboxIndex(i => (i + 1) % photos.length);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Customer Photos ({photos.length})
      </h2>

      {/* Horizontal scroll gallery */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(i)}
            className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden snap-start bg-gray-100"
          >
            {photo.signedUrl ? (
              <img
                src={photo.signedUrl}
                alt={`Customer photo ${i + 1}`}
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="w-full h-full hidden items-center justify-center text-gray-300 text-xs">
              Photo unavailable
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="absolute top-4 right-4 text-white text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
          <img
            src={photos[lightboxIndex]?.signedUrl}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-8 flex gap-6" onClick={e => e.stopPropagation()}>
            <button
              onClick={prev}
              className="px-6 py-3 bg-white/20 text-white rounded-full text-lg font-bold"
            >
              ←
            </button>
            <button
              onClick={() => setLightboxIndex(null)}
              className="px-6 py-3 bg-white/20 text-white rounded-full text-sm font-semibold"
            >
              Close
            </button>
            <button
              onClick={next}
              className="px-6 py-3 bg-white/20 text-white rounded-full text-lg font-bold"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
