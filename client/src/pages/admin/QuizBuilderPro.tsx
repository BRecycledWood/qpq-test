/**
 * QuizBuilderPro — Unified quiz builder for QPQ.
 *
 * Merges both quiz systems (Packs backend + Quiz localStorage) into one
 * production-quality builder that saves to the Pack API.
 *
 * Features:
 * - 12 question types
 * - Full scoring engine (condition → points)
 * - Calculated fields (JS expressions)
 * - Branching logic per question
 * - ShowIf visibility rules
 * - Outcomes (pass/caution/fail) with CTA
 * - Threshold rules (score range → outcome)
 * - Disqualifier rules
 * - Stripe paywall
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { nanoid } from "nanoid";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConditionBuilder from "@/components/ConditionBuilder";
import type {
  PackDefinition,
  Question,
  QuestionType,
  QuestionOption,
  BranchingRule,
  CalculatedField,
  Outcome,
  ScoringRule,
  DisqualifierRule,
  ThresholdRule,
  ShowIfRule,
  ConditionGroup,
  PricingRule,
} from "@shared/pack";
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Settings,
  List,
  GitBranch,
  Calculator,
  AlertTriangle,
  Target,
  DollarSign,
  ChevronLeft,
  Copy,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Rocket,
  FileText,
  Zap,
  Check,
  X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string; group: string }[] = [
  { value: "yes_no", label: "Yes / No", icon: "✓✗", group: "Choice" },
  { value: "true_false", label: "True / False", icon: "T/F", group: "Choice" },
  { value: "single", label: "Single Select", icon: "◉", group: "Choice" },
  { value: "multi", label: "Multi Select", icon: "☑", group: "Choice" },
  { value: "dropdown", label: "Dropdown", icon: "▾", group: "Choice" },
  { value: "number", label: "Number", icon: "#", group: "Input" },
  { value: "percent", label: "Percent (0–100)", icon: "%", group: "Input" },
  { value: "scale_1_5", label: "Scale 1–5", icon: "⑤", group: "Input" },
  { value: "scale_1_10", label: "Scale 1–10", icon: "⑩", group: "Input" },
  { value: "short_text", label: "Short Text", icon: "Aa", group: "Text" },
  { value: "long_text", label: "Long Text", icon: "¶", group: "Text" },
  { value: "date", label: "Date", icon: "📅", group: "Input" },
];

const QUESTION_TYPE_MAP = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t]));

const HAS_OPTIONS: QuestionType[] = ["single", "multi", "dropdown"];

const BRANCHING_CONDITIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

function getAdminKey() {
  return typeof window !== "undefined" ? localStorage.getItem("adminKey") ?? "" : "";
}

async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const key = getAdminKey();
  const res = await fetch(url, {
    ...opts,
    headers: {
      "x-admin-key": key,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PackMeta = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  publishedVersionId: string | null;
  isPaid: boolean;
  stripePriceId: string | null;
};

type PackVersionRecord = {
  id: string;
  packId: string;
  version: number;
  createdAt: string;
  definition: PackDefinition;
};

type Workspace = { id: string; name: string; slug: string };

// ─── Builder State ────────────────────────────────────────────────────────────

function emptyDefinition(): PackDefinition {
  return {
    name: "New Quiz",
    description: "",
    version: 1,
    questions: [],
    outcomes: [],
    calculatedFields: [],
    scoring: [],
    disqualifiers: [],
    thresholds: [],
    showIf: [],
    pricing: { isPaid: false },
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuizBuilderPro({ isNew }: { isNew?: boolean }) {
  const [, editParams] = useRoute("/admin/builder/:packId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const packId = editParams?.packId;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packMeta, setPackMeta] = useState<PackMeta | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [def, setDef] = useState<PackDefinition>(emptyDefinition());
  const [selectedQId, setSelectedQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("questions");
  const [dirty, setDirty] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Selected question
  const selectedQ = useMemo(
    () => def.questions.find((q) => q.id === selectedQId) ?? null,
    [def.questions, selectedQId],
  );

  // ─── Load Data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const wsData = await apiFetch<{ workspaces: Workspace[] }>("/api/admin/workspaces");
        setWorkspaces(wsData.workspaces);

        if (!isNew && packId) {
          // Load existing pack
          const packsPromises = wsData.workspaces.map((ws) =>
            apiFetch<{ packs: PackMeta[] }>(`/api/admin/workspaces/${ws.id}/packs`),
          );
          const allPacksRes = await Promise.all(packsPromises);
          const allPacks = allPacksRes.flatMap((r) => r.packs);
          const pack = allPacks.find((p) => p.id === packId);

          if (pack) {
            setPackMeta(pack);
            const versRes = await apiFetch<{ versions: PackVersionRecord[] }>(
              `/api/admin/packs/${packId}/versions`,
            );
            const versions = versRes.versions.sort((a, b) => b.version - a.version);
            if (versions.length > 0) {
              const latestDef = versions[0].definition;
              setDef({
                ...emptyDefinition(),
                ...latestDef,
                calculatedFields: latestDef.calculatedFields ?? [],
                scoring: latestDef.scoring ?? [],
                disqualifiers: latestDef.disqualifiers ?? [],
                thresholds: latestDef.thresholds ?? [],
                showIf: latestDef.showIf ?? [],
                pricing: latestDef.pricing ?? { isPaid: false },
              });
              if (latestDef.questions.length > 0) {
                setSelectedQId(latestDef.questions[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error("Load error:", err);
        toast({ title: "Error loading data", description: String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [isNew, packId]);

  // ─── Save (draft only — no publish) ─────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      let targetPackId = packMeta?.id;

      // Create pack if new
      if (!targetPackId) {
        const wsId = workspaces[0]?.id;
        if (!wsId) throw new Error("No workspace found. Create one first.");

        const slug = (def.name ?? "quiz")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const packRes = await apiFetch<{ pack: PackMeta }>(
          `/api/admin/workspaces/${wsId}/packs`,
          {
            method: "POST",
            body: JSON.stringify({
              name: def.name ?? "New Quiz",
              slug: slug || `quiz-${nanoid(6)}`,
              isPaid: def.pricing?.isPaid ?? false,
              stripePriceId: def.pricing?.stripePriceId ?? null,
            }),
          },
        );
        targetPackId = packRes.pack.id;
        setPackMeta(packRes.pack);
      } else {
        // Update pack metadata
        await apiFetch(`/api/admin/packs/${targetPackId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: def.name,
            isPaid: def.pricing?.isPaid ?? false,
            stripePriceId: def.pricing?.stripePriceId ?? null,
          }),
        });
      }

      // Create new version (saved as draft)
      await apiFetch<{ version: PackVersionRecord }>(
        `/api/admin/packs/${targetPackId}/versions`,
        {
          method: "POST",
          body: JSON.stringify({ definition: def }),
        },
      );

      setDirty(false);
      toast({ title: "Draft saved ✓", description: "Your quiz has been saved. Publish it to make it live." });

      // Navigate to edit URL if was new
      if (isNew) {
        setLocation(`/admin/builder/${targetPackId}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [def, packMeta, workspaces, isNew, setLocation, toast]);

  // ─── Publish (save + make live) ────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    setSaving(true);
    try {
      let targetPackId = packMeta?.id;

      // Create pack if new
      if (!targetPackId) {
        const wsId = workspaces[0]?.id;
        if (!wsId) throw new Error("No workspace found. Create one first.");

        const slug = (def.name ?? "quiz")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const packRes = await apiFetch<{ pack: PackMeta }>(
          `/api/admin/workspaces/${wsId}/packs`,
          {
            method: "POST",
            body: JSON.stringify({
              name: def.name ?? "New Quiz",
              slug: slug || `quiz-${nanoid(6)}`,
              isPaid: def.pricing?.isPaid ?? false,
              stripePriceId: def.pricing?.stripePriceId ?? null,
            }),
          },
        );
        targetPackId = packRes.pack.id;
        setPackMeta(packRes.pack);
      } else {
        await apiFetch(`/api/admin/packs/${targetPackId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: def.name,
            isPaid: def.pricing?.isPaid ?? false,
            stripePriceId: def.pricing?.stripePriceId ?? null,
          }),
        });
      }

      // Create new version
      const versionRes = await apiFetch<{ version: PackVersionRecord }>(
        `/api/admin/packs/${targetPackId}/versions`,
        {
          method: "POST",
          body: JSON.stringify({ definition: def }),
        },
      );

      // Publish
      await apiFetch(`/api/admin/packs/${targetPackId}/publish/${versionRes.version.id}`, {
        method: "POST",
      });

      setDirty(false);
      setPackMeta((prev) =>
        prev ? { ...prev, publishedVersionId: versionRes.version.id } : prev,
      );
      toast({ title: "Published ✓", description: `Version ${versionRes.version.version} is now live!` });

      if (isNew) {
        setLocation(`/admin/builder/${targetPackId}`);
      }
    } catch (err) {
      console.error("Publish error:", err);
      toast({ title: "Publish failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [def, packMeta, workspaces, isNew, setLocation, toast]);

  // ─── Publish gate (freemium paywall) ───────────────────────────────────────

  const isPro = false; // TODO: wire to real subscription status

  const handlePublishClick = useCallback(() => {
    if (isPro) {
      handlePublish();
    } else {
      setShowPaywall(true);
    }
  }, [isPro, handlePublish]);

  // ─── Definition Updaters ────────────────────────────────────────────────────

  const updateDef = useCallback((patch: Partial<PackDefinition>) => {
    setDef((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const updateQuestion = useCallback((qId: string, patch: Partial<Question>) => {
    setDef((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
    }));
    setDirty(true);
  }, []);

  const addQuestion = useCallback(() => {
    const newQ: Question = {
      id: `q-${nanoid(6)}`,
      prompt: "New Question",
      type: "single",
      key: `q_${def.questions.length + 1}`,
      required: true,
      options: [
        { id: `opt-${nanoid(4)}`, label: "Option A", value: "a", points: 0 },
        { id: `opt-${nanoid(4)}`, label: "Option B", value: "b", points: 0 },
      ],
    };
    setDef((prev) => ({ ...prev, questions: [...prev.questions, newQ] }));
    setSelectedQId(newQ.id);
    setDirty(true);
  }, [def.questions.length]);

  const deleteQuestion = useCallback(
    (qId: string) => {
      setDef((prev) => ({
        ...prev,
        questions: prev.questions.filter((q) => q.id !== qId),
        // Clean up showIf rules referencing this question
        showIf: (prev.showIf ?? []).filter((r) => r.questionId !== qId),
      }));
      if (selectedQId === qId) {
        setSelectedQId(def.questions.find((q) => q.id !== qId)?.id ?? null);
      }
      setDirty(true);
    },
    [selectedQId, def.questions],
  );

  const moveQuestion = useCallback((qId: string, direction: "up" | "down") => {
    setDef((prev) => {
      const idx = prev.questions.findIndex((q) => q.id === qId);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      [questions[idx], questions[newIdx]] = [questions[newIdx], questions[idx]];
      return { ...prev, questions };
    });
    setDirty(true);
  }, []);

  const duplicateQuestion = useCallback((qId: string) => {
    setDef((prev) => {
      const q = prev.questions.find((q) => q.id === qId);
      if (!q) return prev;
      const newId = `q-${nanoid(6)}`;
      const clone: Question = {
        ...JSON.parse(JSON.stringify(q)),
        id: newId,
        key: `${q.key}_copy`,
        prompt: `${q.prompt} (Copy)`,
      };
      // Regenerate option IDs
      if (clone.options) {
        clone.options = clone.options.map((o: QuestionOption) => ({ ...o, id: `opt-${nanoid(4)}` }));
      }
      const idx = prev.questions.findIndex((q) => q.id === qId);
      const questions = [...prev.questions];
      questions.splice(idx + 1, 0, clone);
      return { ...prev, questions };
    });
    setDirty(true);
  }, []);

  // ─── Option Helpers ─────────────────────────────────────────────────────────

  const addOption = useCallback((qId: string) => {
    updateQuestion(qId, {
      options: [
        ...(def.questions.find((q) => q.id === qId)?.options ?? []),
        { id: `opt-${nanoid(4)}`, label: "New Option", value: nanoid(4), points: 0 },
      ],
    });
  }, [def.questions, updateQuestion]);

  const updateOption = useCallback(
    (qId: string, optId: string, patch: Partial<QuestionOption>) => {
      const q = def.questions.find((q) => q.id === qId);
      if (!q) return;
      updateQuestion(qId, {
        options: q.options?.map((o) => (o.id === optId ? { ...o, ...patch } : o)),
      });
    },
    [def.questions, updateQuestion],
  );

  const deleteOption = useCallback(
    (qId: string, optId: string) => {
      const q = def.questions.find((q) => q.id === qId);
      if (!q) return;
      updateQuestion(qId, {
        options: q.options?.filter((o) => o.id !== optId),
      });
    },
    [def.questions, updateQuestion],
  );

  // ─── Branching Helpers ──────────────────────────────────────────────────────

  const addBranchingRule = useCallback(
    (qId: string) => {
      const q = def.questions.find((q) => q.id === qId);
      if (!q) return;
      const rule: BranchingRule = {
        id: `br-${nanoid(4)}`,
        condition: "equals",
        value: "",
        targetQuestionId: "",
      };
      updateQuestion(qId, {
        branchingRules: [...(q.branchingRules ?? []), rule],
      });
    },
    [def.questions, updateQuestion],
  );

  const updateBranchingRule = useCallback(
    (qId: string, ruleId: string, patch: Partial<BranchingRule>) => {
      const q = def.questions.find((q) => q.id === qId);
      if (!q) return;
      updateQuestion(qId, {
        branchingRules: q.branchingRules?.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
      });
    },
    [def.questions, updateQuestion],
  );

  const deleteBranchingRule = useCallback(
    (qId: string, ruleId: string) => {
      const q = def.questions.find((q) => q.id === qId);
      if (!q) return;
      updateQuestion(qId, {
        branchingRules: q.branchingRules?.filter((r) => r.id !== ruleId),
      });
    },
    [def.questions, updateQuestion],
  );

  // ─── Scoring Rule Helpers ───────────────────────────────────────────────────

  const addScoringRule = useCallback(() => {
    const rule: ScoringRule = {
      id: `sr-${nanoid(4)}`,
      points: 1,
      when: { all: [] },
    };
    updateDef({ scoring: [...(def.scoring ?? []), rule] });
  }, [def.scoring, updateDef]);

  const updateScoringRule = useCallback(
    (ruleId: string, patch: Partial<ScoringRule>) => {
      updateDef({
        scoring: (def.scoring ?? []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
      });
    },
    [def.scoring, updateDef],
  );

  const deleteScoringRule = useCallback(
    (ruleId: string) => {
      updateDef({ scoring: (def.scoring ?? []).filter((r) => r.id !== ruleId) });
    },
    [def.scoring, updateDef],
  );

  // ─── Calculated Field Helpers ───────────────────────────────────────────────

  const addCalculatedField = useCallback(() => {
    const cf: CalculatedField = {
      id: `cf-${nanoid(4)}`,
      key: `calc_${(def.calculatedFields ?? []).length + 1}`,
      label: "New Calculated Field",
      type: "number",
      expression: "",
    };
    updateDef({ calculatedFields: [...(def.calculatedFields ?? []), cf] });
  }, [def.calculatedFields, updateDef]);

  const updateCalculatedField = useCallback(
    (cfId: string, patch: Partial<CalculatedField>) => {
      updateDef({
        calculatedFields: (def.calculatedFields ?? []).map((cf) =>
          cf.id === cfId ? { ...cf, ...patch } : cf,
        ),
      });
    },
    [def.calculatedFields, updateDef],
  );

  const deleteCalculatedField = useCallback(
    (cfId: string) => {
      updateDef({ calculatedFields: (def.calculatedFields ?? []).filter((cf) => cf.id !== cfId) });
    },
    [def.calculatedFields, updateDef],
  );

  // ─── Disqualifier Helpers ───────────────────────────────────────────────────

  const addDisqualifier = useCallback(() => {
    const dq: DisqualifierRule = {
      id: `dq-${nanoid(4)}`,
      reason: "Disqualification reason",
      when: { all: [] },
    };
    updateDef({ disqualifiers: [...(def.disqualifiers ?? []), dq] });
  }, [def.disqualifiers, updateDef]);

  const updateDisqualifier = useCallback(
    (dqId: string, patch: Partial<DisqualifierRule>) => {
      updateDef({
        disqualifiers: (def.disqualifiers ?? []).map((dq) =>
          dq.id === dqId ? { ...dq, ...patch } : dq,
        ),
      });
    },
    [def.disqualifiers, updateDef],
  );

  const deleteDisqualifier = useCallback(
    (dqId: string) => {
      updateDef({ disqualifiers: (def.disqualifiers ?? []).filter((dq) => dq.id !== dqId) });
    },
    [def.disqualifiers, updateDef],
  );

  // ─── Outcome Helpers ────────────────────────────────────────────────────────

  const addOutcome = useCallback(() => {
    const o: Outcome = {
      id: `out-${nanoid(4)}`,
      title: "New Outcome",
      description: "Describe this outcome...",
      status: "pass",
    };
    updateDef({ outcomes: [...def.outcomes, o] });
  }, [def.outcomes, updateDef]);

  const updateOutcome = useCallback(
    (oId: string, patch: Partial<Outcome>) => {
      updateDef({
        outcomes: def.outcomes.map((o) => (o.id === oId ? { ...o, ...patch } : o)),
      });
    },
    [def.outcomes, updateDef],
  );

  const deleteOutcome = useCallback(
    (oId: string) => {
      updateDef({
        outcomes: def.outcomes.filter((o) => o.id !== oId),
        thresholds: (def.thresholds ?? []).filter((t) => t.outcomeId !== oId),
      });
    },
    [def.outcomes, def.thresholds, updateDef],
  );

  // ─── Threshold Helpers ──────────────────────────────────────────────────────

  const addThreshold = useCallback(() => {
    const t: ThresholdRule = {
      id: `th-${nanoid(4)}`,
      minScore: 0,
      maxScore: undefined,
      outcomeId: def.outcomes[0]?.id ?? "",
    };
    updateDef({ thresholds: [...(def.thresholds ?? []), t] });
  }, [def.thresholds, def.outcomes, updateDef]);

  const updateThreshold = useCallback(
    (thId: string, patch: Partial<ThresholdRule>) => {
      updateDef({
        thresholds: (def.thresholds ?? []).map((t) => (t.id === thId ? { ...t, ...patch } : t)),
      });
    },
    [def.thresholds, updateDef],
  );

  const deleteThreshold = useCallback(
    (thId: string) => {
      updateDef({ thresholds: (def.thresholds ?? []).filter((t) => t.id !== thId) });
    },
    [def.thresholds, updateDef],
  );

  // ─── ShowIf Helpers ─────────────────────────────────────────────────────────

  const getShowIf = useCallback(
    (qId: string): ShowIfRule | null => {
      return (def.showIf ?? []).find((r) => r.questionId === qId) ?? null;
    },
    [def.showIf],
  );

  const setShowIf = useCallback(
    (qId: string, when: ConditionGroup | null) => {
      const existing = (def.showIf ?? []).filter((r) => r.questionId !== qId);
      if (when && ((when.all?.length ?? 0) > 0 || (when.any?.length ?? 0) > 0)) {
        existing.push({ questionId: qId, when });
      }
      updateDef({ showIf: existing });
    },
    [def.showIf, updateDef],
  );

  // ─── Preview ────────────────────────────────────────────────────────────────

  const previewUrl = useMemo(() => {
    if (!packMeta) return null;
    const ws = workspaces.find((w) => w.id === packMeta.workspaceId);
    return ws ? `/w/${ws.slug}/${packMeta.slug}` : null;
  }, [packMeta, workspaces]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading builder…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between -mt-2 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/quizzes">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {def.name || "Untitled Quiz"}
              </h1>
              {dirty && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Unsaved
                </Badge>
              )}
              {packMeta?.publishedVersionId && !dirty && (
                <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Published
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {def.questions.length} question{def.questions.length !== 1 ? "s" : ""} ·{" "}
              {def.outcomes.length} outcome{def.outcomes.length !== 1 ? "s" : ""} ·{" "}
              {(def.scoring ?? []).length} scoring rule{(def.scoring ?? []).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {previewUrl && (
            <Button variant="outline" onClick={() => window.open(previewUrl, "_blank")}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
          )}
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button onClick={handlePublishClick} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing…
              </span>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" /> Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-12 p-1 bg-muted/50">
          <TabsTrigger value="settings" className="h-10 px-5 gap-2 text-sm">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="questions" className="h-10 px-5 gap-2 text-sm">
            <List className="w-4 h-4" /> Questions
          </TabsTrigger>
          <TabsTrigger value="scoring" className="h-10 px-5 gap-2 text-sm">
            <Calculator className="w-4 h-4" /> Scoring
          </TabsTrigger>
          <TabsTrigger value="results" className="h-10 px-5 gap-2 text-sm">
            <Target className="w-4 h-4" /> Results
          </TabsTrigger>
          <TabsTrigger value="paywall" className="h-10 px-5 gap-2 text-sm">
            <DollarSign className="w-4 h-4" /> Paywall
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
                <CardDescription>Name, description, and workspace assignment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="quiz-name">Name</Label>
                  <Input
                    id="quiz-name"
                    value={def.name ?? ""}
                    onChange={(e) => updateDef({ name: e.target.value })}
                    placeholder="e.g. AI Readiness Assessment"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quiz-desc">Description</Label>
                  <Textarea
                    id="quiz-desc"
                    value={def.description ?? ""}
                    onChange={(e) => updateDef({ description: e.target.value })}
                    placeholder="Describe what this quiz measures…"
                    rows={3}
                  />
                </div>
                {packMeta && (
                  <div className="grid gap-2">
                    <Label>Workspace</Label>
                    <p className="text-sm text-muted-foreground">
                      {workspaces.find((w) => w.id === packMeta.workspaceId)?.name ?? "Unknown"} ({packMeta.slug})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* QUESTIONS TAB                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="questions">
          <div className="grid grid-cols-12 gap-6 min-h-[600px]">
            {/* ── Question Sidebar ────────────────────────────────────────── */}
            <div className="col-span-4 xl:col-span-3">
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Questions</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {def.questions.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                    {def.questions.map((q, idx) => (
                      <button
                        key={q.id}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                          selectedQId === q.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                        onClick={() => setSelectedQId(q.id)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5 min-w-[20px]">
                            {idx + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{q.prompt}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {QUESTION_TYPE_MAP[q.type]?.label ?? q.type}
                              </Badge>
                              {q.key && (
                                <span className="text-[10px] font-mono text-muted-foreground/60">
                                  {q.key}
                                </span>
                              )}
                              {q.required && (
                                <span className="text-[10px] text-red-400">req</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <Button
                      onClick={addQuestion}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <Plus className="w-3 h-3" /> Add Question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Question Editor ─────────────────────────────────────────── */}
            <div className="col-span-8 xl:col-span-9">
              {selectedQ ? (
                <div className="space-y-6">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono text-muted-foreground">
                        Q{def.questions.findIndex((q) => q.id === selectedQ.id) + 1}
                      </span>
                      <Separator orientation="vertical" className="h-6" />
                      <Badge variant="outline">
                        {QUESTION_TYPE_MAP[selectedQ.type]?.icon}{" "}
                        {QUESTION_TYPE_MAP[selectedQ.type]?.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestion(selectedQ.id, "up")}
                            disabled={def.questions[0]?.id === selectedQ.id}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move up</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestion(selectedQ.id, "down")}
                            disabled={def.questions[def.questions.length - 1]?.id === selectedQ.id}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move down</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => duplicateQuestion(selectedQ.id)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteQuestion(selectedQ.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Core fields */}
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid gap-2">
                        <Label>Question Text</Label>
                        <Textarea
                          value={selectedQ.prompt}
                          onChange={(e) => updateQuestion(selectedQ.id, { prompt: e.target.value })}
                          className="text-lg font-medium min-h-[80px]"
                          placeholder="Enter your question…"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={selectedQ.type}
                            onValueChange={(v) => updateQuestion(selectedQ.id, { type: v as QuestionType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Choice", "Input", "Text"].map((group) => (
                                <div key={group}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {group}
                                  </div>
                                  {QUESTION_TYPES.filter((t) => t.group === group).map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      <span className="mr-2">{t.icon}</span> {t.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Variable Key{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 inline text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Used in scoring conditions and calculated fields. Use snake_case (e.g. annual_revenue).
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            value={selectedQ.key ?? ""}
                            onChange={(e) =>
                              updateQuestion(selectedQ.id, { key: e.target.value.replace(/\s/g, "_") })
                            }
                            className="font-mono text-sm"
                            placeholder="question_key"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Input
                            value={selectedQ.category ?? ""}
                            onChange={(e) => updateQuestion(selectedQ.id, { category: e.target.value })}
                            placeholder="e.g. Data & Tech"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Help Text</Label>
                          <Input
                            value={selectedQ.helpText ?? ""}
                            onChange={(e) => updateQuestion(selectedQ.id, { helpText: e.target.value })}
                            placeholder="Optional hint shown below the question"
                          />
                        </div>
                        <div className="flex items-end gap-4 pb-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={selectedQ.required ?? false}
                              onCheckedChange={(c) => updateQuestion(selectedQ.id, { required: c })}
                              id="req-switch"
                            />
                            <Label htmlFor="req-switch">Required</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Answer Options (for choice types) */}
                  {HAS_OPTIONS.includes(selectedQ.type) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          Answer Options
                          <Badge variant="secondary" className="text-xs">
                            {selectedQ.options?.length ?? 0}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedQ.options?.map((opt, optIdx) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 group"
                          >
                            <span className="text-xs text-muted-foreground font-mono w-5">{optIdx + 1}</span>
                            <Input
                              value={opt.label}
                              onChange={(e) => updateOption(selectedQ.id, opt.id, { label: e.target.value })}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <Input
                              value={opt.value ?? ""}
                              onChange={(e) => updateOption(selectedQ.id, opt.id, { value: e.target.value })}
                              placeholder="Value"
                              className="w-28 font-mono text-xs"
                            />
                            <Input
                              type="number"
                              value={opt.points ?? 0}
                              onChange={(e) =>
                                updateOption(selectedQ.id, opt.id, { points: parseFloat(e.target.value) || 0 })
                              }
                              className="w-20 text-center"
                            />
                            <span className="text-xs text-muted-foreground w-8">pts</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              onClick={() => deleteOption(selectedQ.id, opt.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addOption(selectedQ.id)}>
                          <Plus className="w-3 h-3 mr-2" /> Add Option
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Branching Logic */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GitBranch className="w-4 h-4" /> Branching Logic
                        </CardTitle>
                      </div>
                      <CardDescription>Skip to a specific question based on this answer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedQ.branchingRules?.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                          <span className="text-xs font-medium text-muted-foreground">IF</span>
                          <Select
                            value={rule.condition}
                            onValueChange={(v) =>
                              updateBranchingRule(selectedQ.id, rule.id, {
                                condition: v as BranchingRule["condition"],
                              })
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BRANCHING_CONDITIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={rule.value}
                            onChange={(e) =>
                              updateBranchingRule(selectedQ.id, rule.id, { value: e.target.value })
                            }
                            className="w-28 h-8 text-xs"
                            placeholder="Value"
                          />
                          <span className="text-xs font-medium text-muted-foreground">→</span>
                          <Select
                            value={rule.targetQuestionId}
                            onValueChange={(v) =>
                              updateBranchingRule(selectedQ.id, rule.id, { targetQuestionId: v })
                            }
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue placeholder="Go to…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="finish">✓ End Quiz</SelectItem>
                              {def.questions
                                .filter((q) => q.id !== selectedQ.id)
                                .map((q, i) => (
                                  <SelectItem key={q.id} value={q.id}>
                                    Q{def.questions.indexOf(q) + 1}: {q.prompt.substring(0, 40)}
                                    {q.prompt.length > 40 ? "…" : ""}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteBranchingRule(selectedQ.id, rule.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => addBranchingRule(selectedQ.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Rule
                        </Button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Default next:</span>
                          <Select
                            value={selectedQ.defaultNextQuestionId || "next"}
                            onValueChange={(v) =>
                              updateQuestion(selectedQ.id, {
                                defaultNextQuestionId: v === "next" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="w-44 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="next">Next in order</SelectItem>
                              <SelectItem value="finish">End Quiz</SelectItem>
                              {def.questions
                                .filter((q) => q.id !== selectedQ.id)
                                .map((q) => (
                                  <SelectItem key={q.id} value={q.id}>
                                    Q{def.questions.indexOf(q) + 1}: {q.prompt.substring(0, 35)}…
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ShowIf Visibility */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Visibility (Show If)
                      </CardTitle>
                      <CardDescription>
                        Only show this question when certain conditions are met. Leave empty to always show.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ConditionBuilder
                        conditions={getShowIf(selectedQ.id)?.when.all ?? []}
                        questions={def.questions.filter((q) => q.id !== selectedQ.id)}
                        onChange={(conditions) => {
                          setShowIf(selectedQ.id, conditions.length > 0 ? { all: conditions } : null);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="flex items-center justify-center h-96">
                  <div className="text-center text-muted-foreground space-y-3">
                    <FileText className="w-12 h-12 mx-auto opacity-30" />
                    <p className="font-medium">No question selected</p>
                    <p className="text-sm">Select a question from the sidebar or create a new one.</p>
                    <Button onClick={addQuestion} variant="outline">
                      <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SCORING TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="scoring">
          <div className="max-w-4xl space-y-8">
            {/* Scoring Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Scoring Rules
                </CardTitle>
                <CardDescription>
                  Award points when conditions are met. These add up to produce the final score used by
                  threshold rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(def.scoring ?? []).map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Points:</Label>
                          <Input
                            type="number"
                            value={rule.points}
                            onChange={(e) =>
                              updateScoringRule(rule.id, { points: parseInt(e.target.value) || 0 })
                            }
                            className="w-20 h-8 text-center font-bold"
                          />
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {rule.id}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteScoringRule(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        When ALL conditions match:
                      </Label>
                      <ConditionBuilder
                        conditions={rule.when.all ?? []}
                        questions={def.questions}
                        onChange={(conditions) => updateScoringRule(rule.id, { when: { ...rule.when, all: conditions } })}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addScoringRule}>
                  <Plus className="w-4 h-4 mr-2" /> Add Scoring Rule
                </Button>
              </CardContent>
            </Card>

            {/* Calculated Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" /> Calculated Fields
                </CardTitle>
                <CardDescription>
                  Compute derived values from answers using JS expressions. Reference question keys (e.g.{" "}
                  <code className="bg-muted px-1 rounded">revenue / employees</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(def.calculatedFields ?? []).map((cf) => (
                  <div key={cf.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-mono">{cf.key}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteCalculatedField(cf.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={cf.label}
                          onChange={(e) => updateCalculatedField(cf.id, { label: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Key (snake_case)</Label>
                        <Input
                          value={cf.key}
                          onChange={(e) =>
                            updateCalculatedField(cf.id, { key: e.target.value.replace(/\s/g, "_") })
                          }
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Output Type</Label>
                        <Select
                          value={cf.type}
                          onValueChange={(v) =>
                            updateCalculatedField(cf.id, { type: v as CalculatedField["type"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expression</Label>
                      <Input
                        value={cf.expression}
                        onChange={(e) => updateCalculatedField(cf.id, { expression: e.target.value })}
                        className="font-mono"
                        placeholder="e.g. active_str_count / building_unit_count"
                      />
                    </div>
                    {cf.description !== undefined && (
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={cf.description ?? ""}
                          onChange={(e) => updateCalculatedField(cf.id, { description: e.target.value })}
                          placeholder="What this calculates"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addCalculatedField}>
                  <Plus className="w-4 h-4 mr-2" /> Add Calculated Field
                </Button>
              </CardContent>
            </Card>

            {/* Disqualifiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" /> Disqualifiers
                </CardTitle>
                <CardDescription>
                  Instant-fail rules. If any condition matches, the user is disqualified and no outcome is
                  calculated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(def.disqualifiers ?? []).map((dq) => (
                  <div key={dq.id} className="border border-red-200 bg-red-50/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <Label className="text-xs">Reason shown to user</Label>
                        <Input
                          value={dq.reason}
                          onChange={(e) => updateDisqualifier(dq.id, { reason: e.target.value })}
                          placeholder="e.g. Active coverage is required."
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDisqualifier(dq.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        When ALL conditions match:
                      </Label>
                      <ConditionBuilder
                        conditions={dq.when.all ?? []}
                        questions={def.questions}
                        onChange={(conditions) => updateDisqualifier(dq.id, { when: { ...dq.when, all: conditions } })}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addDisqualifier}>
                  <Plus className="w-4 h-4 mr-2" /> Add Disqualifier
                </Button>
              </CardContent>
            </Card>

            {/* Available Question Keys Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Quick Reference — Question Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {def.questions
                    .filter((q) => q.key)
                    .map((q) => (
                      <Badge key={q.id} variant="outline" className="font-mono text-xs">
                        {q.key} <span className="text-muted-foreground ml-1">({q.type})</span>
                      </Badge>
                    ))}
                  {(def.calculatedFields ?? []).map((cf) => (
                    <Badge key={cf.id} variant="secondary" className="font-mono text-xs">
                      {cf.key} <span className="text-muted-foreground ml-1">(calc)</span>
                    </Badge>
                  ))}
                  {def.questions.filter((q) => q.key).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No keys assigned yet. Add keys to questions in the Questions tab.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RESULTS TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="results">
          <div className="max-w-4xl space-y-8">
            {/* Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Outcomes</CardTitle>
                <CardDescription>
                  Define the possible results. Users see one outcome based on their score and threshold
                  rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {def.outcomes.map((outcome) => {
                  const statusColor =
                    outcome.status === "pass"
                      ? "border-l-emerald-500 bg-emerald-50/30"
                      : outcome.status === "caution"
                        ? "border-l-amber-500 bg-amber-50/30"
                        : "border-l-red-500 bg-red-50/30";

                  return (
                    <div key={outcome.id} className={`border border-l-4 rounded-lg p-5 space-y-4 ${statusColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={outcome.title}
                              onChange={(e) => updateOutcome(outcome.id, { title: e.target.value })}
                              className="font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={outcome.status ?? "pass"}
                              onValueChange={(v) =>
                                updateOutcome(outcome.id, { status: v as Outcome["status"] })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass
                                  </span>
                                </SelectItem>
                                <SelectItem value="caution">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Caution
                                  </span>
                                </SelectItem>
                                <SelectItem value="fail">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" /> Fail
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-4"
                          onClick={() => deleteOutcome(outcome.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={outcome.description ?? ""}
                          onChange={(e) => updateOutcome(outcome.id, { description: e.target.value })}
                          rows={2}
                          placeholder="What this outcome means for the user…"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CTA Button Label</Label>
                          <Input
                            value={outcome.ctaLabel ?? ""}
                            onChange={(e) => updateOutcome(outcome.id, { ctaLabel: e.target.value })}
                            placeholder="e.g. Book a Consultation"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CTA URL</Label>
                          <Input
                            value={outcome.ctaUrl ?? ""}
                            onChange={(e) => updateOutcome(outcome.id, { ctaUrl: e.target.value })}
                            placeholder="https://…"
                          />
                        </div>
                      </div>

                      <div className="text-xs font-mono text-muted-foreground">ID: {outcome.id}</div>
                    </div>
                  );
                })}
                <Button variant="outline" onClick={addOutcome}>
                  <Plus className="w-4 h-4 mr-2" /> Add Outcome
                </Button>
              </CardContent>
            </Card>

            {/* Threshold Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Threshold Rules</CardTitle>
                <CardDescription>
                  Map score ranges to outcomes. The engine evaluates top-to-bottom and picks the last
                  match.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(def.thresholds ?? []).length > 0 && (
                  <div className="text-xs font-medium text-muted-foreground grid grid-cols-12 gap-2 px-2">
                    <div className="col-span-3">Min Score</div>
                    <div className="col-span-3">Max Score</div>
                    <div className="col-span-5">→ Outcome</div>
                    <div className="col-span-1" />
                  </div>
                )}
                {(def.thresholds ?? []).map((th) => (
                  <div key={th.id} className="grid grid-cols-12 gap-2 items-center border rounded-lg px-3 py-2">
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={th.minScore}
                        onChange={(e) =>
                          updateThreshold(th.id, { minScore: parseInt(e.target.value) || 0 })
                        }
                        className="h-9 text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={th.maxScore ?? ""}
                        onChange={(e) =>
                          updateThreshold(th.id, {
                            maxScore: e.target.value === "" ? undefined : parseInt(e.target.value),
                          })
                        }
                        className="h-9 text-center"
                        placeholder="∞"
                      />
                    </div>
                    <div className="col-span-5">
                      <Select
                        value={th.outcomeId}
                        onValueChange={(v) => updateThreshold(th.id, { outcomeId: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select outcome…" />
                        </SelectTrigger>
                        <SelectContent>
                          {def.outcomes.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    o.status === "pass"
                                      ? "bg-emerald-500"
                                      : o.status === "caution"
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                />
                                {o.title}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteThreshold(th.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addThreshold} disabled={def.outcomes.length === 0}>
                  <Plus className="w-4 h-4 mr-2" /> Add Threshold Rule
                </Button>
                {def.outcomes.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add outcomes above first.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PAYWALL TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="paywall">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Result Paywall
                </CardTitle>
                <CardDescription>
                  Gate the full results behind a Stripe payment. Users complete the quiz for free but must
                  pay to see their detailed report.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border p-4 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Enable Paywall</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Require payment to view full results & download PDF
                    </p>
                  </div>
                  <Switch
                    checked={def.pricing?.isPaid ?? false}
                    onCheckedChange={(c) =>
                      updateDef({ pricing: { ...def.pricing, isPaid: c } })
                    }
                  />
                </div>

                {def.pricing?.isPaid && (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stripe Price ID</Label>
                        <Input
                          value={def.pricing?.stripePriceId ?? ""}
                          onChange={(e) =>
                            updateDef({
                              pricing: { ...def.pricing, stripePriceId: e.target.value },
                            })
                          }
                          className="font-mono text-sm"
                          placeholder="price_1Abc..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Create in Stripe Dashboard → Products → Pricing
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Display Amount</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={def.pricing?.amount ?? ""}
                            onChange={(e) =>
                              updateDef({
                                pricing: {
                                  ...def.pricing,
                                  amount: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              })
                            }
                            placeholder="49"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={def.pricing?.currency ?? "usd"}
                          onValueChange={(v) =>
                            updateDef({ pricing: { ...def.pricing, currency: v } })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usd">USD</SelectItem>
                            <SelectItem value="eur">EUR</SelectItem>
                            <SelectItem value="gbp">GBP</SelectItem>
                            <SelectItem value="cad">CAD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Billing Interval</Label>
                        <Select
                          value={def.pricing?.interval ?? "one_time"}
                          onValueChange={(v) =>
                            updateDef({
                              pricing: { ...def.pricing, interval: v as PricingRule["interval"] },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-Time</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="year">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post-Completion info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Post-Completion Features (Auto)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>PDF report auto-generated with workspace branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Email delivery with PDF attachment (if Zoho configured)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Lead notification sent to workspace admin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Submission tracked in analytics dashboard</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>CSV export available from quiz dashboard</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Sticky Save Bar ────────────────────────────────────────────── */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t py-3 px-6 flex items-center justify-between z-50">
          <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Discard
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button onClick={handlePublishClick} disabled={saving}>
              <Rocket className="mr-2 h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      )}

      {/* ─── Publish Paywall Modal ─────────────────────────────────────── */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Ready to Go Live?</DialogTitle>
            <DialogDescription className="text-center">
              Upgrade to Pro to publish your quiz and start collecting leads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Free vs Pro comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Free</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Create quizzes</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Visual editor</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Branching logic</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Scoring engine</li>
                  <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-400" /> Publish & share</li>
                  <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-400" /> Lead capture</li>
                  <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-400" /> Analytics</li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-primary p-4 bg-primary/5 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-3">Recommended</Badge>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">Pro</p>
                <p className="text-2xl font-bold mb-3">$39<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Everything in Free</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Unlimited publishing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Lead capture & email</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Full analytics</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> PDF reports</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Custom branding</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Priority support</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 text-base"
                onClick={() => {
                  setShowPaywall(false);
                  setLocation("/pricing");
                }}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Upgrade to Pro
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setShowPaywall(false)}
              >
                Maybe later — keep editing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
