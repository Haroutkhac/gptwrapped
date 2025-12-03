'use client';

import { useEffect, useState } from 'react';

export default function GreetingHeader() {
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="pb-6 pt-8 px-8 bg-gradient-to-b from-[#535353] to-[#121212]">
      <h2 className="text-3xl font-bold text-white tracking-tight">{greeting}</h2>
    </div>
  );
}

