import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/properties.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Aurum Imóveis" },
      { name: "description", content: "Gerencie o catálogo de imóveis." },
      { property: "og:title", content: "Painel — Aurum Imóveis" },
      { property: "og:description", content: "Gerencie o catálogo de imóveis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Form = Omit<Property, "id" | "created_at"> & { id?: string };
const vazio: Form = { titulo: "", bairro: "", tipo: "Apartamento", negocio: "Venda", preco: 0, quartos: 2, banheiros: 1, area: 0, descricao: "", imagem_url: "", ativo: true };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Admin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user } = Route.useRouteContext();
  const isAdmin = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true,
  });
  const lista = useQuery({
    queryKey: ["admin-props"],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<Form | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sair() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setMsg("");
    try {
      let imagem_url = form.imagem_url;
      if (file) {
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "_")}`;
        const up = await supabase.storage.from("imoveis").upload(path, file);
        if (up.error) throw up.error;
        const s = await supabase.storage.from("imoveis").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (s.error) throw s.error;
        imagem_url = s.data.signedUrl;
      }
      const { id, ...rest } = form;
      const payload = { ...rest, imagem_url, preco: Number(rest.preco), quartos: Number(rest.quartos), banheiros: Number(rest.banheiros), area: Number(rest.area) };
      const r = id ? await supabase.from("properties").update(payload).eq("id", id) : await supabase.from("properties").insert(payload);
      if (r.error) throw r.error;
      setForm(null); setFile(null);
      qc.invalidateQueries({ queryKey: ["admin-props"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    } catch (err) {
      setMsg((err as Error).message || "Erro ao salvar.");
    }
    setBusy(false);
  }

  async function remover(p: Property) {
    if (!confirm(`Remover "${p.titulo}"?`)) return;
    await supabase.from("properties").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["admin-props"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
  }

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const set = (k: keyof Form, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));

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
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {isAdmin.isLoading ? <p>Carregando...</p> : !isAdmin.data ? (
          <p className="text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl">Imóveis</h1>
              <button onClick={() => { setForm({ ...vazio }); setFile(null); }} className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">+ Novo imóvel</button>
            </div>

            {form && (
              <form onSubmit={salvar} className="mt-6 grid gap-3 rounded-xl border bg-card p-6 sm:grid-cols-2">
                <h2 className="text-2xl sm:col-span-2">{form.id ? "Editar imóvel" : "Novo imóvel"}</h2>
                <label className="text-sm">Título<input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className={input} /></label>
                <label className="text-sm">Bairro<input required value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={input} /></label>
                <label className="text-sm">Tipo<select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={input}><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Terreno</option><option>Comercial</option></select></label>
                <label className="text-sm">Negócio<select value={form.negocio} onChange={(e) => set("negocio", e.target.value)} className={input}><option>Venda</option><option>Aluguel</option></select></label>
                <label className="text-sm">Preço (R$)<input type="number" min={0} required value={form.preco} onChange={(e) => set("preco", e.target.value)} className={input} /></label>
                <label className="text-sm">Área (m²)<input type="number" min={0} value={form.area} onChange={(e) => set("area", e.target.value)} className={input} /></label>
                <label className="text-sm">Quartos<input type="number" min={0} value={form.quartos} onChange={(e) => set("quartos", e.target.value)} className={input} /></label>
                <label className="text-sm">Banheiros<input type="number" min={0} value={form.banheiros} onChange={(e) => set("banheiros", e.target.value)} className={input} /></label>
                <label className="text-sm sm:col-span-2">Descrição<textarea value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
                <label className="text-sm">Foto<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" /></label>
                {form.imagem_url && !file && <img src={form.imagem_url} alt="" className="h-24 w-36 rounded-md object-cover" />}
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
                    <p className="text-sm text-muted-foreground">{p.bairro} · {p.tipo} · {p.negocio}</p>
                  </div>
                  <p className="font-display text-xl text-primary">{brl(Number(p.preco))}</p>
                  <button onClick={() => { setForm({ ...p }); setFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-md border px-3 py-2 text-sm">Editar</button>
                  <button onClick={() => remover(p)} className="rounded-md border px-3 py-2 text-sm text-destructive">Remover</button>
                </div>
              ))}
              {lista.data?.length === 0 && <p className="p-6 text-muted-foreground">Nenhum imóvel cadastrado.</p>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
