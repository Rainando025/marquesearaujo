import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, BedDouble, Bath, Maximize, MessageCircle, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { waLink } from "@/lib/site";
import { listProperties, recommendProperties, type Property, type Recommendation } from "@/lib/properties.functions";

const propsQuery = queryOptions({ queryKey: ["properties"], queryFn: () => listProperties() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum Imóveis — Seu próximo lar em Salvador" },
      { name: "description", content: "Apartamentos e casas para comprar ou alugar. Busque, filtre, receba recomendações e fale com um corretor pelo WhatsApp." },
      { property: "og:title", content: "Aurum Imóveis — Seu próximo lar" },
      { property: "og:description", content: "Apartamentos e casas para comprar ou alugar, com atendimento pelo WhatsApp." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(propsQuery),
  component: Index,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Card({ i, motivo }: { i: Property; motivo?: string }) {
  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={i.imagem_url || "/images/hero.jpg"} alt={i.titulo} loading="lazy" width={1024} height={768} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{i.negocio}</span>
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{i.bairro}</p>
        <h3 className="mt-1 text-2xl">{i.titulo}</h3>
        {motivo && <p className="mt-2 rounded-md bg-secondary p-2 text-sm"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{motivo}</p>}
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{i.quartos}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{i.banheiros}</span>
          <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{i.area} m²</span>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-display text-2xl text-primary">{brl(Number(i.preco))}{i.negocio === "Aluguel" && <span className="text-sm text-muted-foreground">/mês</span>}</p>
          <a href={waLink(`Olá! Tenho interesse no imóvel "${i.titulo}" (${i.bairro}).`)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-primary-foreground">
            <MessageCircle className="h-4 w-4" />Contato
          </a>
        </div>
      </div>
    </article>
  );
}

function Recomendador({ imoveis }: { imoveis: Property[] }) {
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
      if (r.error) setErro(r.error);
      else setRes(r.items);
    } catch {
      setErro("Não foi possível gerar recomendações agora.");
    }
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
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {res.map((r) => {
              const i = imoveis.find((p) => p.id === r.id);
              return i ? <Card key={r.id} i={i} motivo={r.motivo} /> : null;
            })}
            {!res.length && <p className="text-muted-foreground">Nenhum imóvel compatível encontrado.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function Index() {
  const { data: imoveis } = useSuspenseQuery(propsQuery);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [negocio, setNegocio] = useState("Todos");
  const [quartos, setQuartos] = useState(0);
  const [max, setMax] = useState(0);

  const lista = useMemo(() => imoveis.filter((i) =>
    (!q || `${i.titulo} ${i.bairro} ${i.tipo}`.toLowerCase().includes(q.toLowerCase())) &&
    (tipo === "Todos" || i.tipo === tipo) &&
    (negocio === "Todos" || i.negocio === negocio) &&
    i.quartos >= quartos && (!max || Number(i.preco) <= max)
  ), [imoveis, q, tipo, negocio, quartos, max]);

  const sel = "h-12 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-primary-foreground">
          <span className="font-display text-2xl">Aurum<span className="text-gold">.</span></span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#imoveis" className="hidden sm:inline hover:text-gold">Imóveis</a>
            <a href="#recomendar" className="hidden sm:inline hover:text-gold">Recomendação</a>
            <Link to="/termos" className="hidden sm:inline hover:text-gold">Termos</Link>
            <a href={waLink("Olá! Gostaria de falar com um corretor.")} target="_blank" rel="noreferrer" className="rounded-full bg-whatsapp px-4 py-2 font-semibold text-primary-foreground">WhatsApp</a>
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
        <div className="mt-8 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className={sel} />
          <select value={negocio} onChange={(e) => setNegocio(e.target.value)} className={sel}>
            <option>Todos</option><option>Venda</option><option>Aluguel</option>
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
            <option>Todos</option><option>Apartamento</option><option>Casa</option><option>Cobertura</option><option>Terreno</option><option>Comercial</option>
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
          {lista.map((i) => <Card key={i.id} i={i} />)}
          {!lista.length && <p className="text-muted-foreground">Nenhum imóvel encontrado com esses filtros.</p>}
        </div>
      </section>

      <Recomendador imoveis={imoveis} />

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <h2 className="max-w-xl text-4xl">Não encontrou o imóvel ideal? Nós buscamos para você.</h2>
          <a href={waLink("Olá! Quero ajuda para encontrar um imóvel.")} target="_blank" rel="noreferrer" className="rounded-full bg-gold px-8 py-4 font-semibold text-accent-foreground">Falar no WhatsApp</a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-6 py-10 text-sm text-muted-foreground">
        <span>© 2026 Aurum Imóveis · CRECI 00000-J</span>
        <div className="flex gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos de uso e privacidade</Link>
          <Link to="/admin" className="hover:text-foreground">Área do corretor</Link>
        </div>
      </footer>

      <a href={waLink("Olá!")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="fixed bottom-6 right-6 z-30 rounded-full bg-whatsapp p-4 text-primary-foreground shadow-xl">
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
