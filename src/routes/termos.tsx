import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteQuery, nomeEmpresa } from "@/lib/site-query";

export const Route = createFileRoute("/termos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Termos de Uso — ${nomeEmpresa(loaderData)}` },
      { name: "description", content: `Termos de uso e política de privacidade da ${nomeEmpresa(loaderData)}.` },
      { property: "og:title", content: `Termos de Uso — ${nomeEmpresa(loaderData)}` },
      { property: "og:description", content: `Termos de uso e política de privacidade da ${nomeEmpresa(loaderData)}.` },
    ],
  }),
  component: Termos,
});

const itens = [
  ["1. Informações dos imóveis", "Preços, metragens e disponibilidade são informativos e podem mudar sem aviso prévio. Confirme sempre com um corretor."],
  ["2. Intermediação", "{EMPRESA} atua como intermediadora, com corretores registrados no CRECI. Honorários seguem a tabela do conselho regional."],
  ["3. Imagens", "As fotos são ilustrativas e podem não representar exatamente o estado atual do imóvel."],
  ["4. Privacidade (LGPD)", "Seus dados enviados por formulário ou WhatsApp são usados apenas para atendimento e não são compartilhados com terceiros sem consentimento. Registramos endereço IP, horário e páginas acessadas para estatísticas de visitas e segurança."],
  ["5. Visitas", "Visitas são agendadas previamente e acompanhadas por um corretor."],
];

function Termos() {
  const { data } = useSuspenseQuery(siteQuery);
  const empresa = nomeEmpresa(data);
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      <h1 className="mt-6 text-5xl">Termos de Uso</h1>
      <div className="mt-10 space-y-8">
        {itens.map(([t, d]) => (
          <section key={t}>
            <h2 className="text-2xl">{t}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{d.replace("{EMPRESA}", empresa)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
