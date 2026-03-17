import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function TopNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide the global nav on quiz runner pages (quiz has its own nav)
  if (location.startsWith("/quiz/") || location.startsWith("/w/")) return null;
  // Hide on admin pages (admin has its own sidebar)
  if (location.startsWith("/admin")) return null;
  // Home page has its own header
  if (location === "/") return null;

  return (
    <header className="w-full border-b bg-background/90 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg font-display">
          <img src="/logo.png" alt="QPQ" className="h-7 w-auto" />
          Quiz Pro Quo
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#use-cases" className="hover:text-foreground transition-colors">Use Cases</Link>
          <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Sign In</Button>
          </Link>
          <Link href="/demo">
            <Button size="sm">Get Started →</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background animate-in fade-in slide-in-from-top-1 duration-150">
          <nav className="flex flex-col p-4 space-y-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Home</Link>
            <Link href="/templates" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Templates</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Pricing</Link>
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Demo</Link>
            <div className="border-t my-2" />
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Sign In</Link>
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full mt-1" size="sm">Get Started →</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
