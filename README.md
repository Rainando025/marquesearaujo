# Marques e Araújo - Plataforma Imobiliária

Landing page e painel administrativo moderno e otimizado para imobiliária e corretores de imóveis.

## Funcionalidades

- **Catálogo de Imóveis**: Vitrine rápida com filtros dinâmicos por Cidade, Bairro, Negócio (Venda/Aluguel), Tipo, Quartos e Faixa de Preço.
- **Visualização em Mapa**: Exibição do endereço e localização no mapa interativo com rota direta no Google Maps.
- **Logomarca Personalizável**: Upload de logotipo pelo painel com exibição integrada ao cabeçalho da landing page.
- **Gestão de Cidades e Bairros**: Painel exclusivo para o corretor cadastrar as cidades e bairros que atende.
- **Painel do Corretor Seguro**: Gestão de imóveis, fotos com otimização automática de tamanho, funil de leads, carteira de captações e métricas de acessos.
- **Segurança**: Autenticação fechada via Supabase Auth + RLS (Row Level Security); sem registro livre de visitantes.
- **Alta Performance**: Cache no servidor para evitar estouro de cotas no Supabase e carregamento ultra-rápido na Vercel.

## Configuração e Deploy

1. Configure as variáveis de ambiente baseadas no `.env.example`.
2. Execute o script SQL consolidado no **SQL Editor** do Supabase para criar as tabelas e políticas de segurança.
3. Conecte o repositório na **Vercel** com deploy automático.
