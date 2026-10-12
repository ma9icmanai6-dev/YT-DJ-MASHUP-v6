import React from 'react';

interface SlidingTitleProps {
  title: string;
  artist?: string;
  className?: string;
  accentClassName?: string;
}

export const SlidingTitle: React.FC<SlidingTitleProps> = ({
  title,
  artist,
  className = 'text-xs font-bold text-white',
  accentClassName = 'text-neutral-400 text-[10px]',
}) => {
  const isLong = title.length > 24;

  return (
    <div className="w-full overflow-hidden relative group/title">
      <div
        className={`whitespace-nowrap ${isLong ? 'animate-marquee-slide' : ''}`}
        style={isLong ? ({ '--slide-dist': `-${Math.min(75, Math.max(25, (title.length - 20) * 3))}%` } as React.CSSProperties) : undefined}
      >
        <span className={className}>{title}</span>
        {artist && (
          <span className={`ml-1.5 ${accentClassName}`}>
            · {artist}
          </span>
        )}
      </div>
    </div>
  );
};
