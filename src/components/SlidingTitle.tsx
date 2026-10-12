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
  return (
    <div className="w-full overflow-hidden relative group/title select-none">
      {/* Edge gradient masks for hardware display bezel aesthetic */}
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-neutral-950/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-neutral-950/90 to-transparent z-10 pointer-events-none" />

      {/* Continuously scrolling DJ CDJ / VFD LED Ticker */}
      <div className="flex whitespace-nowrap overflow-hidden">
        <div className="inline-flex items-center animate-deck-ticker shrink-0 pr-8">
          <span className={className}>{title}</span>
          {artist && (
            <span className={`ml-2 ${accentClassName}`}>
              · {artist}
            </span>
          )}
          <span className="mx-4 text-cyan-400/40 text-[10px] font-mono">✦</span>
          <span className={className}>{title}</span>
          {artist && (
            <span className={`ml-2 ${accentClassName}`}>
              · {artist}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
