"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWrappedData } from "@/components/DataProvider";
import {
  X,
  ChevronUp,
  ChevronDown,
  Brain,
  CheckCircle,
  Type,
  Hash,
  AlertTriangle,
  Sparkles,
  Share2,
  Download,
  Moon,
  Bot,
} from "lucide-react";
import { toPng } from "html-to-image";

interface WrappedStoryProps {
  onClose: () => void;
}

export default function WrappedStory({ onClose }: WrappedStoryProps) {
  const { data } = useWrappedData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 8;
  const slideRef = useRef<HTMLDivElement>(null);
  const ai = data.aiInsights;

  const handleExport = async (action: "download" | "share") => {
    if (slideRef.current) {
      try {
        const dataUrl = await toPng(slideRef.current, {
          cacheBust: true,
          style: {
            transform: "scale(1)", // Ensure proper scaling
          },
        });

        if (action === "download") {
          const link = document.createElement("a");
          link.download = `gpt-wrapped-2025-slide-${currentSlide + 1}.png`;
          link.href = dataUrl;
          link.click();
        } else {
          // For now, open Twitter/X compose with the text (image attachment not supported via web intent)
          // Ideally, you'd upload the image to a server and get a URL, or use the native sharing API if supported
          const text = `Check out my #GPTWrapped2025!`;
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
            "_blank"
          );
        }
      } catch (err) {
        console.error("Failed to export image", err);
      }
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentSlide, onClose]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, onClose]);

  const ProgressBar = () => (
    <div className="absolute top-4 left-0 w-full px-4 flex gap-2 z-50">
      {Array.from({ length: totalSlides }).map((_, idx) => (
        <div
          key={idx}
          className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
        >
          <div
            className={`h-full bg-white transition-all duration-300 ${
              idx < currentSlide
                ? "w-full"
                : idx === currentSlide
                ? "w-full animate-progress"
                : "w-0"
            }`}
          />
        </div>
      ))}
    </div>
  );

  // Slide 1: Intro
  const Slide1 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-blue-600 rounded-full shadow-2xl shadow-blue-900/50 animate-bounce-slow">
        <Brain size={64} className="text-white" />
      </div>
      <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">
        {ai?.slideTexts.intro || "You asked ChatGPT"}
        <br />
        <span className="text-blue-400 text-8xl block my-4">
          {(
            data.summary.totals.userMessages ?? data.summary.totals.messages
          ).toLocaleString()}
        </span>
        questions
      </h2>
    </div>
  );

  // Slide 2: Top Topics
  const Slide2 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-pink-600 rounded-full shadow-2xl shadow-pink-900/50">
        <Hash size={64} className="text-white" />
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">
        {ai?.slideTexts.topics || "What you wouldn't stop talking about"}
      </h2>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {data.summary.top_topics.slice(0, 3).map((topic, i) => (
          <div
            key={topic.label}
            className="flex items-center justify-between bg-white/10 p-6 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors transform hover:scale-105 duration-300"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-2xl font-bold text-white text-left">
              #{i + 1} {topic.label}
            </span>
            <span className="text-pink-300 font-mono text-xl">
              {(topic.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // Slide 3: Vocabulary
  const Slide3 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-purple-600 rounded-full shadow-2xl shadow-purple-900/50">
        <Type size={64} className="text-white" />
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">
        {ai?.slideTexts.vocabulary || "Your Vocabulary"}
      </h2>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {(data.summary.fun.top_words || []).map((word, i) => (
          <div
            key={word.term}
            className="flex items-center justify-between bg-white/10 p-4 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors transform hover:scale-105 duration-300"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-2xl font-bold text-white">
              #{i + 1} {word.term}
            </span>
            <span className="text-purple-300 font-mono text-xl">
              {word.count}
            </span>
          </div>
        ))}
        {(!data.summary.fun.top_words ||
          data.summary.fun.top_words.length === 0) && (
          <p className="text-white/50">Not enough words to analyze yet.</p>
        )}
      </div>
    </div>
  );

  // Slide 4: Stupid Questions
  const Slide4 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-yellow-600 rounded-full shadow-2xl shadow-yellow-900/50 animate-shake">
        <AlertTriangle size={64} className="text-white" />
      </div>
      <h2 className="text-4xl md:text-6xl font-black text-white mb-8">
        You asked
      </h2>
      <div className="relative mb-8">
        <span className="text-yellow-400 text-9xl font-black block">
          {data.summary.fun.stupid_question_count ?? 0}
        </span>
      </div>
      <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">
        Stupid Questions
      </h3>
      <p className="text-xl text-yellow-100 max-w-2xl font-medium bg-yellow-900/30 p-4 rounded-lg">
        {ai?.slideTexts.stupidQuestions || (
          <>
            That puts you in the top{" "}
            <span className="font-black text-yellow-400">0.001%</span> of users
          </>
        )}
      </p>
    </div>
  );

  // Slide 5: Weirdest Request
  const Slide5 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-900/50">
        <Sparkles size={64} className="text-white" />
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">
        Your Weirdest Request
      </h2>
      <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-md max-w-3xl shadow-xl border border-white/10">
        <p className="text-xl md:text-3xl font-serif italic text-indigo-100 leading-relaxed">
          &quot;
          {data.summary.fun.weirdest_request ||
            "No weird requests found (boring!)"}
          &quot;
        </p>
      </div>
      <p className="text-indigo-300 mt-8 text-lg">
        {ai?.slideTexts.weirdest ||
          "We're not judging. Okay, maybe a little bit."}
      </p>
    </div>
  );

  // Slide 6: Validation
  const Slide6 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-green-600 rounded-full shadow-2xl shadow-green-900/50 animate-pulse">
        <CheckCircle size={64} className="text-white" />
      </div>
      <h2 className="text-4xl md:text-6xl font-black text-white mb-8">
        But hey, you were absolutely right!
      </h2>
      <div className="relative">
        <span className="text-green-400 text-9xl font-black block mb-4">
          {data.summary.fun.right_count ?? 0}
        </span>
        <span className="text-2xl text-green-200 font-bold absolute -right-12 top-4 transform rotate-12 bg-green-900/50 px-2 py-1 rounded">
          Times!
        </span>
      </div>
      <p className="text-xl md:text-2xl text-green-100 max-w-2xl mt-8 font-light">
        {ai?.slideTexts.validation ||
          "At least that's what the AI told you to make you feel better."}
      </p>
    </div>
  );

  // Slide 7: Late Night Owl
  const Slide7 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-slate-700 rounded-full shadow-2xl shadow-slate-900/50">
        <Moon size={64} className="text-yellow-200" />
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">
        {ai?.slideTexts.lateNight || "Night Owl Alert 🦉"}
      </h2>
      <div className="relative mb-8">
        <span className="text-yellow-300 text-9xl font-black block">
          {data.summary.fun.late_night_count ?? 0}
        </span>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
        messages sent after midnight
      </h3>
      <p className="text-xl text-slate-300 max-w-2xl font-light">
        Sleep is overrated when you have an AI that never judges your 3am
        existential crises.
      </p>
    </div>
  );

  const Slide8 = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full shadow-2xl shadow-violet-900/50">
        <Bot size={64} className="text-white" />
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
        Your AI Profile
      </h2>
      {ai ? (
        <>
          <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md max-w-2xl shadow-xl border border-white/10 mb-6">
            <p className="text-lg md:text-xl text-violet-100 leading-relaxed">
              {ai.personality}
            </p>
          </div>
          <div className="bg-gradient-to-r from-fuchsia-900/50 to-violet-900/50 p-4 rounded-xl max-w-xl">
            <p className="text-md md:text-lg text-fuchsia-200 italic">
              &ldquo;{ai.roast}&rdquo;
            </p>
          </div>
          <p className="text-violet-300 mt-6 text-sm max-w-md">{ai.summary}</p>
        </>
      ) : (
        <p className="text-white/50 text-lg">
          AI insights not available. Try re-importing your data.
        </p>
      )}
    </div>
  );

  const getBackgroundColor = (slide: number) => {
    switch (slide) {
      case 0:
        return "#1e3a8a"; // blue-900
      case 1:
        return "#db2777"; // pink-600
      case 2:
        return "#581c87"; // purple-900
      case 3:
        return "#ca8a04"; // yellow-600
      case 4:
        return "#4338ca"; // indigo-700
      case 5:
        return "#14532d"; // green-900
      case 6:
        return "#1e293b"; // slate-800
      case 7:
        return "#581c87"; // violet-900
      default:
        return "#000000";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden">
      <ProgressBar />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
      >
        <X size={24} />
      </button>

      <div
        ref={slideRef}
        className="h-full w-full transition-colors duration-700 ease-in-out flex items-center justify-center"
        style={{ backgroundColor: getBackgroundColor(currentSlide) }}
      >
        {currentSlide === 0 && <Slide1 />}
        {currentSlide === 1 && <Slide2 />}
        {currentSlide === 2 && <Slide3 />}
        {currentSlide === 3 && <Slide4 />}
        {currentSlide === 4 && <Slide5 />}
        {currentSlide === 5 && <Slide6 />}
        {currentSlide === 6 && <Slide7 />}
        {currentSlide === 7 && <Slide8 />}

        {/* Watermark for exported images */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/30 text-sm font-medium opacity-0 data-[html2canvas-ignore]:opacity-0 print:opacity-100">
          GPT Wrapped 2025
        </div>
      </div>

      <div className="absolute bottom-8 left-8 flex gap-4 z-50">
        <button
          onClick={() => handleExport("share")}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
        >
          <Share2 size={18} />
          <span className="text-sm font-medium">Share</span>
        </button>
        <button
          onClick={() => handleExport("download")}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
        >
          <Download size={18} />
          <span className="text-sm font-medium">Save</span>
        </button>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-0 transition-all"
        >
          <ChevronUp size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
}
