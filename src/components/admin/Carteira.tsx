import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { brl } from "@/lib/site";

type Item = Database["public"]["Tables"]["portfolio"]["Row"];
type Form = Omit<Item, "id" | "created_at"> & { id?: string };

export const STATUS_CARTEIRA = [
  ["captado", "Captado"],
  ["anunciado", "Anunciado"],
  ["negociacao", "Em negociação"],
  ["vendido", "Vendido"],
  ["alugado", "Alugado"],
  ["retirado", "Retirado"],
] as const;
const label = (s: string) => STATUS_CARTEIRA.find(([k]) => k === s)?.[1] ?? s;
const hoje = () => new Date().toISOString().slice(0, 10);
const vazio = (): Form => ({ titulo: "", bairro: "", tipo: "Apartamento", negocio: "Venda", proprietario: "", data_entrada: hoje(), status: "captado", valor: 0, notas: "" });

export function Carteira() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [msg, setMsg] = useState("");
  const q = useQuery({
    queryKey: ["carteira"],
    queryFn: async () => (await supabase.from("portfolio").select("*").order("data_entrada", { ascending: false })).data ?? [],
  });
  const bairros = useQuery({
    queryKey: ["bairros"],
    queryFn: async () => (await supabase.from("neighborhoods").select("nome").order("nome")).data?.map((b) => b.nome) ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["carteira"] });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const payload = { ...rest, valor: Number(rest.valor) };
    const r = id ? await supabase.from("portfolio").update(payload).eq("id", id) : await supabase.from("portfolio").insert(payload);
    if (r.error) { setMsg(r.error.message); return; }
    setForm(null); setMsg(""); refresh();
  }
  async function del(i: Item) {
    if (!confirm(`Excluir "${i.titulo}" da carteira?`)) return;
    await supabase.from("portfolio").delete().eq("id", i.id);
    refresh();
  }
  async function mudarStatus(id: string, status: string) {
    await supabase.from("portfolio").update({ status }).eq("id", id);
    refresh();
  }

  const all = q.data ?? [];
  const lista = all.filter((i) => filtro === "todos" || i.status === filtro);
  const ativos = all.filter((i) => !["vendido", "alugado", "retirado"].includes(i.status));
  const fechados = all.filter((i) => ["vendido", "alugado"].includes(i.status));
  const resumo: [string, string][] = [
    ["Imóveis na carteira", String(ativos.length)],
    ["Valor em carteira", brl(ativos.reduce((s, i) => s + Number(i.valor), 0))],
    ["Negócios fechados", String(fechados.length)],
    ["Valor fechado", brl(fechados.reduce((s, i) => s + Number(i.valor), 0))],
  ];

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const set = (k: keyof Form, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const dias = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 864e5));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">Carteira</h1>
        <button onClick={() => { setForm(vazio()); setMsg(""); }} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">+ Adicionar à carteira</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {resumo.map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-2 break-words font-display text-xl sm:text-3xl">{v}</p></div>
        ))}
      </div>

      {form && (
        <form onSubmit={salvar} className="grid gap-3 rounded-xl border bg-card p-6 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">{form.id ? "Editar imóvel da carteira" : "Novo imóvel na carteira"}</h2>
          <label className="text-sm">Imóvel / endereço<input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className={input} /></label>
          <label className="text-sm">Bairro
            <select value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={input}>
              <option value="">Selecione...</option>
              {form.bairro && !bairros.data?.includes(form.bairro) && <option>{form.bairro}</option>}
              {bairros.data?.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="text-sm">Tipo<select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={input}><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Terreno</option><option>Comercial</option></select></label>
          <label className="text-sm">Negócio<select value={form.negocio} onChange={(e) => set("negocio", e.target.value)} className={input}><option>Venda</option><option>Aluguel</option></select></label>
          <label className="text-sm">Proprietário<input value={form.proprietario} onChange={(e) => set("proprietario", e.target.value)} className={input} /></label>
          <label className="text-sm">Data de entrada<input type="date" required value={form.data_entrada} onChange={(e) => set("data_entrada", e.target.value)} className={input} /></label>
          <label className="text-sm">Status<select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>{STATUS_CARTEIRA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-sm">Valor (R$)<input type="number" min={0} required value={form.valor} onChange={(e) => set("valor", e.target.value)} className={input} /></label>
          <label className="text-sm sm:col-span-2">Observações<textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
          <div className="flex gap-3 sm:col-span-2">
            <button className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">Salvar</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-md border px-5 py-3">Cancelar</button>
          </div>
          {msg && <p className="text-sm text-destructive sm:col-span-2">{msg}</p>}
        </form>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {[["todos", "Todos"] as const, ...STATUS_CARTEIRA].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`rounded-full border px-3 py-1 ${filtro === k ? "bg-primary text-primary-foreground" : ""}`}>
            {l} ({k === "todos" ? all.length : all.filter((i) => i.status === k).length})
          </button>
        ))}
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {lista.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-56 flex-1">
              <p className="font-semibold">{i.titulo}</p>
              <p className="text-sm text-muted-foreground">{[i.bairro, i.tipo, i.negocio, i.proprietario && `Prop.: ${i.proprietario}`].filter(Boolean).join(" · ")}</p>
              <p className="text-xs text-muted-foreground">Entrada: {new Date(i.data_entrada + "T00:00:00").toLocaleDateString("pt-BR")} · há {dias(i.data_entrada)} dias</p>
            </div>
            <p className="font-display text-xl text-primary">{brl(Number(i.valor))}</p>
            <select aria-label="Status" value={i.status} onChange={(e) => mudarStatus(i.id, e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {STATUS_CARTEIRA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button onClick={() => { setForm({ ...i }); setMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-md border px-3 py-2 text-sm">Editar</button>
            <button onClick={() => del(i)} className="rounded-md border px-3 py-2 text-sm text-destructive">Excluir</button>
          </div>
        ))}
        {lista.length === 0 && <p className="p-6 text-muted-foreground">{filtro === "todos" ? "Nenhum imóvel na carteira ainda." : `Nenhum imóvel com status "${label(filtro)}".`}</p>}
      </div>
    </div>
  );
}
