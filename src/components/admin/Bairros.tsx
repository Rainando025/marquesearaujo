import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateSiteCache } from "@/lib/properties.functions";
import { MapPin, Building2 } from "lucide-react";

export function Bairros() {
  const qc = useQueryClient();
  const [subAba, setSubAba] = useState<"cidades" | "bairros">("cidades");
  const [nomeBairro, setNomeBairro] = useState("");
  const [nomeCidade, setNomeCidade] = useState("");
  const [erro, setErro] = useState("");

  const qBairros = useQuery({
    queryKey: ["bairros-admin"],
    queryFn: async () => (await supabase.from("neighborhoods").select("*").order("nome")).data ?? [],
  });

  const qCidades = useQuery({
    queryKey: ["cidades-admin"],
    queryFn: async () => (await supabase.from("cities").select("*").order("nome")).data ?? [],
  });

  const refresh = () => {
    invalidateSiteCache();
    ["bairros-admin", "bairros", "cidades-admin", "cidades", "properties"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] })
    );
  };

  async function addBairro(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const val = nomeBairro.trim();
    if (!val) return;
    const { error } = await supabase.from("neighborhoods").insert({ nome: val });
    if (error) setErro(error.code === "23505" ? "Esse bairro já está cadastrado." : "Erro ao salvar bairro.");
    else { setNomeBairro(""); refresh(); }
  }

  async function delBairro(id: string, nome: string) {
    if (!confirm(`Remover o bairro "${nome}"?`)) return;
    await supabase.from("neighborhoods").delete().eq("id", id);
    refresh();
  }

  async function addCidade(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const val = nomeCidade.trim();
    if (!val) return;
    const { error } = await supabase.from("cities").insert({ nome: val });
    if (error) setErro(error.code === "23505" ? "Essa cidade já está cadastrada." : "Erro ao salvar cidade.");
    else { setNomeCidade(""); refresh(); }
  }

  async function delCidade(id: string, nome: string) {
    if (!confirm(`Remover a cidade "${nome}"?`)) return;
    await supabase.from("cities").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Localidades</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie as cidades e bairros que alimentam os filtros da página inicial e o cadastro de imóveis.</p>
      </div>

      {/* Seletor Cidades vs Bairros */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => { setSubAba("cidades"); setErro(""); }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            subAba === "cidades" ? "border-gold text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" /> Cidades ({qCidades.data?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => { setSubAba("bairros"); setErro(""); }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            subAba === "bairros" ? "border-gold text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="h-4 w-4" /> Bairros ({qBairros.data?.length ?? 0})
        </button>
      </div>

      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}

      {subAba === "cidades" ? (
        <div className="space-y-4">
          <form onSubmit={addCidade} className="flex gap-2">
            <input
              required
              value={nomeCidade}
              onChange={(e) => setNomeCidade(e.target.value)}
              placeholder="Nome da cidade (ex.: Salvador, Lauro de Freitas, etc.)"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="shrink-0 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition">
              Adicionar cidade
            </button>
          </form>

          <ul className="divide-y rounded-xl border bg-card">
            {qCidades.data?.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3.5">
                <span className="font-medium text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> {c.nome}
                </span>
                <button
                  type="button"
                  onClick={() => delCidade(c.id, c.nome)}
                  className="rounded-md border px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition"
                >
                  Remover
                </button>
              </li>
            ))}
            {qCidades.data?.length === 0 && (
              <li className="p-5 text-center text-sm text-muted-foreground">Nenhuma cidade cadastrada ainda.</li>
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={addBairro} className="flex gap-2">
            <input
              required
              value={nomeBairro}
              onChange={(e) => setNomeBairro(e.target.value)}
              placeholder="Nome do bairro (ex.: Barra, Pituba, etc.)"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="shrink-0 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition">
              Adicionar bairro
            </button>
          </form>

          <ul className="divide-y rounded-xl border bg-card">
            {qBairros.data?.map((b) => (
              <li key={b.id} className="flex items-center justify-between p-3.5">
                <span className="font-medium text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {b.nome}
                </span>
                <button
                  type="button"
                  onClick={() => delBairro(b.id, b.nome)}
                  className="rounded-md border px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition"
                >
                  Remover
                </button>
              </li>
            ))}
            {qBairros.data?.length === 0 && (
              <li className="p-5 text-center text-sm text-muted-foreground">Nenhum bairro cadastrado ainda.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
