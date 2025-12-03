'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Topic } from '@/types/data';
import { TOPIC_OVERRIDES_EVENT, clearTopicOverrides, loadTopicOverrides, saveTopicOverrides } from '@/lib/storage';

interface Props {
  topics: Topic[];
}

export default function TopicManager({ topics }: Props) {
  const [rows, setRows] = useState<Topic[]>(topics);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasCustomizations, setHasCustomizations] = useState(false);
  const [query, setQuery] = useState('');
  const hasOverrides = useRef(false);

  useEffect(() => {
    const stored = loadTopicOverrides();
    if (stored?.length) {
      setRows(stored);
      hasOverrides.current = true;
      setHasCustomizations(true);
    }
  }, []);

  useEffect(() => {
    if (hasOverrides.current) {
      saveTopicOverrides(rows);
      setHasCustomizations(true);
    }
  }, [rows]);

  useEffect(() => {
    if (!hasOverrides.current) {
      setRows(topics);
    }
  }, [topics]);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent<Topic[] | null>).detail;
      if (payload) {
        hasOverrides.current = true;
        setHasCustomizations(true);
        setRows(payload);
      } else {
        hasOverrides.current = false;
        setHasCustomizations(false);
        setRows(topics);
        setSelected(new Set());
      }
    };
    window.addEventListener(TOPIC_OVERRIDES_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOPIC_OVERRIDES_EVENT, handler as EventListener);
  }, [topics]);

  const total = useMemo(() => rows.reduce((acc, topic) => acc + topic.size, 0), [rows]);
  const visibleRows = useMemo(() => {
    const lowered = query.toLowerCase();
    if (!lowered) return rows;
    return rows.filter((topic) => topic.label.toLowerCase().includes(lowered));
  }, [rows, query]);

  const toggleSelection = (topic_id: string) => {
    setSelected((prev) => {
      const draft = new Set(prev);
      if (draft.has(topic_id)) {
        draft.delete(topic_id);
      } else {
        draft.add(topic_id);
      }
      return draft;
    });
  };

  const handleRename = (topic_id: string, label: string) => {
    hasOverrides.current = true;
    setRows((prev) => prev.map((topic) => (topic.topic_id === topic_id ? { ...topic, label } : topic)));
  };

  const handleMerge = () => {
    if (selected.size < 2) return;
    const ids = Array.from(selected);
    const anchor = ids[0];
    hasOverrides.current = true;
    setRows((prev) => {
      const merging = prev.filter((topic) => selected.has(topic.topic_id));
      const anchorTopic = merging.find((topic) => topic.topic_id === anchor) ?? prev.find((topic) => topic.topic_id === anchor);
      const mergedSize = merging.reduce((acc, topic) => acc + topic.size, 0);
      const mergedMessages = merging.reduce((acc, topic) => acc + (topic.messages ?? 0), 0);
      const sentimentTotal = merging.reduce(
        (acc, topic) => acc + (topic.sentiment ?? 0) * (topic.messages ?? 0),
        0
      );
      const mergedSentiment = mergedMessages ? sentimentTotal / mergedMessages : anchorTopic?.sentiment;
      const merged = anchorTopic
        ? {
            ...anchorTopic,
            topic_id: anchorTopic.topic_id,
            size: mergedSize,
            messages: mergedMessages || anchorTopic.messages,
            sentiment: mergedSentiment
          }
        : {
            topic_id: anchor,
            label: 'Merged topic',
            size: mergedSize,
            color: '#f97316',
            messages: mergedMessages || undefined,
            sentiment: mergedSentiment
          };
      return [merged, ...prev.filter((topic) => !selected.has(topic.topic_id))];
    });
    setSelected(new Set([anchor]));
  };

  const handleResetOverrides = () => {
    hasOverrides.current = false;
    setRows(topics);
    setSelected(new Set());
    clearTopicOverrides();
    setHasCustomizations(false);
  };

  return (
    <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Topic table</h2>
          <input
            type="search"
            placeholder="Filter"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'inherit',
              padding: '0.3rem 0.8rem'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleMerge} disabled={selected.size < 2}>
            Merge selected
          </button>
          <button className="button" onClick={handleResetOverrides} disabled={!hasCustomizations}>
            Reset overrides
          </button>
        </div>
      </div>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ width: '60px' }}>Keep</th>
              <th style={{ width: 'auto' }}>Label</th>
              <th style={{ width: '80px' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((topic) => (
              <tr key={topic.topic_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td>
                  <input type="checkbox" checked={selected.has(topic.topic_id)} onChange={() => toggleSelection(topic.topic_id)} />
                </td>
                <td style={{ overflow: 'hidden' }}>
                  <input
                    value={topic.label}
                    onChange={(event) => handleRename(topic.topic_id, event.target.value)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      padding: '0.4rem 0.6rem',
                      color: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </td>
                <td>{total ? ((topic.size / total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
            {!visibleRows.length && (
              <tr>
                <td colSpan={3} style={{ padding: '0.75rem 0', color: '#94a3b8' }}>
                  No topics match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
