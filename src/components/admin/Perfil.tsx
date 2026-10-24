import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { Settings } from "@/lib/properties.functions";

export function Perfil() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [f, setF] = useState<Settings | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  if (!f) return <p>Carregando...</p>;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy(true); setMsg("");
    try {
      const foto_url = foto ? await uploadImage(foto, "perfil") : f.foto_url;
      const { error } = await supabase.from("settings").update({
        nome_empresa: f.nome_empresa, nome_corretor: f.nome_corretor, creci: f.creci,
        whatsapp: f.whatsapp.replace(/\D/g, ""), email: f.email, bio: f.bio, foto_url, updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
      setFoto(null); setMsg("Dados salvos! Já aparecem no site.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    } catch (err) { setMsg((err as Error).message); }
    setBusy(false);
  }

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const set = (k: keyof Settings, v: string) => setF({ ...f, [k]: v });
  return (
    <form onSubmit={salvar} className="max-w-2xl space-y-4">
      <h1 className="text-4xl">Meus dados</h1>
      <div className="flex items-center gap-4">
        {(foto || f.foto_url) && <img src={foto ? URL.createObjectURL(foto) : f.foto_url!} alt="" className="h-24 w-24 rounded-full object-cover" />}
        <label className="text-sm">Sua foto<input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="block text-sm" /></label>
      </div>
      <label className="block text-sm">Nome da imobiliária<input value={f.nome_empresa} onChange={(e) => set("nome_empresa", e.target.value)} className={input} /></label>
      <label className="block text-sm">Seu nome<input value={f.nome_corretor} onChange={(e) => set("nome_corretor", e.target.value)} className={input} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">CRECI<input value={f.creci} onChange={(e) => set("creci", e.target.value)} className={input} /></label>
        <label className="block text-sm">WhatsApp (com DDD e 55)<input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="5571988887777" className={input} /></label>
      </div>
      <label className="block text-sm">E-mail de contato<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={input} /></label>
      <label className="block text-sm">Sobre você<textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
      <button disabled={busy} className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Salvando..." : "Salvar"}</button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}
