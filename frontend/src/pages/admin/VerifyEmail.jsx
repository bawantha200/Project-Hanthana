// src/pages/VerifyEmail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  AlertCircle, 
  ArrowLeft, 
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  // First, verify the token is valid
  useEffect(() => {
    const verifyToken = async () => {
      try {
        console.log('🔍 Verifying token:', token);
        
        if (!token) {
          setStatus('error');
          setMessage('No verification token provided.');
          return;
        }

        // ✅ Decode token to check if it's valid
        const response = await fetch(`http://localhost:5000/api/auth/decode-token/${token}`);
        const data = await response.json();
        
        console.log('📦 Token decode response:', data);
        
        if (data.success) {
          setTokenData(data.decoded);
          setStatus('password_required');
          setMessage('Please enter your password to confirm the email change.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Invalid or expired verification link.');
          setErrorDetails(data);
        }
      } catch (error) {
        console.error('❌ Token verification error:', error);
        setStatus('error');
        setMessage('Network error. Please check your connection.');
        setErrorDetails({ error: error.message });
      }
    };

    verifyToken();
  }, [token]);

  // Handle password submission
  const handleVerifyWithPassword = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setPasswordError('Password is required.');
      return;
    }
    
    setLoading(true);
    setPasswordError('');
    
    try {
      console.log('🔐 Sending verification request with password...');
      
      const response = await fetch(`http://localhost:5000/api/auth/verify-email/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      console.log('📦 Verification response:', data);
      console.log('📦 Response status:', response.status);
      
      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email changed successfully! Please login with your new email.' } 
          });
        }, 5000);
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          setPasswordError('Incorrect password. Please try again.');
        } else if (data.message && data.message.includes('expired')) {
          setStatus('error');
          setMessage(data.message);
        } else {
          setPasswordError(data.message || 'Verification failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setPasswordError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // If token is being verified
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold mt-4 text-slate-800">Verifying Link...</h2>
            <p className="text-slate-500 mt-2">Please wait while we validate your verification link.</p>
          </div>
        </div>
      </div>
    );
  }

  // If password is required
  if (status === 'password_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full flex items-center justify-center bg-blue-50">
                <Shield className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">Confirm Email Change</h2>
            <p className="text-slate-500 mt-2">{message}</p>
            
            {tokenData && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">New Email:</span> {tokenData.newEmail}
                </p>
                {tokenData.oldEmail && (
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">Current Email:</span> {tokenData.oldEmail}
                  </p>
                )}
              </div>
            )}
            
            <form onSubmit={handleVerifyWithPassword} className="mt-6 space-y-4">
              <div className="text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-12 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                      passwordError ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                Confirm Email Change
              </button>
            </form>
            
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => navigate('/app/settings')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Go back to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mt-4 text-green-600">Email Verified!</h2>
            <p className="text-slate-600 mt-2">{message}</p>
            
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Your email has been successfully changed
              </p>
            </div>
            
            <p className="text-sm text-slate-400 mt-4">Redirecting to login...</p>
            
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mt-4 text-red-600">Verification Failed</h2>
          <p className="text-slate-600 mt-2">{message}</p>
          
          {errorDetails && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left">
              <p className="text-xs text-slate-500 font-mono break-all">
                Debug: {JSON.stringify(errorDetails, null, 2)}
              </p>
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/app/settings')}
              className="w-full px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to Settings
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}