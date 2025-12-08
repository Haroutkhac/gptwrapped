import type { NormalizedConversation } from "./analytics";

export interface ConversationEmbedding {
  conversationId: string;
  title: string;
  embedding: number[];
  messageCount: number;
  wordCount: number;
  timestamp: number;
}

export interface SemanticCluster {
  clusterId: string;
  label: string;
  description: string;
  color: string;
  conversationIds: string[];
  centroid: number[];
  keywords: string[];
  size: number;
  messageCount: number;
  sentiment: number;
}

export interface ClusterRelation {
  source: string;
  target: string;
  similarity: number;
}

export interface TopicAnalysisResult {
  clusters: SemanticCluster[];
  relations: ClusterRelation[];
  embeddings: ConversationEmbedding[];
  projections: {
    conversationId: string;
    x: number;
    y: number;
    clusterId: string;
  }[];
}

const CLUSTER_COLORS = [
  "#8b5cf6",
  "#f472b6",
  "#22d3ee",
  "#facc15",
  "#34d399",
  "#f97316",
  "#2dd4bf",
  "#c084fc",
  "#fb7185",
  "#38bdf8",
  "#a3e635",
  "#fbbf24",
  "#e879f9",
  "#67e8f9",
  "#f43f5e",
];

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function averageEmbedding(embeddings: number[][]): number[] {
  if (!embeddings.length) return [];
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= embeddings.length;
  }
  return avg;
}

function normalizeEmbedding(emb: number[]): number[] {
  let norm = 0;
  for (const v of emb) norm += v * v;
  norm = Math.sqrt(norm);
  if (!norm) return emb;
  return emb.map((v) => v / norm);
}

interface AgglomerativeNode {
  id: number;
  indices: number[];
  centroid: number[];
}

function agglomerativeClustering(
  embeddings: number[][],
  targetClusters: number
): number[] {
  if (embeddings.length <= targetClusters) {
    return embeddings.map((_, i) => i);
  }

  let nodes: AgglomerativeNode[] = embeddings.map((emb, i) => ({
    id: i,
    indices: [i],
    centroid: [...emb],
  }));

  while (nodes.length > targetClusters) {
    let bestI = 0,
      bestJ = 1,
      bestSim = -Infinity;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sim = cosineSimilarity(nodes[i].centroid, nodes[j].centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const merged: AgglomerativeNode = {
      id: nodes[bestI].id,
      indices: [...nodes[bestI].indices, ...nodes[bestJ].indices],
      centroid: averageEmbedding([
        ...nodes[bestI].indices.map((i) => embeddings[i]),
        ...nodes[bestJ].indices.map((i) => embeddings[i]),
      ]),
    };

    nodes = nodes.filter((_, i) => i !== bestI && i !== bestJ);
    nodes.push(merged);
  }

  const assignments = new Array(embeddings.length).fill(-1);
  nodes.forEach((node, clusterIdx) => {
    for (const i of node.indices) {
      assignments[i] = clusterIdx;
    }
  });

  return assignments;
}

function estimateClusterCount(n: number): number {
  if (n <= 3) return Math.max(1, n);
  if (n <= 10) return Math.min(n, 4);
  if (n <= 30) return Math.min(n, 6);
  if (n <= 100) return Math.min(n, 8);
  return Math.min(n, Math.floor(Math.sqrt(n)) + 2);
}

function pcaProjection(embeddings: number[][]): { x: number; y: number }[] {
  if (!embeddings.length) return [];

  const dim = embeddings[0].length;
  const n = embeddings.length;

  const mean = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      mean[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= n;
  }

  const centered = embeddings.map((emb) => emb.map((v, i) => v - mean[i]));

  const pc1 = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    pc1[i] = Math.random() - 0.5;
  }
  let norm = Math.sqrt(pc1.reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < dim; i++) pc1[i] /= norm;

  for (let iter = 0; iter < 20; iter++) {
    const newPc = new Array(dim).fill(0);
    for (const row of centered) {
      const dot = row.reduce((s, v, i) => s + v * pc1[i], 0);
      for (let i = 0; i < dim; i++) {
        newPc[i] += dot * row[i];
      }
    }
    norm = Math.sqrt(newPc.reduce((s, v) => s + v * v, 0));
    if (norm) {
      for (let i = 0; i < dim; i++) pc1[i] = newPc[i] / norm;
    }
  }

  const pc2 = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    pc2[i] = Math.random() - 0.5;
  }
  const dot1 = pc2.reduce((s, v, i) => s + v * pc1[i], 0);
  for (let i = 0; i < dim; i++) pc2[i] -= dot1 * pc1[i];
  norm = Math.sqrt(pc2.reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < dim; i++) pc2[i] /= norm || 1;

  for (let iter = 0; iter < 20; iter++) {
    const newPc = new Array(dim).fill(0);
    for (const row of centered) {
      const dot = row.reduce((s, v, i) => s + v * pc2[i], 0);
      for (let i = 0; i < dim; i++) {
        newPc[i] += dot * row[i];
      }
    }
    const dotProj = newPc.reduce((s, v, i) => s + v * pc1[i], 0);
    for (let i = 0; i < dim; i++) newPc[i] -= dotProj * pc1[i];
    norm = Math.sqrt(newPc.reduce((s, v) => s + v * v, 0));
    if (norm) {
      for (let i = 0; i < dim; i++) pc2[i] = newPc[i] / norm;
    }
  }

  const projections = centered.map((row) => ({
    x: row.reduce((s, v, i) => s + v * pc1[i], 0),
    y: row.reduce((s, v, i) => s + v * pc2[i], 0),
  }));

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of projections) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return projections.map((p) => ({
    x: ((p.x - minX) / rangeX) * 100,
    y: ((p.y - minY) / rangeY) * 100,
  }));
}

function getConversationText(
  conv: NormalizedConversation,
  maxLength = 2000
): string {
  const parts: string[] = [conv.title];
  for (const msg of conv.messages) {
    if (msg.role === "user" && msg.text) {
      parts.push(msg.text);
      if (parts.join(" ").length > maxLength) break;
    }
  }
  return parts.join(" ").slice(0, maxLength);
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  // eslint-disable-next-line no-restricted-globals
  const response = await fetch(`${API_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate embeddings");
  }

  const data = await response.json();
  return data.embeddings;
}

async function fetchClusterLabels(
  clusters: { titles: string[]; keywords: string[] }[]
): Promise<{ label: string; description: string }[]> {
  // eslint-disable-next-line no-restricted-globals
  const response = await fetch(`${API_BASE_URL}/api/generate-labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clusters }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate labels");
  }

  const data = await response.json();
  return data.labels;
}

function extractKeywordsFromTitles(titles: string[], limit = 10): string[] {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "our",
    "their",
    "what",
    "which",
    "who",
    "whom",
    "how",
    "when",
    "where",
    "why",
    "all",
    "each",
    "every",
    "both",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "not",
    "only",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
    "about",
    "help",
    "make",
    "using",
    "use",
  ]);

  const counts = new Map<string, number>();

  for (const title of titles) {
    const words = title.toLowerCase().match(/[a-z0-9]+/g) || [];
    for (const word of words) {
      if (word.length > 2 && !stopwords.has(word)) {
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function scoreSentiment(text: string): number {
  const lexicon: Record<string, number> = {
    love: 0.8,
    great: 0.6,
    awesome: 0.6,
    thanks: 0.4,
    good: 0.3,
    nice: 0.3,
    cool: 0.3,
    happy: 0.3,
    excited: 0.5,
    perfect: 0.5,
    excellent: 0.6,
    amazing: 0.6,
    wonderful: 0.5,
    bad: -0.4,
    broken: -0.5,
    bug: -0.4,
    error: -0.5,
    fail: -0.5,
    stuck: -0.3,
    terrible: -0.8,
    sad: -0.5,
    worry: -0.2,
    wrong: -0.3,
    issue: -0.3,
    problem: -0.4,
    fix: -0.2,
    crash: -0.6,
    hate: -0.8,
  };

  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (!words.length) return 0;

  let score = 0;
  for (const word of words) {
    score += lexicon[word] || 0;
  }
  return Math.max(-1, Math.min(1, score / words.length));
}

export async function analyzeTopicsWithEmbeddings(
  conversations: NormalizedConversation[],
  onProgress?: (progress: number, message: string) => void
): Promise<TopicAnalysisResult> {
  if (!conversations.length) {
    return { clusters: [], relations: [], embeddings: [], projections: [] };
  }

  onProgress?.(0, "Starting analysis...");

  const conversationTexts = conversations.map((conv) =>
    getConversationText(conv)
  );
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < conversationTexts.length; i += batchSize) {
    const batch = conversationTexts.slice(i, i + batchSize);
    onProgress?.(
      (i / conversationTexts.length) * 40,
      `Generating embeddings... (${i}/${conversationTexts.length})`
    );

    const batchEmbeddings = await fetchEmbeddings(batch);
    allEmbeddings.push(...batchEmbeddings);
  }

  const embeddings: ConversationEmbedding[] = conversations.map((conv, i) => {
    const wordCount = conv.messages.reduce((sum, m) => sum + m.wordCount, 0);
    return {
      conversationId: conv.id,
      title: conv.title,
      embedding: allEmbeddings[i],
      messageCount: conv.messages.length,
      wordCount,
      timestamp: conv.createdAt,
    };
  });

  onProgress?.(45, "Clustering conversations...");

  const targetClusters = estimateClusterCount(embeddings.length);
  const assignments = agglomerativeClustering(allEmbeddings, targetClusters);

  const clusterMap = new Map<number, ConversationEmbedding[]>();
  for (let i = 0; i < embeddings.length; i++) {
    const clusterId = assignments[i];
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, []);
    }
    clusterMap.get(clusterId)!.push(embeddings[i]);
  }

  const clusterData: { titles: string[]; keywords: string[] }[] = [];
  const clusterEntries = Array.from(clusterMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [, items] of clusterEntries) {
    const titles = items.map((e) => e.title);
    const keywords = extractKeywordsFromTitles(titles);
    clusterData.push({ titles, keywords });
  }

  onProgress?.(55, "Generating topic labels with AI...");

  const labels = await fetchClusterLabels(clusterData);

  onProgress?.(90, "Building visualizations...");

  const clusters: SemanticCluster[] = [];
  const conversationToCluster = new Map<string, string>();

  clusterEntries.forEach(([, items], idx) => {
    const clusterIdStr = `cluster-${idx}`;
    const clusterEmbeddings = items.map((e) => e.embedding);
    const centroid = normalizeEmbedding(averageEmbedding(clusterEmbeddings));

    const allText = items.map((e) => e.title).join(" ");
    const sentiment = scoreSentiment(allText);

    for (const item of items) {
      conversationToCluster.set(item.conversationId, clusterIdStr);
    }

    clusters.push({
      clusterId: clusterIdStr,
      label: labels[idx]?.label || `Topic ${idx + 1}`,
      description: labels[idx]?.description || "",
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      conversationIds: items.map((e) => e.conversationId),
      centroid,
      keywords: clusterData[idx].keywords.slice(0, 5),
      size: items.reduce((sum, e) => sum + e.wordCount, 0),
      messageCount: items.reduce((sum, e) => sum + e.messageCount, 0),
      sentiment,
    });
  });

  const relations: ClusterRelation[] = [];
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const sim = cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
      if (sim > 0.3) {
        relations.push({
          source: clusters[i].clusterId,
          target: clusters[j].clusterId,
          similarity: sim,
        });
      }
    }
  }

  const projections2D = pcaProjection(allEmbeddings);
  const projections = embeddings.map((e, i) => ({
    conversationId: e.conversationId,
    x: projections2D[i].x,
    y: projections2D[i].y,
    clusterId: conversationToCluster.get(e.conversationId) || "cluster-0",
  }));

  onProgress?.(100, "Complete!");

  return { clusters, relations, embeddings, projections };
}
