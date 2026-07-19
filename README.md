# Painel Semanal de Reservas — Encantos de Altitude

Painel estático (HTML puro, sem servidor) para consulta semanal de reservas: check-ins, check-outs, cabana, hóspedes, plataforma (Booking/Airbnb/Próprio), saldo a cobrar, observações e consumo de frigobar. Também permite escolher um intervalo de datas personalizado, imprimir o período em PDF A4, gerar a fatura de fechamento do frigobar por reserva, imprimir o cardápio de produtos e (para administradores) cadastrar/editar/remover produtos do frigobar.

## Como funciona

- `index.html` é a página inteira (HTML + CSS + JS, sem dependências externas além de fontes do Google Fonts).
- `data/reservas.csv` é a planilha de reservas exportada do FazReservas. A página busca esse arquivo automaticamente ao abrir — **qualquer pessoa que acessar o link vê os mesmos dados**, sem precisar importar nada manualmente.

## Atualizar os dados (rotina diária, sem terminal)

1. No FazReservas: **Reservas → Lista** → habilite as colunas necessárias → botão **CSV** para exportar.
2. No GitHub, abra este repositório no navegador e clique em `data/reservas.csv`.
3. Clique no ícone de lápis (editar) — ou em **Add file → Upload files** para substituir o arquivo pelo CSV exportado.
4. Faça o commit direto na branch `main`.
5. Aguarde cerca de 1 minuto e recarregue a página publicada (ou clique no botão **"🔄 Atualizar dados"** dentro do painel) — os dados aparecem atualizados para todo mundo automaticamente.

## Intervalo de datas personalizado e impressão em PDF

- Além da navegação semana a semana ("« Semana anterior" / "Próxima semana »"), é possível escolher um período qualquer preenchendo **De** / **Até** na barra de ferramentas e clicando em **"Aplicar intervalo"**. O botão **"Voltar à semana"** aparece para desfazer e retornar à navegação normal.
- **"🖨️ Imprimir período (PDF)"** abre a caixa de impressão do navegador (Ctrl+P) já formatada em A4 paisagem com a lista de entradas/saídas do período exibido — escolha "Salvar como PDF" no destino da impressão para gerar o arquivo.
- **"🍽️ Cardápio"** imprime a lista de produtos do frigobar com preços, em A4 retrato — útil para deixar impresso nas cabanas/containers.
- Dentro de **"Ver detalhes de uma reserva"**, o botão **"🖨️ Imprimir fatura"** (ao lado de "Consumo de frigobar") gera a fatura de fechamento daquela reserva: itens consumidos, saldo da reserva e total a pagar — para entregar ao hóspede na saída.
- Em todos os casos o conteúdo impresso é gerado dinamicamente e enviado direto para o diálogo de impressão do navegador; não é necessária nenhuma biblioteca externa de PDF.

## Filtro de acomodações exibidas

- O botão **"🏠 Acomodações"** abre uma lista com as 5 unidades (Cabana Verde, Cabana Rosa, Cabana Azul, Container A, Container B), todas marcadas por padrão. Desmarque as que não quiser ver — por exemplo, deixe marcado só "Container A" para analisar apenas aquele container.
- Os botões **"Marcar todos"** / **"Desmarcar todos"** agilizam quando você quer olhar só uma ou duas unidades.
- O filtro afeta o calendário e também o **"🖨️ Imprimir período (PDF)"**, então o relatório impresso mostra só as acomodações selecionadas.

## Navegação por módulos (barra lateral)

O painel é organizado em três módulos, acessíveis pela barra lateral esquerda:

- **📋 Reservas** — o calendário semanal, sempre visível para qualquer pessoa.
- **🧹 Faxinas** — o calendário de faxinas (veja seção abaixo). Visível para administrador, faxineira e colaboradores autorizados.
- **🔧 Manutenção** — ordens de serviço e pedidos de material, em abas dentro do módulo. Visível só para administrador e colaboradores autorizados.

Cada módulo só aparece na barra lateral para quem tem permissão de vê-lo; quem não tem acesso a nenhum módulo além de Reservas simplesmente não vê os outros botões.

## Papéis de acesso

- **Sem login**: qualquer pessoa que abrir o link vê o calendário completo (módulo Reservas), navega entre semanas e pode **escrever observações** em qualquer reserva (toalhas, arrumação, pedidos especiais) — sincronizadas entre todos os dispositivos quando a API estiver configurada (veja abaixo). Também vê a barra de estoque de frigobar (se a sincronização estiver configurada).
- **Administrador**: clicando em "🔒 Entrar como administrador" e digitando o código, libera acesso a todos os módulos e:
  - Importar/colar CSV manualmente dentro do próprio painel (além do fluxo normal via GitHub).
  - Lançar e remover itens de consumo de frigobar por reserva.
  - Registrar reabastecimento de estoque (botão "📦 Estoque de frigobar", só aparece com a sincronização configurada).
  - Cadastrar, editar e remover produtos do catálogo de frigobar (botão "🧾 Produtos do frigobar").
  - Ver e controlar o pagamento das faxinas, e resolver ordens de serviço/pedidos de material.
  - Configurar o acesso do colaborador (botão "⚙️ Configurar colaborador" — veja abaixo).
- **Faxineira**: clicando em "🧹 Entrar como faxineira" e digitando o código próprio, libera os módulos Reservas e Faxinas sem nenhum dado financeiro (sem saldo da reserva, sem "a cobrar"), mas com:
  - Ver todas as entradas e saídas normalmente.
  - Lançar consumo de frigobar por reserva e gerar a fatura de fechamento (mostra só o total do frigobar a cobrar, sem o saldo da reserva).
  - Marcar a faxina de uma reserva como executada (dentro de "Ver detalhes da reserva").
- **Colaborador**: clicando em "🧑‍💼 Entrar como colaborador" e digitando o código próprio, libera **exatamente o que o administrador configurou** para esse código — nem mais, nem menos.

### Configurar o colaborador

O administrador usa o botão **"⚙️ Configurar colaborador"** para escolher:

- **Quais módulos** ficam liberados (Reservas / Faxinas / Manutenção), com caixas de seleção independentes.
- O **nível de acesso**: "Completo" (vê valores financeiros normalmente) ou "Limitado" (mesmo comportamento da faxineira — sem saldo, sem "a cobrar").

Essa configuração é única (um só código de colaborador) e vale para qualquer pessoa que entrar com esse código — para dar acessos diferentes a pessoas diferentes, é preciso trocar a configuração antes de repassar o código a cada uma, ou combinar com elas horários diferentes de uso. A configuração fica salva na planilha (aba Config, chave `colaboradorPermissoes`) quando a sincronização estiver ativa, então vale para todos os dispositivos.

## Controle de faxinas

- Toda reserva com data de check-out aparece com o badge **"🧹 Faxina pendente"** até alguém marcar como executada. Dentro de "Ver detalhes de uma reserva", o botão **"Marcar faxina como executada"** (visível para administrador, faxineira e colaboradores autorizados) registra a data e, opcionalmente, quem executou.
- O módulo **"🧹 Faxinas"** na barra lateral abre um **calendário em colunas por dia** — igual ao quadro de reservas — mostrando as cabanas/containers que precisam de faxina em cada dia de check-out. Clique em qualquer card para abrir os detalhes daquela faxina. Use "« Semana anterior" / "Próxima semana »" para navegar. Quem tem acesso financeiro completo vê também valor e se já foi paga; quem está no nível limitado não vê esses dados.
- Dentro da seção "🧹 Faxina" dos detalhes de uma reserva, além de marcar como executada, é possível:
  - Escrever **observações de manutenção** (ex.: "torneira pingando"), sincronizadas junto com a faxina.
  - **"🔧 Solicitar manutenção"** — registra um pedido de manutenção para aquela cabana (visível na aba "Ordens de Serviço" do módulo "🔧 Manutenção").
  - **"📦 Solicitar material"** — registra um pedido de material/reposição (ex.: prato quebrado), visível na aba "Materiais" do módulo "🔧 Manutenção".
- O administrador marca cada solicitação de manutenção ou material como concluída na respectiva aba.
- No topo do módulo Faxinas (para quem tem acesso financeiro completo), mostra o **saldo total a pagar** (soma das faxinas concluídas e ainda não pagas) e permite marcar cada uma como paga (registra a data do pagamento). O valor padrão por faxina também é configurável ali.

### ⚠️ Importante sobre o código de administrador

O código fica definido na constante `ADMIN_PIN` dentro do `<script>` de `index.html` (procure por `const ADMIN_PIN = ...`). O código da faxineira fica na constante `FAXINEIRA_PIN` e o do colaborador na constante `COLABORADOR_PIN`, logo abaixo. **Troque os três valores antes de publicar.**

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

O script cria oito abas sozinho na primeira vez que for usado:

- **Estoque**: uma linha por cabana/container + item (Água, Cerveja, etc.) com a quantidade atual e o mínimo antes de disparar o aviso "⚠️ repor". Você pode editar essas colunas diretamente na planilha a qualquer momento (ex.: corrigir uma contagem, ou mudar o mínimo de um item).
- **Movimentos**: histórico de tudo — cada consumo lançado numa reserva (saída de estoque) e cada reabastecimento registrado pelo administrador (entrada de estoque), com data/hora.
- **Observacoes**: uma linha por reserva com a observação atual e quando foi atualizada pela última vez.
- **Produtos**: uma linha por produto do catálogo de frigobar (nome e preço), editável pelo administrador direto no painel (botão "🧾 Produtos do frigobar") ou diretamente na planilha.
- **Faxinas**: uma linha por reserva com faxina marcada como executada (cabana, data de execução, quem executou, valor, se já foi paga, data do pagamento e observações de manutenção).
- **Config**: pares chave/valor genéricos; hoje guarda só `valorFaxina` (valor padrão pago por faxina), editável no painel "🧹 Faxinas".
- **OrdensServico**: cada solicitação de manutenção feita pela faxineira ou administrador (cabana, descrição, data, status aberta/concluída), visível no painel "🔧 Manutenção".
- **PedidosMaterial**: cada solicitação de material/reposição (cabana, descrição, data, status aberto/concluído), visível no painel "📦 Materiais".

### Sobre o código-fonte da API (`apps-script/Code.gs`)

Esse arquivo fica neste repositório só como referência/backup do que foi colado no editor do Apps Script — ele **não roda a partir daqui**, precisa estar colado dentro do projeto Apps Script vinculado à planilha (passo 3 acima). Se você editar a lógica no editor do Apps Script, lembre de copiar as mudanças de volta pra cá também, e de criar uma **nova implantação** (ou "Gerenciar implantações → editar → nova versão") depois de qualquer alteração — o Apps Script não atualiza a URL publicada sozinho.

## Publicar no GitHub Pages

1. Neste repositório: **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Branch: `main`, pasta: `/ (root)`.
4. Salve e aguarde — a URL pública aparece no formato `https://SEU-USUARIO.github.io/painel-reservas-encantos/`.
5. Não é necessário nenhum GitHub Actions/workflow adicional — o Pages republica sozinho a cada commit na branch configurada.
