import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        // 1. Extract access_token from URL hash (e.g., #access_token=xxx)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        let accessToken = params.get('access_token');

        if (!accessToken) {
          // Fallback: try session (if Supabase already processed it)
          const { data: { session } } = await import('../../supabaseClient').then(mod => mod.supabase.auth.getSession());
          accessToken = session?.access_token;
        }

        if (!accessToken) {
          throw new Error('No access token found in callback URL');
        }

        // 2. Send token to backend
        const response = await fetch('http://localhost:5000/api/auth/google/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Backend authentication failed');
        }

        // 3. Log the user in (stores token & user data)
        login(result.user, result.session.access_token, result.permissions || []);

        // 4. Redirect based on role
        const userRole = (result.user.role || '').toUpperCase();
        if (userRole === 'ADMIN' || userRole === 'STAFF') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          // Customer goes to the main customer home page (same as "/")
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        setTimeout(() => navigate('/login?error=oauth_failed'), 2000);
      }
    };

    if (isMounted) handleCallback();
    return () => { isMounted = false; };
  }, [navigate, login]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
        <p className="text-red-600">Authentication failed: {error}</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-slate-600 font-medium text-sm">Completing Google Sign‑In...</p>
    </div>
  );
}