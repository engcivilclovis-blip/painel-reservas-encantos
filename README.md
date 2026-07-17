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

- **Sem login**: qualquer pessoa que abrir o link vê o calendário completo, navega entre semanas e pode **escrever observações** em qualquer reserva (toalhas, arrumação, pedidos especiais) — sincronizadas entre todos os dispositivos quando a API estiver configurada (veja abaixo). Também vê a barra de estoque de frigobar (se a sincronização estiver configurada).
- **Administrador**: clicando em "🔒 Entrar como administrador" e digitando o código, libera:
  - Importar/colar CSV manualmente dentro do próprio painel (além do fluxo normal via GitHub).
  - Lançar e remover itens de consumo de frigobar por reserva.
  - Registrar reabastecimento de estoque (botão "📦 Estoque de frigobar", só aparece com a sincronização configurada).

### ⚠️ Importante sobre o código de administrador

O código fica definido na constante `ADMIN_PIN` dentro do `<script>` de `index.html` (procure por `const ADMIN_PIN = ...`). **Troque esse valor antes de publicar.**

Isso **não é uma senha de verdade** — como o site é público e estático, qualquer pessoa que abrir "Ver código-fonte da página" no navegador consegue ler esse valor. Serve apenas para evitar que alguém sem intenção de editar clique e mexa por engano nos dados. Não use para proteger informações sensíveis.

### ⚠️ Sem a API configurada, observações e frigobar ficam só no navegador local

Enquanto `FRIGOBAR_API_URL` estiver vazio em `index.html`, tanto as **observações** quanto o **consumo de frigobar** ficam salvos apenas no `localStorage` do navegador de cada pessoa — não sincronizam entre dispositivos. Assim que a API for configurada (próxima seção), os dois passam a sincronizar automaticamente entre todos os dispositivos.

## Sincronizar observações, estoque e consumo de frigobar entre dispositivos (Google Sheets)

Por padrão (`FRIGOBAR_API_URL` vazio em `index.html`), observações e frigobar ficam só no navegador local. Para que **todo mundo veja as mesmas observações, o mesmo estoque e os mesmos lançamentos**, em qualquer aparelho, siga estes passos (uma vez só):

1. Acesse [sheets.google.com](https://sheets.google.com) com a conta Google do administrador e crie uma planilha em branco. Nomeie, por exemplo, "Estoque Frigobar — Encantos".
2. No menu, vá em **Extensões → Apps Script**. Vai abrir um editor de código numa aba nova.
3. Apague o conteúdo padrão (`function myFunction() {}`) e cole o conteúdo do arquivo [`apps-script/Code.gs`](apps-script/Code.gs) deste repositório.
4. Salve o projeto (ícone de disquete ou Ctrl+S). Dê um nome ao projeto, ex. "API Frigobar".
5. Clique em **Implantar → Nova implantação**.
6. Em "Selecionar tipo", clique na engrenagem e escolha **App da Web**.
7. Configure:
   - **Executar como**: Eu (sua conta)
   - **Quem pode acessar**: Qualquer pessoa
8. Clique em **Implantar**. Na primeira vez, o Google vai pedir para autorizar o script a acessar sua planilha — clique em **Autorizar acesso**, escolha sua conta, e em "Acesso não verificado" clique em **Avançado → Acessar [nome do projeto] (não seguro)** (é normal esse aviso para scripts pessoais que você mesmo escreveu).
9. Copie a **URL do app da Web** que aparece (termina em `/exec`).
10. Abra `index.html` neste repositório, procure `const FRIGOBAR_API_URL = '';` e cole a URL entre as aspas:
    ```js
    const FRIGOBAR_API_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
    ```
11. Faça commit dessa alteração. Pronto — a partir daí, toda observação escrita e todo consumo de frigobar lançado, em qualquer dispositivo, atualiza a planilha e aparece para todo mundo (a página verifica atualizações a cada 1 minuto automaticamente, ou na hora ao abrir/fechar o painel de detalhes; observações salvam ~1 segundo depois de parar de digitar).

### O que fica registrado na planilha

O script cria três abas sozinho na primeira vez que for usado:

- **Estoque**: uma linha por cabana/container + item (Água, Cerveja, etc.) com a quantidade atual e o mínimo antes de disparar o aviso "⚠️ repor". Você pode editar essas colunas diretamente na planilha a qualquer momento (ex.: corrigir uma contagem, ou mudar o mínimo de um item).
- **Movimentos**: histórico de tudo — cada consumo lançado numa reserva (saída de estoque) e cada reabastecimento registrado pelo administrador (entrada de estoque), com data/hora.
- **Observacoes**: uma linha por reserva com a observação atual e quando foi atualizada pela última vez.

### Sobre o código-fonte da API (`apps-script/Code.gs`)

Esse arquivo fica neste repositório só como referência/backup do que foi colado no editor do Apps Script — ele **não roda a partir daqui**, precisa estar colado dentro do projeto Apps Script vinculado à planilha (passo 3 acima). Se você editar a lógica no editor do Apps Script, lembre de copiar as mudanças de volta pra cá também, e de criar uma **nova implantação** (ou "Gerenciar implantações → editar → nova versão") depois de qualquer alteração — o Apps Script não atualiza a URL publicada sozinho.

## Publicar no GitHub Pages

1. Neste repositório: **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Branch: `main`, pasta: `/ (root)`.
4. Salve e aguarde — a URL pública aparece no formato `https://SEU-USUARIO.github.io/painel-reservas-encantos/`.
5. Não é necessário nenhum GitHub Actions/workflow adicional — o Pages republica sozinho a cada commit na branch configurada.
