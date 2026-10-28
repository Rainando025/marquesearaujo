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
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.includes("@") ? email.trim() : `${email.trim()}@aurum.test`, password: senha });
      if (error) setMsg("E-mail ou senha inválidos.");
      else nav({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + "/admin" } });
      if (error) setMsg(error.message); else nav({ to: "/admin" });
    }
    setBusy(false);
  }

  const input = "h-12 w-full rounded-md border border-input bg-background px-3";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8">
        <Link to="/" className="font-display text-2xl">{nomeEmpresa(site)}<span className="text-gold">.</span></Link>
        <h1 className="text-3xl">{modo === "entrar" ? "Área do corretor" : "Criar conta"}</h1>
        <input type="text" required placeholder="E-mail ou usuário" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input type="password" required minLength={6} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className={input} />
        <button disabled={busy} className="h-12 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button type="button" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")} className="text-sm text-muted-foreground underline">
          {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      </form>
    </main>
  );
}
