import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Property = Database["public"]["Tables"]["properties"]["Row"];

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function loadActive(): Promise<Property[]> {
  const { data, error } = await publicClient()
    .from("properties")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export const listProperties = createServerFn({ method: "GET" }).handler(() => loadActive());

type Prefs = { texto: string };
export type Recommendation = { id: string; motivo: string };

export const recommendProperties = createServerFn({ method: "POST" })
  .inputValidator((d: Prefs) => {
    const texto = String(d?.texto ?? "").trim().slice(0, 1500);
    if (texto.length < 3) throw new Error("Descreva suas preferências.");
    return { texto };
  })
  .handler(async ({ data }): Promise<{ items: Recommendation[]; error?: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { items: [], error: "Serviço de recomendação indisponível." };
    const imoveis = await loadActive();
    if (!imoveis.length) return { items: [], error: "Catálogo vazio no momento." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const { z } = await import("zod");
    const { createLovableAiGatewayRunIdFetch } = await import("./aig-run-id.server");

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const catalogo = imoveis.map((i) => ({
      id: i.id, titulo: i.titulo, bairro: i.bairro, tipo: i.tipo, negocio: i.negocio,
      preco: Number(i.preco), quartos: i.quartos, banheiros: i.banheiros, area_m2: i.area, descricao: i.descricao,
    }));

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions:
          "Você é um corretor de imóveis. Escolha até 3 imóveis do catálogo que melhor combinam com as preferências do cliente. Use apenas ids do catálogo. Para cada um, escreva um motivo curto (1 frase) em português. Se nada combinar bem, retorne os mais próximos e explique a diferença.",
        prompt: `Preferências do cliente: ${data.texto}\n\nCatálogo (JSON): ${JSON.stringify(catalogo)}`,
        output: Output.object({
          schema: z.object({ items: z.array(z.object({ id: z.string(), motivo: z.string() })) }),
        }),
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] },
        },
      });
      const out = await result.output;
      const ids = new Set(imoveis.map((i) => i.id));
      return { items: out.items.filter((r) => ids.has(r.id)).slice(0, 3) };
    } catch (e) {
      console.error("recommend error", e);
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 402) return { items: [], error: "Créditos de IA esgotados. Tente mais tarde." };
      if (status === 429) return { items: [], error: "Muitas solicitações. Aguarde um instante." };
      return { items: [], error: "Não foi possível gerar recomendações agora." };
    }
  });
