# Painel Semanal de Reservas — Encantos de Altitude

Painel estático (HTML puro, sem servidor) para consulta semanal de reservas: check-ins, check-outs, cabana, hóspedes, plataforma (Booking/Airbnb/Próprio), saldo a cobrar, observações e consumo de frigobar. Também permite escolher um intervalo de datas personalizado, imprimir o período em PDF A4, gerar a fatura de fechamento do frigobar por reserva, imprimir o cardápio de produtos e (para administradores) cadastrar/editar/remover produtos do frigobar.

## Como funciona

- `index.html` é a página inteira (HTML + CSS + JS). As únicas dependências externas são as fontes do Google Fonts e um gerador de QR Code (CDN), usado só para o QR do PIX na fatura.
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
- Dentro de **"Ver detalhes de uma reserva"**, o botão **"🖨️ Imprimir fatura"** (ao lado de "Consumo de frigobar") gera a fatura de fechamento daquela reserva: itens consumidos, saldo da reserva e total a pagar — para entregar ao hóspede na saída. Se a **chave PIX** estiver configurada (veja abaixo), a fatura já sai com um **QR Code PIX** (com o valor a pagar) e o "PIX copia e cola".
- Em todos os casos o conteúdo impresso é gerado dinamicamente e enviado direto para o diálogo de impressão do navegador (a única biblioteca externa é o gerador de QR Code, carregado via CDN; sem internet, a fatura ainda mostra a chave PIX em texto).

## Cobrança por PIX (QR Code na fatura)

- O administrador clica em **"💳 Dados PIX (cobrança)"** e informa a **chave PIX**, o **nome do beneficiário** (como no banco) e a **cidade**. Fica salvo na planilha (aba Config) e sincroniza entre dispositivos.
- A partir daí, toda **fatura de fechamento do frigobar** ("🖨️ Imprimir fatura") sai com o **QR Code PIX** já no valor a cobrar, além da chave e do "PIX copia e cola" — o hóspede aponta a câmera e paga.
- O QR Code é gerado no próprio navegador (padrão PIX/EMV do Banco Central), sem enviar seus dados para lugar nenhum.

## Filtro de acomodações exibidas

- O botão **"🏠 Acomodações"** abre uma lista com as 5 unidades (Cabana Verde, Cabana Rosa, Cabana Azul, Container A, Container B), todas marcadas por padrão. Desmarque as que não quiser ver — por exemplo, deixe marcado só "Container A" para analisar apenas aquele container.
- Os botões **"Marcar todos"** / **"Desmarcar todos"** agilizam quando você quer olhar só uma ou duas unidades.
- O filtro afeta o calendário e também o **"🖨️ Imprimir período (PDF)"**, então o relatório impresso mostra só as acomodações selecionadas.

## Navegação por módulos (barra lateral)

O painel é organizado em três módulos, acessíveis pela barra lateral esquerda:

- **📋 Reservas** — o calendário semanal, sempre visível para qualquer pessoa (exceto o colaborador de manutenção, que não vê reservas).
- **🧹 Faxinas** — o calendário de faxinas (veja seção abaixo). Visível para administrador e colaborador da limpeza.
- **🔧 Manutenção** — ordens de serviço, materiais e programação semanal, em abas dentro do módulo. Visível para administrador e colaborador de manutenção.

Cada módulo só aparece na barra lateral para quem tem permissão de vê-lo.

## Papéis de acesso

- **Sem login**: qualquer pessoa que abrir o link vê o calendário completo (módulo Reservas), navega entre semanas e pode **escrever observações** em qualquer reserva (toalhas, arrumação, pedidos especiais) — sincronizadas entre todos os dispositivos quando a API estiver configurada (veja abaixo). Também vê a barra de estoque de frigobar (se a sincronização estiver configurada).
- **Administrador** ("🔒 Entrar como administrador"): acesso a todos os módulos e:
  - Importar/colar CSV manualmente dentro do próprio painel (além do fluxo normal via GitHub).
  - Lançar e remover itens de consumo de frigobar por reserva.
  - Registrar reabastecimento de estoque (botão "📦 Estoque de frigobar", só aparece com a sincronização configurada).
  - Cadastrar, editar e remover produtos do catálogo de frigobar (botão "🧾 Produtos do frigobar").
  - Ver e controlar o pagamento das faxinas; definir os valores de faxina; criar/agendar/concluir ordens de serviço e concluir pedidos de material.
- **Colaborador da limpeza** ("🧹 Entrar como colaborador da limpeza"): libera os módulos Reservas e Faxinas. **Não vê os dados financeiros das reservas** (saldo, "a cobrar"), mas **vê o valor das faxinas** (para saber quanto vai receber). Pode:
  - Ver todas as entradas e saídas.
  - Lançar consumo de frigobar por reserva e gerar a fatura de fechamento (só o total do frigobar, sem o saldo da reserva).
  - Marcar a faxina de uma reserva como executada; escrever observações de manutenção; solicitar manutenção e material.
  - Ver o valor de cada faxina e o saldo a receber (mas não pode alterar os valores — só o administrador define).
- **Colaborador de manutenção** ("🔧 Entrar como colaborador de manutenção"): libera **apenas o módulo Manutenção**, sem nenhum dado financeiro em lugar nenhum (não vê reservas, frigobar nem valores de faxina). Recebe as demandas geradas pela limpeza e pelo administrador, e marca cada uma como concluída.

## Valores de faxina por tipo de unidade

No topo do módulo Faxinas, o administrador define dois valores: um para **cabanas** e outro para **containers/studios**. Quando uma faxina é marcada como executada, o sistema escolhe automaticamente o valor certo pelo tipo da unidade (qualquer unidade cujo nome começa com "CONTAINER" usa o valor de container; as demais usam o valor de cabana). O colaborador da limpeza vê esses valores, mas só o administrador pode alterá-los.

## Controle de faxinas

- Toda reserva com data de check-out aparece com o badge **"🧹 Faxina pendente"** até alguém marcar como executada. Dentro de "Ver detalhes de uma reserva", o botão **"Marcar faxina como executada"** (administrador e colaborador da limpeza) registra a data e, opcionalmente, quem executou.
- O módulo **"🧹 Faxinas"** na barra lateral abre um **calendário em colunas por dia** — igual ao quadro de reservas — mostrando as cabanas/containers que precisam de faxina em cada dia de check-out. Clique em qualquer card para abrir os detalhes daquela faxina.
- Dentro da seção "🧹 Faxina" dos detalhes de uma reserva, além de marcar como executada, é possível:
  - Escrever **observações de manutenção** (ex.: "torneira pingando"), sincronizadas junto com a faxina.
  - **"🔧 Solicitar manutenção"** — registra uma ordem de serviço para aquela cabana (visível na aba "Ordens de Serviço" do módulo "🔧 Manutenção"). Solicitações vindas da limpeza entram como **emergência**.
  - **"📦 Solicitar material"** — registra um pedido de material/reposição (ex.: prato quebrado), visível na aba "Materiais" do módulo "🔧 Manutenção".
- **Confirmação da faxina (execução):** tanto o **colaborador da limpeza** quanto o **administrador** podem marcar uma faxina como executada.
- **Valor da faxina:** o colaborador da limpeza **vê** o valor de cada faxina (para saber quanto vai receber), mas **não vê nem registra pagamento** (nem status, nem forma, nem data, nem saldo) — isso fica **só com o administrador**, para evitar risco de fraude na cobrança.
- **Registro de pagamento (só administrador):** ao clicar em **"💳 Registrar pagamento"** (nos detalhes da reserva) ou **"Marcar pago"** (no calendário de faxinas), o administrador informa a **forma de pagamento** (ex.: Dinheiro, PIX, Transferência) e a **data**. Fica registrado, por exemplo: *"pago em 19/07/2026 via PIX"*.
- O **saldo total a pagar** (soma das faxinas concluídas e ainda não pagas) aparece no topo do módulo Faxinas **somente para o administrador**.

### Tabela "Faxinas registradas — controle de pagamento" (só administrador)

Abaixo do calendário de faxinas há uma tabela com **todas as faxinas já confirmadas**, mostrando cabana, reserva, data de execução, quem executou, valor, se está paga, forma e data do pagamento. Nela o administrador pode:

- **"✏️ Valor"** — lançar/corrigir o valor daquela faxina específica (o padrão vem da configuração por tipo, mas aqui dá para ajustar caso a caso).
- **"💳 Pagar"** — registrar o pagamento informando **valor**, **forma de pagamento** e **data**.
- **"↩️ Desfazer"** — desfazer um pagamento lançado por engano.

> ⚠️ **Por que essa tabela existe:** o `data/reservas.csv` é substituído a cada atualização, e o FazReservas deixa de exportar reservas antigas. O calendário mostra faxinas só das reservas que ainda estão no CSV — então, quando uma reserva sai do arquivo, a faxina dela sumiria da tela. Esta tabela lê direto da planilha, então **nenhuma faxina (e nenhum valor a pagar) se perde** quando o CSV é atualizado.

> 📅 **Sobre as datas:** o Google Sheets converte automaticamente textos como "19/07/2026" em data real, e devolve num formato técnico. O painel normaliza tudo para DD/MM/AAAA na exibição.

## Módulo de Manutenção

- **Resumo** no topo: quantas ordens estão abertas, quantas são emergência, quantas programadas e quantas já foram concluídas.
- Aba **"🔧 Ordens de Serviço"**: lista todas as ordens (com tipo emergência/programada, data agendada e status). O administrador pode criar uma ordem direto ("+ Nova Ordem de Serviço") escolhendo cabana, descrição, tipo (emergência ou programada) e data agendada; e também agendar/concluir ordens existentes. O colaborador de manutenção vê e conclui as ordens.
- Aba **"📦 Materiais"**: lista os pedidos de material/reposição, com botão para marcar como concluído.
- Aba **"📅 Programação Semanal"**: um quadro dia a dia (como o de reservas) mostrando as ordens **agendadas** de cada dia da semana — a "agenda" das tarefas de manutenção pendentes. Navega por semana.

## Módulo Financeiro — Conciliação bancária (Sicredi)

Só o **administrador** vê este módulo (💰 Financeiro na barra lateral). Ele confere se os pagamentos que o FazReservas registra como recebidos **realmente caíram na conta Sicredi** — feito para pegar o caso de hóspede de reserva direta que vai embora sem pagar.

**Como usar (funciona no celular e no PC):**
1. No app/internet banking do Sicredi, baixe o **extrato em PDF** do período.
2. No módulo Financeiro, toque em **"📄 Carregar extrato (PDF)"** e escolha o arquivo. O sistema lê o PDF direto no navegador (não precisa renomear nada) e extrai só os **recebimentos** (linhas `RECEBIMENTO PIX` e `TED`), com **pagador, valor e data**.
3. Para atualizar, é só carregar um PDF novo por cima. O extrato lido fica salvo na planilha (Config), então **sincroniza entre celular e PC**.
4. Plano B: se algum PDF vier em formato diferente, use **"Colar texto (plano B)"** e cole o texto do extrato.

**Como concilia:** para cada reserva própria (não Booking/Airbnb), compara o quanto o FazReservas diz que **já entrou** (`valor − saldo`) com os recebimentos do extrato, casando por **nome do pagador** e **valor**. Os status:

| Status | Significado |
|---|---|
| ✅ **Conciliado** | O valor que os livros dizem ter recebido bateu no extrato, com o nome do hóspede. |
| 👥 **Valor bate, pagador difere** | O valor entrou, mas quem pagou tem outro nome (possível pagamento de terceiro). |
| ⚠️ **Valor difere** | Recebimento do hóspede encontrado, mas em valor diferente do registrado. |
| ⛔ **Consta pago, não achei no extrato** | O FazReservas diz que recebeu, mas **não há esse crédito na conta** — alerta de possível calote. |
| 💡 **Recebido no banco, não lançado** | Entrou dinheiro do hóspede no Sicredi, mas o FazReservas ainda mostra saldo em aberto (falta lançar). |
| ⏳ **A receber** | Ainda não há recebimento registrado — normal para check-out futuro. |

**Ajustes do administrador** (por reserva): **✅ OK** (confirma manualmente), **👥 Terceiro** (informa o nome de quem pagou) e **💵 Dinheiro** (recebido em espécie, fora da conta). Cada ajuste fica salvo e sincronizado; **↩️ Limpar ajuste** volta ao automático. Há ainda a lista **"recebimentos no extrato sem reserva correspondente"**, útil para achar dinheiro que entrou sem reserva ligada.

Os cartões no topo resumem: **⛔ consta pago sem extrato**, **⚠️ a revisar**, **⏳ a receber** e **✅ conciliados**.

### ⚠️ Importante sobre o código de administrador

Os códigos ficam definidos no `<script>` de `index.html`: `ADMIN_PIN` (administrador), `FAXINEIRA_PIN` (colaborador da limpeza) e `MANUTENCAO_PIN` (colaborador de manutenção). **Troque os três valores antes de publicar.**

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
- **Config**: pares chave/valor genéricos; hoje guarda `valorFaxinaCabana` e `valorFaxinaContainer` (valores pagos por faxina, por tipo de unidade), editáveis no módulo "🧹 Faxinas".
- **OrdensServico**: cada ordem de serviço de manutenção (cabana, descrição, tipo emergência/programada, data agendada, data de criação, status aberta/concluída), criada pela limpeza ou pelo administrador, visível no módulo "🔧 Manutenção".
- **PedidosMaterial**: cada solicitação de material/reposição (cabana, descrição, data, status aberto/concluído), visível na aba "📦 Materiais".

### Sobre o código-fonte da API (`apps-script/Code.gs`)

Esse arquivo fica neste repositório só como referência/backup do que foi colado no editor do Apps Script — ele **não roda a partir daqui**, precisa estar colado dentro do projeto Apps Script vinculado à planilha (passo 3 acima). Se você editar a lógica no editor do Apps Script, lembre de copiar as mudanças de volta pra cá também, e de criar uma **nova implantação** (ou "Gerenciar implantações → editar → nova versão") depois de qualquer alteração — o Apps Script não atualiza a URL publicada sozinho.

## Publicar no GitHub Pages

1. Neste repositório: **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Branch: `main`, pasta: `/ (root)`.
4. Salve e aguarde — a URL pública aparece no formato `https://SEU-USUARIO.github.io/painel-reservas-encantos/`.
5. Não é necessário nenhum GitHub Actions/workflow adicional — o Pages republica sozinho a cada commit na branch configurada.
