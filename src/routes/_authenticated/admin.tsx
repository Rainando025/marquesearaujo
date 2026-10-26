import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard } from "@/components/admin/Dashboard";
import { Imoveis } from "@/components/admin/Imoveis";
import { Leads } from "@/components/admin/Leads";
import { Consultas } from "@/components/admin/Consultas";
import { Bairros } from "@/components/admin/Bairros";
import { Carteira } from "@/components/admin/Carteira";
import { Perfil } from "@/components/admin/Perfil";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Aurum Imóveis" },
      { name: "description", content: "Gerencie imóveis, leads e resultados." },
      { property: "og:title", content: "Painel — Aurum Imóveis" },
      { property: "og:description", content: "Gerencie imóveis, leads e resultados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const abas = [
  ["dashboard", "Painel"],
  ["imoveis", "Imóveis"],
  ["carteira", "Carteira"],
  ["leads", "Leads e clientes"],
  ["consultas", "Consultas"],
  ["bairros", "Bairros"],
  ["perfil", "Meus dados"],
] as const;
type Aba = (typeof abas)[number][0];

function Admin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user } = Route.useRouteContext();
  const [aba, setAba] = useState<Aba>("dashboard");
  const isAdmin = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true,
  });

  async function sair() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-2xl">Aurum<span className="text-gold">.</span> <span className="text-sm text-muted-foreground">painel</span></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <button onClick={sair} className="rounded-md border px-3 py-2">Sair</button>
          </div>
        </div>
        {isAdmin.data && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
            {abas.map(([k, l]) => (
              <button key={k} onClick={() => setAba(k)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${aba === k ? "border-gold font-semibold" : "border-transparent text-muted-foreground"}`}>{l}</button>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        {isAdmin.isLoading ? <p>Carregando...</p> : !isAdmin.data ? (
          <p className="text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        ) : aba === "dashboard" ? <Dashboard /> : aba === "imoveis" ? <Imoveis /> : aba === "carteira" ? <Carteira /> : aba === "leads" ? <Leads /> :
          aba === "consultas" ? <Consultas /> : aba === "bairros" ? <Bairros /> : <Perfil />}
      </main>
    </div>
  );
}
