import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Aurum Imóveis" },
      { name: "description", content: "Termos de uso e política de privacidade da Aurum Imóveis." },
      { property: "og:title", content: "Termos de Uso — Aurum Imóveis" },
      { property: "og:description", content: "Termos de uso e política de privacidade da Aurum Imóveis." },
    ],
  }),
  component: Termos,
});

const itens = [
  ["1. Informações dos imóveis", "Preços, metragens e disponibilidade são informativos e podem mudar sem aviso prévio. Confirme sempre com um corretor."],
  ["2. Intermediação", "A Aurum Imóveis atua como intermediadora, com corretores registrados no CRECI. Honorários seguem a tabela do conselho regional."],
  ["3. Imagens", "As fotos são ilustrativas e podem não representar exatamente o estado atual do imóvel."],
  ["4. Privacidade (LGPD)", "Seus dados enviados por formulário ou WhatsApp são usados apenas para atendimento e não são compartilhados com terceiros sem consentimento."],
  ["5. Visitas", "Visitas são agendadas previamente e acompanhadas por um corretor."],
];

function Termos() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      <h1 className="mt-6 text-5xl">Termos de Uso</h1>
      <div className="mt-10 space-y-8">
        {itens.map(([t, d]) => (
          <section key={t}>
            <h2 className="text-2xl">{t}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{d}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
