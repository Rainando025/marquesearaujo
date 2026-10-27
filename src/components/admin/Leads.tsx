import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STATUS = [["lead", "Lead"], ["prospect", "Prospect"], ["cliente", "Cliente"], ["perdido", "Perdido"]] as const;
const ORIGEM: Record<string, string> = { recomendacao: "Recomendação", imovel: "Página do imóvel", manual: "Cadastro manual", site: "Site" };

export function Leads() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("todos");
  const [novo, setNovo] = useState({ nome: "", telefone: "", email: "", interesse: "" });
  const q = useQuery({
    queryKey: ["leads"],
    queryFn: async () => (await supabase.from("leads").select("*, properties(titulo)").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["leads"] });

  async function update(id: string, patch: { status?: string; notas?: string }) {
    await supabase.from("leads").update(patch).eq("id", id);
    refresh();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("leads").insert({ ...novo, origem: "manual" });
    setNovo({ nome: "", telefone: "", email: "", interesse: "" });
    refresh();
  }
  async function del(id: string) {
    if (!confirm("Excluir este contato?")) return;
    await supabase.from("leads").delete().eq("id", id);
    refresh();
  }

  const lista = (q.data ?? []).filter((l) => filtro === "todos" || l.status === filtro);
  const input = "h-10 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Leads e clientes</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["todos", "Todos"], ...STATUS].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`rounded-full border px-3 py-1 ${filtro === k ? "bg-primary text-primary-foreground" : ""}`}>
              {l} ({k === "todos" ? q.data?.length ?? 0 : q.data?.filter((x) => x.status === k).length ?? 0})
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={add} className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-5">
        <input required placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className={input} />
        <input placeholder="Telefone" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} className={input} />
        <input placeholder="E-mail" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} className={input} />
        <input placeholder="Interesse" value={novo.interesse} onChange={(e) => setNovo({ ...novo, interesse: e.target.value })} className={input} />
        <button className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground">+ Adicionar contato</button>
      </form>

      <div className="divide-y rounded-xl border bg-card">
        {lista.map((l) => (
          <div key={l.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <p className="font-semibold">{l.nome}</p>
              <p className="text-sm text-muted-foreground">
                {l.telefone && <a className="underline" href={`https://wa.me/${l.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noreferrer">{l.telefone}</a>}
                {l.email && ` · ${l.email}`}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")} · {ORIGEM[l.origem] ?? l.origem}</p>
            </div>
            <div className="text-sm">
              {l.properties?.titulo && <p>Imóvel: {l.properties.titulo}</p>}
              {l.interesse && <p className="text-muted-foreground">{l.interesse}</p>}
              <textarea defaultValue={l.notas} placeholder="Anotações..." onBlur={(e) => e.target.value !== l.notas && update(l.id, { notas: e.target.value })} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background p-2 text-sm" />
            </div>
            <div className="flex items-start gap-2">
              <select value={l.status} onChange={(e) => update(l.id, { status: e.target.value })} className={input}>
                {STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              <button onClick={() => del(l.id)} className="h-10 rounded-md border px-3 text-sm text-destructive">Excluir</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="p-6 text-muted-foreground">Nenhum contato ainda.</p>}
      </div>
    </div>
  );
}
