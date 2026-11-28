import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from './DataStates.jsx';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';

/**
 * Route guard enforcing authentication and role authorization.
 * - Unauthenticated requests redirect to /login, preserving the destination in state.from.
 * - Transient/500 verification failures show in-place Retry instead of wiping the session.
 * - Authenticated users lacking a permitted role see ForbiddenPage.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitializing, sessionError, retrySession, user } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="page-main">
        <LoadingState label="Đang xác thực phiên đăng nhập..." />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="page-main">
        <ErrorState
          title="Không thể xác thực phiên đăng nhập"
          message={sessionError}
          onRetry={retrySession}
        />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage requiredRoles={allowedRoles} />;
  }

  return children;
}
