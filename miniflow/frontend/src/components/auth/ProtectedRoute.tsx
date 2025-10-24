import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth, useAuthActions } from '../../store/userStore';
import type { ProtectedRouteProps } from '../../types/user';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const { refreshProfile } = useAuthActions();
  const location = useLocation();

  // Auto refresh profile if token exists but no user data
  useEffect(() => {
    if (token && !user && !isLoading) {
      refreshProfile();
    }
  }, [token, user, isLoading, refreshProfile]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="auth-loading">
        <Spin size="large" tip="正在验证身份..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !token) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based access if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ error: 'insufficient_permissions' }} 
        replace 
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
