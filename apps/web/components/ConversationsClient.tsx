'use client';

import { useMemo, useState } from 'react';
import { useWrappedData } from '@/components/DataProvider';
import TrackRow from '@/components/TrackRow';
import LockedOverlay from '@/components/LockedOverlay';
import { Clock, Search, MessageSquare, ChevronDown, ChevronUp, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function ConversationsClient() {
  const { data, hasImportedData, hydrated } = useWrappedData();
  const isUnlocked = hydrated && hasImportedData;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!search) return data.conversations;
    return data.conversations.filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [data.conversations, search]);

  const selected = useMemo(() => 
    data.conversations.find((conv) => conv.conversation_id === selectedId), 
    [data.conversations, selectedId]
  );

  const closePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(null);
    setIsExpanded(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#503e3e] to-[#121212]">
        <div className="w-52 h-52 shadow-2xl bg-gradient-to-br from-purple-700 to-orange-500 flex items-center justify-center shrink-0">
           <MessageSquare size={64} className="text-white" />
        </div>
        <div className="flex flex-col gap-2 pb-2 min-w-0">
          <span className="uppercase text-xs font-bold tracking-wider text-white">Playlist</span>
          <h1 className="text-4xl md:text-6xl font-black text-white truncate">All Conversations</h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            {isUnlocked 
              ? `${data.summary.totals.messages.toLocaleString()} messages • ${data.conversations.length} conversations`
              : 'Import your data to see your conversations'
            }
          </p>
        </div>
      </div>

      <div className="bg-[#121212] sticky top-0 z-10 px-8 py-4 flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={20} />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!isUnlocked}
            className="w-full bg-[#242424] text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm placeholder:text-[#B3B3B3] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-8 py-2 text-[#B3B3B3] text-sm uppercase border-b border-[#282828] sticky top-[72px] bg-[#121212] z-10">
        <div className="w-8 text-center">#</div>
        <div className="pl-2">Title</div>
        <div className="flex items-center gap-8">
           <span className="hidden sm:block">Date</span>
           <Clock size={16} className="w-[4ch] text-right" />
        </div>
      </div>

      <div className="px-4 pb-32 relative min-h-[300px]">
        {!isUnlocked && <LockedOverlay />}
        {isUnlocked ? (
          <>
            {filteredConversations.map((conv, i) => (
              <TrackRow 
                key={conv.conversation_id}
                index={i + 1}
                title={conv.title}
                isActive={selectedId === conv.conversation_id}
                meta={new Date(conv.start).toLocaleDateString()}
                endMeta={`${conv.messages} msgs`}
                onClick={() => {
                  if (selectedId === conv.conversation_id) {
                    setIsExpanded(true);
                  } else {
                    setSelectedId(conv.conversation_id);
                    setIsExpanded(false);
                  }
                }}
              />
            ))}
            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-[#B3B3B3]">
                No conversations found matching &ldquo;{search}&rdquo;
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-14 bg-[#1a1a1a] rounded-md animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {selected && isUnlocked && (
        <>
          <div 
            className={clsx(
              "fixed inset-0 z-50 bg-[#000] transition-transform duration-300 ease-in-out flex flex-col",
              isExpanded ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="flex items-center justify-between p-4 md:p-8">
              <button onClick={() => setIsExpanded(false)} className="text-white hover:scale-110 transition-transform">
                <ChevronDown size={32} />
              </button>
              <span className="text-xs font-bold tracking-widest uppercase text-[#B3B3B3]">Playing Conversation</span>
              <button onClick={closePlayer} className="text-white hover:scale-110 transition-transform">
                 <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-16 pb-8 max-w-4xl mx-auto w-full">
               <div className="mb-8 flex flex-col items-center text-center">
                  <div className="w-48 h-48 md:w-64 md:h-64 shadow-2xl bg-gradient-to-br from-purple-700 to-orange-500 flex items-center justify-center rounded-lg mb-6">
                    <MessageSquare size={80} className="text-white" />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{selected.title}</h2>
                  <p className="text-[#B3B3B3]">{selected.messages} messages • Started {selected.start}</p>
               </div>

               <div className="bg-[#121212] rounded-xl p-6 border border-[#282828] text-[#B3B3B3] text-center">
                  <p className="italic">
                     Full conversation content is not stored locally by default for privacy. 
                     <br/>To see message content, we would need to enable full-text import options.
                  </p>
                  <p className="mt-4 text-sm">
                    (Placeholder for formatted chat view)
                  </p>
               </div>
            </div>
          </div>

          <div 
            className="fixed bottom-0 right-0 left-0 md:left-[240px] bg-[#181818] border-t border-[#282828] p-3 flex items-center justify-between gap-4 z-40 cursor-pointer hover:bg-[#202020] transition-colors"
            onClick={() => setIsExpanded(true)}
          >
             <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-700 to-orange-500 flex items-center justify-center shrink-0 rounded">
                   <MessageSquare size={24} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm hover:underline">{selected.title}</span>
                  <span className="text-xs text-[#B3B3B3]">{selected.messages} messages</span>
                </div>
             </div>
             
             <div className="flex items-center gap-4 pr-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="text-[#B3B3B3] hover:text-white p-2"
                >
                   {isExpanded ? <ChevronDown /> : <ChevronUp />}
                </button>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
