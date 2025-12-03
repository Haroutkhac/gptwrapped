'use client';

import { useMemo, useState } from 'react';
import { useWrappedData } from '@/components/DataProvider';
import TrackRow from '@/components/TrackRow';
import { Clock, Search, MessageSquare } from 'lucide-react';

export default function ConversationsClient() {
  const { data } = useWrappedData();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full relative">
      {/* Playlist Header */}
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#503e3e] to-[#121212]">
        <div className="w-52 h-52 shadow-2xl bg-gradient-to-br from-purple-700 to-orange-500 flex items-center justify-center shrink-0">
           <MessageSquare size={64} className="text-white" />
        </div>
        <div className="flex flex-col gap-2 pb-2 min-w-0">
          <span className="uppercase text-xs font-bold tracking-wider text-white">Playlist</span>
          <h1 className="text-4xl md:text-6xl font-black text-white truncate">All Conversations</h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            {data.summary.totals.messages.toLocaleString()} messages • {data.conversations.length} conversations
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#121212] sticky top-0 z-10 px-8 py-4 flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={20} />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#242424] text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm placeholder:text-[#B3B3B3]"
          />
        </div>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-8 py-2 text-[#B3B3B3] text-sm uppercase border-b border-[#282828] sticky top-[72px] bg-[#121212] z-10">
        <div className="w-8 text-center">#</div>
        <div className="pl-2">Title</div>
        <div className="flex items-center gap-8">
           <span className="hidden sm:block">Date</span>
           <Clock size={16} className="w-[4ch] text-right" />
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-8">
        {filteredConversations.map((conv, i) => (
          <TrackRow 
            key={conv.conversation_id}
            index={i + 1}
            title={conv.title}
            subTitle={selectedId === conv.conversation_id ? 'Currently Selected' : undefined}
            meta={new Date(conv.start).toLocaleDateString()}
            endMeta={`${conv.messages} msgs`}
            onClick={() => setSelectedId(conv.conversation_id)}
          />
        ))}
        {filteredConversations.length === 0 && (
          <div className="p-8 text-center text-[#B3B3B3]">
            No conversations found matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Selected Conversation "Now Playing" Details */}
      {selected && (
        <div className="fixed bottom-0 right-0 left-0 md:left-[240px] bg-[#181818] border-t border-[#282828] p-4 flex items-center justify-between gap-4 z-20">
           <div className="flex flex-col">
             <span className="text-white font-bold">{selected.title}</span>
             <span className="text-xs text-[#B3B3B3]">{selected.messages} messages • {selected.start}</span>
           </div>
           <div className="flex gap-2">
             {/* Could add specific actions here */}
           </div>
        </div>
      )}
    </div>
  );
}
