'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Library, 
  Activity, 
  MessageSquare, 
  Download,
  ChevronRight,
  ChevronDown,
  Lock
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWrappedData } from '@/components/DataProvider';
import { useMemo, useState } from 'react';
import type { ConversationSummary } from '@/types/data';

export default function Sidebar() {
  const pathname = usePathname();
  const { data, hasImportedData, hydrated } = useWrappedData();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const isUnlocked = hydrated && hasImportedData;

  const isActive = (path: string) => pathname === path;

  const conversationsByTopic = useMemo(() => {
    const map: Record<string, ConversationSummary[]> = {};
    data.conversations.forEach((c) => {
      if (c.topic_id) {
        if (!map[c.topic_id]) {
          map[c.topic_id] = [];
        }
        map[c.topic_id].push(c);
      }
    });
    return map;
  }, [data.conversations]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

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
        </div>
      </div>

      <div className="px-6 py-2">
        <hr className="border-[#282828]" />
      </div>

      <div className="flex-1 overflow-y-auto px-2 scroll-area">
        <div className="px-4 py-2 text-sm font-bold text-[#B3B3B3]">Playlists</div>
        {isUnlocked ? (
          <ul className="px-2 space-y-1 mt-1 text-sm text-[#B3B3B3]">
            {data.topics.map((topic) => {
              const topicConvos = conversationsByTopic[topic.topic_id] || [];
              if (topicConvos.length === 0) return null;
              
              const isExpanded = expandedTopic === topic.topic_id;
              
              return (
                <li key={topic.topic_id} className="block">
                  <button 
                    onClick={() => toggleTopic(topic.topic_id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-2 py-1.5 hover:text-white transition-colors group rounded-md",
                      isExpanded && "text-white"
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-4 flex-shrink-0">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <span className="truncate font-medium">{topic.label}</span>
                    </div>
                    <span className="text-xs opacity-60 group-hover:opacity-100">{topicConvos.length}</span>
                  </button>
                  
                  {isExpanded && (
                    <ul className="pl-6 pr-1 py-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {topicConvos.map((convo) => (
                        <li key={convo.conversation_id}>
                          <Link 
                            href={`/explore/conversations?id=${convo.conversation_id}`}
                            className="block px-2 py-1 text-xs truncate hover:text-white hover:bg-[#282828] rounded-sm transition-colors"
                            title={convo.title}
                          >
                            {convo.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#282828] flex items-center justify-center">
              <Lock size={20} className="text-[#666]" />
            </div>
            <p className="text-xs text-[#666] mb-3">
              Import your data to see your conversation playlists
            </p>
            <Link 
              href="/import"
              className="text-xs text-[#1DB954] hover:underline font-medium"
            >
              Import Data →
            </Link>
          </div>
        )}
      </div>
      
      <div className="mt-auto px-2">
         <NavItem href="/import" icon={Download} label="Import Data" active={isActive('/import')} />
      </div>
    </nav>
  );
}
