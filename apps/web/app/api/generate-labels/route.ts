import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { clusters } = await request.json();
    
    if (!Array.isArray(clusters)) {
      return NextResponse.json(
        { error: 'clusters array is required' },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    const results: { label: string; description: string }[] = [];

    for (const cluster of clusters) {
      const sampleTitles = cluster.titles.slice(0, 15).join('\n- ');
      const keywordsStr = cluster.keywords.slice(0, 10).join(', ');

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that creates concise, meaningful topic labels for clusters of conversations. 
Given a list of conversation titles and common keywords, generate:
1. A short label (2-4 words max) that captures the main theme
2. A brief description (1 sentence) explaining what this topic cluster is about

Respond in JSON format: {"label": "...", "description": "..."}`
          },
          {
            role: 'user',
            content: `Conversation titles in this cluster:
- ${sampleTitles}

Common keywords: ${keywordsStr}

Generate a label and description for this topic cluster.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 150
      });

      try {
        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        results.push({
          label: parsed.label || `Topic ${results.length + 1}`,
          description: parsed.description || 'A cluster of related conversations.'
        });
      } catch {
        results.push({
          label: `Topic ${results.length + 1}`,
          description: 'A cluster of related conversations.'
        });
      }
    }

    return NextResponse.json({ labels: results });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate labels' },
      { status: 500 }
    );
  }
}

