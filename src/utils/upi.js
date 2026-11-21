/** Build UPI deep link. omitAmount=true opens UPI with no amount (user types it). */
export function buildUpiLink({ upiId, name, amount, note, invoiceNumber, omitAmount = false }) {
  if (!upiId) return '';
  const params = new URLSearchParams();
  params.set('pa', upiId);
  params.set('pn', name || 'Payee');
  params.set('cu', 'INR');
  if (!omitAmount && amount != null && Number(amount) > 0) {
    params.set('am', Number(amount).toFixed(2));
  }
  params.set('tn', note || `Invoice ${invoiceNumber || ''}`.trim());
  if (invoiceNumber) params.set('tr', String(invoiceNumber));
  return `upi://pay?${params.toString()}`;
}
