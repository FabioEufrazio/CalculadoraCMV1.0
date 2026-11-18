import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ViewGestaoLayout from './components/layout/ViewGestaoLayout';
import ViewBalcaoLayout from './components/layout/ViewBalcaoLayout';
import DashboardGestao from './pages/gestao/DashboardGestao';
import FornecedoresPage from './pages/gestao/FornecedoresPage';
import InsumosPage from './pages/gestao/InsumosPage';
import ReceitasPage from './pages/gestao/ReceitasPage';
import BalcaoHome from './pages/balcao/BalcaoHome';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'gestor' ? '/gestao' : '/balcao'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas do Gestor (<ViewGestao>) */}
          <Route
            path="/gestao"
            element={
              <ProtectedRoute allowedRoles={['gestor']}>
                <ViewGestaoLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardGestao />} />
            <Route path="fornecedores" element={<FornecedoresPage />} />
            <Route path="insumos" element={<InsumosPage />} />
            <Route path="receitas" element={<ReceitasPage />} />
          </Route>

          {/* Rotas Protegidas de Operação / Bartender (<ViewBalcao> - Service Mode) */}
          <Route
            path="/balcao"
            element={
              <ProtectedRoute allowedRoles={['bartender', 'gestor']}>
                <ViewBalcaoLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BalcaoHome />} />
          </Route>

          {/* Redirecionamento padrão */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
