import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

export default function BarcodeScanner({ open, onClose, onScan, title = 'Scan barcode' }) {
  const started = useRef(false)
  const scannerRef = useRef(null)
  const regionId = 'bd-barcode-region'

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(regionId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded) => {
            if (cancelled) return
            onScan(decoded)
            stop()
            onClose()
          },
          () => {},
        )
        started.current = true
      } catch (e) {
        console.error(e)
        alert('Camera not available. Type the barcode manually.')
        onClose()
      }
    }
    start()
    return () => {
      cancelled = true
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function stop() {
    try {
      if (scannerRef.current && started.current) {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      }
    } catch { /* ignore */ }
    started.current = false
    scannerRef.current = null
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-bold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={async () => {
              await stop()
              onClose()
            }}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <div id={regionId} className="rounded-xl overflow-hidden" />
          <p className="text-xs text-slate-500 mt-3 text-center">Point camera at barcode</p>
        </div>
      </div>
    </div>
  )
}
