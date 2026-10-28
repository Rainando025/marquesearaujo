import { queryOptions } from "@tanstack/react-query";
import { getSiteData } from "@/lib/properties.functions";

export const siteQuery = queryOptions({ queryKey: ["properties"], queryFn: () => getSiteData() });

export const nomeEmpresa = (d: { settings: { nome_empresa?: string | null } | null } | undefined) =>
  d?.settings?.nome_empresa?.trim() || "Imobiliária";
