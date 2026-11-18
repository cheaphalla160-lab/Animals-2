import { useState } from 'react';
import { ANIMALS, AnimalId } from '../data/animals';

interface AnimalImageProps {
  animalId: AnimalId;
  className?: string;
  imgClassName?: string;
}

export function AnimalImage({ animalId, className = '', imgClassName = '' }: AnimalImageProps) {
  const [hasError, setHasError] = useState(false);
  const animal = ANIMALS[animalId];

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 border border-stone-200 p-3 text-center ${className}`}
      >
        <svg
          className="w-10 h-10 text-amber-600 mb-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        <span className="font-display text-sm font-semibold text-stone-700 capitalize">
          {animal.word}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#FAF6EC] ${className}`}>
      <img
        src={animal.imagePath}
        alt={`${animal.word} (${animal.chinese}) illustration`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover select-none ${imgClassName}`}
        draggable={false}
      />
    </div>
  );
}
