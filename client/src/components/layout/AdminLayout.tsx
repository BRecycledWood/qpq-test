import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Settings, BarChart3, LogOut, PenTool, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: "/admin/quizzes", icon: FileText, label: "My Quizzes" },
    { href: "/admin/builder/new", icon: PenTool, label: "Create Quiz" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const comingSoonItems = [
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location === item.href;
    return location === item.href || location.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-sidebar-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link href="/admin">
            <a className="flex items-center gap-2 font-bold text-xl text-primary">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                Q
              </div>
              QuizProQuo
            </a>
          </Link>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive(item)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          ))}

          {comingSoonItems.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Coming Soon</p>
              </div>
              {comingSoonItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive(item)
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
                  )}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 text-muted-foreground/50 border-muted-foreground/20">Soon</Badge>
                  </a>
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              HS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">HOWstud.io</p>
              <p className="text-xs text-muted-foreground truncate">Org Admin</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <LogOut className="w-4 h-4" />
              Back to Site
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 bg-background border-b px-6 flex items-center justify-between md:hidden">
          <Link href="/admin">
            <span className="font-bold text-primary">QuizProQuo</span>
          </Link>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
