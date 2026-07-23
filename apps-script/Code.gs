/**
 * API de estoque, movimentos de frigobar e observações para o Painel Semanal
 * de Reservas (Encantos de Altitude). Cole este código no Apps Script
 * vinculado a uma planilha Google (Extensões > Apps Script) e publique como
 * Web App. Veja o passo a passo completo no README.md do repositório.
 *
 * O estoque é controlado POR CABANA/CONTAINER (cada unidade tem seu próprio
 * frigobar), não um estoque central único.
 */

var SHEET_ESTOQUE = 'Estoque';
var SHEET_MOVIMENTOS = 'Movimentos';
var SHEET_OBSERVACOES = 'Observacoes';
var SHEET_PRODUTOS = 'Produtos';
var SHEET_FAXINAS = 'Faxinas';
var SHEET_CONFIG = 'Config';
var SHEET_ORDENS_SERVICO = 'OrdensServico';
var SHEET_PEDIDOS_MATERIAL = 'PedidosMaterial';
var SHEET_RESERVAS_CSV = 'ReservasCSV';
var DEFAULT_MINIMO = 2;

// Busca usada no Gmail para achar o relatório de reservas do FazReservas.
// Pode ser ajustada sem mexer no código: crie a chave "buscaEmailReservas"
// na aba Config com o filtro desejado (sintaxe de busca do Gmail).
var BUSCA_EMAIL_PADRAO = 'has:attachment filename:csv newer_than:30d';

function getSheet_(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    if(name === SHEET_ESTOQUE) sh.appendRow(['Cabana','Item','Estoque','Minimo']);
    if(name === SHEET_MOVIMENTOS) sh.appendRow(['ID','Timestamp','Tipo','Cabana','Item','Qtd','ValorUnit','ReservaChave','ReservaLabel']);
    if(name === SHEET_OBSERVACOES) sh.appendRow(['ReservaChave','ReservaLabel','Observacao','AtualizadoEm']);
    if(name === SHEET_PRODUTOS) sh.appendRow(['Nome','Preco']);
    if(name === SHEET_FAXINAS) sh.appendRow(['ReservaChave','ReservaLabel','Cabana','DataExecucao','ExecutadoPor','Valor','Pago','DataPagamento','ObsManutencao','FormaPagamento']);
    if(name === SHEET_CONFIG) sh.appendRow(['Chave','Valor']);
    if(name === SHEET_ORDENS_SERVICO) sh.appendRow(['ID','Timestamp','Cabana','ReservaChave','ReservaLabel','Descricao','Status','Tipo','DataAgendada']);
    if(name === SHEET_PEDIDOS_MATERIAL) sh.appendRow(['ID','Timestamp','Cabana','ReservaChave','ReservaLabel','Descricao','Status']);
    if(name === SHEET_RESERVAS_CSV) sh.appendRow(['LinhaCSV']);
  }
  return sh;
}

function jsonOutput_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Proteção de acesso (segredo compartilhado) ----------
// O painel é uma página pública, então não há login de verdade. Este segredo
// serve para BARRAR o acesso ANÔNIMO direto à URL /exec (scrapers, quem só
// descobriu o endereço do robô). Ele fica guardado na aba Config (chave
// "apiSecret") e o painel envia o mesmo valor no parâmetro "k" de toda chamada.
//
// Migração sem quebrar nada: enquanto a chave "apiSecret" NÃO existir/estiver
// vazia na Config, tudo é liberado. A proteção só passa a valer quando você
// preenche esse valor (pelo botão "Proteção do backend" no painel). Para
// desligar, basta esvaziar a chave.
function apiSecretConfigurado_(){
  var sh = getSheet_(SHEET_CONFIG);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]) === 'apiSecret') return String(data[i][1] || '');
  }
  return '';
}
function autorizado_(e){
  var segredo = apiSecretConfigurado_();
  if(!segredo) return true;                       // sem segredo definido => libera (migração)
  var recebido = '';
  if(e && e.parameter && e.parameter.k){
    recebido = String(e.parameter.k);
  } else if(e && e.postData && e.postData.contents){
    try { recebido = String((JSON.parse(e.postData.contents) || {}).k || ''); } catch(_e){}
  }
  return recebido === segredo;
}

function doGet(e){
  if(!autorizado_(e)) return jsonOutput_({error:'não autorizado'});
  var action = e.parameter.action;
  var result;
  if(action === 'estoque'){
    result = getEstoque_();
  } else if(action === 'totais'){
    result = getTotaisPorReserva_();
  } else if(action === 'movimentos'){
    result = getMovimentosPorReserva_(e.parameter.reserva || '');
  } else if(action === 'observacoes'){
    result = getObservacoes_();
  } else if(action === 'produtos'){
    result = getProdutos_();
  } else if(action === 'faxinas'){
    result = getFaxinas_();
  } else if(action === 'config'){
    result = getConfig_();
  } else if(action === 'ordensServico'){
    result = getOrdensServico_();
  } else if(action === 'pedidosMaterial'){
    result = getPedidosMaterial_();
  } else if(action === 'reservasCsv'){
    result = getReservasCsv_();
  } else if(action === 'reservasPdf'){
    result = getReservasPdf_();
  } else if(action === 'telegramChats'){
    result = getTelegramChats_();
  } else if(action === 'movimentosTodos'){
    result = getMovimentosTodos_();
  } else {
    result = {error:'ação inválida'};
  }
  return jsonOutput_(result);
}

function doPost(e){
  if(!autorizado_(e)) return jsonOutput_({ok:false, error:'não autorizado'});
  var body = JSON.parse(e.postData.contents);
  var result;
  if(body.action === 'consumo'){
    result = registrarConsumo_(body);
  } else if(body.action === 'restock'){
    result = registrarRestock_(body);
  } else if(body.action === 'remover'){
    result = removerMovimento_(body.id);
  } else if(body.action === 'salvarObs'){
    result = salvarObs_(body);
  } else if(body.action === 'salvarProduto'){
    result = salvarProduto_(body);
  } else if(body.action === 'removerProduto'){
    result = removerProduto_(body.nome);
  } else if(body.action === 'salvarFaxina'){
    result = salvarFaxina_(body);
  } else if(body.action === 'salvarConfig'){
    result = salvarConfig_(body);
  } else if(body.action === 'criarOrdemServico'){
    result = criarOrdemServico_(body);
  } else if(body.action === 'concluirOrdemServico'){
    result = concluirOrdemServico_(body.id);
  } else if(body.action === 'agendarOrdemServico'){
    result = agendarOrdemServico_(body.id, body.dataAgendada);
  } else if(body.action === 'criarPedidoMaterial'){
    result = criarPedidoMaterial_(body);
  } else if(body.action === 'concluirPedidoMaterial'){
    result = concluirPedidoMaterial_(body.id);
  } else if(body.action === 'atualizarReservasEmail'){
    result = atualizarReservasDoEmail();
  } else if(body.action === 'alertaTelegram'){
    result = alertaTelegram_(body);
  } else {
    result = {ok:false, error:'ação inválida'};
  }
  return jsonOutput_(result);
}

function getEstoque_(){
  var sh = getSheet_(SHEET_ESTOQUE);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(!data[i][0] || !data[i][1]) continue;
    out.push({cabana:data[i][0], item:data[i][1], estoque:Number(data[i][2])||0, minimo:Number(data[i][3])||DEFAULT_MINIMO});
  }
  return out;
}

function findEstoqueRow_(sh, cabana, item){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]).trim().toLowerCase() === String(cabana).trim().toLowerCase() &&
       String(data[i][1]).trim().toLowerCase() === String(item).trim().toLowerCase()) return i+1;
  }
  return -1;
}

function ajustarEstoque_(cabana, item, delta){
  var sh = getSheet_(SHEET_ESTOQUE);
  var row = findEstoqueRow_(sh, cabana, item);
  if(row === -1){
    sh.appendRow([cabana, item, delta, DEFAULT_MINIMO]);
  } else {
    var atual = Number(sh.getRange(row,3).getValue()) || 0;
    sh.getRange(row,3).setValue(atual + delta);
  }
}

function registrarConsumo_(body){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var id = Utilities.getUuid();
  sh.appendRow([id, new Date(), 'saida', body.cabana||'', body.item, Number(body.qtd)||1, Number(body.valorUnit)||0, body.reservaChave||'', body.reservaLabel||'']);
  ajustarEstoque_(body.cabana||'', body.item, -(Number(body.qtd)||1));
  return {ok:true, id:id};
}

function registrarRestock_(body){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var id = Utilities.getUuid();
  sh.appendRow([id, new Date(), 'entrada', body.cabana||'', body.item, Number(body.qtd)||1, 0, '', 'Reabastecimento']);
  ajustarEstoque_(body.cabana||'', body.item, Number(body.qtd)||1);
  return {ok:true, id:id};
}

function removerMovimento_(id){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === id){
      var tipo = data[i][2], cabana = data[i][3], item = data[i][4], qtd = Number(data[i][5])||0;
      sh.deleteRow(i+1);
      ajustarEstoque_(cabana, item, tipo === 'saida' ? qtd : -qtd);
      return {ok:true};
    }
  }
  return {ok:false, error:'movimento não encontrado'};
}

function getTotaisPorReserva_(){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var data = sh.getDataRange().getValues();
  var totals = {};
  for(var i=1;i<data.length;i++){
    var tipo = data[i][2], qtd = Number(data[i][5])||0, valorUnit = Number(data[i][6])||0, chave = data[i][7];
    if(tipo === 'saida' && chave){
      totals[chave] = (totals[chave]||0) + qtd*valorUnit;
    }
  }
  return totals;
}

// Todos os movimentos de saída do frigobar (para o relatório de vendas por
// produto). O custo/margem é calculado no painel, pois o custo mora na Config.
function getMovimentosTodos_(){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var data = sh.getDataRange().getValues();
  var tz = Session.getScriptTimeZone();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(data[i][2] !== 'saida') continue;   // só saídas (consumo, cortesia, perda, quebra)
    var d = data[i][1];
    out.push({
      data: (d instanceof Date) ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d),
      cabana: data[i][3] || '',
      item: data[i][4] || '',
      qtd: Number(data[i][5]) || 0,
      valor: Number(data[i][6]) || 0,        // valor unitário cobrado (0 = não cobrado)
      chave: data[i][7] || '',               // vazio = cortesia/perda/quebra
      label: data[i][8] || ''                // guarda o motivo quando não cobrado
    });
  }
  return out;
}

function getMovimentosPorReserva_(chave){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(data[i][2]==='saida' && String(data[i][7])===String(chave)){
      out.push({id:data[i][0], desc:data[i][4], qtd:Number(data[i][5])||0, valor:Number(data[i][6])||0});
    }
  }
  return out;
}

function getObservacoes_(){
  var sh = getSheet_(SHEET_OBSERVACOES);
  var data = sh.getDataRange().getValues();
  var out = {};
  for(var i=1;i<data.length;i++){
    if(data[i][0] && data[i][2]) out[data[i][0]] = data[i][2];
  }
  return out;
}

function findObsRow_(sh, chave){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]) === String(chave)) return i+1;
  }
  return -1;
}

function salvarObs_(body){
  var sh = getSheet_(SHEET_OBSERVACOES);
  var row = findObsRow_(sh, body.reservaChave);
  if(row === -1){
    sh.appendRow([body.reservaChave, body.reservaLabel||'', body.obs||'', new Date()]);
  } else {
    sh.getRange(row,2).setValue(body.reservaLabel||'');
    sh.getRange(row,3).setValue(body.obs||'');
    sh.getRange(row,4).setValue(new Date());
  }
  return {ok:true};
}

function getProdutos_(){
  var sh = getSheet_(SHEET_PRODUTOS);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    out.push({nome:data[i][0], preco:Number(data[i][1])||0});
  }
  return out;
}

function findProdutoRow_(sh, nome){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]).trim().toLowerCase() === String(nome).trim().toLowerCase()) return i+1;
  }
  return -1;
}

function salvarProduto_(body){
  var sh = getSheet_(SHEET_PRODUTOS);
  var nomeOriginal = body.nomeOriginal || body.nome;
  var row = findProdutoRow_(sh, nomeOriginal);
  if(row === -1){
    sh.appendRow([body.nome, Number(body.preco)||0]);
  } else {
    sh.getRange(row,1).setValue(body.nome);
    sh.getRange(row,2).setValue(Number(body.preco)||0);
  }
  return {ok:true};
}

function removerProduto_(nome){
  var sh = getSheet_(SHEET_PRODUTOS);
  var row = findProdutoRow_(sh, nome);
  if(row === -1) return {ok:false, error:'produto não encontrado'};
  sh.deleteRow(row);
  return {ok:true};
}

function getFaxinas_(){
  var sh = getSheet_(SHEET_FAXINAS);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    out.push({
      reservaChave: data[i][0], reservaLabel: data[i][1], cabana: data[i][2],
      dataExecucao: data[i][3], executadoPor: data[i][4],
      valor: Number(data[i][5])||0, pago: data[i][6] === true || data[i][6] === 'TRUE' || data[i][6] === 'true',
      dataPagamento: data[i][7], obsManutencao: data[i][8]||'', formaPagamento: data[i][9]||''
    });
  }
  return out;
}

function findFaxinaRow_(sh, chave){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]) === String(chave)) return i+1;
  }
  return -1;
}

function salvarFaxina_(body){
  var sh = getSheet_(SHEET_FAXINAS);
  var row = findFaxinaRow_(sh, body.reservaChave);
  var linha = [body.reservaChave, body.reservaLabel||'', body.cabana||'', body.dataExecucao||'', body.executadoPor||'', Number(body.valor)||0, !!body.pago, body.dataPagamento||'', body.obsManutencao||'', body.formaPagamento||''];
  if(row === -1){
    sh.appendRow(linha);
  } else {
    sh.getRange(row,1,1,linha.length).setValues([linha]);
  }
  return {ok:true};
}

// Chaves que são credenciais puramente de servidor: o ENVIO (Telegram/WhatsApp)
// acontece aqui no robô, então o navegador nunca precisa do valor. Não devolvemos
// esses valores no GET; só sinalizamos "<chave>Set:true" para o painel saber que
// já está configurada. O apiSecret também nunca sai daqui.
var CONFIG_SECRETA = ['telegramToken', 'apiSecret'];
function getConfig_(){
  var sh = getSheet_(SHEET_CONFIG);
  var data = sh.getDataRange().getValues();
  var out = {};
  for(var i=1;i<data.length;i++){
    var chave = data[i][0];
    if(!chave) continue;
    if(CONFIG_SECRETA.indexOf(String(chave)) !== -1){
      if(String(data[i][1] || '') !== '') out[chave + 'Set'] = true;   // não devolve o valor
    } else {
      out[chave] = data[i][1];
    }
  }
  return out;
}

function findConfigRow_(sh, chave){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]) === String(chave)) return i+1;
  }
  return -1;
}

function salvarConfig_(body){
  var sh = getSheet_(SHEET_CONFIG);
  var row = findConfigRow_(sh, body.chave);
  if(row === -1){
    sh.appendRow([body.chave, body.valor]);
  } else {
    sh.getRange(row,2).setValue(body.valor);
  }
  return {ok:true};
}

function getOrdensServico_(){
  var sh = getSheet_(SHEET_ORDENS_SERVICO);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    out.push({id:data[i][0], data:data[i][1], cabana:data[i][2], reservaChave:data[i][3], reservaLabel:data[i][4], descricao:data[i][5], status:data[i][6], tipo:data[i][7]||'emergencia', dataAgendada:data[i][8]||''});
  }
  return out;
}

function criarOrdemServico_(body){
  var sh = getSheet_(SHEET_ORDENS_SERVICO);
  var id = Utilities.getUuid();
  sh.appendRow([id, body.data || new Date().toLocaleString('pt-BR'), body.cabana||'', body.reservaChave||'', body.reservaLabel||'', body.descricao||'', 'aberta', body.tipo||'emergencia', body.dataAgendada||'']);
  return {ok:true, id:id};
}

function concluirOrdemServico_(id){
  var sh = getSheet_(SHEET_ORDENS_SERVICO);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === id){
      sh.getRange(i+1,7).setValue('concluida');
      return {ok:true};
    }
  }
  return {ok:false, error:'ordem de serviço não encontrada'};
}

function agendarOrdemServico_(id, dataAgendada){
  var sh = getSheet_(SHEET_ORDENS_SERVICO);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === id){
      sh.getRange(i+1,9).setValue(dataAgendada||'');
      return {ok:true};
    }
  }
  return {ok:false, error:'ordem de serviço não encontrada'};
}

function getPedidosMaterial_(){
  var sh = getSheet_(SHEET_PEDIDOS_MATERIAL);
  var data = sh.getDataRange().getValues();
  var out = [];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    out.push({id:data[i][0], data:data[i][1], cabana:data[i][2], reservaChave:data[i][3], reservaLabel:data[i][4], descricao:data[i][5], status:data[i][6]});
  }
  return out;
}

function criarPedidoMaterial_(body){
  var sh = getSheet_(SHEET_PEDIDOS_MATERIAL);
  var id = Utilities.getUuid();
  sh.appendRow([id, body.data || new Date().toLocaleString('pt-BR'), body.cabana||'', body.reservaChave||'', body.reservaLabel||'', body.descricao||'', 'aberto']);
  return {ok:true, id:id};
}

function concluirPedidoMaterial_(id){
  var sh = getSheet_(SHEET_PEDIDOS_MATERIAL);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === id){
      sh.getRange(i+1,7).setValue('concluido');
      return {ok:true};
    }
  }
  return {ok:false, error:'pedido de material não encontrado'};
}

/* ═══════════════════════════════════════════════════════════════
   ATUALIZAÇÃO AUTOMÁTICA DAS RESERVAS A PARTIR DO E-MAIL
   O FazReservas envia o relatório de reservas (CSV) por e-mail.
   Esta parte lê o e-mail mais recente com anexo CSV e guarda o
   conteúdo na aba ReservasCSV, que o painel consome.
   Rode "atualizarReservasDoEmail" num acionador por tempo.
   ═══════════════════════════════════════════════════════════════ */

function getReservasCsv_(){
  var sh = getSheet_(SHEET_RESERVAS_CSV);
  var data = sh.getDataRange().getValues();
  var linhas = [];
  for(var i=1;i<data.length;i++){
    if(data[i][0] !== '' && data[i][0] !== null && data[i][0] !== undefined) linhas.push(String(data[i][0]));
  }
  var cfg = getConfig_();
  return {csv: linhas.join('\n'), atualizadoEm: cfg.reservasAtualizadoEm || '', origem: cfg.reservasOrigem || ''};
}

// Localiza no Gmail o PDF mais recente do relatório de reservas enviado pelo
// FazReservas (rotina) e devolve o arquivo em base64. A LEITURA do PDF é feita
// no painel (pdf.js) — aqui o robô só encontra e entrega o arquivo, o que é
// simples e confiável (Apps Script não lê PDF de tabela com qualidade).
function getReservasPdf_(){
  var cfg = getConfig_();
  var busca = cfg.buscaEmailReservasPdf || 'from:reservas@fazreserva.com.br has:attachment filename:pdf newer_than:10d';
  var threads = GmailApp.search(busca, 0, 25);
  var candidatos = [];
  for(var i=0;i<threads.length;i++){
    var msgs = threads[i].getMessages();
    for(var j=0;j<msgs.length;j++){
      var m = msgs[j];
      var anexos = m.getAttachments();
      for(var k=0;k<anexos.length;k++){
        var nome = String(anexos[k].getName()).toLowerCase();
        if(nome.indexOf('.pdf') === -1) continue;
        // aceita relatórios do FazReservas (custom1.../arrivals.../propid...)
        if(nome.indexOf('custom') === -1 && nome.indexOf('propid') === -1 && nome.indexOf('arrivals') === -1) continue;
        candidatos.push({quando: m.getDate(), anexo: anexos[k], arquivo: anexos[k].getName(), de: m.getFrom()});
      }
    }
  }
  if(!candidatos.length){
    return {b64:'', arquivo:'', atualizadoEm:'', erro:'Nenhum PDF de reservas encontrado. Busca: ' + busca};
  }
  // mais recente primeiro; prefere o relatório do painel (custom1)
  candidatos.sort(function(a,b){ return b.quando.getTime() - a.quando.getTime(); });
  var escolhido = null;
  for(var c=0;c<candidatos.length;c++){
    if(String(candidatos[c].arquivo).toLowerCase().indexOf('custom1') > -1){ escolhido = candidatos[c]; break; }
  }
  if(!escolhido) escolhido = candidatos[0];
  return {
    b64: Utilities.base64Encode(escolhido.anexo.getBytes()),
    arquivo: escolhido.arquivo,
    de: escolhido.de,
    atualizadoEm: Utilities.formatDate(escolhido.quando, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
  };
}

/* ═══════════════════════════════════════════════════════════════
   ALERTAS NO CELULAR (Telegram)
   O admin cria um bot no @BotFather e guarda o token na aba Config
   (chave telegramToken). Cada responsável dá /start no bot; o chat_id
   dele é guardado em telegramChatManutencao / telegramChatFaxina /
   telegramChatAdmin. Ao abrir uma manutenção de emergência ou avisar
   a faxineira, o painel chama action=alertaTelegram e o robô envia a
   mensagem — que toca o alarme do Telegram no celular do responsável.
   ═══════════════════════════════════════════════════════════════ */
function enviarTelegram_(chatId, texto){
  var cfg = getConfig_();
  var token = cfg.telegramToken;
  if(!token) return {ok:false, error:'Bot do Telegram não configurado (falta telegramToken na Config).'};
  if(!chatId) return {ok:false, error:'Destinatário sem chat_id configurado.'};
  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  var resp = UrlFetchApp.fetch(url, {
    method:'post', muteHttpExceptions:true,
    payload:{chat_id:String(chatId), text:texto, parse_mode:'HTML', disable_web_page_preview:'true'}
  });
  var ok = resp.getResponseCode() === 200;
  return {ok:ok, code:resp.getResponseCode(), resposta: ok ? 'enviado' : resp.getContentText().slice(0,200)};
}
// WhatsApp pelo CallMeBot (grátis). Cada pessoa autoriza uma vez pelo próprio
// WhatsApp e recebe uma apikey; guardamos telefone + apikey de cada uma na Config.
// Observação: nem o CallMeBot nem a API oficial do WhatsApp enviam para GRUPOS —
// por isso cada responsável recebe a mensagem individualmente.
function enviarWhatsApp_(fone, apikey, texto){
  if(!fone || !apikey) return {ok:false, error:'WhatsApp sem número/chave configurados para este destinatário.'};
  var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(fone) +
            '&apikey=' + encodeURIComponent(apikey) +
            '&text=' + encodeURIComponent(texto);
  var resp = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
  var corpo = resp.getContentText() || '';
  var ok = resp.getResponseCode() === 200 && corpo.toLowerCase().indexOf('error') === -1;
  return {ok:ok, code:resp.getResponseCode(), resposta: corpo.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,200)};
}
// O painel continua chamando action=alertaTelegram; aqui decidimos o canal
// conforme a Config (alertaCanal: 'whatsapp' padrão, ou 'telegram').
function alertaTelegram_(body){ return enviarAlerta_(body); }
function enviarAlerta_(body){
  var cfg = getConfig_();
  var destino = body.destino || 'admin';
  var bruto = String(body.mensagem || '(sem mensagem)');
  var canal = String(cfg.alertaCanal || 'whatsapp').toLowerCase();
  var r;
  if(canal === 'telegram'){
    var chat = destino === 'manutencao' ? cfg.telegramChatManutencao
             : destino === 'faxina' ? cfg.telegramChatFaxina : cfg.telegramChatAdmin;
    r = enviarTelegram_(chat, bruto);
    if(cfg.telegramChatAdmin && cfg.telegramChatAdmin !== chat && destino !== 'admin' && body.copiaAdmin !== false){
      enviarTelegram_(cfg.telegramChatAdmin, bruto);
    }
    return r;
  }
  // WhatsApp: converte o negrito do HTML para o do WhatsApp e limpa o resto.
  var msg = bruto.replace(/<\/?b>/g, '*').replace(/<[^>]+>/g, '');
  var fone = destino === 'manutencao' ? cfg.waManutencaoFone
           : destino === 'faxina' ? cfg.waFaxinaFone : cfg.waAdminFone;
  var key  = destino === 'manutencao' ? cfg.waManutencaoKey
           : destino === 'faxina' ? cfg.waFaxinaKey  : cfg.waAdminKey;
  r = enviarWhatsApp_(fone, key, msg);
  // cópia para o administrador
  if(cfg.waAdminFone && cfg.waAdminKey && destino !== 'admin' && cfg.waAdminFone !== fone && body.copiaAdmin !== false){
    enviarWhatsApp_(cfg.waAdminFone, cfg.waAdminKey, msg);
  }
  return r;
}
// Helper de configuração: lê as últimas mensagens recebidas pelo bot e devolve
// os chat_id + nome de quem escreveu, para o admin descobrir o id de cada pessoa
// (cada responsável manda um "oi" para o bot e aparece aqui).
function getTelegramChats_(){
  var cfg = getConfig_();
  var token = cfg.telegramToken;
  if(!token) return {ok:false, error:'Falta o token do bot (telegramToken).', chats:[]};
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', {muteHttpExceptions:true});
  if(resp.getResponseCode() !== 200) return {ok:false, error:'Token inválido? code=' + resp.getResponseCode(), chats:[]};
  var data = JSON.parse(resp.getContentText());
  var vistos = {}, chats = [];
  (data.result || []).forEach(function(u){
    var m = u.message || u.edited_message || (u.my_chat_member ? u.my_chat_member : null);
    var c = m && m.chat ? m.chat : (m && m.from ? m.from : null);
    if(!c || !c.id || vistos[c.id]) return;
    vistos[c.id] = true;
    chats.push({chatId:String(c.id), nome:[c.first_name, c.last_name].filter(Boolean).join(' ') || c.title || c.username || '(sem nome)'});
  });
  return {ok:true, chats:chats, configurado:{manutencao:!!cfg.telegramChatManutencao, faxina:!!cfg.telegramChatFaxina, admin:!!cfg.telegramChatAdmin}};
}

function gravarReservasCsv_(texto){
  var sh = getSheet_(SHEET_RESERVAS_CSV);
  sh.clear();
  sh.appendRow(['LinhaCSV']);
  var linhas = String(texto).replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  var valores = [];
  for(var i=0;i<linhas.length;i++){
    if(linhas[i].trim() === '') continue;
    // Prefixo evita que o Sheets interprete a linha como fórmula/data.
    valores.push([linhas[i].charAt(0) === '=' ? "'" + linhas[i] : linhas[i]]);
  }
  if(valores.length){
    var rng = sh.getRange(2, 1, valores.length, 1);
    rng.setNumberFormat('@'); // texto puro: preserva datas e números do CSV
    rng.setValues(valores);
  }
  return valores.length;
}

// Lê o anexo tentando UTF-8 e caindo para latin1 se a acentuação vier quebrada.
function lerAnexoTexto_(anexo){
  var texto = anexo.getDataAsString('UTF-8');
  if(texto.indexOf('�') > -1){
    try { texto = anexo.getDataAsString('ISO-8859-1'); } catch(e){}
  }
  return texto;
}

// Identifica o relatório de reservas pelo CONTEÚDO (cabeçalho), não pelo nome
// do arquivo. Assim não importa o nome comprido que o FazReservas gera, e não
// há risco de pegar um CSV de outro assunto que esteja na caixa de entrada.
function csvPareceReservas_(texto){
  if(!texto) return false;
  var primeira = String(texto).replace(/\r\n/g,'\n').split('\n')[0] || '';
  var h = primeira.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  var pontos = 0;
  if(h.indexOf('check') > -1) pontos++;               // Check In / Check-in
  if(h.indexOf('acomoda') > -1 || h.indexOf('alojamento') > -1) pontos++;
  if(h.indexOf('nome') > -1) pontos++;                // Nome completo
  if(h.indexOf('status') > -1) pontos++;
  if(h.indexOf('noites') > -1) pontos++;
  return pontos >= 3;
}

function atualizarReservasDoEmail(){
  var cfg = getConfig_();
  var busca = cfg.buscaEmailReservas || BUSCA_EMAIL_PADRAO;
  var threads = GmailApp.search(busca, 0, 20);
  var candidatos = [];
  for(var i=0;i<threads.length;i++){
    var msgs = threads[i].getMessages();
    for(var j=0;j<msgs.length;j++){
      var m = msgs[j];
      var anexos = m.getAttachments();
      for(var k=0;k<anexos.length;k++){
        var nome = String(anexos[k].getName()).toLowerCase();
        // Aceita qualquer .csv — o nome do arquivo é irrelevante.
        if(nome.indexOf('.csv') === -1) continue;
        candidatos.push({quando: m.getDate(), anexo: anexos[k], assunto: m.getSubject(), de: m.getFrom(), arquivo: anexos[k].getName()});
      }
    }
  }
  if(!candidatos.length){
    return {ok:false, error:'Nenhum e-mail com anexo .csv encontrado. Busca usada: ' + busca};
  }
  // Do mais recente para o mais antigo, usa o primeiro que for mesmo de reservas.
  candidatos.sort(function(a,b){ return b.quando.getTime() - a.quando.getTime(); });
  var escolhido = null, texto = null, ignorados = [];
  for(var c=0;c<candidatos.length;c++){
    var t = lerAnexoTexto_(candidatos[c].anexo);
    if(csvPareceReservas_(t)){ escolhido = candidatos[c]; texto = t; break; }
    ignorados.push(candidatos[c].arquivo);
  }
  if(!escolhido){
    return {ok:false, error:'Encontrei ' + candidatos.length + ' anexo(s) .csv, mas nenhum tem cabeçalho de reservas. Ignorados: ' + ignorados.join(', ')};
  }
  var qtdLinhas = gravarReservasCsv_(texto);
  salvarConfig_({chave:'reservasAtualizadoEm', valor: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')});
  salvarConfig_({chave:'reservasOrigem', valor: escolhido.arquivo + ' — ' + escolhido.de});
  return {
    ok: true,
    de: escolhido.de,
    assunto: escolhido.assunto,
    arquivo: escolhido.arquivo,
    dataEmail: Utilities.formatDate(escolhido.quando, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    linhasGravadas: qtdLinhas,
    ignorados: ignorados
  };
}

// Utilitário: mostra os e-mails com CSV que a busca encontra, para conferir
// o filtro antes de ativar o acionador. Veja o resultado em "Registro de execução".
function diagnosticarEmailReservas(){
  var cfg = getConfig_();
  var busca = cfg.buscaEmailReservas || BUSCA_EMAIL_PADRAO;
  var threads = GmailApp.search(busca, 0, 20);
  var achados = [];
  for(var i=0;i<threads.length;i++){
    var msgs = threads[i].getMessages();
    for(var j=0;j<msgs.length;j++){
      var m = msgs[j];
      var anexos = m.getAttachments();
      for(var k=0;k<anexos.length;k++){
        if(String(anexos[k].getName()).toLowerCase().indexOf('.csv') === -1) continue;
        achados.push({
          de: m.getFrom(),
          assunto: m.getSubject(),
          arquivo: anexos[k].getName(),
          quando: Utilities.formatDate(m.getDate(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
          ehRelatorioDeReservas: csvPareceReservas_(lerAnexoTexto_(anexos[k]))
        });
      }
    }
  }
  Logger.log('Busca: ' + busca);
  Logger.log('E-mails com CSV encontrados: ' + achados.length);
  for(var a=0;a<achados.length;a++) Logger.log(JSON.stringify(achados[a]));
  return achados;
}

// Cria o acionador que atualiza as reservas a cada 2 horas.
// Se já houver um acionador antigo (ex.: de hora em hora), ele é removido antes.
function criarAcionadorReservas(){
  var gatilhos = ScriptApp.getProjectTriggers();
  var removidos = 0;
  for(var i=0;i<gatilhos.length;i++){
    if(gatilhos[i].getHandlerFunction() === 'atualizarReservasDoEmail'){
      ScriptApp.deleteTrigger(gatilhos[i]);
      removidos++;
    }
  }
  ScriptApp.newTrigger('atualizarReservasDoEmail').timeBased().everyHours(2).create();
  return {ok:true, info:'Acionador ativo: atualiza a cada 2 horas.' + (removidos ? ' (' + removidos + ' acionador(es) antigo(s) substituído(s))' : '')};
}
