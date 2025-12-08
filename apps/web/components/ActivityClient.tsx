'use client';

import Heatmap from '@/components/Heatmap';
import KpiStat from '@/components/KpiStat';
import LockedOverlay from '@/components/LockedOverlay';
import { useWrappedData } from '@/components/DataProvider';
import { Activity as ActivityIcon } from 'lucide-react';

export default function ActivityClient() {
  const { data, hasImportedData, hydrated } = useWrappedData();
  const isUnlocked = hydrated && hasImportedData;
  const histogram = data.hours ?? Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }));
  const maxMessages = Math.max(...histogram.map((bucket) => bucket.messages || 0), 1);

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#1e3a8a] to-[#121212]">
        <div className="w-52 h-52 shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shrink-0">
           <ActivityIcon size={64} className="text-white" />
        </div>
        <div className="flex flex-col gap-2 pb-2 min-w-0">
          <span className="uppercase text-xs font-bold tracking-wider text-white">Your Activity</span>
          <h1 className="text-4xl md:text-6xl font-black text-white truncate">Stats & Trends</h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            {isUnlocked 
              ? `${data.activity.length} active days • ${data.summary.fun.avg_words_per_day} words/day avg`
              : 'Import your data to see your activity stats'
            }
          </p>
        </div>
      </div>

      <div className="px-8 mt-8 grid gap-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {!isUnlocked && <LockedOverlay className="rounded-lg" />}
          <KpiStat label="Active Days" value={isUnlocked ? `${data.activity.length}` : '---'} subLabel="Days with ≥1 message" />
          <KpiStat label="Avg Words/Day" value={isUnlocked ? `${data.summary.fun.avg_words_per_day}` : '---'} />
          <KpiStat label="Peak Hour" value={isUnlocked ? `${data.summary.most_active_hour}:00` : '---'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#181818] rounded-lg p-6 border border-[#282828] relative overflow-hidden min-h-[280px]">
            {!isUnlocked && <LockedOverlay />}
            <h2 className="text-xl font-bold text-white mb-4">Calendar Heatmap</h2>
            {isUnlocked && (
              <Heatmap 
                key={`${data.summary.period.start}-${data.summary.period.end}-${data.activity.length}`} 
                points={data.activity.map((point) => ({ date: point.date, value: point.messages }))} 
              />
            )}
          </div>

          <div className="bg-[#181818] rounded-lg p-6 border border-[#282828] relative overflow-hidden min-h-[280px]">
            {!isUnlocked && <LockedOverlay />}
            <h2 className="text-xl font-bold text-white mb-4">Messages by Hour</h2>
            {isUnlocked && (
              <div className="flex flex-col gap-1">
                {histogram.map((bucket) => (
                  <div key={bucket.hour} className="flex items-center gap-3 group cursor-pointer">
                    <span className="text-xs text-[#B3B3B3] w-8 text-right">{bucket.hour}:00</span>
                    <div className="flex-1 h-5 bg-[#2a2a2a] rounded relative overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-[#1DB954] group-hover:bg-[#1ed760] transition-all duration-300 rounded"
                        style={{
                          width: `${Math.min(100, ((bucket.messages || 0) / maxMessages) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#B3B3B3] w-10">{bucket.messages}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
