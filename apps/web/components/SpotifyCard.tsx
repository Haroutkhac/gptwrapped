'use client';

import { Play } from 'lucide-react';
import { clsx } from 'clsx';

interface SpotifyCardProps {
  title: string;
  description?: string;
  image?: React.ReactNode; // Can be an icon or image
  onClick?: () => void;
  className?: string;
}

export default function SpotifyCard({ title, description, image, onClick, className }: SpotifyCardProps) {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        "group relative p-4 rounded-md bg-[#181818] hover:bg-[#282828] transition-colors duration-300 ease-out cursor-pointer flex flex-col gap-4",
        className
      )}
    >
      <div className="relative aspect-square w-full bg-[#333] rounded shadow-lg overflow-hidden flex items-center justify-center text-neutral-400 mb-1">
        {image ? image : <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />}
        
        {/* Play Button on Hover */}
        <div className="absolute bottom-2 right-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl z-10">
          <button className="w-12 h-12 rounded-full bg-[#1DB954] hover:scale-105 hover:bg-[#1ed760] flex items-center justify-center text-black shadow-lg transition-transform">
            <Play fill="currentColor" size={24} className="ml-1" />
          </button>
        </div>
      </div>

      <div className="min-h-[60px]">
        <h3 className="text-white font-bold text-base truncate pb-1">{title}</h3>
        {description && (
          <p className="text-[#B3B3B3] text-sm line-clamp-2 leading-tight font-medium">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

