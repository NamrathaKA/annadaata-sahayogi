import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANG_NAMES, type Lang } from "@/lib/i18n";
import { Leaf } from "lucide-react";
import type { Role } from "@/hooks/use-auth";
import { VoiceInput } from "@/components/voice-input";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) navigate({ to: "/app" });
  }, [loading, user, profile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col px-4 py-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">{t("app_name")}</span>
        </Link>

        <div className="mb-4 flex items-center justify-end">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <option key={l} value={l}>{LANG_NAMES[l]}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
              <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="e">{t("email")}</Label>
        <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="p">{t("password")}</Label>
        <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{t("sign_in")}</Button>
    </form>
  );
}

function SignUpForm() {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("farmer");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { role, full_name: fullName, phone, language: lang },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — signing you in…");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>{t("role")}</Label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(["farmer", "buyer", "delivery"] as Role[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-lg border p-2 text-sm transition ${
                role === r ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted"
              }`}
            >
              {t(r)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="n">{t("full_name")}</Label>
        <p className="mb-1 text-xs text-muted-foreground">{t("say_your_name")}</p>
        <div className="flex gap-2">
          <Input id="n" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1" />
          <VoiceInput field="name" onValue={setFullName} ariaLabel={t("say_your_name")} />
        </div>
      </div>
      <div>
        <Label htmlFor="ph">{t("phone")}</Label>
        <p className="mb-1 text-xs text-muted-foreground">{t("say_your_phone")}</p>
        <div className="flex gap-2">
          <Input id="ph" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
          <VoiceInput field="phone" onValue={setPhone} ariaLabel={t("say_your_phone")} />
        </div>
      </div>
      <div>
        <Label htmlFor="e2">{t("email")}</Label>
        <p className="mb-1 text-xs text-muted-foreground">{t("say_your_email")}</p>
        <div className="flex gap-2">
          <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <VoiceInput field="email" onValue={setEmail} ariaLabel={t("say_your_email")} />
        </div>
      </div>
      <div>
        <Label htmlFor="p2">{t("password")}</Label>
        <Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{t("sign_up")}</Button>
    </form>
  );
}
