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
        // 1. Extract access_token from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        let accessToken = params.get('access_token');

        if (!accessToken) {
          // Fallback: try session from Supabase
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token;
        }

        if (!accessToken) {
          throw new Error('No access token found in callback URL');
        }

        // Store token in localStorage
        localStorage.setItem('token', accessToken);

        // 2. Send token to backend
        const response = await fetch('http://localhost:5000/api/auth/google/callback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ accessToken }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Backend authentication failed');
        }

        console.log('Google callback result:', result);
        console.log('needsProfileCompletion:', result.needsProfileCompletion);
        console.log('isNewUser:', result.isNewUser);
        console.log('User data:', result.user);
        console.log('User address:', result.user?.address);
        console.log('User phone:', result.user?.phone);

        // 3. Log the user in
        login(result.user, accessToken, result.permissions || []);

        // 4. Check if this was a Google sign-in
        const isGoogleSignIn = localStorage.getItem('googleSignInPending') === 'true';
        
        // 5. Determine if profile needs completion
        // Check if user has address and phone
        const hasAddress = result.user?.address && result.user.address.trim().length > 0;
        const hasPhone = result.user?.phone && result.user.phone.trim().length > 0;
        const needsProfileCompletion = !hasAddress || !hasPhone;
        
        console.log('Profile check:', { 
          hasAddress, 
          hasPhone, 
          needsProfileCompletion,
          address: result.user?.address,
          phone: result.user?.phone
        });

        // Get user role
        const userRole = (result.user?.role || '').toUpperCase();

        // ✅ If Google sign-in and needs profile completion, go to complete-profile
        if (isGoogleSignIn && needsProfileCompletion) {
          console.log('Redirecting to /complete-profile');
          // Keep googleSignInPending flag for CompleteProfile
          localStorage.setItem('isNewGoogleUser', 'true');
          navigate('/complete-profile', { replace: true });
        } else {
          // Remove pending flags
          localStorage.removeItem('googleSignInPending');
          localStorage.removeItem('isNewGoogleUser');
          
          if (userRole === 'ADMIN' || userRole === 'STAFF') {
            navigate('/app/dashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);

        localStorage.removeItem('token');
        localStorage.removeItem('googleSignInPending');
        localStorage.removeItem('isNewGoogleUser');
        
        await supabase.auth.signOut();

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