"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Sparkles, Zap, Heart, RefreshCw } from "lucide-react";

const quotes = [
  { text: "Stay hungry, stay foolish.", emoji: "🔥", gradient: "from-orange-500 to-red-500" },
  { text: "Move fast and break things.", emoji: "⚡", gradient: "from-yellow-400 to-orange-500" },
  { text: "The best way to predict the future is to create it.", emoji: "🚀", gradient: "from-violet-500 to-purple-600" },
  { text: "Done is better than perfect.", emoji: "✅", gradient: "from-emerald-400 to-green-600" },
  { text: "Your network is your net worth.", emoji: "🤝", gradient: "from-blue-400 to-cyan-500" },
  { text: "Build in public. Fail in public. Win in public.", emoji: "📢", gradient: "from-pink-500 to-rose-500" },
  { text: "The only way to do great work is to love what you do.", emoji: "💜", gradient: "from-purple-400 to-indigo-600" },
  { text: "Ship it. Learn. Repeat.", emoji: "🔄", gradient: "from-teal-400 to-emerald-500" },
  { text: "Alone we can do so little; together we can do so much.", emoji: "🌍", gradient: "from-blue-500 to-violet-500" },
  { text: "Ideas are worthless. Execution is everything.", emoji: "💡", gradient: "from-amber-400 to-orange-500" },
  { text: "Be so good they can't ignore you.", emoji: "🎯", gradient: "from-red-400 to-pink-600" },
  { text: "First they ignore you, then they laugh, then you win.", emoji: "👑", gradient: "from-yellow-400 to-amber-500" },
];

const vibeOptions = [
  { emoji: "🧠", label: "The Strategist", desc: "You plan before you build. Big brain energy.", color: "from-violet-500 to-indigo-600" },
  { emoji: "⚡", label: "The Shipper", desc: "You build fast, break things, and iterate. Speed demon.", color: "from-yellow-400 to-orange-500" },
  { emoji: "🎨", label: "The Creative", desc: "You make things beautiful. Pixels are your love language.", color: "from-pink-500 to-rose-500" },
  { emoji: "🤝", label: "The Connector", desc: "You bring people together. The glue of every team.", color: "from-emerald-400 to-teal-500" },
];

export function Testimonials() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [selectedVibe, setSelectedVibe] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const nextQuote = useCallback(() => {
    setCurrentQuote((prev) => (prev + 1) % quotes.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextQuote, 4000);
    return () => clearInterval(interval);
  }, [nextQuote]);

  const handleVibeSelect = (index: number) => {
    setSelectedVibe(index);
    setShowResult(true);
  };

  const resetVibe = () => {
    setSelectedVibe(null);
    setShowResult(false);
  };

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Rotating Quote */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>DAILY INSPO</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>

          <div className="h-32 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <span className="text-4xl mb-3 block">{quotes[currentQuote].emoji}</span>
                <h2 className={`font-heading text-2xl md:text-3xl font-bold bg-gradient-to-r ${quotes[currentQuote].gradient} bg-clip-text text-transparent`}>
                  &ldquo;{quotes[currentQuote].text}&rdquo;
                </h2>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-1.5 mt-6">
            {quotes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuote(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentQuote ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Builder Vibe Game */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>MINI GAME</span>
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <h3 className="font-heading text-2xl md:text-3xl font-bold">
              What&apos;s Your{" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Builder Vibe?
              </span>
            </h3>
            <p className="text-muted-foreground mt-2">Pick one. No overthinking. Go with your gut.</p>
          </div>

          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {vibeOptions.map((vibe, i) => (
                  <motion.div
                    key={vibe.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <Card
                      className="cursor-pointer group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-2 border-transparent hover:border-primary/30"
                      onClick={() => handleVibeSelect(i)}
                    >
                      <CardContent className="p-6 text-center">
                        <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">
                          {vibe.emoji}
                        </span>
                        <h4 className={`font-heading text-lg font-bold bg-gradient-to-r ${vibe.color} bg-clip-text text-transparent`}>
                          {vibe.label}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{vibe.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <span className="text-6xl block mb-4">{vibeOptions[selectedVibe!].emoji}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h4 className={`font-heading text-2xl md:text-3xl font-bold bg-gradient-to-r ${vibeOptions[selectedVibe!].color} bg-clip-text text-transparent mb-2`}>
                        You&apos;re {vibeOptions[selectedVibe!].label}!
                      </h4>
                      <p className="text-muted-foreground text-lg mb-2">{vibeOptions[selectedVibe!].desc}</p>
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-6">
                        <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
                        <span>Every team needs you</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm" onClick={resetVibe}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Try Again
                        </Button>
                        <Button size="sm" className="gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Find Your Team
                        </Button>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
