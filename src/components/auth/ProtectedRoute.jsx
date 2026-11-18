import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Componente de Rota Protegida por Autenticação e Role ('gestor' | 'bartender')
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!user || user.status !== 'ativo') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redireciona cada perfil para sua respectiva View padrão
    const redirectPath = user.role === 'gestor' ? '/gestao' : '/balcao';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

