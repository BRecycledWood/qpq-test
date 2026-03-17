import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Users, CheckCircle, DollarSign, TrendingUp, Plus, ArrowUpRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Admin key helper                                                   */
/* ------------------------------------------------------------------ */
function getAdminKey() {
  return typeof window !== "undefined" ? localStorage.getItem("adminKey") ?? "" : "";
}

function adminFetch(url: string) {
  const key = getAdminKey();
  return fetch(url, { headers: { "x-admin-key": key } }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type WorkspaceStats = {
  totalSubmissions: number;
  completedSubmissions: number;
  totalRevenue: number;
  avgCompletionRate: number;
  submissionsByDay: Array<{ date: string; count: number }>;
  outcomeBreakdown: Array<{ outcomeId: string; label: string; count: number }>;
  quizBreakdown: Array<{
    packId: string;
    packName: string;
    packSlug: string;
    totalSubmissions: number;
    completedSubmissions: number;
    completionRate: number;
    totalRevenue: number;
    lastSubmissionAt: string | null;
  }>;
};

type Submission = {
  id: string;
  email: string | null;
  firstName: string | null;
  packId: string;
  outcomeLabel: string | null;
  completedAt: string | null;
  createdAt: string;
  paid: boolean;
};

type Workspace = { id: string; name: string; slug: string };

/* ------------------------------------------------------------------ */
/*  Demo / seed data (used when API returns empty)                     */
/* ------------------------------------------------------------------ */
function generateDemoChart(): { date: string; count: number }[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29 + i);
    const base = 3 + Math.floor(i * 0.35);
    return {
      date: d.toISOString().slice(0, 10),
      count: base + Math.floor(Math.random() * 5),
    };
  });
}

const DEMO_STATS: WorkspaceStats = {
  totalSubmissions: 312,
  completedSubmissions: 247,
  totalRevenue: 4_235,
  avgCompletionRate: 68,
  submissionsByDay: generateDemoChart(),
  outcomeBreakdown: [
    { outcomeId: "d1", label: "Industry Leader", count: 82 },
    { outcomeId: "d2", label: "On Track", count: 97 },
    { outcomeId: "d3", label: "Needs Improvement", count: 44 },
    { outcomeId: "d4", label: "At Risk", count: 24 },
  ],
  quizBreakdown: [
    { packId: "demo-1", packName: "Marketing Readiness Assessment", packSlug: "marketing-readiness", totalSubmissions: 142, completedSubmissions: 108, completionRate: 76, totalRevenue: 2_156, lastSubmissionAt: new Date().toISOString() },
    { packId: "demo-2", packName: "Financial Health Check", packSlug: "financial-health", totalSubmissions: 89, completedSubmissions: 71, completionRate: 80, totalRevenue: 1_421, lastSubmissionAt: new Date(Date.now() - 86400000).toISOString() },
    { packId: "demo-3", packName: "Sales Pipeline Diagnostic", packSlug: "sales-pipeline", totalSubmissions: 54, completedSubmissions: 45, completionRate: 83, totalRevenue: 490, lastSubmissionAt: new Date(Date.now() - 172800000).toISOString() },
    { packId: "demo-4", packName: "Leadership Style Quiz", packSlug: "leadership-style", totalSubmissions: 27, completedSubmissions: 23, completionRate: 85, totalRevenue: 168, lastSubmissionAt: new Date(Date.now() - 345600000).toISOString() },
  ],
};

const DEMO_LEADS: Submission[] = [
  { id: "s1", email: "sarah.chen@acme.io", firstName: "Sarah", packId: "demo-1", outcomeLabel: "Industry Leader", completedAt: new Date().toISOString(), createdAt: new Date().toISOString(), paid: true },
  { id: "s2", email: "james.wilson@startup.co", firstName: "James", packId: "demo-2", outcomeLabel: "On Track", completedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(), paid: true },
  { id: "s3", email: "maria.garcia@enterprise.com", firstName: "Maria", packId: "demo-1", outcomeLabel: "Industry Leader", completedAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(), paid: false },
  { id: "s4", email: "alex.kumar@agency.co", firstName: "Alex", packId: "demo-3", outcomeLabel: "Needs Improvement", completedAt: new Date(Date.now() - 14400000).toISOString(), createdAt: new Date(Date.now() - 14400000).toISOString(), paid: true },
  { id: "s5", email: "rachel.lee@consulting.io", firstName: "Rachel", packId: "demo-2", outcomeLabel: "On Track", completedAt: new Date(Date.now() - 28800000).toISOString(), createdAt: new Date(Date.now() - 28800000).toISOString(), paid: false },
  { id: "s6", email: "david.patel@growth.co", firstName: "David", packId: "demo-4", outcomeLabel: "At Risk", completedAt: new Date(Date.now() - 43200000).toISOString(), createdAt: new Date(Date.now() - 43200000).toISOString(), paid: true },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9"];

function completionBadge(rate: number) {
  if (rate >= 60) return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{rate}%</Badge>;
  if (rate >= 30) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{rate}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{rate}%</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const [, setLocation] = useLocation();

  /* ---- API queries ---- */
  const { data: workspacesData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["/api/admin/workspaces"],
    queryFn: () => adminFetch("/api/admin/workspaces"),
  });
  const workspaceId = workspacesData?.workspaces?.[0]?.id ?? "";

  const { data: liveStats, isLoading: statsLoading } = useQuery<WorkspaceStats>({
    queryKey: ["stats", workspaceId],
    queryFn: () => adminFetch(`/api/admin/workspaces/${workspaceId}/stats`),
    enabled: Boolean(workspaceId),
  });

  const { data: subsData } = useQuery<{ submissions: Submission[]; total: number }>({
    queryKey: ["submissions", workspaceId],
    queryFn: () => adminFetch(`/api/admin/workspaces/${workspaceId}/submissions?limit=10`),
    enabled: Boolean(workspaceId),
  });

  /* ---- Determine if we should show demo data ---- */
  const hasRealData = liveStats && (liveStats.totalSubmissions > 0 || (liveStats.quizBreakdown?.length ?? 0) > 0);
  const isDemo = !hasRealData;
  const stats = hasRealData ? liveStats : DEMO_STATS;
  const submissions = (subsData?.submissions?.length ?? 0) > 0 ? subsData!.submissions : (isDemo ? DEMO_LEADS : []);

  /* ---- Pack name map ---- */
  const packNameMap: Record<string, string> = {};
  stats?.quizBreakdown?.forEach((q) => { packNameMap[q.packId] = q.packName; });

  return (
    <AdminLayout>
      {/* Demo banner */}
      {isDemo && !statsLoading && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            <strong>Demo Data</strong> — This is sample data to show you how your dashboard will look. Create and publish a quiz to see real analytics!
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your assessment performance at a glance.</p>
        </div>
        <Link href="/admin/builder/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedSubmissions ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed submissions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `$${stats.totalRevenue.toLocaleString()}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From paid assessments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.avgCompletionRate}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all quizzes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Quizzes</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quizBreakdown?.length ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">With submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mb-8">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Submissions Over Time</CardTitle>
            <CardDescription>Daily completions — last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              {stats?.submissionsByDay ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.submissionsByDay}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Outcome Breakdown</CardTitle>
            <CardDescription>Distribution across all quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center relative">
              {stats?.outcomeBreakdown && stats.outcomeBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.outcomeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="label">
                        {stats.outcomeBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-bold">{stats.completedSubmissions}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No data yet</div>
              )}
            </div>
            {stats?.outcomeBreakdown && stats.outcomeBreakdown.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs text-muted-foreground">
                {stats.outcomeBreakdown.map((item, i) => (
                  <div key={item.outcomeId} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.label} ({item.count})
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance Table */}
      <Card className="mb-8 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quiz Performance</CardTitle>
            <CardDescription>Click a row to view detailed analytics.</CardDescription>
          </div>
          <Link href="/admin/quizzes">
            <Button variant="outline" size="sm" className="gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.quizBreakdown && stats.quizBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-3 pr-4 font-medium">Quiz Name</th>
                    <th className="pb-3 pr-4 font-medium text-right">Leads</th>
                    <th className="pb-3 pr-4 font-medium text-right">Completion</th>
                    <th className="pb-3 pr-4 font-medium text-right">Revenue</th>
                    <th className="pb-3 font-medium text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.quizBreakdown.map((quiz) => (
                    <tr
                      key={quiz.packId}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => !isDemo && setLocation(`/admin/quiz/${quiz.packId}/dashboard`)}
                    >
                      <td className="py-3 pr-4 font-medium">{quiz.packName}</td>
                      <td className="py-3 pr-4 text-right">{quiz.completedSubmissions}</td>
                      <td className="py-3 pr-4 text-right">{completionBadge(quiz.completionRate)}</td>
                      <td className="py-3 pr-4 text-right">${quiz.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {quiz.lastSubmissionAt ? new Date(quiz.lastSubmissionAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No quizzes yet. <Link href="/admin/builder/new" className="text-primary hover:underline">Create your first quiz</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>Latest submissions across all quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.length > 0 ? (
              submissions.map((sub) => (
                <div key={sub.id} className="flex items-center pb-3 border-b last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(sub.firstName ?? sub.email ?? "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sub.firstName ?? sub.email ?? "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">
                      {packNameMap[sub.packId] ?? sub.packId} · {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 shrink-0">
                    {sub.outcomeLabel ? (
                      <Badge variant="outline" className="text-xs">{sub.outcomeLabel}</Badge>
                    ) : null}
                    {sub.paid ? <Badge className="bg-green-600 text-xs">Paid</Badge> : null}
                  </div>
                </div>
              ))
            ) : statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No submissions yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
