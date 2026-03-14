import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = ["All Templates", "Assessment", "Scorecard", "Personality", "Visual Choice", "Diagnostic", "Calculator"];
const INDUSTRY_FILTERS = ["Marketing", "Sales", "Finance", "Health", "HR", "SaaS", "Coaching", "E-commerce"];

interface Template {
  name: string;
  type: string;
  industry: string;
  desc: string;
  stats: { label: string; value: string }[];
  previewBg: string;
  preview: React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    name: "AI Readiness Assessment",
    type: "Assessment",
    industry: "SaaS",
    desc: "Score how prepared a business is to adopt AI. 5 weighted questions with 3 outcome tiers.",
    stats: [{ label: "questions", value: "5" }, { label: "outcomes", value: "3" }],
    previewBg: "bg-gradient-to-br from-primary/5 to-primary/10",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Question 2 of 5</div>
        <div className="text-xs font-bold mb-2">How do you currently handle AI tools?</div>
        <div className="space-y-1">
          {["We use AI daily", "A few people experiment", "We've tried it", "Haven't explored"].map((opt, i) => (
            <div key={i} className={cn("flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border", i === 1 ? "border-primary bg-primary/5 text-primary font-semibold" : "text-muted-foreground")}>
              <div className={cn("w-2.5 h-2.5 rounded-full border", i === 1 ? "border-primary bg-primary shadow-[inset_0_0_0_1.5px_white]" : "border-muted-foreground/30")} />
              {opt}
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "40%" }} />
        </div>
      </div>
    ),
  },
  {
    name: "Marketing ROI Calculator",
    type: "Calculator",
    industry: "Marketing",
    desc: "Show prospects the exact ROI from optimizing their ad spend. Slider-based inputs with dynamic calculations.",
    stats: [{ label: "inputs", value: "4" }, { label: "report", value: "PDF" }],
    previewBg: "bg-gradient-to-br from-orange-50 to-orange-100",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">ROI Calculator</div>
        <div className="text-xs font-bold mb-3">Monthly ad spend</div>
        <div className="relative h-1.5 bg-muted rounded-full mb-1">
          <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
          <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-primary shadow-sm" style={{ top: "-3px", left: "57%" }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mb-3">
          <span>$0</span><span>$50,000</span>
        </div>
        <div className="text-center border-t pt-2">
          <div className="text-lg font-bold text-emerald-600">$24,500/mo</div>
          <div className="text-[9px] text-muted-foreground">Projected savings</div>
        </div>
      </div>
    ),
  },
  {
    name: "Wellness Wheel Assessment",
    type: "Scorecard",
    industry: "Health",
    desc: "Rate 6 life areas on a scale, then deliver a personalized radar chart + PDF report with action steps.",
    stats: [{ label: "categories", value: "6" }, { label: "chart", value: "Radar" }],
    previewBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Your Results</div>
        <div className="text-xs font-bold mb-2">Wellness Scorecard</div>
        <div className="flex justify-center">
          <svg width="110" height="90" viewBox="0 0 120 100">
            <polygon points="60,10 100,35 100,75 60,100 20,75 20,35" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
            <polygon points="60,25 85,40 85,70 60,85 35,70 35,40" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
            <polygon points="60,18 92,38 80,72 45,88 25,55 40,32" fill="hsl(239 84% 67% / 0.15)" stroke="hsl(239 84% 67%)" strokeWidth="2" />
            <circle cx="60" cy="18" r="2.5" fill="hsl(239 84% 67%)" />
            <circle cx="92" cy="38" r="2.5" fill="hsl(239 84% 67%)" />
            <circle cx="80" cy="72" r="2.5" fill="hsl(239 84% 67%)" />
            <circle cx="45" cy="88" r="2.5" fill="hsl(239 84% 67%)" />
            <circle cx="25" cy="55" r="2.5" fill="hsl(239 84% 67%)" />
            <circle cx="40" cy="32" r="2.5" fill="hsl(239 84% 67%)" />
            <text x="60" y="7" textAnchor="middle" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Nutrition</text>
            <text x="107" y="38" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Sleep</text>
            <text x="105" y="78" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Fitness</text>
            <text x="45" y="98" textAnchor="middle" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Stress</text>
            <text x="10" y="58" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Social</text>
            <text x="28" y="28" fontSize="5" fill="hsl(var(--muted-foreground))" fontWeight="600">Mental</text>
          </svg>
        </div>
      </div>
    ),
  },
  {
    name: "Lead Qualification Quiz",
    type: "Diagnostic",
    industry: "Sales",
    desc: "Score and segment inbound leads by budget, timeline, and fit before your sales team picks up the phone.",
    stats: [{ label: "questions", value: "8" }, { label: "segments", value: "4" }],
    previewBg: "bg-gradient-to-br from-blue-50 to-blue-100",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Question 3 of 8</div>
        <div className="text-xs font-bold mb-2">What's your annual revenue?</div>
        <div className="space-y-1">
          {["Under $100K", "$100K – $500K", "$500K – $2M", "$2M+"].map((opt, i) => (
            <div key={i} className={cn("flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border", i === 2 ? "border-primary bg-primary/5 text-primary font-semibold" : "text-muted-foreground")}>
              <div className={cn("w-2.5 h-2.5 rounded-full border", i === 2 ? "border-primary bg-primary shadow-[inset_0_0_0_1.5px_white]" : "border-muted-foreground/30")} />
              {opt}
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "37.5%" }} />
        </div>
      </div>
    ),
  },
  {
    name: "Brand Personality Quiz",
    type: "Personality",
    industry: "Coaching",
    desc: "Help prospects discover their brand archetype with visual choices. Ends with a personalized brand guide PDF.",
    stats: [{ label: "questions", value: "6" }, { label: "archetypes", value: "4" }],
    previewBg: "bg-gradient-to-br from-pink-50 to-pink-100",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Question 4 of 6</div>
        <div className="text-xs font-bold mb-2">Pick your ideal workspace</div>
        <div className="grid grid-cols-2 gap-1.5">
          {["🏙️", "🏡", "☕", "🌲"].map((emoji, i) => (
            <div key={i} className={cn("h-9 rounded-md border flex items-center justify-center text-base", i === 1 ? "border-primary border-2 bg-primary/5" : "")}>
              {emoji}
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "66%" }} />
        </div>
      </div>
    ),
  },
  {
    name: "Employee Engagement Audit",
    type: "Scorecard",
    industry: "HR",
    desc: "Measure team engagement across 4 categories with scored questions and a detailed PDF breakdown.",
    stats: [{ label: "questions", value: "12" }, { label: "categories", value: "4" }],
    previewBg: "bg-gradient-to-br from-violet-50 to-violet-100",
    preview: (
      <div className="bg-card rounded-lg shadow-sm p-3 mx-4 mt-4 border">
        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Results</div>
        <div className="text-xs font-bold mb-1">Your engagement score</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">82%</div>
          <div className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5 mb-2">Strong Culture</div>
        </div>
        <div className="space-y-1">
          {[{ l: "Leadership", v: "9/10" }, { l: "Work-Life Balance", v: "7/10" }, { l: "Growth", v: "8/10" }, { l: "Communication", v: "8/10" }].map((row) => (
            <div key={row.l} className="flex justify-between text-[10px] py-0.5 border-b border-muted/50">
              <span className="text-muted-foreground">{row.l}</span>
              <span className="font-bold">{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function Templates() {
  const [activeType, setActiveType] = useState("All Templates");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    if (activeType !== "All Templates" && t.type !== activeType) return false;
    if (activeIndustry && t.industry !== activeIndustry) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="pt-16 pb-8 text-center px-6 bg-card border-b">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6">
          Template Gallery
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
          Start with a proven template
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Choose from our library of professionally designed quiz templates. Customize the questions, branding, and scoring to match your business.
        </p>

        {/* Type Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                activeType === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/30"
              )}
              onClick={() => setActiveType(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Industry Filters */}
        <div className="flex flex-wrap justify-center gap-2 pb-6">
          {INDUSTRY_FILTERS.map((f) => (
            <button
              key={f}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                activeIndustry === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/30"
              )}
              onClick={() => setActiveIndustry(activeIndustry === f ? null : f)}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => (
          <div
            key={t.name}
            className="bg-card border rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
          >
            {/* Preview */}
            <div className={cn("h-[200px] relative overflow-hidden", t.previewBg)}>
              {t.preview}
            </div>

            {/* Info */}
            <div className="p-5 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary border-0">
                  {t.type}
                </Badge>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold">
                  {t.industry}
                </Badge>
              </div>
              <h3 className="font-bold text-base">{t.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {t.stats.map((s) => (
                    <span key={s.label}>
                      <strong className="text-foreground">{s.value}</strong> {s.label}
                    </span>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Use Template →
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No templates match your filters</p>
            <p className="text-sm">Try adjusting your filters or <button className="text-primary font-semibold" onClick={() => { setActiveType("All Templates"); setActiveIndustry(null); }}>reset all filters</button></p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="text-center py-16 px-6">
        <p className="text-lg text-muted-foreground mb-4">Don't see what you need? Build from scratch in minutes.</p>
        <Link href="/demo">
          <Button size="lg" className="h-14 px-10 text-base">
            Create Custom Quiz →
          </Button>
        </Link>
      </section>
    </div>
  );
}
