'use client';

import { useMemo, useState } from 'react';
import type { ConversationSummary } from '@/types/data';

interface Props {
  conversations: ConversationSummary[];
  selectedId?: string;
  onSelect?: (conversation: ConversationSummary) => void;
}

export default function ConversationsTable({ conversations, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase();
    return conversations.filter((conversation) => conversation.title.toLowerCase().includes(lowered));
  }, [conversations, query]);

  return (
    <div style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Conversations</h2>
        <input
          placeholder="Search title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            flex: '1 1 200px',
            minWidth: 0,
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: 'inherit',
            padding: '0.5rem 1rem',
            maxWidth: '100%'
          }}
        />
      </header>
      <div style={{ maxHeight: 360, overflow: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ width: '50%' }}>Title</th>
              <th style={{ width: '20%' }}>Messages</th>
              <th style={{ width: '30%' }}>Started</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((conversation) => {
              const isSelected = conversation.conversation_id === selectedId;
              return (
                <tr
                  key={conversation.conversation_id}
                  tabIndex={0}
                  onClick={() => onSelect?.(conversation)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(conversation);
                    }
                  }}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(59,130,246,0.12)' : 'transparent',
                    cursor: onSelect ? 'pointer' : 'default'
                  }}
                >
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>{conversation.title}</td>
                  <td>{conversation.messages}</td>
                  <td>{conversation.start}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
