# Plano: aposentar o parser de PDF usando a API do Beds24

**Objetivo:** parar de depender do relatório em PDF enviado por e-mail pelo FazReservas
(que o robô hoje serve e o painel raspa por coordenadas) e passar a buscar as reservas
direto pela **API do Beds24 v2**, em JSON estruturado.

O FazReservas é um *white-label* do Beds24, e a conta já tem a página de API/tokens
(encontrada, ainda vazia). Ou seja: a via existe; falta gerar o token e ligar o robô.

## Por que vale a pena
- **Fim da fragilidade:** o parser por coordenadas quebra em silêncio se o FazReservas
  mudar o layout do relatório (já aconteceu: relatório saiu em inglês → 0 reservas). A API
  devolve campos nomeados (arrival, departure, status, price, guestName, roomId…).
- **Dados mais ricos e exatos:** datas certas (sem o "última noite +1"), status, valor,
  contato do hóspede, acomodação — sem heurística.
- **Mais fresco:** dá para buscar sob demanda / a cada 2h, sem depender do e-mail chegar.
- **Painel mais simples:** o robô normaliza as reservas no servidor; o painel só consome
  (dá para aposentar `extrairItensPdf`/`parseReservasPdfItens` no futuro).

## O que é preciso (ordem)
1. **[VOCÊ] Gerar o token de API** na conta FazReservas/Beds24:
   - No Beds24 v2: Conta → *Settings → API → invite code*; gera-se um **invite code**,
     troca-se por um **refresh token** (longa duração) e, com ele, obtêm-se **access tokens**
     (~24h) via `GET /authentication/token` (refresh token no header).
   - Confirmar se o FazReservas expõe `https://api.beds24.com/v2` direto ou um endereço
     white-label próprio. **Eu não gero o token** (é credencial sua) — me passe o refresh
     token quando tiver, ou o cadastre você na Config (ver passo 3).
2. **[EU] Guardar o refresh token com segurança:** na aba Config, chave `beds24Token`,
   já coberta pela redação do `getConfig_` (nunca sai no GET) — mesma proteção do
   apiSecret/telegramToken. O robô lê server-side.
3. **[EU] Função no robô** `sincronizarReservasBeds24_()` (Apps Script, usa UrlFetchApp —
   escopo já autorizado):
   - troca refresh token → access token;
   - `GET /bookings` com janela (arrival de −30d a +180d, como o relatório hoje);
   - normaliza cada reserva para o formato que o painel já entende (nome, acomodação,
     unidade, check-in, check-out, status, valor, saldo, celular…);
   - grava na aba `ReservasCSV` (ou nova aba `Reservas`), substituindo o parser de PDF
     como fonte primária. Mantém o PDF como *fallback* por 1–2 semanas.
   - roda no acionador de 2h que já existe.
4. **[EU] Painel:** passar a priorizar essa fonte (ajuste no `initialLoad`, junto da
   lógica de prioridade CSV manual/PDF que já existe). Nenhuma mudança visual.
5. **[EU] Validar** lado a lado (API × PDF) por alguns dias antes de desligar o PDF.

## Riscos / cuidados
- **White-label:** o FazReservas pode restringir/renomear endpoints do Beds24. Passo 1
  confirma isso antes de codar.
- **Segurança do token:** fica só no servidor (Config, redigido). Nunca no painel público.
- **Limite de chamadas:** buscar a cada 2h e cachear na planilha (não a cada acesso do painel).
- **Escopo:** UrlFetchApp já está autorizado (usado no WhatsApp), então **não precisa de
  nova permissão** — diferente do backup.

## Esforço estimado
- Passo 1 (você): ~15 min na conta FazReservas/Beds24.
- Passos 2–5 (eu): ~meio dia de implementação + alguns dias de validação lado a lado.

## Status
Aguardando o passo 1 (token). Enquanto isso, a conciliação já foi consolidada no **OFX**
(fonte estruturada do banco), que é o análogo desta migração no lado financeiro.
