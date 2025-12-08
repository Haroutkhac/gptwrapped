"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWrappedData } from "@/components/DataProvider";
import {
  loadEmbeddingAnalysis,
  saveEmbeddingAnalysis,
  clearEmbeddingAnalysis,
  subscribeToEmbeddingAnalysis,
  hasRawConversations as checkRawConversations,
  loadRawConversations,
} from "@/lib/storage";
import {
  analyzeTopicsWithEmbeddings,
  type TopicAnalysisResult,
  type SemanticCluster,
} from "@/lib/embeddings";
import { MessageSquare, RefreshCw, Play, BrainCircuit } from "lucide-react";
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
  const clusterColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of analysis.clusters) {
      map.set(cluster.clusterId, cluster.color);
    }
    return map;
  }, [analysis.clusters]);

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

  return (
    <div className="w-full aspect-square bg-[#181818] rounded-lg border border-[#282828] overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />
      <svg
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
              <stop offset="0%" stopColor={cluster.color} stopOpacity="0.4" />
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
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={rel.similarity * 0.5}
              strokeDasharray="1,1"
            />
          );
        })}

        {analysis.clusters.map((cluster) => {
          const centroid = clusterCentroids.get(cluster.clusterId);
          if (!centroid) return null;
          const radius = Math.sqrt(cluster.conversationIds.length) * 3 + 5;
          return (
            <circle
              key={`bg-${cluster.clusterId}`}
              cx={centroid.x}
              cy={centroid.y}
              r={radius}
              fill={`url(#grad-${cluster.clusterId})`}
            />
          );
        })}

        {analysis.projections.map((p) => {
          const isActive = p.clusterId === activeCluster;
          return (
            <circle
              key={p.conversationId}
              cx={p.x}
              cy={p.y}
              r={isActive ? 1 : 0.6}
              fill={clusterColors.get(p.clusterId) || "#666"}
              opacity={activeCluster ? (isActive ? 1 : 0.1) : 0.6}
              className="transition-all duration-300"
            />
          );
        })}

        {analysis.clusters.map((cluster) => {
          const centroid = clusterCentroids.get(cluster.clusterId);
          if (!centroid) return null;
          const isActive = cluster.clusterId === activeCluster;
          return (
            <g
              key={`label-${cluster.clusterId}`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectCluster(cluster.clusterId)}
            >
              <circle
                cx={centroid.x}
                cy={centroid.y}
                r={isActive ? 2 : 1.5}
                fill={cluster.color}
                stroke={isActive ? "#fff" : "transparent"}
                strokeWidth={0.2}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-4 right-4 text-xs text-[#B3B3B3] pointer-events-none">
        Semantic Map
      </div>
    </div>
  );
}

function ClusterRow({
  cluster,
  isActive,
  onSelect,
  totalSize,
  index,
}: {
  cluster: SemanticCluster;
  isActive: boolean;
  onSelect: () => void;
  totalSize: number;
  index: number;
}) {
  const share = totalSize ? ((cluster.size / totalSize) * 100).toFixed(1) : "0";

  return (
    <div
      onClick={onSelect}
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
        <span className="hidden sm:block">
          {cluster.conversationIds.length} convs
        </span>
        <span className="min-w-[4ch] text-right">{share}%</span>
      </div>
    </div>
  );
}

export default function TopicsClient() {
  const { data, hasImportedData, hydrated } = useWrappedData();
  const isUnlocked = hydrated && hasImportedData;
  const [analysis, setAnalysis] = useState<TopicAnalysisResult | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [hasRawConversations, setHasRawConversations] = useState(false);

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
          conversations. This runs locally in your browser using OpenAI's API
          (key required).
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAnalyze}
                  className="bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
                >
                  Analyze Topics
                </button>
                <span className="text-xs text-[#B3B3B3] opacity-60">
                  Requires OpenAI API Key
                </span>
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
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#134e4a] to-[#121212]">
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 overflow-hidden">
        {/* Left: Map */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-white font-bold text-xl">Semantic Map</h3>
          <SemanticMap
            analysis={analysis}
            activeCluster={activeCluster}
            onSelectCluster={setActiveCluster}
          />
          {activeClusterData && (
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828] flex-1 overflow-y-auto">
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
              <div className="text-xs text-[#B3B3B3]">
                {activeClusterData.conversationIds.length} conversations •{" "}
                {activeClusterData.messageCount} messages
              </div>
            </div>
          )}
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 bg-[#121212] flex flex-col min-h-0">
          <h3 className="text-white font-bold text-xl mb-4">Topics</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            {analysis.clusters.map((cluster, i) => (
              <ClusterRow
                key={cluster.clusterId}
                cluster={cluster}
                isActive={cluster.clusterId === activeCluster}
                onSelect={() => setActiveCluster(cluster.clusterId)}
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
