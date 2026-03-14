import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Building2, Key, CreditCard, Shield, LogOut } from "lucide-react";

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

type Workspace = { id: string; name: string; slug: string };

export default function Settings() {
  const [adminKey, setAdminKey] = useState(getAdminKey());

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["/api/admin/workspaces"],
    queryFn: () => adminFetch("/api/admin/workspaces"),
  });
  const workspace = wsData?.workspaces?.[0];

  const handleSignOut = () => {
    localStorage.removeItem("adminKey");
    window.location.href = "/";
  };

  const handleSaveKey = () => {
    localStorage.setItem("adminKey", adminKey);
    window.location.reload();
  };

  return (
    <AdminLayout>
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace and account.</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace
            </CardTitle>
            <CardDescription>Your workspace details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input value={workspace?.name ?? "—"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Workspace Slug</Label>
              <Input value={workspace?.slug ?? "—"} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Your quizzes will be available at <code>/w/{workspace?.slug ?? "..."}/quiz-slug</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Admin Key
            </CardTitle>
            <CardDescription>Your API admin key for authentication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter your admin key"
                />
                <Button variant="outline" onClick={handleSaveKey}>
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>Your current plan and billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div>
                <p className="font-medium">Free Plan</p>
                <p className="text-sm text-muted-foreground">Create quizzes for free. Upgrade to publish.</p>
              </div>
              <Badge variant="secondary">Free</Badge>
            </div>
            <Button className="mt-4 w-full" onClick={() => window.location.href = "/pricing"}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will clear your admin key and return you to the homepage.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
