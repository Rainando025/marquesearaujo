export const DEFAULT_WHATSAPP = "5571999999999";
export const waLink = (numero: string | undefined, msg: string) =>
  `https://wa.me/${(numero || DEFAULT_WHATSAPP).replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
