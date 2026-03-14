import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function TopNav() {
  const [location] = useLocation();

  // Hide the global nav on quiz runner pages (quiz has its own nav)
  if (location.startsWith("/quiz/") || location.startsWith("/w/")) return null;
  // Home page has its own header
  if (location === "/") return null;

  return (
    <header className="w-full border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg font-display">
          <img src="/logo.png" alt="QPQ" className="h-7 w-auto" />
          QuizProQuo
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#use-cases" className="hover:text-foreground transition-colors">Use Cases</Link>
          <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Sign In</Button>
          </Link>
          <Link href="/demo">
            <Button size="sm">Get Started →</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
