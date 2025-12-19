import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const { clusters } = await request.json();

    if (!Array.isArray(clusters)) {
      return NextResponse.json(
        { error: "clusters array is required" },
        { status: 400 }
      );
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

    return NextResponse.json({ labels: results });
  } catch (error) {
    console.error("Label generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate labels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
