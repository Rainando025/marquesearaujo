import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, BedDouble, Bath, Maximize, MessageCircle, Sparkles, X } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { waLink, brl } from "@/lib/site";
import {
  getSiteData, recommendProperties, trackEvent, createLead,
  type Property, type Recommendation,
} from "@/lib/properties.functions";

const siteQuery = queryOptions({ queryKey: ["properties"], queryFn: () => getSiteData() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum Imóveis — Seu próximo lar em Salvador" },
      { name: "description", content: "Apartamentos e casas para comprar ou alugar. Busque, filtre, receba recomendações e fale com um corretor pelo WhatsApp." },
      { property: "og:title", content: "Aurum Imóveis — Seu próximo lar" },
      { property: "og:description", content: "Apartamentos e casas para comprar ou alugar, com atendimento pelo WhatsApp." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Index,
});

function useTrack() {
  const fn = useServerFn(trackEvent);
  return (tipo: string, property_id?: string) => { fn({ data: { tipo, property_id, pagina: window.location.pathname + window.location.hash } }).catch(() => {}); };
}

function Card({ i, motivo, wa, onOpen }: { i: Property; motivo?: string; wa: string; onOpen: (p: Property) => void }) {
  const track = useTrack();
  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:-translate-y-1 hover:shadow-xl">
      <button onClick={() => onOpen(i)} className="relative block aspect-[4/3] w-full overflow-hidden">
        <img src={i.imagem_url || "/images/hero.jpg"} alt={i.titulo} loading="lazy" width={1024} height={768} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{i.negocio}</span>
        {i.fotos.length > 0 && <span className="absolute bottom-3 right-3 rounded-full bg-card px-3 py-1 text-xs">+{i.fotos.length} fotos</span>}
      </button>
      <div className="p-5">
        <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{i.bairro}</p>
        <button onClick={() => onOpen(i)} className="mt-1 text-left font-display text-2xl hover:underline">{i.titulo}</button>
        {motivo && <p className="mt-2 rounded-md bg-secondary p-2 text-sm"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{motivo}</p>}
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{i.quartos}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{i.banheiros}</span>
          <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{i.area} m²</span>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-display text-2xl text-primary">{brl(Number(i.preco))}{i.negocio === "Aluguel" && <span className="text-sm text-muted-foreground">/mês</span>}</p>
          <a onClick={() => track("whatsapp_click", i.id)} href={waLink(wa, `Olá! Tenho interesse no imóvel "${i.titulo}" (${i.bairro}).`)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-primary-foreground">
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={fotos[idx]} alt={p.titulo} className="aspect-video w-full object-cover" />
          <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full bg-card p-2"><X className="h-5 w-5" /></button>
        </div>
        {fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {fotos.map((f, n) => (
              <button key={n} onClick={() => setIdx(n)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${n === idx ? "border-gold" : "border-transparent"}`}>
                <img src={f} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="space-y-4 p-6">
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{p.bairro} · {p.tipo} · {p.negocio}</p>
          <h3 className="text-3xl">{p.titulo}</h3>
          <p className="font-display text-3xl text-primary">{brl(Number(p.preco))}{p.negocio === "Aluguel" && <span className="text-sm text-muted-foreground">/mês</span>}</p>
          <p className="text-muted-foreground">{p.quartos} quartos · {p.banheiros} banheiros · {p.area} m²</p>
          {p.descricao && <p className="leading-relaxed">{p.descricao}</p>}
          <a onClick={() => track("whatsapp_click", p.id)} href={waLink(wa, `Olá! Tenho interesse no imóvel "${p.titulo}" (${p.bairro}).`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-semibold text-primary-foreground">
            <MessageCircle className="h-5 w-5" />Falar no WhatsApp
          </a>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Prefere que a gente ligue?</p>
            <LeadForm interesse={`Interesse no imóvel: ${p.titulo}`} property_id={p.id} origem="imovel" />
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
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Recomendação inteligente</p>
        <h2 className="mt-2 text-4xl md:text-5xl">Conte o que você procura</h2>
        <form onSubmit={enviar} className="mt-8 flex flex-col gap-3 md:flex-row">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required minLength={3} maxLength={1500}
            placeholder="Ex.: 2 quartos para alugar perto da praia, até R$ 3.000, aceita pet"
            className="min-h-24 flex-1 rounded-xl border border-input bg-card p-4" />
          <button disabled={busy} className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground disabled:opacity-60">
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
            <div className="mt-8 max-w-2xl rounded-xl bg-card p-5">
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
  const { imoveis, settings, bairros } = data;
  const wa = settings?.whatsapp ?? "";
  const empresa = settings?.nome_empresa || "Aurum Imóveis";
  const track = useTrack();
  const [q, setQ] = useState("");
  const [bairro, setBairro] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [negocio, setNegocio] = useState("Todos");
  const [quartos, setQuartos] = useState(0);
  const [max, setMax] = useState(0);
  const [aberto, setAberto] = useState<Property | null>(null);

  useEffect(() => { track("page_view"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (p: Property) => { setAberto(p); track("property_view", p.id); };

  const lista = useMemo(() => imoveis.filter((i) =>
    (!q || `${i.titulo} ${i.bairro} ${i.tipo}`.toLowerCase().includes(q.toLowerCase())) &&
    (bairro === "Todos" || i.bairro === bairro) &&
    (tipo === "Todos" || i.tipo === tipo) &&
    (negocio === "Todos" || i.negocio === negocio) &&
    i.quartos >= quartos && (!max || Number(i.preco) <= max)
  ), [imoveis, q, bairro, tipo, negocio, quartos, max]);

  const sel = "h-12 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-primary-foreground">
          <span className="font-display text-2xl">{empresa}<span className="text-gold">.</span></span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#imoveis" className="hidden sm:inline hover:text-gold">Imóveis</a>
            <a href="#recomendar" className="hidden sm:inline hover:text-gold">Recomendação</a>
            <Link to="/termos" className="hidden sm:inline hover:text-gold">Termos</Link>
            <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá! Gostaria de falar com um corretor.")} target="_blank" rel="noreferrer" className="rounded-full bg-whatsapp px-4 py-2 font-semibold text-primary-foreground">WhatsApp</a>
          </nav>
        </div>
      </header>

      <section className="relative flex min-h-[88vh] items-end">
        <img src={hero} alt="Sala de apartamento aconchegante com varanda" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 text-primary-foreground">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Comprar ou alugar</p>
          <h1 className="mt-4 max-w-3xl text-5xl leading-tight md:text-7xl">O lar certo para a sua família, no preço certo.</h1>
          <div className="mt-10 flex max-w-2xl gap-2 rounded-xl bg-card p-2 shadow-2xl">
            <div className="flex flex-1 items-center gap-2 px-3 text-foreground">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bairro ou tipo de imóvel" className="h-12 w-full bg-transparent outline-none" />
            </div>
            <a href="#imoveis" className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Buscar</a>
          </div>
        </div>
      </section>

      <section id="imoveis" className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl md:text-5xl">Imóveis disponíveis</h2>
          <span className="text-muted-foreground">{lista.length} resultado(s)</span>
        </div>
        <div className="mt-8 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className={sel} />
          <select value={bairro} onChange={(e) => setBairro(e.target.value)} className={sel}>
            <option value="Todos">Bairro: todos</option>
            {bairros.map((b) => <option key={b}>{b}</option>)}
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
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((i) => <Card key={i.id} i={i} wa={wa} onOpen={abrir} />)}
          {!lista.length && <p className="text-muted-foreground">Nenhum imóvel encontrado com esses filtros.</p>}
        </div>
      </section>

      <Recomendador imoveis={imoveis} wa={wa} onOpen={abrir} />

      {settings?.nome_corretor && (
        <section className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-20 md:flex-row">
          {settings.foto_url && <img src={settings.foto_url} alt={settings.nome_corretor} className="h-48 w-48 rounded-full object-cover" />}
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Seu corretor</p>
            <h2 className="mt-2 text-4xl">{settings.nome_corretor}</h2>
            {settings.creci && <p className="mt-1 text-muted-foreground">CRECI {settings.creci}</p>}
            {settings.bio && <p className="mt-4 max-w-2xl leading-relaxed">{settings.bio}</p>}
          </div>
        </section>
      )}

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <h2 className="max-w-xl text-4xl">Não encontrou o imóvel ideal? Nós buscamos para você.</h2>
          <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá! Quero ajuda para encontrar um imóvel.")} target="_blank" rel="noreferrer" className="rounded-full bg-gold px-8 py-4 font-semibold text-accent-foreground">Falar no WhatsApp</a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-6 py-10 text-sm text-muted-foreground">
        <span>© 2026 {empresa}{settings?.creci ? ` · CRECI ${settings.creci}` : ""}{settings?.email ? ` · ${settings.email}` : ""}</span>
        <div className="flex gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos de uso e privacidade</Link>
          <Link to="/admin" className="hover:text-foreground">Área do corretor</Link>
        </div>
      </footer>

      <a onClick={() => track("whatsapp_click")} href={waLink(wa, "Olá!")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="fixed bottom-6 right-6 z-30 rounded-full bg-whatsapp p-4 text-primary-foreground shadow-xl">
        <MessageCircle className="h-6 w-6" />
      </a>

      {aberto && <Detalhe p={aberto} wa={wa} onClose={() => setAberto(null)} />}
    </div>
  );
}
