import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type TriviaQuestion = {
  question: string;
  options: { label: string; emoji: string }[];
  correctIndex: number;
  explanation: string;
};

const TRIVIA_BANK: TriviaQuestion[] = [
  {
    question: "What does \"quid pro quo\" actually mean?",
    options: [
      { label: "A type of cheese", emoji: "🧀" },
      { label: "Something for something", emoji: "🤝" },
      { label: "A Latin dance move", emoji: "💃" },
      { label: "A quiz about quos", emoji: "🤷" },
    ],
    correctIndex: 1,
    explanation:
      "\"Something for something\" — and here's ours: we'll help you find what you're looking for.",
  },
  {
    question: "What percentage of website visitors leave without converting?",
    options: [
      { label: "About 50%", emoji: "😐" },
      { label: "About 70%", emoji: "😬" },
      { label: "About 96%", emoji: "😱" },
      { label: "About 20%", emoji: "😎" },
    ],
    correctIndex: 2,
    explanation:
      "96%! That's why lead-capture quizzes exist — they turn passive visitors into engaged leads.",
  },
  {
    question: "How long does the average person spend on a quiz?",
    options: [
      { label: "10 seconds", emoji: "⚡" },
      { label: "2–3 minutes", emoji: "⏱️" },
      { label: "15 minutes", emoji: "📚" },
      { label: "They never finish", emoji: "🚪" },
    ],
    correctIndex: 1,
    explanation:
      "2–3 minutes of focused attention — that's more engagement than most landing pages ever get.",
  },
  {
    question: "What's the #1 reason people abandon online forms?",
    options: [
      { label: "Too many fields", emoji: "📝" },
      { label: "Ugly design", emoji: "🎨" },
      { label: "Slow loading", emoji: "🐌" },
      { label: "No Wi-Fi", emoji: "📡" },
    ],
    correctIndex: 0,
    explanation:
      "Too many fields! That's why quizzes work — one question at a time feels way more manageable.",
  },
];

export default function NotFound() {
  const trivia = useMemo(
    () => TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)],
    []
  );
  const [selected, setSelected] = useState<number | null>(null);
  const isCorrect = selected === trivia.correctIndex;
  const answered = selected !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Big 404 */}
        <div className="space-y-2">
          <h1 className="text-8xl font-bold font-display text-primary/20">404</h1>
          <p className="text-xl font-semibold text-foreground">
            This page wandered off
          </p>
          <p className="text-sm text-muted-foreground">
            But since you're here, let's make it fun…
          </p>
        </div>

        {/* Mini trivia */}
        <Card className="text-left border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Trivia
            </div>
            <p className="font-semibold text-foreground">{trivia.question}</p>

            <div className="space-y-2">
              {trivia.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all",
                    answered && i === trivia.correctIndex
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium"
                      : answered && i === selected
                      ? "border-red-400 bg-red-50 text-red-700"
                      : !answered
                      ? "hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                      : "opacity-50"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {answered && (
              <div
                className={cn(
                  "rounded-lg p-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isCorrect
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                )}
              >
                <p className="font-semibold mb-1">
                  {isCorrect ? "🎉 Nailed it!" : "😅 Not quite!"}
                </p>
                <p>{trivia.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/demo">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <RotateCcw className="w-4 h-4" />
              Try a Real Quiz
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
