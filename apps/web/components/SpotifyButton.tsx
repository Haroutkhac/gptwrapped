'use client';

import { clsx } from 'clsx';

interface SpotifyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export default function SpotifyButton({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: SpotifyButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center rounded-full font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
  
  const variants = {
    primary: "bg-[#1DB954] text-black hover:bg-[#1ed760] hover:scale-105",
    secondary: "bg-white text-black hover:scale-105",
    outline: "bg-transparent border border-[#727272] text-white hover:border-white hover:scale-105",
    ghost: "bg-transparent text-[#B3B3B3] hover:text-white hover:bg-[rgba(255,255,255,0.05)]",
  };

  const sizes = {
    sm: "px-4 py-1 text-xs",
    md: "px-8 py-3 text-sm",
    lg: "px-10 py-4 text-base",
    icon: "w-10 h-10 p-0 flex items-center justify-center",
  };

  return (
    <button 
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

