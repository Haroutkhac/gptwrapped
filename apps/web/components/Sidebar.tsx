'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Library, 
  PlusSquare, 
  Heart, 
  Activity, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Download
} from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active?: boolean }) => (
    <Link 
      href={href as any} 
      className={clsx(
        "flex items-center gap-4 px-4 py-2 transition-colors duration-200 ease-in-out font-semibold text-sm",
        active ? "text-white" : "text-[#B3B3B3] hover:text-white"
      )}
    >
      <Icon size={24} strokeWidth={active ? 3 : 2} />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="w-[240px] bg-black flex flex-col h-full pt-6 pb-2 gap-2 text-[#B3B3B3]">
      <div className="px-6 mb-2">
        <h1 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>GPT Wrapped</span>
        </h1>
      </div>
      
      <div className="flex flex-col px-2">
        <NavItem href="/" icon={Home} label="Home" active={isActive('/')} />
        <NavItem href="/explore/conversations" icon={Search} label="Search" active={isActive('/explore/conversations')} />
        <NavItem href="/import" icon={Library} label="Your Library" active={isActive('/import')} />
      </div>

      <div className="mt-2 px-2">
        <div className="pt-2">
          <NavItem 
            href="/explore/activity" 
            icon={Activity} 
            label="Activity" 
            active={isActive('/explore/activity')} 
          />
          <NavItem 
            href="/explore/topics" 
            icon={MessageSquare} 
            label="Topics" 
            active={isActive('/explore/topics')} 
          />
          <NavItem 
            href="/explore/modes" 
            icon={BarChart3} 
            label="Modes" 
            active={isActive('/explore/modes')} 
          />
        </div>
      </div>

      <div className="px-6 py-2">
        <hr className="border-[#282828]" />
      </div>

      <div className="flex-1 overflow-y-auto px-2 scroll-area">
        <div className="px-4 py-2 text-sm font-bold text-[#B3B3B3]">Playlists</div>
        <ul className="px-4 space-y-3 mt-2 text-sm text-[#B3B3B3]">
           <li className="hover:text-white cursor-pointer transition-colors">Your Top Songs 2024</li>
           <li className="hover:text-white cursor-pointer transition-colors">Coding Mode</li>
           <li className="hover:text-white cursor-pointer transition-colors">Deep Dive: React</li>
           <li className="hover:text-white cursor-pointer transition-colors">Creative Writing</li>
           <li className="hover:text-white cursor-pointer transition-colors">Debug Logs</li>
        </ul>
      </div>
      
      {/* User / Settings Area moved to bottom of sidebar or similar position */}
      <div className="mt-auto px-2">
         <NavItem href="/import" icon={Download} label="Import Data" active={isActive('/import')} />
      </div>
    </nav>
  );
}

