import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, CheckCircle, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user, login, refreshUser } = useAuth();
  
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ address: false, phone: false });
  const [registrationData, setRegistrationData] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isNewGoogleUser, setIsNewGoogleUser] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    const checkUserAndData = async () => {
      try {
        const storedData = localStorage.getItem('registrationData');
        const isGoogleSignIn = localStorage.getItem('googleSignInPending') === 'true';
        const isNewGoogle = localStorage.getItem('isNewGoogleUser') === 'true';
        const storedTempToken = localStorage.getItem('registrationTempToken');
        
        console.log('CompleteProfile check:', { 
          isGoogleSignIn, 
          isNewGoogle, 
          hasToken: !!storedTempToken,
          hasRegistrationData: !!storedData
        });
        
        setIsGoogleUser(isGoogleSignIn);
        setIsNewGoogleUser(isNewGoogle);
        
        if (storedData) {
          const data = JSON.parse(storedData);
          setRegistrationData(data);
        }
        
        if (storedTempToken) {
          setTempToken(storedTempToken);
        }

        // If Google user, check if they already have address/phone
        if (isGoogleSignIn) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const response = await fetch('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await response.json();
              
              console.log('Google user profile check:', data);
              
              if (data.success && data.user) {
                const hasAddress = data.user.address && data.user.address.trim().length > 0;
                const hasPhone = data.user.phone && data.user.phone.trim().length > 0;
                
                // If user already has address and phone, redirect to dashboard
                if (hasAddress && hasPhone) {
                  console.log('User already has profile, redirecting to dashboard');
                  localStorage.removeItem('googleSignInPending');
                  localStorage.removeItem('isNewGoogleUser');
                  navigate('/app/dashboard', { replace: true });
                  return;
                }
                
                // Pre-fill phone if available
                if (data.user.phone) {
                  setPhone(data.user.phone);
                }
                if (data.user.address) {
                  setAddress(data.user.address);
                }
              }
            } catch (fetchError) {
              console.error('Error fetching user profile:', fetchError);
            }
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };
    
    checkUserAndData();
  }, [navigate]);

  const validatePhone = (phone) => {
    if (!phone || phone.trim().length === 0) {
    return ''; // Phone is optional
  }
  
  const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;

  if (phone.trim().length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhone(value);
    // Mark as touched when user starts typing
    if (!touchedFields.phone) {
      setTouchedFields(prev => ({ ...prev, phone: true }));
    }
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    // Mark as touched when user starts typing
    if (!touchedFields.address) {
      setTouchedFields(prev => ({ ...prev, address: true }));
    }
  };

  const validateField = (field) => {
    if (field === 'address' && !address.trim()) {
      return 'Address is required';
    }
    if (field === 'phone' && !phone.trim()) {
      return 'Phone number is required';
    }
    if (field === 'phone' && phone.trim() && !validatePhone(phone)) {
      return 'Please enter a valid phone number (10 digits)';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('Submit clicked - isGoogleUser:', isGoogleUser);
    console.log('Address:', address);
    console.log('Phone:', phone);
    
    // Validate fields
    const addressError = validateField('address');
    const phoneError = validateField('phone');
    
    if (addressError || phoneError) {
      setError(addressError || phoneError || 'Please fill all required fields');
      setTouchedFields({ address: true, phone: true });
      return;
    }

    setLoading(true);

    try {
      const isGoogleSignIn = localStorage.getItem('googleSignInPending') === 'true';
      const isNewGoogle = localStorage.getItem('isNewGoogleUser') === 'true';
      const token = localStorage.getItem('token');

      console.log('Submitting with:', { isGoogleSignIn, isNewGoogle, token: !!token });

      if (isGoogleSignIn) {
        // GOOGLE USER FLOW
        if (!token) {
          throw new Error('No authentication token found. Please sign in again.');
        }
        
        let endpoint;
        let method;
        
        if (isNewGoogle) {
          // New Google user - create profile
          endpoint = 'http://localhost:5000/api/auth/google/create-profile';
          method = 'POST';
        } else {
          // Existing Google user - update profile
          endpoint = 'http://localhost:5000/api/auth/google/update-profile';
          method = 'PUT';
        }
        
        console.log(`Calling ${method} ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            address: address.trim(),
            phone: phone.trim(),
            fullName: user?.fullName || ''
          })
        });

        // Check if response is OK before parsing JSON
        if (!response.ok) {
          const text = await response.text();
          let errorMessage;
          try {
            const data = JSON.parse(text);
            errorMessage = data.message || `Server error: ${response.status}`;
          } catch {
            errorMessage = `Server error: ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to update profile');
        }

        setSuccess(true);
        localStorage.removeItem('googleSignInPending');
        localStorage.removeItem('isNewGoogleUser');
        
        await refreshUser();
        
        setTimeout(() => {
          navigate('/app/dashboard', { replace: true });
        }, 1500);
        
      } else {
        // REGULAR USER FLOW - Phase 2 completion
        const storedData = localStorage.getItem('registrationData');
        if (!storedData) {
          throw new Error('Registration data not found. Please start over.');
        }

        const regData = JSON.parse(storedData);
        const tempTokenFromStorage = localStorage.getItem('registrationTempToken');

        console.log('Submitting phase 2 with:', {
          tempToken: tempTokenFromStorage,
          address: address.trim(),
          phone: phone.trim()
        });

        if (!tempTokenFromStorage) {
          throw new Error('Registration session expired. Please start over.');
        }

        const response = await fetch('http://localhost:5000/api/auth/register/phase2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tempToken: tempTokenFromStorage,
            address: address.trim(),
            phone: phone.trim()
          }),
        });

        // Get response text first for debugging
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok) {
          throw new Error(data.message || data.error || `Server error: ${response.status}`);
        }

        if (!data.success) {
          throw new Error(data.message || 'Registration failed');
        }

        // Login the user
        if (data.session) {
          login(data.user, data.session.access_token, data.permissions || []);
        } else {
          // If no session, user needs to login manually
          login(data.user, null, data.permissions || []);
        }
        
        setSuccess(true);
        localStorage.removeItem('registrationData');
        localStorage.removeItem('registrationTempToken');
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      }

    } catch (error) {
      console.error('Submit error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/register');
  };

  // Check if form is valid
  const isFormValid = () => {
    return address.trim().length > 5 && phone.trim().length >= 10;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="flex items-center gap-2 text-sm font-medium text-gray-400">
                <span className="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-xs">1</span>
                {isGoogleUser ? 'Google Auth' : 'Basic Info'}
              </span>
              <div className="w-12 h-0.5 bg-blue-600"></div>
              <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                Details
              </span>
            </div>
            
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
            <p className="text-gray-500 text-sm mt-2">
              {isGoogleUser && isNewGoogleUser
                ? 'Welcome! Please provide your address and phone number to create your account'
                : isGoogleUser
                ? 'Please provide your address and phone number to complete your registration'
                : 'Please provide your address and phone number to create your account'
              }
            </p>
            
            {registrationData && !isGoogleUser && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {registrationData.fullName}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {registrationData.email}
                </p>
              </div>
            )}

            {isGoogleUser && user && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {user.fullName || 'Not set'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                {isNewGoogleUser && (
                  <p className="text-sm text-blue-600 mt-1">
                    <span className="font-medium">✓</span> New Google user
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700 font-medium">
                  {isGoogleUser ? 'Profile Created Successfully!' : 'Account Created Successfully!'}
                </p>
                <p className="text-xs text-green-600">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <textarea
                    value={address}
                    onChange={handleAddressChange}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, address: true }))}
                    rows={3}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${
                    touchedFields.address && !address.trim() 
                        ? 'border-2 border-red-500 ring-2 ring-red-200' 
                        : touchedFields.address && address.trim()
                        ? 'border-2 border-green-500 ring-2 ring-green-200'
                        : 'border border-gray-200'
                    }`}
                    placeholder="Enter your delivery address"
                    disabled={success}
                />
                </div>
              {touchedFields.address && !address.trim() && (
                <p className="text-xs text-red-500 mt-1.5">Address is required</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className={`relative transition-all duration-200 ${
                touchedFields.phone && !phone.trim() 
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.phone && phone.trim() && validatePhone(phone)
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : touchedFields.phone && phone.trim() && !validatePhone(phone)
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => setTouchedFields(prev => ({ ...prev, phone: true }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="0771234567"
                  maxLength={15}
                  disabled={success}
                />
              </div>
              {touchedFields.phone && !phone.trim() && (
                <p className="text-xs text-red-500 mt-1.5">Phone number is required</p>
              )}
              {touchedFields.phone && phone.trim() && !validatePhone(phone) && (
                <p className="text-xs text-red-500 mt-1.5">Please enter a valid phone number (10 digits)</p>
              )}
              {touchedFields.phone && phone.trim() && validatePhone(phone) && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid phone number
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {!isGoogleUser && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={success}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium flex items-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || success}
                className={`${!isGoogleUser ? 'flex-1' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    {isGoogleUser ? 'Creating Profile...' : 'Creating Account...'}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isGoogleUser ? 'Create Profile' : 'Create Account'}
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            You can update your profile anytime from settings
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;