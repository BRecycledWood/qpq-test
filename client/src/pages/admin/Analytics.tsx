import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  return (
    <AdminLayout>
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your assessment performance.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md">
            Advanced analytics with funnel visualization, drop-off analysis, A/B testing, and cohort reports. 
            For now, view per-quiz analytics from the Dashboard.
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
