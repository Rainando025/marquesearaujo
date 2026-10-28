import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { Settings } from "@/lib/properties.functions";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

export function Perfil() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [f, setF] = useState<Settings | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [fotoPreview, setFotoPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  useEffect(() => {
    if (!logo) { setLogoPreview(""); return; }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);
  useEffect(() => {
    if (!foto) { setFotoPreview(""); return; }
    const url = URL.createObjectURL(foto);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);
  if (!f) return <p>Carregando...</p>;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy(true); setMsg("");
    try {
      const foto_url = foto ? await uploadImage(foto, "perfil") : f.foto_url;
      const logo_url = logo ? await uploadImage(logo, "logos") : f.logo_url;
      const { error } = await supabase.from("settings").update({
        nome_empresa: f.nome_empresa, nome_corretor: f.nome_corretor, creci: f.creci,
        whatsapp: f.whatsapp.replace(/\D/g, ""), email: f.email, bio: f.bio, foto_url, logo_url, updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
      setF({ ...f, foto_url, logo_url });
      setFoto(null); setLogo(null); setMsg("Dados salvos! Já aparecem no site.");
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
      <div className="flex flex-wrap items-center gap-4 border-b pb-4">
        {(logoPreview || f.logo_url) && <img src={logoPreview || f.logo_url || ""} alt="Logo da imobiliária" className="h-24 w-24 rounded-md border bg-card p-2 object-contain" />}
        <label className="min-w-0 text-sm">Logo da imobiliária<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="mt-2 block w-full max-w-xs text-sm" /></label>
        {(logo || f.logo_url) && <Button type="button" variant="outline" size="icon" aria-label="Remover logo" title="Remover logo" disabled={busy} onClick={() => { setLogo(null); setF({ ...f, logo_url: null }); }}><X /></Button>}
      </div>
      <div className="flex items-center gap-4">
        {(fotoPreview || f.foto_url) && <img src={fotoPreview || f.foto_url || ""} alt="" className="h-24 w-24 rounded-full object-cover" />}
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
      <Button disabled={busy} className="h-12 px-6 font-semibold"><Save />{busy ? "Salvando..." : "Salvar"}</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}
