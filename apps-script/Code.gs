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
var DEFAULT_MINIMO = 2;

function getSheet_(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    if(name === SHEET_ESTOQUE) sh.appendRow(['Cabana','Item','Estoque','Minimo']);
    if(name === SHEET_MOVIMENTOS) sh.appendRow(['ID','Timestamp','Tipo','Cabana','Item','Qtd','ValorUnit','ReservaChave','ReservaLabel']);
    if(name === SHEET_OBSERVACOES) sh.appendRow(['ReservaChave','ReservaLabel','Observacao','AtualizadoEm']);
    if(name === SHEET_PRODUTOS) sh.appendRow(['Nome','Preco']);
    if(name === SHEET_FAXINAS) sh.appendRow(['ReservaChave','ReservaLabel','Cabana','DataExecucao','ExecutadoPor','Valor','Pago','DataPagamento','ObsManutencao']);
    if(name === SHEET_CONFIG) sh.appendRow(['Chave','Valor']);
    if(name === SHEET_ORDENS_SERVICO) sh.appendRow(['ID','Timestamp','Cabana','ReservaChave','ReservaLabel','Descricao','Status','Tipo','DataAgendada']);
    if(name === SHEET_PEDIDOS_MATERIAL) sh.appendRow(['ID','Timestamp','Cabana','ReservaChave','ReservaLabel','Descricao','Status']);
  }
  return sh;
}

function jsonOutput_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
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
  } else {
    result = {error:'ação inválida'};
  }
  return jsonOutput_(result);
}

function doPost(e){
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
      dataPagamento: data[i][7], obsManutencao: data[i][8]||''
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
  var linha = [body.reservaChave, body.reservaLabel||'', body.cabana||'', body.dataExecucao||'', body.executadoPor||'', Number(body.valor)||0, !!body.pago, body.dataPagamento||'', body.obsManutencao||''];
  if(row === -1){
    sh.appendRow(linha);
  } else {
    sh.getRange(row,1,1,linha.length).setValues([linha]);
  }
  return {ok:true};
}

function getConfig_(){
  var sh = getSheet_(SHEET_CONFIG);
  var data = sh.getDataRange().getValues();
  var out = {};
  for(var i=1;i<data.length;i++){
    if(data[i][0]) out[data[i][0]] = data[i][1];
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
