"use client";

import { useState } from "react";
import { useWrappedData } from "@/components/DataProvider";
import GreetingHeader from "@/components/GreetingHeader";
import SpotifyCard from "@/components/SpotifyCard";
import Heatmap from "@/components/Heatmap";
import WrappedStory from "@/components/WrappedStory";
import LockedOverlay from "@/components/LockedOverlay";
import {
  Play,
  MessageSquare,
  BarChart2,
  Clock,
  Calendar,
  Hash,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomeClient() {
  const { data, hasImportedData, hydrated } = useWrappedData();
  const router = useRouter();
  const [showStory, setShowStory] = useState(false);

  const isUnlocked = hydrated && hasImportedData;

  const histogram =
    data.hours ??
    Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }));
  const maxMessages = Math.max(
    ...histogram.map((bucket) => bucket.messages || 0),
    1
  );

  const QuickAccessCard = ({
    icon: Icon,
    label,
    value,
    href,
    locked,
  }: {
    icon: any;
    label: string;
    value: string;
    href?: string;
    locked?: boolean;
  }) => (
    <div
      onClick={() => {
        if (locked) {
          router.push("/import");
        } else if (href) {
          router.push(href as any);
        }
      }}
      className="flex items-center gap-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md p-2 pr-4 cursor-pointer transition-colors group relative overflow-hidden"
    >
      <div className="w-[48px] h-[48px] bg-gradient-to-br from-indigo-600 to-purple-700 rounded shadow flex items-center justify-center">
        <Icon className="text-white" size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-sm truncate">{label}</div>
        <div className="text-[#B3B3B3] text-xs truncate">
          {locked ? "---" : value}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 shadow-xl rounded-full bg-[#1DB954] p-2 transition-opacity">
        <Play size={16} fill="black" className="text-black ml-0.5" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col pb-12 bg-gradient-to-b from-[#121212] to-[#121212]">
      {showStory && isUnlocked && (
        <WrappedStory onClose={() => setShowStory(false)} />
      )}
      <GreetingHeader />

      <div className="px-8 space-y-8">
        <div
          onClick={() => {
            if (isUnlocked) {
              setShowStory(true);
            } else {
              router.push("/import");
            }
          }}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 cursor-pointer hover:scale-[1.01] transition-transform shadow-2xl group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight">
                2025 WRAPPED
              </h2>
              <p className="text-white/90 text-lg md:text-xl font-medium">
                {isUnlocked
                  ? "Your year in review. The data doesn't lie."
                  : "Import your data to see your year in review."}
              </p>
            </div>
            <div className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform flex items-center gap-2">
              <Play size={20} fill="black" />
              {isUnlocked ? "Play Story" : "Import Data"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAccessCard
            icon={MessageSquare}
            label="Total Messages"
            value={data.summary.totals.messages.toLocaleString()}
            href="/explore/activity"
            locked={!isUnlocked}
          />
          <QuickAccessCard
            icon={Hash}
            label="Total Words"
            value={data.summary.totals.words.toLocaleString()}
            href="/explore/activity"
            locked={!isUnlocked}
          />
          <QuickAccessCard
            icon={Calendar}
            label="Active Days"
            value={`${data.summary.fun.active_days} days`}
            href="/explore/activity"
            locked={!isUnlocked}
          />
          <QuickAccessCard
            icon={Clock}
            label="Most Active Hour"
            value={`${data.summary.most_active_hour}:00`}
            href="/explore/activity"
            locked={!isUnlocked}
          />
          <QuickAccessCard
            icon={BarChart2}
            label="Longest Streak"
            value={`${data.summary.longest_streak_days} days`}
            href="/explore/activity"
            locked={!isUnlocked}
          />
          <QuickAccessCard
            icon={Hash}
            label="Top Topic"
            value={data.summary.top_topics[0]?.label || "N/A"}
            href="/explore/topics"
            locked={!isUnlocked}
          />
        </div>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Made For You</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative">
            {!isUnlocked && <LockedOverlay className="rounded-lg" />}
            <SpotifyCard
              title="Top Topics Mix"
              description="A collection of your most discussed subjects."
              onClick={() =>
                isUnlocked
                  ? router.push("/explore/topics")
                  : router.push("/import")
              }
              image={
                <div className="w-full h-full bg-[#333] flex items-center justify-center">
                  <span className="text-4xl">📊</span>
                </div>
              }
            />
            <SpotifyCard
              title="Deep Dives"
              description="Your longest and most complex conversations."
              onClick={() =>
                isUnlocked
                  ? router.push("/explore/conversations")
                  : router.push("/import")
              }
              image={
                <div className="w-full h-full bg-[#4a148c] flex items-center justify-center">
                  <span className="text-4xl">🌌</span>
                </div>
              }
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Activity Overview
          </h2>
          <div className="bg-[#181818] rounded-lg p-6 border border-[#282828] relative overflow-hidden min-h-[280px]">
            {!isUnlocked && <LockedOverlay />}
            <h3 className="text-lg font-bold text-white mb-4">
              Calendar Heatmap
            </h3>
            {isUnlocked && (
              <Heatmap
                key={`${data.summary.period.start}-${data.summary.period.end}-${data.activity.length}`}
                points={data.activity.map((point) => ({
                  date: point.date,
                  value: point.messages,
                }))}
              />
            )}
          </div>

          <div className="bg-[#181818] rounded-lg p-6 border border-[#282828] relative overflow-hidden">
            {!isUnlocked && <LockedOverlay />}
            <h3 className="text-lg font-bold text-white mb-4">
              Messages by Hour
            </h3>
            {isUnlocked && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {histogram.map((bucket) => (
                  <div
                    key={bucket.hour}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div
                      className="w-full h-16 bg-[#2a2a2a] rounded relative overflow-hidden flex items-end"
                    >
                      <div
                        className="w-full bg-[#1DB954] group-hover:bg-[#1ed760] transition-all duration-300 rounded-t"
                        style={{
                          height: `${Math.min(
                            100,
                            ((bucket.messages || 0) / maxMessages) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#B3B3B3]">
                      {bucket.hour}:00
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Your Top Topics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative min-h-[200px]">
            {!isUnlocked && <LockedOverlay className="rounded-lg" />}
            {isUnlocked ? (
              <>
                {data.summary.top_topics.slice(0, 5).map((topic, i) => (
                  <SpotifyCard
                    key={topic.label}
                    title={topic.label}
                    description={`${(topic.pct * 100).toFixed(
                      1
                    )}% of conversations`}
                    onClick={() => router.push("/explore/topics")}
                    image={
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-4xl font-bold text-neutral-600">
                        #{i + 1}
                      </div>
                    }
                  />
                ))}
                {data.summary.top_topics.length === 0 && (
                  <p className="text-[#B3B3B3]">No topics found yet.</p>
                )}
              </>
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-neutral-800 rounded-lg flex items-center justify-center text-4xl font-bold text-neutral-700"
                >
                  #{i}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Recent Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative min-h-[200px]">
            {!isUnlocked && <LockedOverlay className="rounded-lg" />}
            {isUnlocked
              ? data.activity
                  .slice(-5)
                  .reverse()
                  .map((day) => (
                    <SpotifyCard
                      key={day.date}
                      title={new Date(day.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      description={`${day.messages} messages`}
                      image={
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {day.messages}
                            </div>
                            <div className="text-xs text-neutral-500 uppercase">
                              msgs
                            </div>
                          </div>
                        </div>
                      }
                    />
                  ))
              : [1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-neutral-900 rounded-lg flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neutral-700">
                        --
                      </div>
                      <div className="text-xs text-neutral-700 uppercase">
                        msgs
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
