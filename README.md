# Painel Semanal de Reservas — Encantos de Altitude

Painel estático (HTML puro, sem servidor) para consulta semanal de reservas: check-ins, check-outs, cabana, hóspedes, plataforma (Booking/Airbnb/Próprio), saldo a cobrar, observações e consumo de frigobar.

## Como funciona

- `index.html` é a página inteira (HTML + CSS + JS, sem dependências externas além de fontes do Google Fonts).
- `data/reservas.csv` é a planilha de reservas exportada do FazReservas. A página busca esse arquivo automaticamente ao abrir — **qualquer pessoa que acessar o link vê os mesmos dados**, sem precisar importar nada manualmente.

## Atualizar os dados (rotina diária, sem terminal)

1. No FazReservas: **Reservas → Lista** → habilite as colunas necessárias → botão **CSV** para exportar.
2. No GitHub, abra este repositório no navegador e clique em `data/reservas.csv`.
3. Clique no ícone de lápis (editar) — ou em **Add file → Upload files** para substituir o arquivo pelo CSV exportado.
4. Faça o commit direto na branch `main`.
5. Aguarde cerca de 1 minuto e recarregue a página publicada (ou clique no botão **"🔄 Atualizar dados"** dentro do painel) — os dados aparecem atualizados para todo mundo automaticamente.

## Papéis de acesso (administrador x visualização)

- **Sem login**: qualquer pessoa que abrir o link vê o calendário completo, navega entre semanas e pode **escrever observações** em qualquer reserva (toalhas, arrumação, pedidos especiais).
- **Administrador**: clicando em "🔒 Entrar como administrador" e digitando o código, libera:
  - Importar/colar CSV manualmente dentro do próprio painel (além do fluxo normal via GitHub).
  - Lançar e remover itens de consumo de frigobar.

### ⚠️ Importante sobre o código de administrador

O código fica definido na constante `ADMIN_PIN` dentro do `<script>` de `index.html` (procure por `const ADMIN_PIN = ...`). **Troque esse valor antes de publicar.**

Isso **não é uma senha de verdade** — como o site é público e estático, qualquer pessoa que abrir "Ver código-fonte da página" no navegador consegue ler esse valor. Serve apenas para evitar que alguém sem intenção de editar clique e mexa por engano nos dados. Não use para proteger informações sensíveis.

### ⚠️ Observações e frigobar são salvos por navegador, não no repositório

Diferente do calendário de reservas (que vem do `data/reservas.csv` e é igual para todo mundo), as **observações** e o **consumo de frigobar** ficam salvos no `localStorage` do navegador de cada pessoa — ou seja, **não sincronizam entre dispositivos**. Se o administrador lançar um consumo de frigobar no computador da recepção, esse lançamento não aparece no celular da camareira, e vice-versa.

Isso é uma limitação de ser um site 100% estático (sem banco de dados). Se no futuro for necessário que observações/frigobar sejam realmente compartilhados entre todos os dispositivos, é preciso adicionar um backend simples (ex.: Google Sheets como banco via Apps Script, ou Firebase) — avise se quiser que isso seja implementado.

## Publicar no GitHub Pages

1. Neste repositório: **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Branch: `main`, pasta: `/ (root)`.
4. Salve e aguarde — a URL pública aparece no formato `https://SEU-USUARIO.github.io/painel-reservas-encantos/`.
5. Não é necessário nenhum GitHub Actions/workflow adicional — o Pages republica sozinho a cada commit na branch configurada.
