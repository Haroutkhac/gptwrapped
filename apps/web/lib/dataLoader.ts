import { z } from 'zod';
import { localFetch } from '@/lib/localFetch';
import {
  activityPointSchema,
  conversationSummarySchema,
  hourBucketSchema,
  modeSeriesSchema,
  summarySchema,
  topicSchema,
  topicSeriesSchema,
  type TopicSeriesPoint,
  type WrappedData
} from '@/types/data';
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function fetchAndParse<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await localFetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  const payload = await res.json();
  return schema.parse(payload);
}

async function readFileAndParse<T>(relativePath: string, schema: z.ZodType<T>): Promise<T> {
  const filePath = path.join(process.cwd(), 'public', 'data', relativePath);
  const raw = await fs.readFile(filePath, 'utf8');
  return schema.parse(JSON.parse(raw));
}

export async function loadWrappedData(): Promise<WrappedData | null> {
  try {
    const loaders = [
      ['summary.json', summarySchema],
      ['activity_timeseries.json', z.array(activityPointSchema)],
      ['topics.json', z.array(topicSchema)],
      ['messages_sample.json', z.array(conversationSummarySchema)],
      ['hour_histogram.json', z.array(hourBucketSchema)],
      ['mode_series.json', z.array(modeSeriesSchema)]
    ] as const;

    const [summary, activity, topics, conversations, hours, modeSeries] = await Promise.all(
      loaders.map(([file, schema]) => {
        if (typeof window === 'undefined') {
          return readFileAndParse(file, schema as z.ZodType<any>);
        }
        return fetchAndParse(`/data/${file}`, schema as z.ZodType<any>);
      })
    );

    let topicSeries: TopicSeriesPoint[] | undefined;
    const topicSeriesSchemaArray = z.array(topicSeriesSchema);
    try {
      if (typeof window === 'undefined') {
        topicSeries = await readFileAndParse('topic_series.json', topicSeriesSchemaArray);
      } else {
        topicSeries = await fetchAndParse('/data/topic_series.json', topicSeriesSchemaArray);
      }
    } catch (error) {
      const message = (error as Error)?.message ?? '';
      if (!(message.includes('404') || message.includes('Failed to load'))) {
        console.warn('Failed to load topic series dataset:', error);
      }
    }

    return { summary, activity, topics, conversations, hours, modeSeries, topicSeries };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Failed to load dataset:', error);
    }
    return null;
  }
}
