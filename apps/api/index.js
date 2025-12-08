import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey });
};

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/embeddings", async (req, res) => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts) || !texts.length) {
      return res.status(400).json({ error: "texts array is required" });
    }

    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 256,
    });

    res.json({
      embeddings: response.data.map((d) => d.embedding),
    });
  } catch (error) {
    console.error("Embedding error:", error);
    res.status(500).json({ error: "Failed to generate embeddings" });
  }
});

app.post("/api/generate-labels", async (req, res) => {
  try {
    const { clusters } = req.body;

    if (!Array.isArray(clusters)) {
      return res.status(400).json({ error: "clusters array is required" });
    }

    const client = getOpenAIClient();
    const results = [];

    for (const cluster of clusters) {
      const sampleTitles = cluster.titles.slice(0, 15).join("\n- ");
      const keywordsStr = cluster.keywords.slice(0, 10).join(", ");

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that creates concise, meaningful topic labels for clusters of conversations. 
Given a list of conversation titles and common keywords, generate:
1. A short label (2-4 words max) that captures the main theme
2. A brief description (1 sentence) explaining what this topic cluster is about

Respond in JSON format: {"label": "...", "description": "..."}`,
          },
          {
            role: "user",
            content: `Conversation titles in this cluster:
- ${sampleTitles}

Common keywords: ${keywordsStr}

Generate a label and description for this topic cluster.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 150,
      });

      try {
        const parsed = JSON.parse(response.choices[0].message.content || "{}");
        results.push({
          label: parsed.label || `Topic ${results.length + 1}`,
          description:
            parsed.description || "A cluster of related conversations.",
        });
      } catch {
        results.push({
          label: `Topic ${results.length + 1}`,
          description: "A cluster of related conversations.",
        });
      }
    }

    res.json({ labels: results });
  } catch (error) {
    console.error("Label generation error:", error);
    res.status(500).json({ error: "Failed to generate labels" });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
