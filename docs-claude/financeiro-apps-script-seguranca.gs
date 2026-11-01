/* =====================================================================
   SEGURANÇA DO FINANCEIRO — cole este arquivo no Apps Script da planilha do Financeiro
   (o mesmo projeto do endereço .../AKfycbytcNWXox.../exec).
   Revisão de segurança de 01/11/2026.

   O que faz: a página financeiro.html deixou de mandar a senha fixa ("secret") e passou a mandar o
   token do login do Firebase (o mesmo login da Gestão). Este código confere o token com o Google e
   só deixa passar se o e-mail for um dos autorizados. Sem token válido = "acesso_negado".

   COMO USAR (2 passos):
   1) No Apps Script: + (Arquivo) > Script, nome "seguranca", cole TUDO isto e salve.
   2) No arquivo principal, no COMEÇO de doGet(e) e de doPost(e), coloque a linha:
        var bloqueio = exigirLoginFinanceiro_(e); if (bloqueio) return bloqueio;
      e apague a conferência antiga do "secret" (ex.: if (e.parameter.secret !== 'rastreandogps2025') ...).
   3) Implantar > Gerenciar implantações > lápis > Versão: "Nova versão" > Implantar.
      (O endereço /exec continua o mesmo; não precisa mexer na página.)
   ===================================================================== */

var FIN_EMAILS_AUTORIZADOS = ['rastreandogps@gmail.com', 'rastreandogpsbr@rastreandogps.com'];
var FIN_PROJETO_FIREBASE = 'rastreando-assinaturas';
/* ações do Financeiro (as únicas que a página usa). Qualquer uma delas exige login. */
var FIN_ACOES = ['dashboard', 'despesas', 'inadimplentesClasse', 'projecao', 'statusClientes', 'salvarDespesa', 'deletarDespesa', 'atualizarStatusDespesa'];

/* Devolve null se pode continuar; devolve a resposta de erro se tiver que barrar. */
function exigirLoginFinanceiro_(e) {
  var params = (e && e.parameter) || {};
  var corpo = {};
  try { if (e && e.postData && e.postData.contents) corpo = JSON.parse(e.postData.contents) || {}; } catch (x) { corpo = {}; }
  var acao = String(params.action || corpo.action || '');
  if (FIN_ACOES.indexOf(acao) < 0) return null; // não é do Financeiro: segue o fluxo normal do script

  var token = String(params.token || corpo.token || '');
  var quem = emailDoToken_(token);
  if (!quem) return negar_();
  return null; // ok
}

/* Confere o token do Firebase com o Google e devolve o e-mail (ou '' se inválido). Guarda 5 min em cache para não bater no Google a cada clique. */
function emailDoToken_(token) {
  if (!token || token.length < 100 || token.length > 4000) return '';
  var cache = CacheService.getScriptCache();
  var chave = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  var guardado = cache.get(chave);
  if (guardado) return guardado;
  try {
    var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return '';
    var j = JSON.parse(r.getContentText() || '{}');
    var email = String(j.email || '').toLowerCase();
    var agora = Math.floor(Date.now() / 1000);
    if (j.aud !== FIN_PROJETO_FIREBASE) return '';                       // token de outro projeto
    if (!(Number(j.exp) > agora)) return '';                              // vencido
    if (String(j.email_verified) !== 'true' && j.email_verified !== true) { /* o login por senha do Firebase pode não marcar; não barra por isso */ }
    if (FIN_EMAILS_AUTORIZADOS.indexOf(email) < 0) return '';            // e-mail não autorizado
    cache.put(chave, email, 300);
    return email;
  } catch (x) { return ''; }
}

function negar_() {
  return ContentService.createTextOutput(JSON.stringify({ erro: 'acesso_negado' })).setMimeType(ContentService.MimeType.JSON);
}
