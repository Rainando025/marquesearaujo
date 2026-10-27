import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/properties.functions";
import { uploadImage } from "@/lib/upload";
import { brl } from "@/lib/site";

type Form = Omit<Property, "id" | "created_at"> & { id?: string };
const vazio: Form = { titulo: "", bairro: "", tipo: "Apartamento", negocio: "Venda", preco: 0, quartos: 2, banheiros: 1, area: 0, descricao: "", imagem_url: "", ativo: true, fotos: [] };

export function Imoveis() {
  const qc = useQueryClient();
  const lista = useQuery({
    queryKey: ["admin-props"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const bairros = useQuery({
    queryKey: ["bairros"],
    queryFn: async () => (await supabase.from("neighborhoods").select("nome").order("nome")).data?.map((b) => b.nome) ?? [],
  });
  const [form, setForm] = useState<Form | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-props"] }); qc.invalidateQueries({ queryKey: ["properties"] }); };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setMsg("");
    try {
      const { id, ...rest } = form;
      const payload = { ...rest, imagem_url: fotosOrdem[0] ?? null, fotos: fotosOrdem.slice(1), preco: Number(rest.preco), quartos: Number(rest.quartos), banheiros: Number(rest.banheiros), area: Number(rest.area) };
      const r = id ? await supabase.from("properties").update(payload).eq("id", id) : await supabase.from("properties").insert(payload);
      if (r.error) throw r.error;
      setForm(null);
      refresh();
    } catch (err) {
      setMsg((err as Error).message || "Erro ao salvar.");
    }
    setBusy(false);
  }

  async function remover(p: Property) {
    if (!confirm(`Remover "${p.titulo}"?`)) return;
    await supabase.from("properties").delete().eq("id", p.id);
    refresh();
  }

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const set = (k: keyof Form, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const fotosOrdem = form ? [form.imagem_url, ...form.fotos].filter((x): x is string => !!x) : [];
  const setFotos = (l: string[]) => setForm((f) => (f ? { ...f, imagem_url: l[0] ?? null, fotos: l.slice(1) } : f));
  const mover = (n: number, d: number) => {
    const l = [...fotosOrdem];
    const [x] = l.splice(n, 1);
    l.splice(n + d, 0, x!);
    setFotos(l);
  };
  async function adicionarFotos(files: File[]) {
    if (!files.length) return;
    setEnviando(true); setMsg("");
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)));
      setForm((f) => {
        if (!f) return f;
        const l = [f.imagem_url, ...f.fotos, ...urls].filter((x): x is string => !!x);
        return { ...f, imagem_url: l[0] ?? null, fotos: l.slice(1) };
      });
    } catch (err) { setMsg((err as Error).message || "Erro ao enviar fotos."); }
    setEnviando(false);
  }
  const abrir = (f: Form) => { setForm(f); setMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">Imóveis</h1>
        <button onClick={() => abrir({ ...vazio, bairro: bairros.data?.[0] ?? "" })} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">+ Novo imóvel</button>
      </div>

      {form && (
        <form onSubmit={salvar} className="mt-6 grid gap-3 rounded-xl border bg-card p-6 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">{form.id ? "Editar imóvel" : "Novo imóvel"}</h2>
          <label className="text-sm">Título<input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className={input} /></label>
          <label className="text-sm">Bairro
            <select required value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={input}>
              <option value="">Selecione...</option>
              {form.bairro && !bairros.data?.includes(form.bairro) && <option>{form.bairro}</option>}
              {bairros.data?.map((b) => <option key={b}>{b}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">Cadastre novos bairros na aba "Bairros".</span>
          </label>
          <label className="text-sm">Tipo<select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={input}><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Terreno</option><option>Comercial</option></select></label>
          <label className="text-sm">Negócio<select value={form.negocio} onChange={(e) => set("negocio", e.target.value)} className={input}><option>Venda</option><option>Aluguel</option></select></label>
          <label className="text-sm">Preço (R$)<input type="number" min={0} required value={form.preco} onChange={(e) => set("preco", e.target.value)} className={input} /></label>
          <label className="text-sm">Área (m²)<input type="number" min={0} value={form.area} onChange={(e) => set("area", e.target.value)} className={input} /></label>
          <label className="text-sm">Quartos<input type="number" min={0} value={form.quartos} onChange={(e) => set("quartos", e.target.value)} className={input} /></label>
          <label className="text-sm">Banheiros<input type="number" min={0} value={form.banheiros} onChange={(e) => set("banheiros", e.target.value)} className={input} /></label>
          <label className="text-sm sm:col-span-2">Descrição<textarea value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
          <div className="text-sm sm:col-span-2">
            <p className="font-semibold">Fotos ({fotosOrdem.length})</p>
            <p className="text-xs text-muted-foreground">A primeira foto é a capa. Use as setas para mudar a ordem.</p>
            <div className="my-3 flex flex-wrap gap-3">
              {fotosOrdem.map((f, n) => (
                <div key={f + n} className="relative w-32">
                  <img src={f} alt="" className={`h-20 w-32 rounded-md object-cover ${n === 0 ? "ring-2 ring-gold" : ""}`} />
                  {n === 0 && <span className="absolute left-1 top-1 rounded bg-card px-1 text-[10px] font-semibold">CAPA</span>}
                  <button type="button" aria-label="Remover foto" onClick={() => setFotos(fotosOrdem.filter((_, i) => i !== n))} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow"><X className="h-3 w-3" /></button>
                  <div className="mt-1 flex justify-between">
                    <button type="button" aria-label="Mover para a esquerda" disabled={n === 0} onClick={() => mover(n, -1)} className="rounded border px-2 disabled:opacity-30">←</button>
                    {n > 0 && <button type="button" onClick={() => mover(n, -n)} className="rounded border px-1 text-[10px]">Capa</button>}
                    <button type="button" aria-label="Mover para a direita" disabled={n === fotosOrdem.length - 1} onClick={() => mover(n, 1)} className="rounded border px-2 disabled:opacity-30">→</button>
                  </div>
                </div>
              ))}
            </div>
            <label className="inline-block cursor-pointer rounded-md border px-4 py-2">
              {enviando ? "Enviando fotos..." : "+ Adicionar fotos"}
              <input type="file" accept="image/*" multiple disabled={enviando} onChange={(e) => { adicionarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} className="hidden" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} />Visível no site</label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={busy || enviando} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-md border px-5 py-3">Cancelar</button>
          </div>
          {msg && <p className="text-sm text-destructive sm:col-span-2">{msg}</p>}
        </form>
      )}

      <div className="mt-8 divide-y rounded-xl border bg-card">
        {lista.data?.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
            <img src={p.imagem_url || "/images/hero.jpg"} alt="" className="h-16 w-24 rounded-md object-cover" />
            <div className="min-w-48 flex-1">
              <p className="font-semibold">{p.titulo} {!p.ativo && <span className="text-xs text-muted-foreground">(oculto)</span>}</p>
              <p className="text-sm text-muted-foreground">{p.bairro} · {p.tipo} · {p.negocio} · {p.fotos.length + 1} foto(s)</p>
            </div>
            <p className="font-display text-xl text-primary">{brl(Number(p.preco))}</p>
            <button onClick={() => abrir({ ...p })} className="rounded-md border px-3 py-2 text-sm">Editar</button>
            <button onClick={() => remover(p)} className="rounded-md border px-3 py-2 text-sm text-destructive">Remover</button>
          </div>
        ))}
        {lista.data?.length === 0 && <p className="p-6 text-muted-foreground">Nenhum imóvel cadastrado.</p>}
      </div>
    </>
  );
}
