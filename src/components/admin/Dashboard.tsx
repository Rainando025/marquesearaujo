import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export function Dashboard() {
  const [dias, setDias] = useState(30);
  const q = useQuery({
    queryKey: ["dash", dias],
    queryFn: async () => {
      const desde = new Date(Date.now() - dias * 864e5).toISOString();
      // Otimização: reduz o limit para evitar estouro de memória e transferências pesadas do Supabase
      const [ev, leads, cons, props] = await Promise.all([
        supabase
          .from("events")
          .select("tipo, property_id, created_at")
          .gte("created_at", desde)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("leads").select("status, created_at").limit(500),
        supabase.from("recommendation_queries").select("id", { count: "exact", head: true }).gte("created_at", desde),
        supabase.from("properties").select("id, titulo"),
      ]);
      return { ev: ev.data ?? [], leads: leads.data ?? [], consultas: cons.count ?? 0, props: props.data ?? [], desde };
    },
  });
  if (!q.data) return <p className="text-muted-foreground">Carregando painel...</p>;
  const { ev, leads, consultas, props, desde } = q.data;
  const cnt = (t: string) => ev.filter((e) => e.tipo === t).length;
  const st = (s: string) => leads.filter((l) => l.status === s).length;
  const novosLeads = leads.filter((l) => l.created_at >= desde).length;

  const porDia = new Map<string, { dia: string; Visitas: number; "Cliques WhatsApp": number }>();
  for (let n = dias - 1; n >= 0; n--) {
    const d = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    porDia.set(d, { dia: d.slice(8, 10) + "/" + d.slice(5, 7), Visitas: 0, "Cliques WhatsApp": 0 });
  }
  for (const e of ev) {
    const r = porDia.get(e.created_at.slice(0, 10));
    if (!r) continue;
    if (e.tipo === "page_view") r.Visitas++;
    if (e.tipo === "whatsapp_click") r["Cliques WhatsApp"]++;
  }

  const top = new Map<string, { v: number; c: number }>();
  for (const e of ev) {
    if (!e.property_id) continue;
    const t = top.get(e.property_id) ?? { v: 0, c: 0 };
    if (e.tipo === "property_view") t.v++;
    if (e.tipo === "whatsapp_click") t.c++;
    top.set(e.property_id, t);
  }
  const topList = [...top.entries()].sort((a, b) => b[1].v + b[1].c - (a[1].v + a[1].c)).slice(0, 5);

  const cards: [string, number][] = [
    ["Visitas ao site", cnt("page_view")],
    ["Imóveis visualizados", cnt("property_view")],
    ["Cliques no WhatsApp", cnt("whatsapp_click")],
    ["Consultas de recomendação", consultas],
    ["Novos contatos", novosLeads],
  ];
  const funil: [string, number][] = [["Leads", st("lead")], ["Prospects", st("prospect")], ["Clientes", st("cliente")], ["Perdidos", st("perdido")]];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Painel</h1>
        <select value={dias} onChange={(e) => setDias(+e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {cards.map(([l, v]) => (
          <div key={l} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl">{v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-2xl">Visitas e cliques por dia</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={[...porDia.values()]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Visitas" fill="var(--primary)" />
              <Bar dataKey="Cliques WhatsApp" fill="var(--whatsapp)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-2xl">Funil de clientes (total)</h2>
          <div className="grid grid-cols-2 gap-3">
            {funil.map(([l, v]) => (
              <div key={l} className="rounded-lg bg-secondary p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-3xl">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-2xl">Imóveis mais procurados</h2>
          {topList.length === 0 ? <p className="text-sm text-muted-foreground">Ainda sem dados no período.</p> : (
            <ul className="divide-y text-sm">
              {topList.map(([id, t]) => (
                <li key={id} className="flex justify-between py-2">
                  <span>{props.find((p) => p.id === id)?.titulo ?? "Imóvel removido"}</span>
                  <span className="text-muted-foreground">{t.v} visualizações · {t.c} cliques</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Acessos />
    </div>
  );
}

const TIPO: Record<string, string> = { page_view: "Visita", property_view: "Viu imóvel", whatsapp_click: "Clique WhatsApp", property_click: "Clique imóvel" };

function navegador(ua: string | null) {
  if (!ua) return "—";
  const disp = /Mobile|Android|iPhone/i.test(ua) ? "Celular" : "Computador";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Outro";
  return `${disp} · ${nav}`;
}

function Acessos() {
  const [soVisitas, setSoVisitas] = useState(false);
  const q = useQuery({
    queryKey: ["acessos", soVisitas],
    queryFn: async () => {
      // Otimização: limita a 100 registros recentes para resposta rápida e leveza
      let r = supabase
        .from("events")
        .select("id, tipo, ip, pagina, user_agent, created_at, properties(titulo)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (soVisitas) r = r.eq("tipo", "page_view");
      return (await r).data ?? [];
    },
  });
  const ips = new Set((q.data ?? []).map((e) => e.ip).filter(Boolean));
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Quem acessou o site</h2>
          <p className="text-sm text-muted-foreground">Últimos registros · {ips.size} IP(s) diferentes</p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={soVisitas} onChange={(e) => setSoVisitas(e.target.checked)} />Só visitas</label>
      </div>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr><th className="py-2 pr-4">Data e hora</th><th className="pr-4">IP</th><th className="pr-4">Ação</th><th className="pr-4">Página</th><th>Dispositivo</th></tr>
          </thead>
          <tbody className="divide-y">
            {q.data?.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap py-2 pr-4">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                <td className="pr-4 font-mono text-xs">{e.ip ?? "—"}</td>
                <td className="pr-4">{TIPO[e.tipo] ?? e.tipo}{e.properties?.titulo ? `: ${e.properties.titulo}` : ""}</td>
                <td className="pr-4">{e.pagina ?? "/"}</td>
                <td className="text-muted-foreground">{navegador(e.user_agent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.data?.length === 0 && <p className="py-4 text-muted-foreground">Nenhum acesso registrado.</p>}
      </div>
    </div>
  );
}
