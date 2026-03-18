import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Zap, CreditCard, FileText, GitBranch, BarChart3, Mail, Lock, Layers, Settings2, Menu, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import HeroProductMockup from "@/components/HeroProductMockup";

const CALENDLY_URL = "https://calendly.com/brad-howstudio";

/* \u2500\u2500\u2500 Feature grid data \u2500\u2500\u2500 */
const FEATURES = [
  { icon: Settings2, label: "Visual Quiz Editor", desc: "Drag-and-drop builder with live preview" },
  { icon: GitBranch, label: "Branching Logic", desc: "Route users down different paths based on answers" },
  { icon: Zap, label: "Scoring Engine", desc: "Weighted points, thresholds, and disqualifiers" },
  { icon: Layers, label: "Outcome Pages", desc: "Custom results for every score range" },
  { icon: FileText, label: "PDF Reports", desc: "Auto-generated branded reports per lead" },
  { icon: CreditCard, label: "Stripe Paywalls", desc: "Gate results behind a paywall in one click" },
  { icon: Mail, label: "Email Capture", desc: "Collect leads before showing results" },
  { icon: BarChart3, label: "Analytics Dashboard", desc: "Track completions, scores, and conversions" },
  { icon: Lock, label: "Lead Notifications", desc: "Get emailed instantly when a new lead completes a quiz" },
];

const COMING_SOON = [
  "Embeddable Widget",
  "Webhook / Zapier Integration",
  "Quiz Templates Library",
  "Custom Domains",
  "Team Management",
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* \u2500\u2500\u2500 Header \u2500\u2500\u2500 */}
      <header className="h-16 border-b flex items-center justify-between px-6 lg:px-12 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-bold text-xl text-primary font-display">
          <img src="/logo.png" alt="Quiz Pro Quo" className="h-8 w-auto" />
          Quiz Pro Quo
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
          <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
        </nav>
        <div className="hidden md:flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/demo">
            <Button size="sm">Get Started \u2192</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-6 space-y-1">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">Features</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">Use Cases</a>
            <Link href="/templates" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">Templates</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">Pricing</Link>
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors">Demo</Link>
            <div className="border-t my-3" />
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted transition-colors">Sign In</Link>
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full mt-2">Get Started \u2192</Button>
            </Link>
          </nav>
        </div>
      )}

      <main className="flex-1">
        {/* \u2500\u2500\u2500 Hero \u2500\u2500\u2500 */}
        <section className="py-20 lg:py-28 px-6 lg:px-12 overflow-hidden relative">
          <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-top-left scale-110 z-0" />
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
            {/* Left \u2014 copy */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Scored Assessments + Lead Capture
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground font-display leading-[1.1]">
                Turn questions<br />
                into <span className="text-primary">qualified leads</span>.
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Build scored assessments, capture emails, and auto-deliver branded PDF reports \u2014 all from one platform.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link href="/demo">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-base shadow-lg shadow-primary/20 w-full sm:w-auto"
                  >
                    Try the Demo
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base w-full sm:w-auto"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-muted-foreground">
                Free to start \u00b7 No credit card required \u00b7 5-min setup
              </p>
            </div>

            {/* Right \u2014 mockup (clean, no floating cards) */}
            <div className="relative">
              <HeroProductMockup />
            </div>
          </div>
        </section>

        {/* \u2500\u2500\u2500 Features Grid \u2500\u2500\u2500 */}
        <section id="features" className="py-24 bg-background border-t">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
            <div className="text-center mx-auto mb-16 space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold font-display whitespace-nowrap">
                Everything you need to <span className="text-primary">build, launch &amp; monetize</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                A complete quiz platform \u2014 not just a form builder.
              </p>
            </div>

            {/* 3\u00d73 grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <Card
                  key={f.label}
                  className="border hover:border-primary/40 hover:shadow-md transition-all bg-background group"
                >
                  <CardContent className="pt-6 px-6 pb-6 space-y-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg">{f.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coming Soon \u2014 single line */}
            <p className="mt-12 text-center text-sm text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Coming Soon:</span>{" "}
              {COMING_SOON.join(" \u00b7 ")}
            </p>
          </div>
        </section>

        {/* \u2500\u2500\u2500 Product Screenshot Section \u2500\u2500\u2500 */}
        <section className="py-24 bg-muted/20 border-t">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left \u2014 screenshot mockup: Results page */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border bg-card">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-background rounded-md px-4 py-1 text-xs text-muted-foreground border text-center whitespace-nowrap">
                      qproquo.howstud.io/results
                    </div>
                  </div>
                </div>
                {/* Results page mockup */}
                <div className="p-8 bg-gradient-to-br from-background to-muted/20 space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Your Results
                    </p>
                    <h4 className="text-2xl font-bold text-foreground">
                      AI Readiness Assessment
                    </h4>
                  </div>
                  {/* Score ring */}
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={`${0.74 * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                          strokeLinecap="round"
                          className="text-primary"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">74%</span>
                        <span className="text-[10px] font-semibold text-emerald-600">
                          High Potential
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Category breakdown */}
                  <div className="space-y-3">
                    {[
                      { label: "Team Readiness", pct: 85, color: "bg-emerald-500" },
                      { label: "Data Infrastructure", pct: 60, color: "bg-amber-500" },
                      { label: "Strategy & Budget", pct: 78, color: "bg-primary" },
                    ].map((cat) => (
                      <div key={cat.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{cat.label}</span>
                          <span className="text-muted-foreground">{cat.pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat.color}`}
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* CTA */}
                  <div className="flex gap-3 pt-2">
                    <div className="flex-1 text-center py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">
                      \ud83d\udcc4 Download PDF Report
                    </div>
                    <div className="flex-1 text-center py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium border">
                      Schedule a Call \u2192
                    </div>
                  </div>
                </div>
              </div>

              {/* Right \u2014 copy */}
              <div className="space-y-6">
                <h2 className="text-4xl font-bold font-display leading-tight">
                  Deliver results that <span className="text-primary">convert</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Every quiz ends with a personalized results page. Show scores,
                  category breakdowns, and outcome-specific recommendations \u2014 then
                  capture the lead with an email gate or PDF download.
                </p>
                <ul className="space-y-3">
                  {[
                    "Personalized score with category breakdown",
                    "Branded PDF reports auto-emailed to each lead",
                    "Gate results behind Stripe paywall",
                    "Custom CTAs per outcome (schedule a call, download, buy)",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <span className="text-primary mt-0.5 shrink-0">\u2713</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* \u2500\u2500\u2500 Use Cases \u2500\u2500\u2500 */}
        <section id="use-cases" className="py-24 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] border-t">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
            <div className="text-center mx-auto mb-16 space-y-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                Use Cases
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold font-display">
                Built for <span className="text-primary">any industry</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From lead qualification to compliance checks \u2014 our platform adapts to
                your specific needs.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                {
                  emoji: "\ud83c\udfaf",
                  title: "Lead Qualification",
                  desc: "Score and segment prospects by fit before your team picks up the phone.",
                  color: "border-l-indigo-500",
                },
                {
                  emoji: "\ud83d\udee1\ufe0f",
                  title: "Compliance Checks",
                  desc: "Automate regulated checklists with outcome-based guidance and audit trails.",
                  color: "border-l-emerald-500",
                },
                {
                  emoji: "\ud83d\udce6",
                  title: "Product Recommenders",
                  desc: "Guide customers to the right product with scored branching logic.",
                  color: "border-l-amber-500",
                },
                {
                  emoji: "\ud83d\ude80",
                  title: "Onboarding Flows",
                  desc: "Personalize the new-user journey based on role, goals, and experience.",
                  color: "border-l-sky-500",
                },
                {
                  emoji: "\u26a1",
                  title: "Risk Assessments",
                  desc: "Quantify exposure with weighted scoring and tiered outcome actions.",
                  color: "border-l-rose-500",
                },
                {
                  emoji: "\ud83d\udcb0",
                  title: "ROI Calculators",
                  desc: "Show prospects the exact value they're leaving on the table.",
                  color: "border-l-violet-500",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`bg-background rounded-xl border border-l-4 ${item.color} p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="text-2xl mb-3">{item.emoji}</div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* \u2500\u2500\u2500 CTA \u2500\u2500\u2500 */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-8">
            <h2 className="text-4xl font-bold font-display">
              Ready to build your <span className="underline decoration-white/40 decoration-4 underline-offset-4">first quiz</span>?
            </h2>
            <p className="text-xl text-primary-foreground/70">
              Start free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="h-14 px-10 text-lg w-full sm:w-auto bg-white text-primary font-semibold shadow-lg hover:bg-white/90"
                >
                  Get Started for Free <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 text-lg w-full sm:w-auto bg-white/15 border-2 border-white/60 text-white font-semibold hover:bg-white/25"
                >
                  Request Custom Demo
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* \u2500\u2500\u2500 Footer \u2500\u2500\u2500 */}
      <footer className="py-12 px-6 lg:px-12 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-8 mb-12">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-primary font-display">
              <img src="/logo.png" alt="Quiz Pro Quo" className="h-8 w-auto" />
              Quiz Pro Quo
            </div>
            <p className="text-sm text-muted-foreground">
              The enterprise quiz platform for modern businesses.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/demo" className="hover:text-foreground transition-colors">
                  Demo
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-foreground transition-colors">
                  Use Cases
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Request Demo
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@howstud.io"
                  className="hover:text-foreground transition-colors"
                >
                  hello@howstud.io
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
          <p>&copy; 2026 Quiz Pro Quo. Built by <a href="https://howstud.io" className="hover:text-foreground transition-colors">HOWstud.io</a></p>
        </div>
      </footer>
    </div>
  );
}