// src/pages/TwoFactorSetup.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const tempToken = location.state?.tempToken;

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tempToken) {
      navigate('/login');
      return;
    }

    const generateQr = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/2fa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tempToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || 'Failed to generate QR code.');
          return;
        }

        setQrCode(data.qrCodeUrl);
        setSecret(data.secret);
      } catch (err) {
        setError('Failed to generate QR code. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    generateQr();
  }, [tempToken, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch('http://localhost:5000/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ token: code }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid code. Please check your authenticator app and try again.');
        return;
      }

      // Backend එකෙන් session + user දෙකම return කරනවා - password ආපහු type කරන්න ඕන නෑ
      login(data.user, data.session.access_token, data.permissions || []);

      const targetRole = data.user.role?.toUpperCase();
      if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
        navigate('/app/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      setError('Invalid code. Please check your authenticator app and try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Set Up Two-Factor Authentication</h1>
        <p className="text-sm text-gray-500 mb-6">
          Scan this QR code with Google Authenticator, Authy, or any TOTP app.
        </p>

        {qrCode && (
          <div className="flex justify-center mb-4">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-gray-100 rounded-lg" />
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mb-6">
          Can't scan? Enter this key manually: <br />
          <span className="font-mono text-gray-600 break-all">{secret}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-2.5 text-sm text-center tracking-widest border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify & Enable'}
          </button>
        </form>
      </div>
    </div>
  );
}