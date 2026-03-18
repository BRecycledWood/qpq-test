import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    desc: "Get started with the basics. Perfect for trying out quiz-based lead generation.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Get Started Free",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      "Up to 3 quizzes",
      "50 leads / month",
      "Scoring engine + outcomes",
      "Email lead capture",
      "Basic analytics dashboard",
      "QPQ branding on quizzes",
    ],
  },
  {
    name: "Pro",
    desc: "For agencies and growing businesses ready to scale lead generation.",
    monthlyPrice: 49,
    annualPrice: 39,
    cta: "Start Pro Trial \u2192",
    ctaVariant: "default" as const,
    highlight: true,
    popular: true,
    features: [
      "Unlimited quizzes",
      "1,000 leads / month",
      "Automated PDF reports",
      "Branching logic",
      "Stripe paywalls",
      "White labeling (remove QPQ branding)",
      "Custom domain",
      "CSV lead export",
      "Zapier + webhook integrations",
    ],
  },
  {
    name: "Enterprise",
    desc: "For organizations running assessments at scale with custom requirements.",
    monthlyPrice: 179,
    annualPrice: 149,
    cta: "Schedule a Call",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      "Unlimited leads",
      "Multi-workspace support",
      "Team management + roles",
      "SSO / SAML authentication",
      "Priority support + SLA",
      "Dedicated onboarding",
      "Custom integrations",
      "Audit trails + compliance",
    ],
  },
];

const FAQS = [
  {
    q: "Can I change plans at any time?",
    a: "Yes. Upgrade or downgrade anytime. When you upgrade, you'll be charged a prorated amount. When you downgrade, you'll receive credit toward future billing.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is counted each time someone completes a quiz and submits their email. Incomplete attempts or repeat visits from the same person don't count toward your monthly limit.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes \u2014 if you're not satisfied within the first 14 days of any paid plan, contact us for a full refund. No questions asked.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Pro and Enterprise plans support custom domains, so your quizzes live on your own URL (e.g. quiz.yourdomain.com).",
  },
  {
    q: "What happens if I exceed my lead limit?",
    a: "We'll notify you when you're near your limit. Quizzes will continue to function but new leads won't be captured until the next billing cycle \u2014 or you can upgrade your plan instantly.",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="pt-16 pb-12 text-center px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6">
          Pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Start free, scale as you grow. No hidden fees. Cancel anytime.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
          <button
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all",
              !annual ? "bg-background shadow text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              annual ? "bg-background shadow text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setAnnual(true)}
          >
            Annual
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Save 20%</Badge>
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <Card
              key={plan.name}
              className={cn(
                "relative overflow-hidden transition-all",
                plan.highlight
                  ? "border-primary shadow-xl shadow-primary/10 scale-[1.02] z-10"
                  : "border hover:border-primary/30 hover:shadow-md"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              <CardHeader className="pb-2 pt-8 px-8">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {/* Price */}
                <div className="flex items-end gap-1 mt-4 mb-1">
                  <span className="text-5xl font-bold font-display">${price}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  {price === 0
                    ? "Free forever"
                    : annual
                    ? `Billed annually ($${plan.monthlyPrice}/mo if monthly)`
                    : "Billed monthly"}
                </p>

                {/* CTA */}
                {plan.name === "Enterprise" ? (
                  <a href="https://calendly.com/brad-howstudio" target="_blank" rel="noopener noreferrer">
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full h-12 text-sm font-semibold"
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href="/demo">
                    <Button
                      variant={plan.ctaVariant}
                      className={cn(
                        "w-full h-12 text-sm font-semibold",
                        plan.highlight && "shadow-lg shadow-primary/20"
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}

                {/* Features */}
                <div className="mt-6 pt-6 border-t space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {plan.name === "Free"
                      ? "What's included"
                      : plan.name === "Pro"
                      ? "Everything in Free, plus"
                      : "Everything in Pro, plus"}
                  </p>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className={cn("text-muted-foreground", f.includes("Unlimited") || f.includes("PDF") || f.includes("Stripe") ? "font-semibold text-foreground" : "")}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold font-display text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {faq.q}
                <span className="text-muted-foreground">{openFaq === i ? "\u2212" : "+"}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}