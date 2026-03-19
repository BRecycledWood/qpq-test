import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CH_ARROW = String.fromCharCode(8594);
const CH_MDASH = String.fromCharCode(8212);
const CH_DOT = String.fromCharCode(183);

interface PlanFeature {
  text: string;
  tooltip?: string;
  comingSoon?: boolean;
  bold?: boolean;
}

interface Plan {
  name: string;
  desc: string;
  monthlyPrice: number;
  annualPrice: number;
  cta: string;
  ctaVariant: "default" | "outline";
  highlight: boolean;
  popular?: boolean;
  features: PlanFeature[];
  featureHeader: string;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    desc: "Get started with the basics. Perfect for trying out quiz-based lead generation.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Get Started Free",
    ctaVariant: "outline",
    highlight: false,
    featureHeader: "What\u2019s included",
    features: [
      { text: "1 quiz" },
      { text: "50 leads / month" },
      { text: "Scoring engine + outcomes" },
      { text: "Email lead capture" },
      { text: "Basic analytics dashboard" },
      { text: "QPQ branding on quizzes" },
    ],
  },
  {
    name: "Pro",
    desc: "For solo marketers and small teams ready to remove the training wheels.",
    monthlyPrice: 49,
    annualPrice: 39,
    cta: "Start Pro Trial",
    ctaVariant: "default",
    highlight: false,
    featureHeader: "Everything in Free, plus",
    features: [
      { text: "5 quizzes", bold: true },
      { text: "500 leads / month", bold: true },
      { text: "2 team members" },
      { text: "Automated PDF reports", bold: true },
      { text: "Branching logic" },
      { text: "White labeling", tooltip: "Remove \u2018Powered by Quiz Pro Quo\u2019 branding from your quizzes and reports" },
      { text: "Custom domain", tooltip: "Host quizzes on your own URL (e.g. quiz.yourdomain.com)" },
      { text: "Webhook integrations" },
      { text: "CSV lead export" },
    ],
  },
  {
    name: "Business",
    desc: "For agencies and growing companies scaling lead generation across clients.",
    monthlyPrice: 99,
    annualPrice: 79,
    cta: "Start Business Trial",
    ctaVariant: "default",
    highlight: true,
    popular: true,
    featureHeader: "Everything in Pro, plus",
    features: [
      { text: "25 quizzes", bold: true },
      { text: "2,000 leads / month", bold: true },
      { text: "10 team members", bold: true },
      { text: "Team roles + permissions", tooltip: "Admin, editor, and viewer roles with granular access controls" },
      { text: "Zapier + webhook integrations", tooltip: "Connect quiz results to 5,000+ apps via Zapier or custom webhooks" },
      { text: "Stripe paywalls" },
      { text: "Advanced analytics" },
      { text: "Custom branding", tooltip: "Full brand customization including colors, logos, and fonts on quizzes and reports" },
      { text: "Priority email support" },
    ],
  },
  {
    name: "Enterprise",
    desc: "For organizations running assessments at scale with compliance and security needs.",
    monthlyPrice: 179,
    annualPrice: 149,
    cta: "Schedule a Call",
    ctaVariant: "outline",
    highlight: false,
    featureHeader: "Everything in Business, plus",
    features: [
      { text: "Unlimited quizzes", bold: true },
      { text: "Unlimited leads", bold: true },
      { text: "Unlimited team members", bold: true },
      { text: "Multi-workspace support", tooltip: "Separate workspaces for different departments, brands, or clients", comingSoon: true },
      { text: "SSO / SAML authentication", tooltip: "Sign in with your company\u2019s identity provider (Okta, Azure AD, Google Workspace)", comingSoon: true },
      { text: "Audit trails + compliance", tooltip: "Full activity log of every action for regulated industries", comingSoon: true },
      { text: "Dedicated onboarding", tooltip: "1-on-1 setup session to get your first quiz live and integrated" },
      { text: "Custom integrations", tooltip: "Bespoke CRM and platform connections built for your workflow" },
      { text: "Priority support + SLA", tooltip: "Guaranteed response times: 4 hours for critical issues, 24 hours for general requests" },
    ],
  },
];

const FAQS = [
  {
    q: "Can I change plans at any time?",
    a: "Yes. Upgrade or downgrade anytime. When you upgrade, you\u2019ll be charged a prorated amount. When you downgrade, you\u2019ll receive credit toward future billing.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is counted each time someone completes a quiz and submits their email. Incomplete attempts or repeat visits from the same person don\u2019t count toward your monthly limit.",
  },
  {
    q: "What is white labeling?",
    a: "White labeling removes the \u2018Powered by Quiz Pro Quo\u2019 badge from your quizzes and PDF reports, so they look like they were built entirely by your brand.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes \u2014 if you\u2019re not satisfied within the first 14 days of any paid plan, contact us for a full refund. No questions asked.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Pro, Business, and Enterprise plans support custom domains, so your quizzes live on your own URL (e.g. quiz.yourdomain.com). You point a CNAME record to us and we handle the rest.",
  },
  {
    q: "What happens if I exceed my lead limit?",
    a: "We\u2019ll notify you when you\u2019re near your limit. Quizzes will continue to function but new leads won\u2019t be captured until the next billing cycle \u2014 or you can upgrade your plan instantly.",
  },
  {
    q: "What do the \u2018Coming Soon\u2019 features mean?",
    a: "Some Enterprise features are actively in development. They\u2019re on our near-term roadmap and will be included at no extra cost when launched. Schedule a call to learn more about timelines.",
  },
];

function FeatureRow({ feature }: { feature: PlanFeature }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      <span
        className={cn(
          "text-muted-foreground",
          feature.bold && "font-semibold text-foreground"
        )}
      >
        {feature.text}
        {feature.comingSoon && (
          <Badge
            variant="outline"
            className="ml-2 text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50 font-medium align-middle"
          >
            Coming Soon
          </Badge>
        )}
      </span>
      {feature.tooltip && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0 cursor-help" />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[220px] text-xs leading-relaxed"
            >
              {feature.tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

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
          {`Start free, scale as you grow. No hidden fees. Cancel anytime.`}
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
          <button
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all",
              !annual
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground"
            )}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              annual
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground"
            )}
            onClick={() => setAnnual(true)}
          >
            Annual
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">
              Save 20%
            </Badge>
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isEnterprise = plan.name === "Enterprise";
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
              <CardHeader className="pb-2 pt-8 px-6">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {plan.desc}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {/* Price */}
                <div className="flex items-end gap-1 mt-3 mb-1">
                  <span className="text-4xl font-bold font-display">
                    ${price}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">
                    /month
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">
                  {price === 0
                    ? "Free forever"
                    : annual
                    ? `Billed annually ($${plan.monthlyPrice}/mo if monthly)`
                    : "Billed monthly"}
                </p>

                {/* CTA */}
                {isEnterprise ? (
                  <a
                    href="https://calendly.com/brad-howstudio"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full h-11 text-sm font-semibold"
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href="/demo">
                    <Button
                      variant={plan.ctaVariant}
                      className={cn(
                        "w-full h-11 text-sm font-semibold",
                        plan.highlight && "shadow-lg shadow-primary/20"
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}

                {/* Features */}
                <div className="mt-5 pt-5 border-t space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {plan.featureHeader}
                  </p>
                  {plan.features.map((f) => (
                    <FeatureRow key={f.text} feature={f} />
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
                <span className="text-muted-foreground">
                  {openFaq === i ? "\u2212" : "+"}
                </span>
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
