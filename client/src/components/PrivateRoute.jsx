import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute Component
 * Protects routes by checking for the existence of a token in localStorage.
 */
export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // Redirect to home (or login if we had one) if not authenticated
    return <Navigate to="/" replace />;
  }

  return children;
}
