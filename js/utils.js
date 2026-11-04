export function gerarLinkWhatsApp(telefone, mensagem = '') {
  if (!telefone) return null;
  let num = String(telefone).replace(/\D/g, '');
  if (!num) return null;
  if (num.length === 10 || num.length === 11) num = '55' + num;
  const texto = encodeURIComponent(mensagem);
  return `https://wa.me/${num}${mensagem ? `?text=${texto}` : ''}`;
}