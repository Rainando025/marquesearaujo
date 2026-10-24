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
  const [capa, setCapa] = useState<File | null>(null);
  const [extras, setExtras] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-props"] }); qc.invalidateQueries({ queryKey: ["properties"] }); };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setMsg("");
    try {
      const imagem_url = capa ? await uploadImage(capa) : form.imagem_url;
      const novas = await Promise.all(extras.map((f) => uploadImage(f)));
      const { id, ...rest } = form;
      const payload = { ...rest, imagem_url, fotos: [...rest.fotos, ...novas], preco: Number(rest.preco), quartos: Number(rest.quartos), banheiros: Number(rest.banheiros), area: Number(rest.area) };
      const r = id ? await supabase.from("properties").update(payload).eq("id", id) : await supabase.from("properties").insert(payload);
      if (r.error) throw r.error;
      setForm(null); setCapa(null); setExtras([]);
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
  const abrir = (f: Form) => { setForm(f); setCapa(null); setExtras([]); setMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">Imóveis</h1>
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
          <div className="text-sm">
            <p>Foto de capa</p>
            {form.imagem_url && !capa && <img src={form.imagem_url} alt="" className="my-2 h-24 w-36 rounded-md object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => setCapa(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          <div className="text-sm">
            <p>Galeria de fotos</p>
            <div className="my-2 flex flex-wrap gap-2">
              {form.fotos.map((f) => (
                <div key={f} className="relative">
                  <img src={f} alt="" className="h-16 w-24 rounded-md object-cover" />
                  <button type="button" aria-label="Remover foto" onClick={() => set("fotos", form.fotos.filter((x) => x !== f))} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple onChange={(e) => setExtras(Array.from(e.target.files ?? []))} className="block w-full text-sm" />
            {extras.length > 0 && <p className="text-xs text-muted-foreground">{extras.length} nova(s) foto(s) para enviar</p>}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} />Visível no site</label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={busy} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Salvando..." : "Salvar"}</button>
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
