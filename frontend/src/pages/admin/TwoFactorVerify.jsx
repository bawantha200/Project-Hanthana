// src/pages/TwoFactorVerify.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

export default function TwoFactorVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // LoginPage එකෙන් navigate කරනකොට state එකෙන් tempToken එක එනවා
  const tempToken = location.state?.tempToken;

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  // tempToken එකක් නැතුව මේ page එකට direct access කරොත් login එකට ආපහු යවනවා
  if (!tempToken) {
    navigate('/login');
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch('http://localhost:5000/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: code }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid or expired code. Please try again.');
        return;
      }

      login(data.user, data.session.access_token, data.permissions || []);

      const targetRole = data.user.role?.toUpperCase();
      if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Two-Factor Verification</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-2.5 text-lg text-center tracking-[0.5em] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}