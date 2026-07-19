import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { LANG_NAMES, type Lang } from "@/lib/i18n";
import { Leaf, Truck, ShoppingBasket, Mic } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) navigate({ to: "/app" });
  }, [loading, user, profile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">{t("app_name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
              aria-label="Language"
            >
              {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
                <option key={l} value={l}>{LANG_NAMES[l]}</option>
              ))}
            </select>
            <Link to="/auth">
              <Button variant="ghost" size="sm">{t("sign_in")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
              {t("tagline")}
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
              {t("app_name")}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t("hero_desc")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="text-base">{t("get_started")}</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2 text-base">
                  <Mic className="h-4 w-4" /> {t("voice_assistant")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <RoleCard icon={<Leaf className="h-6 w-6" />} title={t("farmer")} desc={t("farmer_intro")} />
            <RoleCard icon={<ShoppingBasket className="h-6 w-6" />} title={t("buyer")} desc={t("buyer_intro")} />
            <RoleCard icon={<Truck className="h-6 w-6" />} title={t("delivery")} desc={t("delivery_intro")} />
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("app_name")}
      </footer>
    </div>
  );
}

function RoleCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}
