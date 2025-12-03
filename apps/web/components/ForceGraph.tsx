'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Topic } from '@/types/data';

const GOLDEN_ANGLE = 2.399963229728653;
const EDGE_THRESHOLD = 0.2;

interface Props {
  topics: Topic[];
  activeTopicId?: string | null;
  onActiveChange?: (topicId: string | null) => void;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  share: number;
  size: number;
  keywords: string[];
  topic: Topic;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  weight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function keywordSimilarity(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const term of setA) {
    if (setB.has(term)) overlap += 1;
  }
  const union = setA.size + setB.size - overlap || 1;
  return overlap / union;
}

function buildNodes(topics: Topic[], width: number, height: number): GraphNode[] {
  if (!topics.length) return [];
  const safeWidth = width || 640;
  const safeHeight = height || 360;
  const total = topics.reduce((acc, topic) => acc + topic.size, 0) || 1;
  const margin = Math.min(safeWidth, safeHeight) * 0.15;
  return [...topics]
    .sort((a, b) => b.size - a.size)
    .map((topic, index) => {
      const share = topic.size / total;
      const angle = index * GOLDEN_ANGLE;
      const radiusBase = Math.min(safeWidth, safeHeight) * 0.18;
      const radiusStep = Math.min(safeWidth, safeHeight) * 0.09;
      const radius = radiusBase + Math.sqrt(index + 1) * radiusStep;
      const rawX = safeWidth / 2 + Math.cos(angle) * radius;
      const rawY = safeHeight / 2 + Math.sin(angle) * radius;
      const x = clamp(rawX, margin, safeWidth - margin);
      const y = clamp(rawY, margin, safeHeight - margin);
      const minSize = 56;
      const maxSize = 140;
      const size = minSize + share * (maxSize - minSize);
      const keywords = (topic.keywords ?? []).map((term) => term.toLowerCase());
      return {
        id: topic.topic_id,
        label: topic.label,
        x,
        y,
        angle,
        color: topic.color,
        share,
        size,
        keywords,
        topic
      };
    });
}

function buildEdges(nodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const weight = keywordSimilarity(nodes[i].keywords, nodes[j].keywords);
      if (weight >= EDGE_THRESHOLD) {
        edges.push({ source: nodes[i], target: nodes[j], weight });
      }
    }
  }
  return edges;
}

function formatShare(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSentiment(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Neutral';
  if (value > 0.15) return 'Positive';
  if (value < -0.15) return 'Negative';
  return 'Mixed';
}

export default function ForceGraph({ topics, activeTopicId, onActiveChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 640, height: 360 });
  const [fallbackActiveId, setFallbackActiveId] = useState<string | null>(topics[0]?.topic_id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width && height) {
          setBounds({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const nodes = useMemo(() => buildNodes(topics, bounds.width, bounds.height), [topics, bounds]);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const derivedActive = activeTopicId ?? fallbackActiveId ?? nodes[0]?.id ?? null;
  const activeNode = nodes.find((node) => node.id === derivedActive) ?? nodes[0];

  const handleActiveChange = useCallback(
    (topicId: string | null) => {
      if (!topicId && nodes[0]) {
        onActiveChange?.(nodes[0].id);
        setFallbackActiveId(nodes[0].id);
        return;
      }
      onActiveChange?.(topicId);
      setFallbackActiveId(topicId);
    },
    [nodes, onActiveChange]
  );

  useEffect(() => {
    if (!activeTopicId && nodes[0]) {
      setFallbackActiveId(nodes[0].id);
    }
  }, [activeTopicId, nodes]);

  useEffect(() => {
    if (!nodes.some((node) => node.id === derivedActive) && nodes[0]) {
      handleActiveChange(nodes[0].id);
    }
  }, [nodes, derivedActive, handleActiveChange]);

  if (!topics.length) {
    return <p style={{ color: '#94a3b8' }}>No topics detected yet.</p>;
  }

  return (
    <div>
      <div className="topic-graph" ref={containerRef}>
        <svg className="topic-graph__edges" viewBox={`0 0 ${bounds.width} ${bounds.height}`} preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge) => (
            <line
              key={`${edge.source.id}-${edge.target.id}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1 + edge.weight * 4}
              opacity={0.7}
            />
          ))}
        </svg>
        <div className="topic-graph__nodes">
          {nodes.map((node) => {
            const isActive = node.id === activeNode?.id;
            const hoverOffset = isActive ? 12 : 0;
            const offsetX = Math.cos(node.angle) * hoverOffset;
            const offsetY = Math.sin(node.angle) * hoverOffset;
            const translateX = node.x - node.size / 2 + offsetX;
            const translateY = node.y - node.size / 2 + offsetY;
            return (
              <button
                key={node.id}
                className="topic-node"
                type="button"
                aria-pressed={isActive}
                style={{
                  width: node.size,
                  height: node.size,
                  background: node.color,
                  transform: `translate(${translateX}px, ${translateY}px) scale(${isActive ? 1.08 : 1})`,
                  boxShadow: isActive ? `0 12px 40px ${node.color}33` : '0 8px 24px rgba(0,0,0,0.35)'
                }}
                onMouseEnter={() => handleActiveChange(node.id)}
                onFocus={() => handleActiveChange(node.id)}
                onClick={() => handleActiveChange(node.id)}
                onMouseLeave={() => handleActiveChange(derivedActive)}
              >
                <span className="topic-node__label">{node.label}</span>
                <span className="topic-node__share">{formatShare(node.share)}</span>
              </button>
            );
          })}
        </div>
        {activeNode && (
          <aside className="topic-graph__panel">
            <p className="topic-graph__panel-label">Focused topic</p>
            <h3 style={{ margin: '0 0 0.5rem' }}>{activeNode.label}</h3>
            <dl className="topic-graph__panel-meta">
              <div>
                <dt>Share</dt>
                <dd>{formatShare(activeNode.share)}</dd>
              </div>
              <div>
                <dt>Mood</dt>
                <dd>{formatSentiment(activeNode.topic.sentiment)}</dd>
              </div>
              <div>
                <dt>Messages</dt>
                <dd>{activeNode.topic.messages ?? '—'}</dd>
              </div>
            </dl>
            <div className="topic-graph__keywords">
              {(activeNode.topic.keywords ?? []).map((keyword) => (
                <span key={`${activeNode.id}-${keyword}`} className="topic-graph__keyword">
                  {keyword}
                </span>
              ))}
              {!(activeNode.topic.keywords ?? []).length && <span className="topic-graph__keyword muted">No keywords captured</span>}
            </div>
          </aside>
        )}
      </div>
      <div className="topic-graph__legend">
        {nodes.map((node) => {
          const isActive = node.id === activeNode?.id;
          return (
            <button
              key={`legend-${node.id}`}
              type="button"
              className="topic-graph__legend-item"
              onClick={() => handleActiveChange(node.id)}
              aria-pressed={isActive}
            >
              <span className="topic-graph__legend-swatch" style={{ background: node.color }} />
              <span>{node.label}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{formatShare(node.share)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
