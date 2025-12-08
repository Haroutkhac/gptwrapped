"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWrappedData } from "@/components/DataProvider";
import {
  loadEmbeddingAnalysis,
  saveEmbeddingAnalysis,
  clearEmbeddingAnalysis,
  subscribeToEmbeddingAnalysis,
  hasRawConversations as checkRawConversations,
  loadRawConversations,
  loadEmbeddingsEnabled,
  saveEmbeddingsEnabled,
} from "@/lib/storage";
import {
  analyzeTopicsWithEmbeddings,
  type TopicAnalysisResult,
  type SemanticCluster,
} from "@/lib/embeddings";
import {
  MessageSquare,
  RefreshCw,
  Play,
  BrainCircuit,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

interface AnalysisState {
  status: "idle" | "loading" | "complete" | "error";
  progress: number;
  message: string;
  error?: string;
}

function SemanticMap({
  analysis,
  activeCluster,
  onSelectCluster,
}: {
  analysis: TopicAnalysisResult;
  activeCluster: string | null;
  onSelectCluster: (id: string) => void;
}) {
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    title: string;
    x: number;
    y: number;
    color: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const clusterColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of analysis.clusters) {
      map.set(cluster.clusterId, cluster.color);
    }
    return map;
  }, [analysis.clusters]);

  const conversationTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const emb of analysis.embeddings) {
      map.set(emb.conversationId, emb.title);
    }
    return map;
  }, [analysis.embeddings]);

  const clusterCentroids = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const clusterPoints = new Map<string, { x: number; y: number }[]>();

    for (const p of analysis.projections) {
      if (!clusterPoints.has(p.clusterId)) {
        clusterPoints.set(p.clusterId, []);
      }
      clusterPoints.get(p.clusterId)!.push({ x: p.x, y: p.y });
    }

    for (const [id, points] of clusterPoints) {
      const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
      const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
      map.set(id, { x: avgX, y: avgY });
    }

    return map;
  }, [analysis.projections]);

  const handleMouseEnter = useCallback(
    (p: {
      conversationId: string;
      x: number;
      y: number;
      clusterId: string;
    }) => {
      const title = conversationTitles.get(p.conversationId) || "Untitled";
      const color = clusterColors.get(p.clusterId) || "#666";
      setHoveredNode({ id: p.conversationId, title, x: p.x, y: p.y, color });
    },
    [conversationTitles, clusterColors]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  return (
    <div className="w-full aspect-square bg-[#181818] rounded-lg border border-[#282828] overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none z-10" />
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          {analysis.clusters.map((cluster) => (
            <radialGradient
              key={`grad-${cluster.clusterId}`}
              id={`grad-${cluster.clusterId}`}
            >
              <stop offset="0%" stopColor={cluster.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={cluster.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {analysis.relations.map((rel) => {
          const source = clusterCentroids.get(rel.source);
          const target = clusterCentroids.get(rel.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${rel.source}-${rel.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={rel.similarity * 0.3}
            />
          );
        })}

        {analysis.clusters.map((cluster) => {
          const centroid = clusterCentroids.get(cluster.clusterId);
          if (!centroid) return null;
          const radius = Math.sqrt(cluster.conversationIds.length) * 4 + 8;
          return (
            <circle
              key={`bg-${cluster.clusterId}`}
              cx={centroid.x}
              cy={centroid.y}
              r={radius}
              fill={`url(#grad-${cluster.clusterId})`}
              className="cursor-pointer"
              onClick={() => onSelectCluster(cluster.clusterId)}
            />
          );
        })}

        {analysis.projections.map((p) => {
          const isActive = p.clusterId === activeCluster;
          const isHovered = hoveredNode?.id === p.conversationId;
          const color = clusterColors.get(p.clusterId) || "#666";
          return (
            <circle
              key={p.conversationId}
              cx={p.x}
              cy={p.y}
              r={isHovered ? 2.5 : isActive ? 1.8 : 1.2}
              fill={color}
              stroke={isHovered ? "#fff" : "transparent"}
              strokeWidth={0.3}
              opacity={activeCluster ? (isActive ? 0.9 : 0.15) : 0.7}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => handleMouseEnter(p)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelectCluster(p.clusterId)}
            />
          );
        })}
      </svg>

      {hoveredNode && (
        <div
          className="absolute z-20 pointer-events-none px-3 py-2 bg-[#282828] border border-[#404040] rounded-lg shadow-xl max-w-[200px] transform -translate-x-1/2"
          style={{
            left: `${hoveredNode.x}%`,
            top: `${Math.max(hoveredNode.y - 8, 5)}%`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="text-white text-xs font-medium truncate">
              {hoveredNode.title}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-[10px] text-[#666] pointer-events-none">
        Hover nodes to see titles
      </div>
    </div>
  );
}

function ClusterRow({
  cluster,
  isActive,
  onSelect,
  onViewConversations,
  totalSize,
  index,
}: {
  cluster: SemanticCluster;
  isActive: boolean;
  onSelect: () => void;
  onViewConversations: () => void;
  totalSize: number;
  index: number;
}) {
  const share = totalSize ? ((cluster.size / totalSize) * 100).toFixed(1) : "0";

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onViewConversations}
      className={clsx(
        "group grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 rounded-md items-center cursor-pointer transition-colors",
        isActive ? "bg-[#ffffff1a]" : "hover:bg-[#ffffff1a]"
      )}
    >
      <div className="w-8 text-[#B3B3B3] text-sm text-center group-hover:text-white flex items-center justify-center">
        <span className="group-hover:hidden">{index + 1}</span>
        <Play
          size={12}
          fill="currentColor"
          className="hidden group-hover:block text-white"
        />
      </div>

      <div className="flex flex-col min-w-0">
        <div
          className={clsx(
            "text-white text-base font-medium truncate",
            isActive ? "text-[#1DB954]" : ""
          )}
        >
          {cluster.label}
        </div>
        <div className="text-[#B3B3B3] text-xs truncate flex gap-2">
          <span style={{ color: cluster.color }}>●</span>
          {cluster.description}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-[#B3B3B3] group-hover:text-white">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewConversations();
          }}
          className="hidden sm:flex items-center gap-1 hover:text-[#1DB954] transition-colors"
        >
          {cluster.conversationIds.length} convs
          <ExternalLink size={12} />
        </button>
        <span className="sm:hidden">{cluster.conversationIds.length}</span>
        <span className="min-w-[4ch] text-right">{share}%</span>
      </div>
    </div>
  );
}

export default function TopicsClient() {
  const { data, hasImportedData, hydrated } = useWrappedData();
  const router = useRouter();
  const isUnlocked = hydrated && hasImportedData;
  const [analysis, setAnalysis] = useState<TopicAnalysisResult | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [hasRawConversations, setHasRawConversations] = useState(false);
  const [embeddingsEnabled, setEmbeddingsEnabled] = useState(false);

  useEffect(() => {
    setEmbeddingsEnabled(loadEmbeddingsEnabled());
  }, []);

  const handleToggleEmbeddings = useCallback((enabled: boolean) => {
    setEmbeddingsEnabled(enabled);
    saveEmbeddingsEnabled(enabled);
  }, []);

  const navigateToTopicConversations = useCallback(
    (clusterId: string) => {
      router.push(`/explore/conversations?topic=${clusterId}`);
    },
    [router]
  );

  useEffect(() => {
    const stored = loadEmbeddingAnalysis();
    if (stored && stored.clusters.length > 0) {
      setAnalysis(stored);
      setActiveCluster(stored.clusters[0]?.clusterId || null);
    }

    return subscribeToEmbeddingAnalysis((updated) => {
      if (updated) {
        setAnalysis(updated);
        setActiveCluster(updated.clusters[0]?.clusterId || null);
      } else {
        setAnalysis(null);
        setActiveCluster(null);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      checkRawConversations().then(setHasRawConversations);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!isUnlocked) return;

    setAnalysisState({
      status: "loading",
      progress: 0,
      message: "Preparing data...",
    });

    try {
      const conversations = await loadRawConversations();

      if (!conversations) {
        setAnalysisState({
          status: "error",
          progress: 0,
          message: "",
          error:
            "No raw conversation data found. Please re-import your ChatGPT export on the Import page.",
        });
        return;
      }

      const result = await analyzeTopicsWithEmbeddings(
        conversations,
        (progress, message) => {
          setAnalysisState({ status: "loading", progress, message });
        }
      );

      saveEmbeddingAnalysis(result);
      setAnalysis(result);
      setActiveCluster(result.clusters[0]?.clusterId || null);
      setAnalysisState({
        status: "complete",
        progress: 100,
        message: "Analysis complete!",
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisState({
        status: "error",
        progress: 0,
        message: "",
        error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  }, [isUnlocked]);

  const handleClear = useCallback(() => {
    clearEmbeddingAnalysis();
    setAnalysis(null);
    setActiveCluster(null);
    setAnalysisState({ status: "idle", progress: 0, message: "" });
  }, []);

  const totalSize = useMemo(() => {
    if (!analysis) return 0;
    return analysis.clusters.reduce((sum, c) => sum + c.size, 0);
  }, [analysis]);

  const activeClusterData = useMemo(() => {
    if (!analysis || !activeCluster) return null;
    return analysis.clusters.find((c) => c.clusterId === activeCluster) || null;
  }, [analysis, activeCluster]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-[#282828] rounded-full flex items-center justify-center mb-6">
          <MessageSquare size={40} className="text-[#B3B3B3]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">No Data Imported</h2>
        <p className="text-[#B3B3B3] mb-8 max-w-md">
          Import your ChatGPT export to analyze your conversation topics with
          AI-powered semantic clustering.
        </p>
        <a
          href="/import"
          className="bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
        >
          Import Data
        </a>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
          <BrainCircuit size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Unlock Topic Analysis
        </h2>
        <p className="text-[#B3B3B3] mb-8 max-w-lg">
          Use AI embeddings to discover meaningful topic clusters in your
          conversations. This runs locally in your browser using OpenAI&apos;s
          API (key required).
        </p>

        {analysisState.status === "loading" ? (
          <div className="w-full max-w-md space-y-2">
            <div className="h-2 bg-[#282828] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1DB954] transition-all duration-300"
                style={{ width: `${analysisState.progress}%` }}
              />
            </div>
            <p className="text-xs text-[#1DB954] font-mono">
              {analysisState.message}
            </p>
          </div>
        ) : (
          <>
            {analysisState.status === "error" && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-md mb-6 max-w-md">
                {analysisState.error}
              </div>
            )}

            {hasRawConversations ? (
              <div className="flex flex-col gap-4 items-center">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={embeddingsEnabled}
                      onChange={(e) => handleToggleEmbeddings(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#282828] rounded-full peer peer-checked:bg-[#1DB954] transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                  <span className="text-white text-sm font-medium">
                    Enable AI Topic Analysis
                  </span>
                </label>
                <p className="text-xs text-[#B3B3B3] max-w-sm text-center">
                  {embeddingsEnabled
                    ? "Your conversation titles will be sent to OpenAI to generate embeddings for topic clustering."
                    : "Toggle to allow requests to OpenAI's API for semantic analysis."}
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={!embeddingsEnabled}
                  className={clsx(
                    "font-bold py-3 px-8 rounded-full transition-all",
                    embeddingsEnabled
                      ? "bg-[#1DB954] text-black hover:scale-105"
                      : "bg-[#282828] text-[#666] cursor-not-allowed"
                  )}
                >
                  Analyze Topics
                </button>
              </div>
            ) : (
              <p className="text-yellow-500">
                Please re-import data to enable analysis.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#134e4a] to-[#121212] shrink-0">
        <div className="w-52 h-52 shadow-2xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shrink-0 rounded-sm">
          <BrainCircuit size={80} className="text-white" />
        </div>
        <div className="flex flex-col gap-2 pb-2 min-w-0">
          <span className="uppercase text-xs font-bold tracking-wider text-white">
            AI Analysis
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white truncate">
            Topic Clusters
          </h1>
          <p className="text-[#B3B3B3] text-sm mt-2 flex items-center gap-4">
            <span>
              {analysis.clusters.length} topics from{" "}
              {analysis.embeddings.length} conversations
            </span>
            <button
              onClick={handleClear}
              className="hover:text-white flex items-center gap-1 text-xs uppercase font-bold tracking-wider"
            >
              <RefreshCw size={12} /> Re-analyze
            </button>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 pb-32">
        {/* Left: Map */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-white font-bold text-xl">Semantic Map</h3>
          <SemanticMap
            analysis={analysis}
            activeCluster={activeCluster}
            onSelectCluster={setActiveCluster}
          />
          {activeClusterData && (
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828]">
              <h4 className="text-[#1DB954] font-bold text-lg mb-2">
                {activeClusterData.label}
              </h4>
              <p className="text-[#B3B3B3] text-sm mb-4">
                {activeClusterData.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {activeClusterData.keywords.slice(0, 6).map((k) => (
                  <span
                    key={k}
                    className="text-xs bg-[#282828] border border-[#333] px-2 py-1 rounded-full text-white"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <div className="text-xs text-[#B3B3B3] mb-4">
                {activeClusterData.conversationIds.length} conversations •{" "}
                {activeClusterData.messageCount} messages
              </div>
              <button
                onClick={() =>
                  navigateToTopicConversations(activeClusterData.clusterId)
                }
                className="w-full bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:scale-105 transition-transform text-sm flex items-center justify-center gap-2"
              >
                View Conversations
                <ExternalLink size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 bg-[#121212] flex flex-col">
          <h3 className="text-white font-bold text-xl mb-4">Topics</h3>
          <div>
            {analysis.clusters.map((cluster, i) => (
              <ClusterRow
                key={cluster.clusterId}
                cluster={cluster}
                isActive={cluster.clusterId === activeCluster}
                onSelect={() => setActiveCluster(cluster.clusterId)}
                onViewConversations={() =>
                  navigateToTopicConversations(cluster.clusterId)
                }
                totalSize={totalSize}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
