'use client';

import Donut from '@/components/Donut';
import ModeStackedArea from '@/components/ModeStackedArea';
import { useWrappedData } from '@/components/DataProvider';
import { BarChart3 } from 'lucide-react';

const modeDefinitions: Record<string, string> = {
  code: 'Contains fenced code blocks or language keywords.',
  debug: 'Mentions errors, stack traces, or failing tests.',
  plan: 'Explicit planning, roadmaps, or milestones.',
  reflect: 'Retro-style reflections and lessons learned.',
  ask: 'Direct questions and information gathering.',
  chat: 'Short back-and-forth chatter.'
};

export default function ModesClient() {
  const { data } = useWrappedData();
  
  // Generate distinct colors for donut segments
  const MODE_COLORS = ['#1DB954', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="flex flex-col h-full pb-12">
       {/* Header */}
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#4c1d95] to-[#121212]">
        <div className="w-52 h-52 shadow-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
           <BarChart3 size={64} className="text-white" />
        </div>
        <div className="flex flex-col gap-2 pb-2 min-w-0">
          <span className="uppercase text-xs font-bold tracking-wider text-white">Analysis</span>
          <h1 className="text-4xl md:text-6xl font-black text-white truncate">Thinking Modes</h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            How you interact with ChatGPT across {data.summary.modes.length} detected modes.
          </p>
        </div>
      </div>

      <div className="px-8 mt-8 grid gap-8 grid-cols-1 lg:grid-cols-2">
        <div className="bg-[#181818] rounded-lg p-6 border border-[#282828]">
           <h2 className="text-xl font-bold text-white mb-6">Mode Split</h2>
           <Donut
            segments={data.summary.modes.map((mode, index) => ({
              label: mode.mode,
              pct: mode.pct,
              color: MODE_COLORS[index % MODE_COLORS.length]
            }))}
          />
        </div>

        <div className="bg-[#181818] rounded-lg p-6 border border-[#282828]">
           <h2 className="text-xl font-bold text-white mb-6">Definitions</h2>
           <ul className="space-y-4">
            {Object.entries(modeDefinitions).map(([mode, definition]) => (
              <li key={mode} className="flex flex-col gap-1">
                <strong className="text-white capitalize flex items-center gap-2">
                   {mode}
                </strong>
                <span className="text-[#B3B3B3] text-sm">{definition}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="col-span-1 lg:col-span-2 bg-[#181818] rounded-lg p-6 border border-[#282828]">
          <h2 className="text-xl font-bold text-white mb-6">Stacked Weekly Timeline</h2>
          <ModeStackedArea data={data.modeSeries ?? []} />
        </div>
      </div>
    </div>
  );
}
