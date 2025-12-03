import { unzipSync, strFromU8 } from 'fflate';
import { normalizeExport, runLocalAnalysis, type NormalizedConversation } from '@/lib/analytics';
import type { WrappedData } from '@/types/data';

async function readZipFile(file: File) {
  const buffer = await file.arrayBuffer();
  const archive = unzipSync(new Uint8Array(buffer));
  const files: Record<string, string> = {};
  Object.entries(archive).forEach(([path, data]) => {
    files[path] = strFromU8(data as Uint8Array);
  });
  return files;
}

async function parseJsonFile(file: File) {
  const text = await file.text();
  return JSON.parse(text);
}

function flattenPayload(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return [payload];
}

export async function ingestExportFiles(files: File[]): Promise<NormalizedConversation[]> {
  const rawConversations: unknown[] = [];
  for (const file of files) {
    if (file.name.endsWith('.zip')) {
      const archive = await readZipFile(file);
      for (const [path, content] of Object.entries(archive)) {
        if (path.endsWith('conversations.json') || path.includes('conversations/')) {
          try {
            rawConversations.push(...flattenPayload(JSON.parse(content)));
          } catch (error) {
            console.warn('Failed to parse conversation file', path, error);
          }
        }
      }
    } else if (file.name.endsWith('.json')) {
      try {
        const payload = await parseJsonFile(file);
        rawConversations.push(...flattenPayload(payload));
      } catch (error) {
        console.warn('Failed to parse JSON file', file.name, error);
      }
    }
  }
  return normalizeExport(rawConversations);
}

export async function analyzeFiles(files: File[]): Promise<WrappedData> {
  const conversations = await ingestExportFiles(files);
  if (!conversations.length) {
    throw new Error('No conversations found in provided files.');
  }
  return runLocalAnalysis(conversations);
}
