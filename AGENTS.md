# Diretrizes do Projeto - Imobiliária Marques e Araújo

- O catálogo de imóveis reside na tabela `properties`; leituras públicas ocorrem via `getSiteData` server fn (com cache de performance), e gravações administrativas ocorrem sob RLS `has_role(admin)`.
- As fotos dos imóveis são enviadas para o bucket `imoveis` com URLs seguras e assinadas.
- As cidades residem na tabela `cities` e os bairros na tabela `neighborhoods`, ambos gerenciados pelo corretor no painel admin.
- O endereço cadastrado no imóvel possui suporte à visualização no mapa integrado e link direto para o Google Maps.
- A logomarca da imobiliária reside na tabela `settings` (`logo_url`) e é exibida no cabeçalho e rodapé do site junto ao nome.
- Cadastros abertos / primeiro acesso público estão desativados por segurança; apenas administradores cadastrados no banco podem acessar o painel.
- As gravações de visitantes (eventos, leads, consultas de recomendação) passam por server functions validadas usando `supabaseAdmin`.
- O projeto está preparado para deploy na Vercel com banco de dados Supabase.
