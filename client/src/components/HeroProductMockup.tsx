/**
 * Hero product mockup — shows a quiz builder UI instead of a generic stock image.
 * Pure React/Tailwind, no external dependencies.
 */
export default function HeroProductMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-background rounded-md px-4 py-1 text-xs text-muted-foreground border text-center whitespace-nowrap">
            qproquo.howstud.io/admin/quizzes/ai-readiness
          </div>
        </div>
      </div>

      {/* Builder UI */}
      <div className="grid grid-cols-[200px_1fr] min-h-[340px] bg-background">
        {/* Sidebar — Questions list */}
        <div className="border-r p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>📝</span> AI Readiness Assessment
          </div>

          <div className="space-y-1 mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Questions</div>
            {[
              { num: 1, label: "Team size", active: false },
              { num: 2, label: "AI usage", active: true },
              { num: 3, label: "Budget", active: false },
              { num: 4, label: "Data readiness", active: false },
              { num: 5, label: "Timeline", active: false },
            ].map((q) => (
              <div
                key={q.num}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  q.active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  q.active ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {q.num}
                </span>
                {q.label}
              </div>
            ))}
            <div className="text-xs text-primary font-medium pl-2 pt-1 cursor-pointer">
              + Add question
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Outcomes</div>
            {[
              { letter: "A", label: "High Potential", color: "bg-emerald-100 text-emerald-700" },
              { letter: "B", label: "Needs Work", color: "bg-yellow-100 text-yellow-700" },
              { letter: "C", label: "Not Ready", color: "bg-red-100 text-red-700" },
            ].map((o) => (
              <div key={o.letter} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${o.color}`}>
                  {o.letter}
                </span>
                {o.label}
              </div>
            ))}
          </div>
        </div>

        {/* Main content — Question editor */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">Q2</span>
            <span className="text-xs text-muted-foreground">Single Choice · Required</span>
          </div>

          <div className="bg-muted/30 rounded-xl p-5 border space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              How do you currently handle AI tools?
            </h3>
            <p className="text-sm text-muted-foreground">
              Select the option that best describes your team's relationship with AI.
            </p>

            <div className="space-y-2 pt-2">
              {[
                { label: "We use AI daily across the team", pts: 3 },
                { label: "A few people experiment with it", pts: 2 },
                { label: "We've tried but haven't adopted", pts: 1 },
                { label: "Haven't explored it yet", pts: 0 },
              ].map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 bg-background rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    <span className="text-foreground">{opt.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    +{opt.pts} pts
                  </span>
                </div>
              ))}
              <div className="text-xs text-primary font-medium pt-1 cursor-pointer">
                + Add answer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
