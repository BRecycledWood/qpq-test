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
  ChevronRight,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a clean option value like "01-a", "01-b" from question index + existing options */
function nextOptionValue(qIndex: number, existingOptions: QuestionOption[] = []): string {
  const pad = String(qIndex + 1).padStart(2, "0");
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const used = new Set(existingOptions.map((o) => o.value));
  for (const ch of letters) {
    const candidate = `${pad}-${ch}`;
    if (!used.has(candidate)) return candidate;
  }
  // Fallback: double letter
  return `${pad}-${letters[existingOptions.length % 26]}${letters[Math.floor(existingOptions.length / 26) % 26]}`;
}

/** Build initial option pair for a new question at the given index */
function initialOptions(qIndex: number): [QuestionOption, QuestionOption] {
  const pad = String(qIndex + 1).padStart(2, "0");
  return [
    { id: `opt-${nanoid(4)}`, label: "Option A", value: `${pad}-a`, points: 0 },
    { id: `opt-${nanoid(4)}`, label: "Option B", value: `${pad}-b`, points: 0 },
  ];
}

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
  const [activeTab, setActiveTab] = useState("details");
  const [dirty, setDirty] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Tab navigation order
  const TAB_ORDER = ["details", "questions", "scoring", "results", "paywall"] as const;
  const TAB_LABELS: Record<string, string> = { details: "Details", questions: "Questions", scoring: "Scoring", results: "Results", paywall: "Paywall" };
  const tabIdx = TAB_ORDER.indexOf(activeTab as any);
  const prevTab = tabIdx > 0 ? TAB_ORDER[tabIdx - 1] : null;
  const nextTab = tabIdx < TAB_ORDER.length - 1 ? TAB_ORDER[tabIdx + 1] : null;

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
        // Silently start with empty builder — no scary errors on load
        console.warn("Builder load:", err);
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
    const qIdx = def.questions.length;
    const newQ: Question = {
      id: `q-${nanoid(6)}`,
      prompt: "New Question",
      type: "single",
      key: `q_${qIdx + 1}`,
      required: true,
      options: [...initialOptions(qIdx)],
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
    const q = def.questions.find((q) => q.id === qId);
    const qIdx = def.questions.findIndex((q) => q.id === qId);
    const existing = q?.options ?? [];
    updateQuestion(qId, {
      options: [
        ...existing,
        { id: `opt-${nanoid(4)}`, label: "New Option", value: nextOptionValue(qIdx, existing), points: 0 },
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
          <TabsTrigger value="details" className="h-10 px-5 gap-2 text-sm">
            <FileText className="w-4 h-4" /> Details
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
        {/* DETAILS TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="details">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
                <CardDescription>
                  The name and description are shown to respondents before they start. The slug becomes part of the shareable URL.
                </CardDescription>
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
                  <p className="text-xs text-muted-foreground">This is the title respondents see at the top of your quiz.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quiz-slug">
                    URL Slug{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help inline-flex" onClick={(e) => e.preventDefault()}>
                          <HelpCircle className="w-3 h-3 inline text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        The slug is the URL-friendly version of the name. It appears in the shareable link your respondents visit.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex items-center gap-0 rounded-md border focus-within:ring-2 focus-within:ring-ring">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-2 border-r rounded-l-md whitespace-nowrap">
                      {typeof window !== "undefined" ? window.location.origin : ""}/w/{"your-workspace"}/
                    </span>
                    <Input
                      id="quiz-slug"
                      value={packMeta?.slug ?? (def.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
                        if (packMeta) {
                          setPackMeta({ ...packMeta, slug });
                          setDirty(true);
                        }
                      }}
                      className="border-0 focus-visible:ring-0 rounded-l-none font-mono text-sm"
                      placeholder="ai-readiness-assessment"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quiz-desc">Description</Label>
                  <Textarea
                    id="quiz-desc"
                    value={def.description ?? ""}
                    onChange={(e) => updateDef({ description: e.target.value })}
                    placeholder="A short paragraph explaining what this quiz measures, who it's for, and what they'll learn…"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Shown on the quiz landing page below the title. Keep it under 2-3 sentences.</p>
                </div>
                {packMeta && (
                  <div className="grid gap-2 pt-2 border-t">
                    <Label className="text-muted-foreground">Workspace</Label>
                    <p className="text-sm text-muted-foreground">
                      {workspaces.find((w) => w.id === packMeta.workspaceId)?.name ?? "Unknown"}
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
                            onValueChange={(v) => {
                              const newType = v as QuestionType;
                              const patch: Partial<Question> = { type: newType };
                              // Auto-populate options for fixed-choice types
                              if (newType === "yes_no" && (!selectedQ.options?.length || HAS_OPTIONS.includes(selectedQ.type) || selectedQ.type === "true_false")) {
                                patch.options = [
                                  { id: `opt-${nanoid(4)}`, label: "Yes", value: "yes", points: 1 },
                                  { id: `opt-${nanoid(4)}`, label: "No", value: "no", points: 0 },
                                ];
                              } else if (newType === "true_false" && (!selectedQ.options?.length || HAS_OPTIONS.includes(selectedQ.type) || selectedQ.type === "yes_no")) {
                                patch.options = [
                                  { id: `opt-${nanoid(4)}`, label: "True", value: "true", points: 1 },
                                  { id: `opt-${nanoid(4)}`, label: "False", value: "false", points: 0 },
                                ];
                              } else if (HAS_OPTIONS.includes(newType) && !selectedQ.options?.length) {
                                const qIdx = def.questions.findIndex((q) => q.id === selectedQ.id);
                                patch.options = [...initialOptions(qIdx)];
                              }
                              updateQuestion(selectedQ.id, patch);
                            }}
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
                              <TooltipTrigger asChild>
                                <span className="cursor-help inline-flex" onClick={(e) => e.preventDefault()}>
                                  <HelpCircle className="w-3 h-3 inline text-muted-foreground" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm text-left" side="top">
                                <p className="font-semibold mb-1">What is this?</p>
                                <p className="text-xs mb-2">A unique identifier for this question's answer, used behind the scenes. Think of it like a column name in a spreadsheet.</p>
                                <p className="font-semibold mb-1">Why does it matter?</p>
                                <p className="text-xs mb-2">You'll reference this key in scoring rules (e.g. "if <code className="bg-muted px-1 rounded">team_size</code> &gt; 50, award 10 points"), calculated fields, and branching logic.</p>
                                <p className="font-semibold mb-1">Format</p>
                                <p className="text-xs">Use lowercase with underscores: <code className="bg-muted px-1 rounded">annual_revenue</code>, <code className="bg-muted px-1 rounded">marketing_budget</code></p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            value={selectedQ.key ?? ""}
                            onChange={(e) =>
                              updateQuestion(selectedQ.id, { key: e.target.value.replace(/\s/g, "_").toLowerCase() })
                            }
                            className="font-mono text-sm"
                            placeholder="question_key"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Category{" "}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help inline-flex" onClick={(e) => e.preventDefault()}>
                                  <HelpCircle className="w-3 h-3 inline text-muted-foreground" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm text-left" side="top">
                                <p className="font-semibold mb-1">What is this?</p>
                                <p className="text-xs mb-2">Groups related questions together. Categories appear as sections in the results page and PDF report.</p>
                                <p className="font-semibold mb-1">Example</p>
                                <p className="text-xs">A marketing quiz might have categories like "Strategy", "Content", "Analytics", and "Budget". The results page shows a score breakdown per category, helping respondents see exactly where they're strong or weak.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            value={selectedQ.category ?? ""}
                            onChange={(e) => updateQuestion(selectedQ.id, { category: e.target.value })}
                            placeholder="e.g. Strategy"
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

                  {/* ── Answer Configuration (type-specific) ─────────────── */}
                  {(() => {
                    const t = selectedQ.type;

                    // Yes/No — fixed two options with point values
                    if (t === "yes_no" || t === "true_false") {
                      const labels = t === "yes_no" ? ["Yes", "No"] : ["True", "False"];
                      const values = t === "yes_no" ? ["yes", "no"] : ["true", "false"];
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Answer Options</CardTitle>
                            <CardDescription>
                              {t === "yes_no" ? "Yes/No" : "True/False"} has fixed options. Set the point value for each.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {[0, 1].map((i) => {
                              const opt = selectedQ.options?.[i];
                              return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                  <span className="text-sm font-medium w-16">{labels[i]}</span>
                                  <div className="flex items-center gap-2 ml-auto">
                                    <Label className="text-xs text-muted-foreground">Points:</Label>
                                    <Input
                                      type="number"
                                      value={opt?.points ?? 0}
                                      onChange={(e) => {
                                        const pts = parseFloat(e.target.value) || 0;
                                        const options = selectedQ.options?.length ? [...selectedQ.options] : [
                                          { id: `opt-${nanoid(4)}`, label: labels[0], value: values[0], points: 0 },
                                          { id: `opt-${nanoid(4)}`, label: labels[1], value: values[1], points: 0 },
                                        ];
                                        if (options[i]) options[i] = { ...options[i], points: pts };
                                        updateQuestion(selectedQ.id, { options });
                                      }}
                                      className="w-20 h-8 text-center font-bold"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      );
                    }

                    // Scale types — show range info + point mapping
                    if (t === "scale_1_5" || t === "scale_1_10") {
                      const max = t === "scale_1_5" ? 5 : 10;
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Scale Configuration</CardTitle>
                            <CardDescription>
                              Respondents choose a value from 1 to {max}. Their selection is used directly as the answer value (and as points if no scoring rules override it).
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                              <div className="flex gap-1.5">
                                {Array.from({ length: max }, (_, i) => (
                                  <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium border ${i === Math.floor(max / 2) ? "bg-primary/10 border-primary text-primary" : "bg-background"}`}>
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                              <div className="space-y-1">
                                <Label className="text-xs">Low Label (optional)</Label>
                                <Input
                                  value={selectedQ.minLabel ?? ""}
                                  onChange={(e) => updateQuestion(selectedQ.id, { minLabel: e.target.value })}
                                  placeholder="e.g. Strongly Disagree"
                                  className="h-8 text-xs w-44"
                                />
                              </div>
                              <div className="space-y-1 text-right">
                                <Label className="text-xs">High Label (optional)</Label>
                                <Input
                                  value={selectedQ.maxLabel ?? ""}
                                  onChange={(e) => updateQuestion(selectedQ.id, { maxLabel: e.target.value })}
                                  placeholder="e.g. Strongly Agree"
                                  className="h-8 text-xs w-44 text-right"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Number / Percent / Date — no options needed, show info
                    if (t === "number" || t === "percent" || t === "date") {
                      const descriptions: Record<string, string> = {
                        number: "Respondents enter a numeric value. Use this for quantities, amounts, or counts. The raw number is stored and can be used in scoring rules and calculated fields.",
                        percent: "Respondents enter a percentage (0–100). Good for rates, growth metrics, or completion levels.",
                        date: "Respondents pick a date from a calendar. Useful for timelines, start dates, or deadlines.",
                      };
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{QUESTION_TYPE_MAP[t]?.label} Input</CardTitle>
                            <CardDescription>{descriptions[t]}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="p-4 rounded-lg bg-muted/30 flex items-center gap-3">
                              <span className="text-2xl">{QUESTION_TYPE_MAP[t]?.icon}</span>
                              <span className="text-sm text-muted-foreground">
                                {t === "number" && "Respondent enters a number → stored as their answer value"}
                                {t === "percent" && "Respondent enters 0–100 → stored as their answer value"}
                                {t === "date" && "Respondent picks a date → stored as YYYY-MM-DD"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Short/Long text — no options
                    if (t === "short_text" || t === "long_text") {
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{QUESTION_TYPE_MAP[t]?.label} Input</CardTitle>
                            <CardDescription>
                              Respondents type a free-text answer. Text responses aren't scored automatically but are captured in submissions and PDF reports. Use scoring rules with "contains" conditions if needed.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="p-4 rounded-lg bg-muted/30">
                              <div className={`bg-background border rounded-md ${t === "long_text" ? "h-20" : "h-9"} px-3 py-2 text-sm text-muted-foreground/40`}>
                                {t === "short_text" ? "Short answer text…" : "Longer paragraph response…"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Choice types (single, multi, dropdown) — full options editor
                    if (HAS_OPTIONS.includes(t)) {
                      const typeLabels: Record<string, { title: string; desc: string }> = {
                        single: { title: "Single Select Options", desc: "Respondent picks exactly one option. Points for the selected option are added to their score." },
                        multi: { title: "Multi Select Options", desc: "Respondent can pick multiple options. Points from all selected options are added together." },
                        dropdown: { title: "Dropdown Options", desc: "Options appear in a dropdown menu. Respondent picks one. Works the same as Single Select but takes less screen space." },
                      };
                      const info = typeLabels[t] ?? { title: "Options", desc: "" };

                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {info.title}
                              <Badge variant="secondary" className="text-xs">
                                {selectedQ.options?.length ?? 0}
                              </Badge>
                            </CardTitle>
                            <CardDescription>{info.desc}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {/* Column headers */}
                            {(selectedQ.options?.length ?? 0) > 0 && (
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                <span className="w-5" />
                                <span className="flex-1">Label (shown to user)</span>
                                <span className="w-28">
                                  Value (stored){" "}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex">
                                        <HelpCircle className="w-2.5 h-2.5 inline text-muted-foreground" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-left" side="top">
                                      <p className="text-xs">The internal ID saved when this option is selected. Referenced in branching rules, scoring, and calculated fields. Format: <code className="bg-muted px-1 rounded">QQ-x</code> (question number + letter).</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </span>
                                <span className="w-20 text-center">Points</span>
                                <span className="w-8" />
                                <span className="w-8" />
                              </div>
                            )}
                            {selectedQ.options?.map((opt, optIdx) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2 group"
                              >
                                <span className="text-xs text-muted-foreground font-mono w-5">
                                  {t === "multi" ? "☐" : t === "dropdown" ? "▾" : "○"}
                                </span>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(selectedQ.id, opt.id, { label: e.target.value })}
                                  placeholder="Option label"
                                  className="flex-1"
                                />
                                <Input
                                  value={opt.value ?? ""}
                                  onChange={(e) => updateOption(selectedQ.id, opt.id, { value: e.target.value })}
                                  placeholder="value"
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
                      );
                    }

                    return null;
                  })()}

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
                  <HelpCircle className="w-4 h-4" /> Quick Reference — Available Keys
                </CardTitle>
                <CardDescription>
                  These are all the variable keys from your questions and calculated fields. Use them in scoring rule conditions above — for example, a condition like <code className="bg-muted px-1 rounded text-xs">team_size</code> <code className="bg-muted px-1 rounded text-xs">greater_than</code> <code className="bg-muted px-1 rounded text-xs">50</code> will check the respondent's answer to the question with key "team_size".
                </CardDescription>
              </CardHeader>
              <CardContent>
                {def.questions.filter((q) => q.key).length > 0 || (def.calculatedFields ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {def.questions.filter((q) => q.key).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Question Keys</p>
                        <div className="flex flex-wrap gap-2">
                          {def.questions
                            .filter((q) => q.key)
                            .map((q) => (
                              <Tooltip key={q.id}>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="font-mono text-xs cursor-help">
                                    {q.key} <span className="text-muted-foreground ml-1">({q.type})</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{q.prompt}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                        </div>
                      </div>
                    )}
                    {(def.calculatedFields ?? []).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Calculated Fields</p>
                        <div className="flex flex-wrap gap-2">
                          {(def.calculatedFields ?? []).map((cf) => (
                            <Tooltip key={cf.id}>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="font-mono text-xs cursor-help">
                                  {cf.key} <span className="text-muted-foreground ml-1">(calc)</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">{cf.label}</p>
                                <p className="text-xs font-mono text-muted-foreground">{cf.expression}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No keys assigned yet. Go to the Questions tab and give each question a Variable Key — you'll then reference those keys here in your scoring rules.
                  </p>
                )}
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
                  Outcomes are the result pages shown to respondents after they complete your quiz. Each outcome represents a different result — like "Industry Leader", "On Track", or "Needs Improvement". You define the outcomes here, then use Threshold Rules below to control which outcome a respondent gets based on their total score.
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
                  Connect score ranges to outcomes. For example: 0–40 points → "Needs Improvement", 41–70 → "On Track", 71–100 → "Industry Leader". 
                  Order matters — put your lowest score range first and highest last. The engine checks each rule from top to bottom and assigns the last one that matches the respondent's score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(def.thresholds ?? []).length > 0 && (
                  <div className="text-xs font-medium text-muted-foreground grid grid-cols-12 gap-2 px-2">
                    <div className="col-span-3">Min Score (≥)</div>
                    <div className="col-span-3">Max Score (≤)</div>
                    <div className="col-span-5">→ Assign This Outcome</div>
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
                {(def.thresholds ?? []).length > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">💡 How scoring works</p>
                    <p>As a respondent answers questions, their points add up. When they finish, the total score is checked against these rules from top to bottom. Leave "Max Score" empty (∞) on the last rule to catch all scores above the minimum.</p>
                    <p className="mt-1.5 font-medium">Example: 3 outcomes for a 100-point quiz</p>
                    <p className="font-mono mt-1">0–40 → Needs Improvement &nbsp;|&nbsp; 41–70 → On Track &nbsp;|&nbsp; 71–∞ → Industry Leader</p>
                  </div>
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

        {/* ─── Tab Navigation Buttons ─── */}
        <div className="flex items-center justify-between pt-4 border-t mt-2">
          {prevTab ? (
            <Button variant="outline" className="gap-2" onClick={() => setActiveTab(prevTab)}>
              <ChevronLeft className="w-4 h-4" />
              Previous: {TAB_LABELS[prevTab]}
            </Button>
          ) : <div />}
          {nextTab ? (
            <Button className="gap-2" onClick={() => setActiveTab(nextTab)}>
              Next: {TAB_LABELS[nextTab]}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : <div />}
        </div>
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
