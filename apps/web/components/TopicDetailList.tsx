import type { Topic } from '@/types/data';

interface Props {
  topics: Topic[];
  activeTopicId?: string | null;
  onSelectTopic?: (topicId: string) => void;
}

function formatSentiment(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Neutral';
  }
  if (value > 0.15) return 'Positive';
  if (value < -0.15) return 'Negative';
  return 'Mixed';
}

export default function TopicDetailList({ topics, activeTopicId, onSelectTopic }: Props) {
  const topicTotal = topics.reduce((acc, topic) => acc + topic.size, 0) || 1;
  if (!topics.length) {
    return (
      <div style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Topic details</h3>
        <p style={{ color: '#94a3b8' }}>No topics detected yet.</p>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', width: '100%', overflow: 'hidden' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Topic details</h3>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table className="topic-table" style={{ width: '100%', minWidth: '600px', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '150px' }}>Topic</th>
              <th style={{ width: '80px' }}>Share</th>
              <th style={{ width: '100px' }}>Mood</th>
              <th style={{ width: '100px' }}>Messages</th>
              <th>Keywords</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => {
              const share = ((topic.size / topicTotal) * 100).toFixed(1);
              const isActive = topic.topic_id === activeTopicId;
              const handleSelect = () => onSelectTopic?.(topic.topic_id);
              return (
                <tr
                  key={topic.topic_id}
                  className={`topic-table__row${isActive ? ' topic-table__row--active' : ''}`}
                  onMouseEnter={handleSelect}
                  onFocus={handleSelect}
                  onClick={handleSelect}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelect();
                    }
                  }}
                  aria-pressed={isActive}
                  role="button"
                >
                  <td>
                    <div className="topic-table__row-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="topic-table__swatch" style={{ background: topic.color, flexShrink: 0 }} />
                      {topic.label}
                    </div>
                  </td>
                  <td>{share}%</td>
                  <td>{formatSentiment(topic.sentiment)}</td>
                  <td>{topic.messages ?? '—'}</td>
                  <td style={{ color: '#a5b4fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{topic.keywords?.length ? topic.keywords.slice(0, 3).join(', ') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
