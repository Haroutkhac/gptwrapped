'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

interface LockedOverlayProps {
  message?: string;
  className?: string;
}

export default function LockedOverlay({ message = 'Import your data to unlock', className }: LockedOverlayProps) {
  const router = useRouter();

  return (
    <div 
      className={clsx(
        "absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-black/70",
        className
      )}
      onClick={() => router.push('/import')}
    >
      <div className="w-12 h-12 rounded-full bg-[#282828] flex items-center justify-center hover:scale-110 transition-transform">
        <Lock size={24} className="text-[#B3B3B3]" />
      </div>
      <span className="text-[#B3B3B3] text-sm font-medium hover:text-white transition-colors text-center px-4">
        {message}
      </span>
    </div>
  );
}
