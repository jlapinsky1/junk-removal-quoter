import React, { useState } from 'react';

export default function PhotoGallery({ before = [], after = [] }) {
  const [lightbox, setLightbox] = useState(null); // { photos: [...], index: number }

  const allPhotos = [
    ...before.map(p => ({ ...p, label: 'Before' })),
    ...after.map(p => ({ ...p, label: 'After' })),
  ];

  function openLightbox(photos, index) {
    setLightbox({ photos, index });
  }

  function closeLightbox() {
    setLightbox(null);
  }

  function prevPhoto() {
    setLightbox(lb => ({
      ...lb,
      index: (lb.index - 1 + lb.photos.length) % lb.photos.length,
    }));
  }

  function nextPhoto() {
    setLightbox(lb => ({
      ...lb,
      index: (lb.index + 1) % lb.photos.length,
    }));
  }

  if (before.length === 0 && after.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        No photos available
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Before column */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Before ({before.length})
          </div>
          {before.length === 0 ? (
            <div className="text-sm text-gray-400">No before photos</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {before.map((photo, i) => (
                <PhotoThumb
                  key={photo.id || i}
                  photo={photo}
                  label="Before"
                  onClick={() => openLightbox(allPhotos, i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* After column */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            After ({after.length})
          </div>
          {after.length === 0 ? (
            <div className="text-sm text-gray-400">No after photos</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {after.map((photo, i) => (
                <PhotoThumb
                  key={photo.id || i}
                  photo={photo}
                  label="After"
                  onClick={() => openLightbox(allPhotos, before.length + i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="relative max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
            >
              Close
            </button>

            {/* Label */}
            <div className="text-center text-white/60 text-xs mb-2">
              {lightbox.photos[lightbox.index]?.label} · {lightbox.index + 1} of {lightbox.photos.length}
            </div>

            {/* Image */}
            <img
              src={lightbox.photos[lightbox.index]?.signedUrl}
              alt={lightbox.photos[lightbox.index]?.label}
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />

            {/* Nav */}
            {lightbox.photos.length > 1 && (
              <div className="flex justify-between mt-4">
                <button
                  onClick={prevPhoto}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={nextPhoto}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PhotoThumb({ photo, label, onClick }) {
  const [error, setError] = useState(false);

  if (!photo.signedUrl || error) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
        Unavailable
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <img
        src={photo.signedUrl}
        alt={label}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </button>
  );
}
