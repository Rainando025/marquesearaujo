import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Settings = Database["public"]["Tables"]["settings"]["Row"];

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

export interface SiteData {
  imoveis: Property[];
  settings: Settings | null;
  bairros: string[];
  cidades: string[];
}

// Cache em memória no servidor (SSR / Server Function) com TTL de 45 segundos
let cachedSiteData: SiteData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 45_000;

export const getSiteData = createServerFn({ method: "GET" }).handler(async (): Promise<SiteData> => {
  const now = Date.now();
  if (cachedSiteData && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSiteData;
  }

  const c = publicClient();
  const [imoveis, s, b, cid] = await Promise.all([
    loadActive(),
    c.from("settings").select("*").eq("id", 1).maybeSingle(),
    c.from("neighborhoods").select("nome").order("nome"),
    c.from("cities").select("nome").order("nome"),
  ]);

  const cidadesDoBanco = cid.data?.map((x) => x.nome.trim()).filter(Boolean) ?? [];
  const cidadesDosImoveis = Array.from(new Set(imoveis.map((i) => i.cidade?.trim()).filter(Boolean)));
  const cidades = Array.from(new Set([...cidadesDoBanco, ...cidadesDosImoveis])).sort();

  cachedSiteData = {
    imoveis,
    settings: s.data as Settings | null,
    bairros: (b.data ?? []).map((x) => x.nome.trim()).filter(Boolean),
    cidades,
  };
  lastCacheTime = now;

  return cachedSiteData;
});

// Invalida o cache ao cadastrar ou atualizar imóveis
export const invalidateSiteCache = () => {
  cachedSiteData = null;
  lastCacheTime = 0;
};

const TIPOS = new Set(["page_view", "property_view", "whatsapp_click", "property_click"]);
export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { tipo: string; property_id?: string | null | undefined; pagina?: string | undefined }) => {
    if (!TIPOS.has(d?.tipo)) throw new Error("tipo inválido");
    const pid = typeof d.property_id === "string" && /^[0-9a-f-]{36}$/.test(d.property_id) ? d.property_id : null;
    return { tipo: d.tipo, property_id: pid, pagina: String(d.pagina ?? "/").slice(0, 200) };
  })
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ip = (
        getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-forwarded-for")?.split(",")[0] ||
        getRequestHeader("x-real-ip") ||
        ""
      ).trim().slice(0, 64) || null;
      const user_agent = (getRequestHeader("user-agent") ?? "").slice(0, 300) || null;
      await supabaseAdmin.from("events").insert({ ...data, ip, user_agent });
      return { ok: true };
    } catch (e) {
      console.warn("trackEvent warning:", e);
      return { ok: false };
    }
  });

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((d: { nome: string; telefone: string; email?: string | undefined; interesse?: string | undefined; property_id?: string | null | undefined; origem?: string | undefined }) => {
    const nome = String(d?.nome ?? "").trim().slice(0, 120);
    const telefone = String(d?.telefone ?? "").trim().slice(0, 40);
    if (nome.length < 2 || telefone.length < 8) throw new Error("Informe nome e telefone.");
    return {
      nome,
      telefone,
      email: String(d.email ?? "").trim().slice(0, 160),
      interesse: String(d.interesse ?? "").trim().slice(0, 1500),
      property_id: typeof d.property_id === "string" && /^[0-9a-f-]{36}$/.test(d.property_id) ? d.property_id : null,
      origem: String(d.origem ?? "site").slice(0, 40),
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").insert(data);
    if (error) { console.error(error); return { ok: false }; }
    return { ok: true };
  });

export type Recommendation = { id: string; motivo: string };

export const recommendProperties = createServerFn({ method: "POST" })
  .inputValidator((d: { texto: string }) => {
    const texto = String(d?.texto ?? "").trim().slice(0, 1500);
    if (texto.length < 3) throw new Error("Descreva suas preferências.");
    return { texto };
  })
  .handler(async ({ data }): Promise<{ items: Recommendation[]; error?: string }> => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return { items: [], error: "Serviço de recomendação por IA não configurado (OPENAI_API_KEY)." };
    }
    const imoveis = await loadActive();
    if (!imoveis.length) return { items: [], error: "Catálogo vazio no momento." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateObject } = await import("ai");
    const { z } = await import("zod");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const openai = createOpenAI({ apiKey });

    const catalogo = imoveis.map((i) => ({
      id: i.id,
      titulo: i.titulo,
      cidade: i.cidade,
      bairro: i.bairro,
      endereco: i.endereco,
      tipo: i.tipo,
      negocio: i.negocio,
      preco: Number(i.preco),
      quartos: i.quartos,
      banheiros: i.banheiros,
      area_m2: i.area,
      descricao: i.descricao,
    }));

    try {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        system:
          "Você é um corretor de imóveis experiente. Escolha até 3 imóveis do catálogo que melhor combinam com as preferências do cliente (considerando cidade, bairro, preço, tipo, quartos). Use apenas ids existentes no catálogo. Para cada um, forneça um motivo curto (1 frase) em português.",
        prompt: `Preferências do cliente: ${data.texto}\n\nCatálogo de Imóveis: ${JSON.stringify(catalogo)}`,
        schema: z.object({
          items: z.array(z.object({ id: z.string(), motivo: z.string() })),
        }),
      });

      const byId = new Map(imoveis.map((i) => [i.id, i]));
      const items = result.object.items.filter((r) => byId.has(r.id)).slice(0, 3);

      await supabaseAdmin.from("recommendation_queries").insert({
        texto: data.texto,
        resultado: items.map((r) => ({ ...r, titulo: byId.get(r.id)?.titulo })),
      });
      return { items };
    } catch (e) {
      console.error("recommend error", e);
      try {
        await supabaseAdmin.from("recommendation_queries").insert({ texto: data.texto, resultado: [] });
      } catch {}
      return { items: [], error: "Não foi possível gerar recomendações neste momento." };
    }
  });
