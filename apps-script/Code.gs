/**
 * API de estoque e movimentos de frigobar para o Painel Semanal de Reservas
 * (Encantos de Altitude). Cole este código no Apps Script vinculado a uma
 * planilha Google (Extensões > Apps Script) e publique como Web App.
 * Veja o passo a passo completo no README.md do repositório.
 */

var SHEET_ESTOQUE = 'Estoque';
var SHEET_MOVIMENTOS = 'Movimentos';
var DEFAULT_MINIMO = 5;

function getSheet_(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    if(name === SHEET_ESTOQUE) sh.appendRow(['Item','Estoque','Minimo']);
    if(name === SHEET_MOVIMENTOS) sh.appendRow(['ID','Timestamp','Tipo','Item','Qtd','ValorUnit','ReservaChave','ReservaLabel']);
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
    if(!data[i][0]) continue;
    out.push({item:data[i][0], estoque:Number(data[i][1])||0, minimo:Number(data[i][2])||DEFAULT_MINIMO});
  }
  return out;
}

function findEstoqueRow_(sh, item){
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]).trim().toLowerCase() === String(item).trim().toLowerCase()) return i+1;
  }
  return -1;
}

function ajustarEstoque_(item, delta){
  var sh = getSheet_(SHEET_ESTOQUE);
  var row = findEstoqueRow_(sh, item);
  if(row === -1){
    sh.appendRow([item, delta, DEFAULT_MINIMO]);
  } else {
    var atual = Number(sh.getRange(row,2).getValue()) || 0;
    sh.getRange(row,2).setValue(atual + delta);
  }
}

function registrarConsumo_(body){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var id = Utilities.getUuid();
  sh.appendRow([id, new Date(), 'saida', body.item, Number(body.qtd)||1, Number(body.valorUnit)||0, body.reservaChave||'', body.reservaLabel||'']);
  ajustarEstoque_(body.item, -(Number(body.qtd)||1));
  return {ok:true, id:id};
}

function registrarRestock_(body){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var id = Utilities.getUuid();
  sh.appendRow([id, new Date(), 'entrada', body.item, Number(body.qtd)||1, 0, '', 'Reabastecimento']);
  ajustarEstoque_(body.item, Number(body.qtd)||1);
  return {ok:true, id:id};
}

function removerMovimento_(id){
  var sh = getSheet_(SHEET_MOVIMENTOS);
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0] === id){
      var tipo = data[i][2], item = data[i][3], qtd = Number(data[i][4])||0;
      sh.deleteRow(i+1);
      ajustarEstoque_(item, tipo === 'saida' ? qtd : -qtd);
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
    var tipo = data[i][2], qtd = Number(data[i][4])||0, valorUnit = Number(data[i][5])||0, chave = data[i][6];
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
    if(data[i][2]==='saida' && String(data[i][6])===String(chave)){
      out.push({id:data[i][0], desc:data[i][3], qtd:Number(data[i][4])||0, valor:Number(data[i][5])||0});
    }
  }
  return out;
}
