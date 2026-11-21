import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Billing from './pages/Billing.jsx';
import Invoices from './pages/Invoices.jsx';
import Settings from './pages/Settings.jsx';
import PublicInvoice from './pages/PublicInvoice.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Secure opaque token — not invoice number */}
      <Route path="/p/:token" element={<PublicInvoice />} />
      {/* Legacy number links still work if needed but discouraged */}
      <Route path="/i/:invoiceNumber" element={<PublicInvoice />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
