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
      const [ev, leads, cons, props] = await Promise.all([
        supabase.from("events").select("tipo, property_id, created_at").gte("created_at", desde).limit(10000),
        supabase.from("leads").select("status, created_at"),
        supabase.from("recommendation_queries").select("id", { count: "exact", head: true }).gte("created_at", desde),
        supabase.from("properties").select("id, titulo"),
      ]);
      return { ev: ev.data ?? [], leads: leads.data ?? [], consultas: cons.count ?? 0, props: props.data ?? [], desde };
    },
  });
  if (!q.data) return <p>Carregando...</p>;
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 font-display text-4xl">{v}</p>
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
    </div>
  );
}
