import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteQuery, nomeEmpresa } from "@/lib/site-query";

export const Route = createFileRoute("/auth")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Entrar — ${nomeEmpresa(loaderData)}` },
      { name: "description", content: `Acesso à área administrativa da ${nomeEmpresa(loaderData)}.` },
      { property: "og:title", content: `Entrar — ${nomeEmpresa(loaderData)}` },
      { property: "og:description", content: "Acesso à área administrativa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { data: site } = useSuspenseQuery(siteQuery);
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const empresa = nomeEmpresa(site);
  const logoUrl = site?.settings?.logo_url;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.includes("@") ? email.trim() : `${email.trim()}@aurum.test`,
      password: senha,
    });
    if (error) {
      setMsg("E-mail ou senha inválidos.");
    } else {
      nav({ to: "/admin" });
    }
    setBusy(false);
  }

  const input = "h-12 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-8 shadow-lg">
        <Link to="/" className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`Logo ${empresa}`}
              className="h-9 w-auto max-w-[120px] object-contain rounded"
            />
          )}
          <span className="font-display text-2xl truncate">
            {empresa}<span className="text-gold">.</span>
          </span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Área do corretor</h1>
          <p className="mt-1 text-xs text-muted-foreground">Acesso restrito para administradores cadastrados.</p>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">
            E-mail ou usuário
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Senha
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <button
          disabled={busy}
          className="h-12 w-full rounded-md bg-primary font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Entrando..." : "Entrar no painel"}
        </button>
        {msg && <p className="text-center text-sm font-medium text-destructive">{msg}</p>}
      </form>
    </main>
  );
}
