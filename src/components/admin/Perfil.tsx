import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { Settings } from "@/lib/properties.functions";
import { invalidateSiteCache } from "@/lib/properties.functions";
import { ImagePlus, Trash2 } from "lucide-react";

export function Perfil() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [f, setF] = useState<Settings | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [removerLogo, setRemoverLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (q.data) {
      setF(q.data);
      setRemoverLogo(false);
    }
  }, [q.data]);

  if (!f) return <p className="text-muted-foreground">Carregando dados...</p>;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy(true);
    setMsg("");
    try {
      const foto_url = foto ? await uploadImage(foto, "perfil") : f.foto_url;
      let logo_url = f.logo_url;
      if (removerLogo) {
        logo_url = null;
      } else if (logo) {
        logo_url = await uploadImage(logo, "logo");
      }

      const { error } = await supabase.from("settings").update({
        nome_empresa: f.nome_empresa,
        nome_corretor: f.nome_corretor,
        creci: f.creci,
        whatsapp: f.whatsapp.replace(/\D/g, ""),
        email: f.email,
        bio: f.bio,
        foto_url,
        logo_url,
        updated_at: new Date().toISOString(),
      }).eq("id", 1);

      if (error) throw error;
      setFoto(null);
      setLogo(null);
      setRemoverLogo(false);
      invalidateSiteCache();
      setMsg("Dados e logomarca salvos com sucesso! As alterações já estão ativas no site.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    } catch (err) {
      setMsg((err as Error).message || "Erro ao salvar alterações.");
    }
    setBusy(false);
  }

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const set = (k: keyof Settings, v: string) => setF({ ...f, [k]: v });

  const logoPreview = logo
    ? URL.createObjectURL(logo)
    : !removerLogo && f.logo_url
    ? f.logo_url
    : null;

  return (
    <form onSubmit={salvar} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Meus dados & Identidade visual</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize o logotipo, informações de contato e foto do corretor exibidos na página inicial.</p>
      </div>

      {/* Seção Logotipo */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-gold" /> Logomarca da Imobiliária / Corretora
        </h2>
        <p className="text-xs text-muted-foreground">
          A logo aparecerá na barra de navegação superior da landing page junto ao nome da empresa e no rodapé.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          {logoPreview ? (
            <div className="relative flex items-center justify-center p-3 rounded-lg border bg-muted/40 max-w-[200px] h-20">
              <img src={logoPreview} alt="Logomarca" className="max-h-14 max-w-full object-contain" />
              <button
                type="button"
                onClick={() => {
                  setLogo(null);
                  setRemoverLogo(true);
                }}
                title="Remover logotipo"
                className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 shadow hover:opacity-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 w-36 rounded-lg border border-dashed text-xs text-muted-foreground">
              Sem logo
            </div>
          )}

          <label className="cursor-pointer rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition">
            {logoPreview ? "Alterar logo..." : "Fazer upload da logo..."}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogo(file);
                  setRemoverLogo(false);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Seção Foto do Corretor */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-base">Foto do Corretor</h2>
        <div className="flex items-center gap-4">
          {(foto || f.foto_url) ? (
            <img
              src={foto ? URL.createObjectURL(foto) : f.foto_url!}
              alt="Foto do corretor"
              className="h-20 w-20 rounded-full object-cover border"
            />
          ) : (
            <div className="h-20 w-20 rounded-full border border-dashed flex items-center justify-center text-xs text-muted-foreground">
              Sem foto
            </div>
          )}
          <label className="cursor-pointer rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition">
            Alterar foto...
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Campos de texto */}
      <div className="space-y-4">
        <label className="block text-sm">
          Nome da imobiliária / marca
          <input
            value={f.nome_empresa}
            onChange={(e) => set("nome_empresa", e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          Seu nome (corretor)
          <input
            value={f.nome_corretor}
            onChange={(e) => set("nome_corretor", e.target.value)}
            className={input}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            CRECI
            <input
              value={f.creci}
              onChange={(e) => set("creci", e.target.value)}
              className={input}
            />
          </label>
          <label className="block text-sm">
            WhatsApp (com DDD e 55)
            <input
              value={f.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="5571988887777"
              className={input}
            />
          </label>
        </div>
        <label className="block text-sm">
          E-mail de contato
          <input
            type="email"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          Sobre você (biografia)
          <textarea
            value={f.bio}
            onChange={(e) => set("bio", e.target.value)}
            className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
          />
        </label>
      </div>

      <button
        disabled={busy}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground shadow disabled:opacity-60 hover:opacity-90 transition"
      >
        {busy ? "Salvando..." : "Salvar alterações"}
      </button>

      {msg && (
        <p className={`text-sm ${msg.includes("sucesso") ? "text-green-600 font-medium" : "text-destructive"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}
