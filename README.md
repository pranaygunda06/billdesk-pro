# BillDesk Pro

Admin-only billing (Swart-style Firebase). Cloud data. Clean public invoice links.

## Features
- Register / login as admin
- Products (barcode scan) & customers
- Billing with custom lines + barcode; custom products auto-saved to Products
- Invoice share link: `/i/INVOICE_NUMBER` (customer sees bill + UPI only)
- PDF download with QR code

## Setup
1. Create Firebase project → Auth email/password → Firestore
2. Copy `.env.example` → `.env` and fill config
3. Deploy rules: `firebase deploy --only firestore:rules`
4. `npm i && npm run dev`
5. Open app → **Register Admin**

## Deploy
Push to GitHub → Vercel → add `VITE_FIREBASE_*` env vars.
