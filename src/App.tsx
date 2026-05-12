/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/AuthRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import AdminDashboard from './pages/AdminDashboard';
import AdminManagement from './pages/AdminManagement';

export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'glass-card text-white border-neutral-800',
          style: {
            background: '#171717',
            color: '#fff',
            border: '1px solid #262626'
          },
        }}
      />
      <Router>
        <div className="min-h-screen font-sans selection:bg-red-500/30">
          <Navbar />
          <main className="container mx-auto">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/history" element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                </ProtectedRoute>
              } />

              <Route path="/admin/management" element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminManagement />
                  </AdminRoute>
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="py-8 text-center text-neutral-600 text-xs mt-auto">
            <p>© 2026 by VAKIM (studio DTDS). ALL Rights Reserved.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

