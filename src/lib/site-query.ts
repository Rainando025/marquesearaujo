import { queryOptions } from "@tanstack/react-query";
import { getSiteData } from "@/lib/properties.functions";

export const siteQuery = queryOptions({
  queryKey: ["properties"],
  queryFn: () => getSiteData(),
  staleTime: 1000 * 60, // 1 minuto no cliente antes de refetch automático
});

export const nomeEmpresa = (d: { settings: { nome_empresa?: string | null } | null } | undefined) =>
  d?.settings?.nome_empresa?.trim() || "Imobiliária";

export const logoEmpresa = (d: { settings: { logo_url?: string | null } | null } | undefined) =>
  d?.settings?.logo_url?.trim() || null;
