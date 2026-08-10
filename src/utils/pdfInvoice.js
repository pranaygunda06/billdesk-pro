import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { formatCurrency, formatDate } from './format'
import { buildUpiLink } from './upi'

export async function downloadInvoicePdf({ invoice, business, publicUrl }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 40

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text((business.name || 'Business').toUpperCase(), 40, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  y += 16
  if (business.address) {
    const lines = doc.splitTextToSize(business.address, 280)
    doc.text(lines, 40, y)
    y += lines.length * 12
  }
  if (business.phone) {
    doc.text(`Ph: ${business.phone}`, 40, y)
    y += 12
  }
  if (business.gstNumber) {
    doc.text(`GST: ${business.gstNumber}`, 40, y)
    y += 12
  }

  doc.setFont('helvetica', 'bold')
  doc.text('TAX INVOICE', pageW - 40, 40, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoiceNumber, pageW - 40, 56, { align: 'right' })
  doc.text(formatDate(invoice.invoiceDate), pageW - 40, 70, { align: 'right' })

  y = Math.max(y, 90) + 10
  doc.setFillColor(238, 242, 255)
  doc.roundedRect(40, y, pageW - 80, 50, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To', 50, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.customerName || '—', 50, y + 32)
  if (invoice.customerPhone) doc.text(invoice.customerPhone, 50, y + 44)

  y += 70
  doc.setFillColor(30, 27, 75)
  doc.rect(40, y, pageW - 80, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ITEM', 50, y + 14)
  doc.text('QTY', 320, y + 14)
  doc.text('PRICE', 380, y + 14)
  doc.text('TOTAL', pageW - 50, y + 14, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  y += 28

  for (const it of invoice.items || []) {
    if (y > 700) {
      doc.addPage()
      y = 40
    }
    doc.setFontSize(10)
    doc.text(String(it.name || '').slice(0, 40), 50, y)
    doc.text(String(it.qty), 320, y)
    doc.text(formatCurrency(it.price), 380, y)
    doc.text(formatCurrency(it.lineTotal), pageW - 50, y, { align: 'right' })
    y += 16
  }

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total', 320, y)
  doc.text(formatCurrency(invoice.grandTotal), pageW - 50, y, { align: 'right' })
  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Status: ${invoice.paymentStatus || 'Pending'}`, 40, y)

  const upi = buildUpiLink({
    upiId: business.upiId,
    name: business.name,
    amount: invoice.grandTotal,
    note: `Invoice ${invoice.invoiceNumber}`,
    ref: invoice.invoiceNumber,
  })
  const qrPayload = publicUrl || upi
  try {
    const dataUrl = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 })
    doc.addImage(dataUrl, 'PNG', 40, y + 10, 90, 90)
    doc.setFontSize(8)
    doc.text('Scan to view & pay', 40, y + 110)
    if (publicUrl) {
      const short = publicUrl.replace(/^https?:\/\//, '')
      doc.text(short.slice(0, 50), 40, y + 122)
    }
  } catch (e) {
    console.warn('QR in PDF failed', e)
  }

  if (business.footer) {
    doc.setFontSize(9)
    doc.text(business.footer, pageW / 2, 800, { align: 'center' })
  }

  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
}
