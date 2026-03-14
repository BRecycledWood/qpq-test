/**
 * QuizList — Real quiz list from Pack API.
 * Shows all packs for the workspace with status, stats, and quick actions.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Edit2,
  ExternalLink,
  BarChart3,
  Copy,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Admin key & fetch                                                  */
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
type Workspace = { id: string; name: string; slug: string };

type Pack = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  publishedVersionId: string | null;
  isPaid: boolean;
  stripePriceId: string | null;
};

type WorkspaceStats = {
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function QuizList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* ---- Fetch workspace ---- */
  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["/api/admin/workspaces"],
    queryFn: () => adminFetch("/api/admin/workspaces"),
  });
  const workspace = wsData?.workspaces?.[0];
  const workspaceId = workspace?.id ?? "";
  const workspaceSlug = workspace?.slug ?? "";

  /* ---- Fetch packs ---- */
  const { data: packsData, isLoading: packsLoading } = useQuery<{ packs: Pack[] }>({
    queryKey: ["packs", workspaceId],
    queryFn: () => adminFetch(`/api/admin/workspaces/${workspaceId}/packs`),
    enabled: Boolean(workspaceId),
  });

  /* ---- Fetch stats for each pack ---- */
  const { data: statsData } = useQuery<WorkspaceStats>({
    queryKey: ["stats", workspaceId],
    queryFn: () => adminFetch(`/api/admin/workspaces/${workspaceId}/stats`),
    enabled: Boolean(workspaceId),
  });

  const packs = packsData?.packs ?? [];
  const statsMap = new Map(
    (statsData?.quizBreakdown ?? []).map((q) => [q.packId, q])
  );

  /* ---- Clone handler ---- */
  async function handleClone(packId: string) {
    try {
      const key = getAdminKey();
      const res = await fetch(`/api/admin/packs/${packId}/clone`, {
        method: "POST",
        headers: { "x-admin-key": key },
      });
      if (!res.ok) throw new Error("Clone failed");
      toast({ title: "Quiz duplicated", description: "A copy has been created." });
      // refetch
      window.location.reload();
    } catch {
      toast({ title: "Error", description: "Could not duplicate quiz.", variant: "destructive" });
    }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
          <p className="text-muted-foreground">
            {packs.length} quiz{packs.length !== 1 ? "zes" : ""} in your workspace
          </p>
        </div>
        <Link href="/admin/builder/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      </div>

      {/* Loading state */}
      {packsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!packsLoading && packs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first quiz to start collecting leads and generating insights.
            </p>
            <Link href="/admin/builder/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quiz table */}
      {!packsLoading && packs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz Name</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Last Activity</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => {
                  const s = statsMap.get(pack.id);
                  return (
                    <TableRow
                      key={pack.id}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/admin/builder/${pack.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <span>{pack.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">/{workspaceSlug}/{pack.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {pack.publishedVersionId ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                        {pack.isPaid && (
                          <Badge variant="outline" className="ml-1.5 text-xs">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {s?.completedSubmissions ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {s ? (
                          <Badge className={
                            s.completionRate >= 60
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : s.completionRate >= 30
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                          }>
                            {s.completionRate}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {s ? `$${s.totalRevenue.toLocaleString()}` : "$0"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {s?.lastSubmissionAt
                          ? new Date(s.lastSubmissionAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/admin/builder/${pack.id}`); }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Quiz
                            </DropdownMenuItem>
                            {pack.publishedVersionId && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/w/${workspaceSlug}/${pack.slug}`, "_blank"); }}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Live
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/admin/quiz/${pack.id}/dashboard`); }}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClone(pack.id); }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
