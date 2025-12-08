'use client';

import { clsx } from 'clsx';

interface TrackRowProps {
  index: number;
  title: string;
  subTitle?: string;
  meta?: string;
  endMeta?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export default function TrackRow({ index, title, subTitle, meta, endMeta, onClick, icon, isActive }: TrackRowProps) {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        "group grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 rounded-md hover:bg-[rgba(255,255,255,0.1)] items-center cursor-pointer transition-colors",
        isActive && "bg-[rgba(255,255,255,0.1)]"
      )}
    >
      <div className="w-8 text-[#B3B3B3] text-sm text-center group-hover:text-white flex items-center justify-center">
        <span className="group-hover:hidden">{index}</span>
        <span className="hidden group-hover:block text-white">▶</span>
      </div>

      <div className="flex flex-col min-w-0">
        <div className={clsx("text-white text-base font-normal truncate", subTitle ? "" : "leading-tight")}>
          {title}
        </div>
        {subTitle && (
          <div className="text-[#B3B3B3] text-sm truncate group-hover:text-white transition-colors">
            {subTitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-8 text-sm text-[#B3B3B3] group-hover:text-white transition-colors">
         {meta && <span className="hidden sm:block">{meta}</span>}
         {endMeta && <span className="min-w-[4ch] text-right tabular-nums">{endMeta}</span>}
      </div>
    </div>
  );
}

