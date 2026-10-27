import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Bairros() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const q = useQuery({
    queryKey: ["bairros-admin"],
    queryFn: async () => (await supabase.from("neighborhoods").select("*").order("nome")).data ?? [],
  });
  const refresh = () => ["bairros-admin", "bairros", "properties"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErro("");
    const { error } = await supabase.from("neighborhoods").insert({ nome: nome.trim() });
    if (error) setErro(error.code === "23505" ? "Esse bairro já está cadastrado." : "Erro ao salvar.");
    else { setNome(""); refresh(); }
  }
  async function del(id: string) {
    await supabase.from("neighborhoods").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-4xl">Bairros</h1>
      <p className="text-muted-foreground">Estes bairros aparecem no cadastro de imóveis e no filtro do site.</p>
      <form onSubmit={add} className="flex gap-2">
        <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do bairro" className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <button className="shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Adicionar</button>
      </form>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <ul className="divide-y rounded-xl border bg-card">
        {q.data?.map((b) => (
          <li key={b.id} className="flex items-center justify-between p-3">
            <span>{b.nome}</span>
            <button onClick={() => del(b.id)} className="rounded-md border px-3 py-1 text-sm text-destructive">Remover</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
