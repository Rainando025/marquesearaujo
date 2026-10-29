import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/properties.functions";
import { invalidateSiteCache } from "@/lib/properties.functions";
import { uploadImage } from "@/lib/upload";
import { brl } from "@/lib/site";

type Form = Omit<Property, "id" | "created_at"> & { id?: string };
const vazio: Form = {
  titulo: "",
  cidade: "",
  bairro: "",
  endereco: "",
  tipo: "Apartamento",
  negocio: "Venda",
  preco: 0,
  quartos: 2,
  banheiros: 1,
  area: 0,
  descricao: "",
  imagem_url: "",
  ativo: true,
  fotos: [],
};

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
  const cidades = useQuery({
    queryKey: ["cidades"],
    queryFn: async () => (await supabase.from("cities").select("nome").order("nome")).data?.map((c) => c.nome) ?? [],
  });

  const [form, setForm] = useState<Form | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = () => {
    invalidateSiteCache();
    qc.invalidateQueries({ queryKey: ["admin-props"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setMsg("");
    try {
      const { id, ...rest } = form;
      const payload = {
        ...rest,
        cidade: rest.cidade?.trim() || "",
        bairro: rest.bairro?.trim() || "",
        endereco: rest.endereco?.trim() || "",
        imagem_url: fotosOrdem[0] ?? null,
        fotos: fotosOrdem.slice(1),
        preco: Number(rest.preco),
        quartos: Number(rest.quartos),
        banheiros: Number(rest.banheiros),
        area: Number(rest.area),
      };
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
  const abrir = (f: Form) => {
    setForm({
      ...f,
      cidade: f.cidade || "",
      endereco: f.endereco || "",
    });
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">Imóveis</h1>
        <button
          onClick={() => abrir({ ...vazio })}
          className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow hover:opacity-90 transition"
        >
          + Novo imóvel
        </button>
      </div>

      {form && (
        <form onSubmit={salvar} className="mt-6 grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">{form.id ? "Editar imóvel" : "Novo imóvel"}</h2>
          <label className="text-sm sm:col-span-2">
            Título do anúncio
            <input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Apartamento 3 quartos com varanda gourmet" className={input} />
          </label>

          <label className="text-sm">
            Cidade
            <div className="flex gap-2">
              <select
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                className={input}
              >
                <option value="">Selecione ou digite ao lado...</option>
                {cidades.data?.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                placeholder="Ou digite a cidade..."
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                className={`${input} max-w-[180px]`}
              />
            </div>
            <span className="text-xs text-muted-foreground">Você pode selecionar uma cidade cadastrada ou digitar uma nova.</span>
          </label>

          <label className="text-sm">
            Bairro
            <div className="flex gap-2">
              <select
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                className={input}
              >
                <option value="">Selecione ou digite ao lado...</option>
                {bairros.data?.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <input
                type="text"
                placeholder="Ou digite o bairro..."
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                className={`${input} max-w-[180px]`}
              />
            </div>
            <span className="text-xs text-muted-foreground">Informe o bairro onde o imóvel está localizado.</span>
          </label>

          <label className="text-sm sm:col-span-2">
            Endereço completo (usado para gerar o mapa do imóvel)
            <div className="relative">
              <input
                value={form.endereco}
                onChange={(e) => set("endereco", e.target.value)}
                placeholder="Ex.: Av. Oceânica, 450, Barra (ou ponto de referência)"
                className={`${input} pr-10`}
              />
              <MapPin className="absolute right-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
            <span className="text-xs text-muted-foreground">O endereço informado será exibido no mapa interativo e permitirá rotas diretas no Google Maps.</span>
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
            <p className="text-xs text-muted-foreground">A primeira foto é a capa. As fotos são otimizadas automaticamente no seu navegador antes do envio.</p>
            <div className="my-3 flex flex-wrap gap-3">
              {fotosOrdem.map((f, n) => (
                <div key={f + n} className="relative w-32">
                  <img src={f} alt="" className={`h-20 w-32 rounded-md object-cover ${n === 0 ? "ring-2 ring-gold" : ""}`} />
                  {n === 0 && <span className="absolute left-1 top-1 rounded bg-card px-1 text-[10px] font-semibold shadow">CAPA</span>}
                  <button type="button" aria-label="Remover foto" onClick={() => setFotos(fotosOrdem.filter((_, i) => i !== n))} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow hover:bg-destructive hover:text-white"><X className="h-3 w-3" /></button>
                  <div className="mt-1 flex justify-between">
                    <button type="button" aria-label="Mover para a esquerda" disabled={n === 0} onClick={() => mover(n, -1)} className="rounded border px-2 disabled:opacity-30">←</button>
                    {n > 0 && <button type="button" onClick={() => mover(n, -n)} className="rounded border px-1 text-[10px]">Capa</button>}
                    <button type="button" aria-label="Mover para a direita" disabled={n === fotosOrdem.length - 1} onClick={() => mover(n, 1)} className="rounded border px-2 disabled:opacity-30">→</button>
                  </div>
                </div>
              ))}
            </div>
            <label className="inline-block cursor-pointer rounded-md border bg-background px-4 py-2 hover:bg-muted transition font-medium">
              {enviando ? "Otimizando e enviando fotos..." : "+ Adicionar fotos"}
              <input type="file" accept="image/*" multiple disabled={enviando} onChange={(e) => { adicionarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} className="hidden" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} />Visível no site</label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={busy || enviando} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow disabled:opacity-60 hover:opacity-90 transition">{busy ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-md border px-5 py-3 hover:bg-muted transition">Cancelar</button>
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
              <p className="text-sm text-muted-foreground">
                {[p.endereco, p.bairro, p.cidade].filter(Boolean).join(" · ")} · {p.tipo} · {p.negocio} · {p.fotos.length + 1} foto(s)
              </p>
            </div>
            <p className="font-display text-xl text-primary">{brl(Number(p.preco))}</p>
            <button onClick={() => abrir({ ...p })} className="rounded-md border px-3 py-2 text-sm hover:bg-muted transition">Editar</button>
            <button onClick={() => remover(p)} className="rounded-md border px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition">Remover</button>
          </div>
        ))}
        {lista.data?.length === 0 && <p className="p-6 text-muted-foreground">Nenhum imóvel cadastrado.</p>}
      </div>
    </>
  );
}
