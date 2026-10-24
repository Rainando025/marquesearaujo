import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; motivo: string; titulo?: string };

export function Consultas() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["consultas"],
    queryFn: async () => (await supabase.from("recommendation_queries").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  async function del(id: string) {
    await supabase.from("recommendation_queries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["consultas"] });
  }
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Consultas de visitantes</h1>
      <p className="text-muted-foreground">O que os visitantes pediram na seção de recomendação e quais imóveis foram sugeridos.</p>
      <div className="divide-y rounded-xl border bg-card">
        {q.data?.map((c) => {
          const itens = (c.resultado as Item[]) ?? [];
          return (
            <div key={c.id} className="flex flex-wrap gap-4 p-4">
              <div className="min-w-60 flex-1">
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                <p className="mt-1">“{c.texto}”</p>
              </div>
              <div className="min-w-60 flex-1 text-sm">
                {itens.length ? itens.map((i) => <p key={i.id}>• {i.titulo ?? "Imóvel"}</p>) : <p className="text-muted-foreground">Sem sugestões</p>}
              </div>
              <button onClick={() => del(c.id)} className="h-9 self-start rounded-md border px-3 text-sm text-destructive">Excluir</button>
            </div>
          );
        })}
        {q.data?.length === 0 && <p className="p-6 text-muted-foreground">Nenhuma consulta ainda.</p>}
      </div>
    </div>
  );
}
