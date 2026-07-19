import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { VoiceAssistant } from "@/components/voice-assistant";
import { LANG_NAMES, type Lang } from "@/lib/i18n";
import { Leaf, LogOut } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const { user, profile, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    // Redirect from bare /app to role dashboard
    if (profile && loc.pathname === "/app") {
      navigate({ to: `/app/${profile.role}` as string, replace: true });
    }
  }, [loading, user, profile, loc.pathname, navigate]);

  if (loading || !user || !profile) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">{t("app_name")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {profile.full_name} · {t(profile.role)}
            </span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
                <option key={l} value={l}>{LANG_NAMES[l]}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <VoiceAssistant />
    </div>
  );
}
