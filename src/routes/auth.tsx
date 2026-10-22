import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Aurum Imóveis" },
      { name: "description", content: "Acesso à área administrativa da Aurum Imóveis." },
      { property: "og:title", content: "Entrar — Aurum Imóveis" },
      { property: "og:description", content: "Acesso à área administrativa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha inválidos.");
      else nav({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + "/admin" } });
      setMsg(error ? error.message : "Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  }

  const input = "h-12 w-full rounded-md border border-input bg-background px-3";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8">
        <Link to="/" className="font-display text-2xl">Aurum<span className="text-gold">.</span></Link>
        <h1 className="text-3xl">{modo === "entrar" ? "Área do corretor" : "Criar conta"}</h1>
        <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
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
