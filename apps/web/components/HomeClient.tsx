'use client';

import { useWrappedData } from '@/components/DataProvider';
import GreetingHeader from '@/components/GreetingHeader';
import SpotifyCard from '@/components/SpotifyCard';
import { Play, MessageSquare, BarChart2, Clock, Calendar, Hash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomeClient() {
  const { data, hasImportedData } = useWrappedData();
  const router = useRouter();

  if (!hasImportedData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to GPT Wrapped</h2>
        <p className="text-[#B3B3B3] mb-8 max-w-md">
          Import your ChatGPT data to see your analytics, habits, and top topics in a Spotify-wrapped style.
        </p>
        <Link 
          href="/import" 
          className="bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
        >
          Import Data
        </Link>
      </div>
    );
  }

  const QuickAccessCard = ({ icon: Icon, label, value, href }: { icon: any, label: string, value: string, href?: string }) => (
    <div 
      onClick={() => href && router.push(href as any)}
      className="flex items-center gap-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md p-2 pr-4 cursor-pointer transition-colors group"
    >
      <div className="w-[48px] h-[48px] bg-gradient-to-br from-indigo-600 to-purple-700 rounded shadow flex items-center justify-center">
        <Icon className="text-white" size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-sm truncate">{label}</div>
        <div className="text-[#B3B3B3] text-xs truncate">{value}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 shadow-xl rounded-full bg-[#1DB954] p-2 transition-opacity">
        <Play size={16} fill="black" className="text-black ml-0.5" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col pb-12 bg-gradient-to-b from-[#121212] to-[#121212]">
      <GreetingHeader />
      
      {/* Quick Access Grid */}
      <div className="px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickAccessCard 
          icon={MessageSquare} 
          label="Total Messages" 
          value={data.summary.totals.messages.toLocaleString()}
          href="/explore/activity"
        />
        <QuickAccessCard 
          icon={Hash} 
          label="Total Words" 
          value={data.summary.totals.words.toLocaleString()} 
          href="/explore/activity"
        />
        <QuickAccessCard 
          icon={Calendar} 
          label="Active Days" 
          value={`${data.summary.fun.active_days} days`} 
          href="/explore/activity"
        />
        <QuickAccessCard 
          icon={Clock} 
          label="Most Active Hour" 
          value={`${data.summary.most_active_hour}:00`} 
          href="/explore/activity"
        />
        <QuickAccessCard 
          icon={BarChart2} 
          label="Longest Streak" 
          value={`${data.summary.longest_streak_days} days`} 
          href="/explore/activity"
        />
        <QuickAccessCard 
          icon={Hash} 
          label="Top Topic" 
          value={data.summary.top_topics[0]?.label || 'N/A'} 
          href="/explore/topics"
        />
      </div>

      {/* Sections */}
      <div className="px-8 space-y-8">
        
        {/* Made For You */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 hover:underline cursor-pointer">Made For You</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <SpotifyCard 
              title="Your 2024 Wrapped" 
              description="The complete story of your year with ChatGPT."
              onClick={() => router.push('/')} 
              className="bg-[#181818]"
              image={
                <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-600 flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-4xl font-black text-white mb-2">2024</span>
                  <span className="text-lg font-bold text-white tracking-widest uppercase">Wrapped</span>
                </div>
              }
            />
             <SpotifyCard 
              title="Top Topics Mix" 
              description="A collection of your most discussed subjects."
              onClick={() => router.push('/explore/topics')}
              image={
                <div className="w-full h-full bg-[#333] flex items-center justify-center">
                  <span className="text-4xl">📊</span>
                </div>
              }
            />
             <SpotifyCard 
              title="Deep Dives" 
              description="Your longest and most complex conversations."
              onClick={() => router.push('/explore/conversations')}
               image={
                <div className="w-full h-full bg-[#4a148c] flex items-center justify-center">
                  <span className="text-4xl">🌌</span>
                </div>
              }
            />
          </div>
        </section>

        {/* Your Top Topics */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Your Top Topics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {data.summary.top_topics.slice(0, 5).map((topic, i) => (
              <SpotifyCard 
                key={topic.label}
                title={topic.label}
                description={`${(topic.pct * 100).toFixed(1)}% of conversations`}
                onClick={() => router.push('/explore/topics')}
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
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {data.activity.slice(-5).reverse().map((day) => (
                <SpotifyCard
                  key={day.date}
                  title={new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  description={`${day.messages} messages`}
                   image={
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{day.messages}</div>
                        <div className="text-xs text-neutral-500 uppercase">msgs</div>
                      </div>
                    </div>
                  }
                />
              ))}
           </div>
        </section>

      </div>
    </div>
  );
}
