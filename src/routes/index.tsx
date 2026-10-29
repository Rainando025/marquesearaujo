import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, BedDouble, Bath, Maximize, MessageCircle, Sparkles, X, ChevronLeft, ChevronRight, Menu, ExternalLink } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { waLink, brl } from "@/lib/site";
import {
  recommendProperties, trackEvent, createLead,
  type Property, type Recommendation,
} from "@/lib/properties.functions";

import { siteQuery, nomeEmpresa } from "@/lib/site-query";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${nomeEmpresa(loaderData)} — Seu próximo lar` },
      { name: "description", content: "Apartamentos e casas para comprar ou alugar. Busque por cidade e bairro, visualize no mapa e fale com um corretor pelo WhatsApp." },
      { property: "og:title", content: `${nomeEmpresa(loaderData)} — Seu próximo lar` },
      { property: "og:description", content: "Apartamentos e casas para comprar ou alugar, com localização no mapa e atendimento direto pelo WhatsApp." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Index,
});

function useTrack() {
  const fn = useServerFn(trackEvent);
  return (tipo: string, property_id?: string) => {
    fn({ data: { tipo, property_id, pagina: window.location.pathname + window.location.hash } }).catch(() => {});
  };
}

function Card({ i, motivo, wa, onOpen }: { i: Property; motivo?: string | undefined; wa: string; onOpen: (p: Property) => void }) {
  const track = useTrack();
  const fotos = [i.imagem_url || "/images/hero.jpg", ...i.fotos];
  const [idx, setIdx] = useState(0);
  const loc = [i.bairro, i.cidade].filter(Boolean).join(", ");

  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <button onClick={() => onOpen(i)} className="block h-full w-full" aria-label={`Ver ${i.titulo}`}>
          <img
            src={fotos[idx]}
            alt={i.titulo}
            loading="lazy"
            decoding="async"
            width={720}
            height={540}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </button>
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
          {i.negocio}
        </span>
        {fotos.length > 1 && (
          <>
            <button aria-label="Foto anterior" onClick={() => setIdx((idx - 1 + fotos.length) % fotos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-1.5 shadow backdrop-blur"><ChevronLeft className="h-4 w-4" /></button>
            <button aria-label="Próxima foto" onClick={() => setIdx((idx + 1) % fotos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-1.5 shadow backdrop-blur"><ChevronRight className="h-4 w-4" /></button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {fotos.map((_, n) => <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === idx ? "bg-card" : "bg-card/50"}`} />)}
            </div>
          </>
        )}
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
          <MapPin className="h-4 w-4 shrink-0 text-gold" />
          <span>{loc || i.endereco || "Localização a consultar"}</span>
        </p>
        <button onClick={() => onOpen(i)} className="mt-1 text-left font-display text-2xl hover:underline line-clamp-1">{i.titulo}</button>
        {motivo && <p className="mt-2 rounded-md bg-secondary p-2 text-sm"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{motivo}</p>}
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{i.quartos}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{i.banheiros}</span>
          <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{i.area} m²</span>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-display text-2xl text-primary">{brl(Number(i.preco))}{i.negocio === "Aluguel" && <span className="text-sm text-muted-foreground">/mês</span>}</p>
          <a onClick={() => track("whatsapp_click", i.id)} href={waLink(wa, `Olá! Tenho interesse no imóvel "${i.titulo}"${loc ? ` (${loc})` : ""}.`)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90">
            <MessageCircle className="h-4 w-4" />Contato
          </a>
        </div>
      </div>
    </article>
  );
}

function LeadForm({ interesse, property_id, origem }: { interesse?: string; property_id?: string; origem: string }) {
  const fn = useServerFn(createLead);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [ok, setOk] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await fn({ data: { nome, telefone: tel, interesse, property_id, origem } }); setOk(r.ok); }
    catch { setOk(false); }
    setBusy(false);
  }
  if (ok) return <p className="rounded-md bg-secondary p-3 text-sm">Recebemos seu contato! Um corretor vai falar com você em breve.</p>;
  const input = "h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm";
  return (
    <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
      <input required minLength={2} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className={input} />
      <input required minLength={8} placeholder="Telefone / WhatsApp" value={tel} onChange={(e) => setTel(e.target.value)} className={input} />
      <button disabled={busy} className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Enviando..." : "Quero ser contatado"}</button>
      {ok === false && <p className="text-sm text-destructive">Não foi possível enviar. Tente novamente.</p>}
    </form>
  );
}

function Detalhe({ p, wa, onClose }: { p: Property; wa: string; onClose: () => void }) {
  const fotos = [p.imagem_url || "/images/hero.jpg", ...p.fotos];
  const [idx, setIdx] = useState(0);
  const track = useTrack();
  const enderecoBusca = [p.endereco, p.bairro, p.cidade].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 p-0 sm:items-center sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-card sm:rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={fotos[idx]} alt={p.titulo} className="aspect-video w-full object-cover" />
          {fotos.length > 1 && (
            <>
              <button aria-label="Foto anterior" onClick={() => setIdx((idx - 1 + fotos.length) % fotos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow"><ChevronLeft className="h-5 w-5" /></button>
              <button aria-label="Próxima foto" onClick={() => setIdx((idx + 1) % fotos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow"><ChevronRight className="h-5 w-5" /></button>
              <span className="absolute bottom-3 right-3 rounded-full bg-card/90 px-3 py-1 text-xs">{idx + 1} / {fotos.length}</span>
            </>
          )}
          <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full bg-card/90 p-2 shadow hover:bg-card"><X className="h-5 w-5" /></button>
        </div>
        {fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {fotos.map((f, n) => (
              <button key={n} onClick={() => setIdx(n)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${n === idx ? "border-gold" : "border-transparent"}`}>
                <img src={f} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        <div className="space-y-4 p-4 sm:p-6">
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 text-gold" />{[p.bairro, p.cidade].filter(Boolean).join(", ")} · {p.tipo} · {p.negocio}</p>
          <h3 className="text-2xl sm:text-3xl font-display">{p.titulo}</h3>
          <p className="font-display text-3xl text-primary">{brl(Number(p.preco))}{p.negocio === "Aluguel" && <span className="text-sm text-muted-foreground">/mês</span>}</p>
          <p className="text-muted-foreground">{p.quartos} quartos · {p.banheiros} banheiros · {p.area} m²</p>
          {p.descricao && <p className="leading-relaxed whitespace-pre-line">{p.descricao}</p>}

          {/* Visualização de Mapa pelo Endereço */}
          {enderecoBusca && (
            <div className="border-t pt-4 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                <MapPin className="h-4 w-4 text-gold shrink-0" />
                <span>Localização no mapa</span>
              </p>
              <p className="text-xs text-muted-foreground">{[p.endereco, p.bairro, p.cidade].filter(Boolean).join(" · ")}</p>
              <div className="overflow-hidden rounded-xl border bg-muted shadow-sm">
                <iframe
                  title={`Mapa do imóvel ${p.titulo}`}
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(enderecoBusca)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
                <div className="flex items-center justify-between p-3 bg-card border-t text-xs">
                  <span className="text-muted-foreground truncate mr-2">{enderecoBusca}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoBusca)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}

          <a onClick={() => track("whatsapp_click", p.id)} href={waLink(wa, `Olá! Tenho interesse no imóvel "${p.titulo}" (${[p.bairro, p.cidade].filter(Boolean).join(", ")}).`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-semibold text-primary-foreground shadow transition hover:opacity-90">
            <MessageCircle className="h-5 w-5" />Falar no WhatsApp
          </a>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Prefere que a gente ligue?</p>
            <LeadForm interesse={`Interesse no imóvel: ${p.titulo} (${p.bairro})`} property_id={p.id} origem="imovel" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Recomendador({ imoveis, wa, onOpen }: { imoveis: Property[]; wa: string; onOpen: (p: Property) => void }) {
  const recommend = useServerFn(recommendProperties);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Recommendation[] | null>(null);
  const [erro, setErro] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro(""); setRes(null);
    try {
      const r = await recommend({ data: { texto } });
      if (r.error) setErro(r.error); else setRes(r.items);
    } catch { setErro("Não foi possível gerar recomendações agora."); }
    setBusy(false);
  }

  return (
    <section id="recomendar" className="bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Recomendação inteligente</p>
        <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl">Conte o que você procura</h2>
        <form onSubmit={enviar} className="mt-8 flex flex-col gap-3 md:flex-row">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required minLength={3} maxLength={1500}
            placeholder="Ex.: 2 quartos para comprar perto do metrô ou praia, até R$ 500 mil, com varanda"
            className="min-h-24 flex-1 rounded-xl border border-input bg-card p-4 text-sm" />
          <button disabled={busy} className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground shadow disabled:opacity-60">
            {busy ? "Analisando..." : "Recomendar imóveis"}
          </button>
        </form>
        {erro && <p className="mt-4 text-destructive">{erro}</p>}
        {res && (
          <>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {res.map((r) => {
                const i = imoveis.find((p) => p.id === r.id);
                return i ? <Card key={r.id} i={i} motivo={r.motivo} wa={wa} onOpen={onOpen} /> : null;
              })}
              {!res.length && <p className="text-muted-foreground">Nenhum imóvel compatível encontrado.</p>}
            </div>
            <div className="mt-8 max-w-2xl rounded-xl bg-card p-5 shadow">
              <p className="mb-3 font-semibold">Quer que um corretor encontre mais opções para você?</p>
              <LeadForm interesse={texto} origem="recomendacao" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Index() {
  const { data } = useSuspenseQuery(siteQuery);
  const { imoveis, settings, bairros, cidades = [] } = data;
  const wa = settings?.whatsapp ?? "";
  const empresa = nomeEmpresa(data);
  const logoUrl = settings?.logo_url;
  const track = useTrack();
  const [q, setQ] = useState("");
  const [cidade, setCidade] = useState("Todos");
  const [bairro, setBairro] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [negocio, setNegocio] = useState("Todos");
  const [quartos, setQuartos] = useState(0);
  const [max, setMax] = useState(0);
  const [aberto, setAberto] = useState<Property | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => { track("page_view"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (p: Property) => { setAberto(p); track("property_view", p.id); };

  const lista = useMemo(() => imoveis.filter((i) =>
    (!q || `${i.titulo} ${i.cidade || ""} ${i.bairro || ""} ${i.endereco || ""} ${i.tipo}`.toLowerCase().includes(q.toLowerCase())) &&
    (cidade === "Todos" || (i.cidade || "").toLowerCase() === cidade.toLowerCase()) &&
    (bairro === "Todos" || (i.bairro || "").toLowerCase() === bairro.toLowerCase()) &&
    (tipo === "Todos" || i.tipo === tipo) &&
    (negocio === "Todos" || i.negocio === negocio) &&
    i.quartos >= quartos && (!max || Number(i.preco) <= max)
  ), [imoveis, q, cidade, bairro, tipo, negocio, quartos, max]);

  const sel = "h-11 rounded-md border border-input bg-background px-3 text-xs sm:text-sm";

  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 text-primary-foreground sm:px-6 sm:py-6">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`Logo ${empresa}`}
                className="h-8 sm:h-10 w-auto max-h-10 max-w-[120px] sm:max-w-[160px] object-contain rounded drop-shadow"
                loading="eager"
                decoding="async"
              />
            )}
            <span className="min-w-0 truncate font-display text-xl sm:text-2xl drop-shadow">
              {empresa}<span className="text-gold">.</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-4 text-sm lg:gap-6">
            <a href="#imoveis" className="hidden sm:inline hover:text-gold transition">Imóveis</a>
            <a href="#recomendar" className="hidden sm:inline hover:text-gold transition">Recomendação</a>
            <Link to="/termos" className="hidden sm:inline hover:text-gold transition">Termos</Link>
            <button aria-label="Menu" onClick={() => setMenu(!menu)} className="rounded-full p-2 sm:hidden"><Menu className="h-6 w-6" /></button>
            <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá! Gostaria de falar com um corretor.")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex items-center gap-2 rounded-full bg-whatsapp p-2 font-semibold text-primary-foreground sm:px-4 sm:py-2 shadow transition hover:opacity-90"><MessageCircle className="h-5 w-5" /><span className="hidden sm:inline">WhatsApp</span></a>
          </nav>
        </div>
        {menu && (
          <div className="mx-4 flex flex-col rounded-xl bg-card p-2 text-foreground shadow-xl sm:hidden border">
            <a href="#imoveis" onClick={() => setMenu(false)} className="rounded-md px-4 py-3">Imóveis</a>
            <a href="#recomendar" onClick={() => setMenu(false)} className="rounded-md px-4 py-3">Recomendação</a>
            <Link to="/termos" className="rounded-md px-4 py-3">Termos</Link>
          </div>
        )}
      </header>

      <section className="relative flex min-h-[88vh] items-end">
        <img
          src={hero}
          alt="Sala de apartamento aconchegante com varanda"
          width={1920}
          height={1088}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-28 text-primary-foreground sm:px-6 sm:pb-20">
          <p className="text-sm uppercase tracking-[0.3em] text-gold font-medium">Comprar ou alugar</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl md:text-7xl font-display">O lar certo para a sua família, no preço certo.</h1>
          <div className="mt-10 flex max-w-2xl gap-2 rounded-xl bg-card p-2 shadow-2xl">
            <div className="flex flex-1 items-center gap-2 px-3 text-foreground">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cidade, bairro, endereço ou tipo de imóvel" className="h-12 w-full bg-transparent outline-none text-sm" />
            </div>
            <a href="#imoveis" className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow">Buscar</a>
          </div>
        </div>
      </section>

      <section id="imoveis" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display">Imóveis disponíveis</h2>
          <span className="text-muted-foreground">{lista.length} resultado(s)</span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-2.5 rounded-xl border bg-card p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-7">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className={`${sel} col-span-2 sm:col-span-1`} />
          <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={sel}>
            <option value="Todos">Cidade: todas</option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={bairro} onChange={(e) => setBairro(e.target.value)} className={sel}>
            <option value="Todos">Bairro: todos</option>
            {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={negocio} onChange={(e) => setNegocio(e.target.value)} className={sel}>
            <option value="Todos">Venda e aluguel</option><option>Venda</option><option>Aluguel</option>
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
            <option value="Todos">Tipo: todos</option><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Terreno</option><option>Comercial</option>
          </select>
          <select value={quartos} onChange={(e) => setQuartos(+e.target.value)} className={sel}>
            <option value={0}>Quartos: qualquer</option><option value={1}>1+</option><option value={2}>2+</option><option value={3}>3+</option>
          </select>
          <select value={max} onChange={(e) => setMax(+e.target.value)} className={sel}>
            <option value={0}>Preço máx.: qualquer</option>
            <option value={3000}>Até R$ 3 mil</option>
            <option value={5000}>Até R$ 5 mil</option>
            <option value={500000}>Até R$ 500 mil</option>
            <option value={800000}>Até R$ 800 mil</option>
          </select>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 2xl:grid-cols-4">
          {lista.map((i) => <Card key={i.id} i={i} wa={wa} onOpen={abrir} />)}
          {!lista.length && <p className="text-muted-foreground col-span-full py-8 text-center">Nenhum imóvel encontrado com esses filtros.</p>}
        </div>
      </section>

      <Recomendador imoveis={imoveis} wa={wa} onOpen={abrir} />

      {settings?.nome_corretor && (
        <section className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 sm:py-20 md:flex-row md:text-left">
          {settings.foto_url && (
            <img
              src={settings.foto_url}
              alt={settings.nome_corretor}
              loading="lazy"
              className="h-48 w-48 rounded-full object-cover shadow-lg border-2 border-border"
            />
          )}
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-medium">Seu corretor</p>
            <h2 className="mt-2 text-4xl font-display">{settings.nome_corretor}</h2>
            {settings.creci && <p className="mt-1 text-muted-foreground">CRECI {settings.creci}</p>}
            {settings.bio && <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{settings.bio}</p>}
          </div>
        </section>
      )}

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 sm:py-16 md:flex-row md:items-center">
          <h2 className="max-w-xl text-3xl sm:text-4xl font-display">Não encontrou o imóvel ideal? Nós buscamos para você.</h2>
          <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá! Quero ajuda para encontrar um imóvel.")} target="_blank" rel="noreferrer" className="rounded-full bg-gold px-8 py-4 font-semibold text-accent-foreground shadow transition hover:opacity-95">Falar no WhatsApp</a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-10 pb-24 sm:flex-row sm:flex-wrap sm:px-6 sm:pb-10 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`Logo ${empresa}`}
              className="h-6 w-auto max-h-6 object-contain rounded opacity-80"
              loading="lazy"
            />
          )}
          <span>© 2026 {empresa}{settings?.creci ? ` · CRECI ${settings.creci}` : ""}{settings?.email ? ` · ${settings.email}` : ""}</span>
        </div>
        <div className="flex gap-4">
          <Link to="/termos" className="hover:text-foreground transition">Termos de uso e privacidade</Link>
          <Link to="/admin" className="hover:text-foreground transition">Área do corretor</Link>
        </div>
      </footer>

      <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá!")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="fixed bottom-6 right-6 z-30 rounded-full bg-whatsapp p-4 text-primary-foreground shadow-2xl transition hover:scale-105">
        <MessageCircle className="h-6 w-6" />
      </a>

      {aberto && <Detalhe p={aberto} wa={wa} onClose={() => setAberto(null)} />}
    </div>
  );
}
