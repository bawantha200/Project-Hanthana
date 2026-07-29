const supabase = require('../config/db');
const supabaseAdmin = supabase.supabaseAdmin;

const jwt = require('jsonwebtoken');
const {
  sendEmailChangeVerification,
  sendEmailChangeConfirmation,
  sendOldEmailNotification
} = require('../utils/mailer');

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const LOCK_DURATION_MINUTES = 15;
const { logAction } = require('../utils/auditLogger');

// ============================================================
// ==================== HELPER FUNCTIONS ======================
/**
 * @desc    Check if user has a password set
 * @route   GET /api/auth/check-password
 * @access  Private
 */
const checkPasswordStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    
    console.log('🔍 Checking password status for user:', userId);
    
    // Try to get the user from Supabase Auth directly
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user) {
      console.error('❌ Error getting user:', error);
      
      // Fallback: Check if user has an email identity by looking at the user object
      // If user came from Google, they won't have password
      // If user came from email, they will have password
      const isGoogleUser = req.user.provider === 'google' || 
                          req.user.authProvider === 'google' ||
                          req.user.app_metadata?.provider === 'google';
      
      // If not Google user, assume they have password
      const hasPassword = !isGoogleUser;
      
      console.log('📊 Fallback check:', {
        isGoogleUser,
        hasPassword
      });
      
      return res.status(200).json({
        success: true,
        hasPassword
      });
    }
    
    // Check if user has email identity
    const identities = user.identities || [];
    const hasEmailIdentity = identities.some(id => id.provider === 'email');
    const hasEncryptedPassword = user.encrypted_password && user.encrypted_password !== '';
    
    const hasPassword = hasEmailIdentity || hasEncryptedPassword;
    
    console.log('📊 Password check:', {
      hasEmailIdentity,
      hasEncryptedPassword,
      hasPassword
    });
    
    return res.status(200).json({
      success: true,
      hasPassword
    });
  } catch (error) {
    console.error('❌ Error checking password status:', error);
    return res.status(200).json({
      success: true,
      hasPassword: false
    });
  }
};



/**
 * Helper function to check if a user has a password
 * Checks both email identity and metadata flag
 */
const userHasPassword = async (userId) => {
  try {
    // Use supabaseAdmin for admin operations
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !data) {
      console.error('Error fetching user:', error);
      return false;
    }
    
    // The user object is directly on data
    const user = data;
    
    // Check identities for email provider
    const identities = user.identities || [];
    const hasEmailIdentity = identities.some(id => id.provider === 'email');
    
    // Check if encrypted_password exists
    const hasEncryptedPassword = user.encrypted_password && user.encrypted_password !== '';
    
    // Check factors
    const hasPasswordFactor = user.factors?.some(
      factor => factor.factor_type === 'password'
    ) || false;
    
    // Return true if any indicator shows user has password
    return hasEmailIdentity || hasEncryptedPassword || hasPasswordFactor;
  } catch (error) {
    console.error('Error checking user password:', error);
    return false;
  }
};


// Add this to authController.js
const handleEmailConfirmation = async (req, res) => {
  try {
    const { user } = req.body;
    
    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: 'Invalid webhook data' });
    }

    // Update the profile email when email is confirmed
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email: user.email })
      .eq('id', user.id);

    if (updateError) {
      console.error('[PROFILE UPDATE ERROR]', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update profile' });
    }

    await logAction(user.id, 'EMAIL_CONFIRMED', { 
      email: user.email,
      status: 'verified'
    }, req);

    return res.status(200).json({ 
      success: true, 
      message: 'Email confirmed and profile updated' 
    });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================
// ================ NEW REGISTRATION FLOW =====================
// ============================================================

/**
 * @desc    Phase 1: Register user with email/password only
 * @route   POST /api/auth/register/phase1
 */
const registerPhase1 = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and full name are required.' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address.' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters.' 
      });
    }

    // Check if email already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingUsers) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email already exists.' 
      });
    }

    // Create temporary registration record
    const tempToken = jwt.sign(
      { 
        email, 
        password, 
        fullName,
        stage: 'phase1_complete'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Phase 1 complete. Proceed to phase 2.',
      tempToken,
      requiresPhase2: true,
      user: {
        email,
        fullName,
      }
    });

  } catch (error) {
    console.error('[REGISTER PHASE 1 ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};

/**
 * @desc    Phase 2: Complete registration with address and phone
 * @route   POST /api/auth/register/phase2
 */
const registerPhase2 = async (req, res) => {
  try {
    const { tempToken, address, phone } = req.body;

    console.log('[REGISTER PHASE 2] Received:', { 
      tempToken: tempToken ? 'present' : 'missing', 
      address, 
      phone 
    });

    if (!tempToken || !address || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields. Please provide your address and phone number.' 
      });
    }

    // Decode and verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      console.log('[REGISTER PHASE 2] Decoded token:', decoded);
    } catch (error) {
      console.error('[REGISTER PHASE 2] Token verification failed:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Registration session expired. Please start over.' 
      });
    }

    if (decoded.stage !== 'phase1_complete') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid registration session.' 
      });
    }

    const { email, password, fullName } = decoded;

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, '');
    console.log('[REGISTER PHASE 2] Cleaned phone:', cleanedPhone);
    console.log('[REGISTER PHASE 2] Address:', address);

    // Validate phone number
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid phone number (10-15 digits).' 
      });
    }

    // Check if phone number already exists
    const { data: existingPhoneUser, error: phoneCheckError } = await supabase
      .from('profiles')
      .select('id, phone_number')
      .eq('phone_number', cleanedPhone)
      .maybeSingle();

    if (phoneCheckError) {
      console.error('[PHONE CHECK ERROR]', phoneCheckError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking phone number availability.' 
      });
    }

    if (existingPhoneUser) {
      return res.status(400).json({ 
        success: false, 
        message: `Phone number ${cleanedPhone} is already registered. Please use a different number.` 
      });
    }

    // 1️⃣ Create user in Supabase Auth
    console.log('[REGISTER PHASE 2] Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName, 
          phone_number: cleanedPhone,
          address: address.trim()
        }
      }
    });

    if (authError) {
      console.error('[AUTH ERROR]', authError);
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }

    const authUser = authData.user;
    if (!authUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User provisioning failed.' 
      });
    }

    console.log('[REGISTER PHASE 2] User created successfully:', authUser.id);

    // 2️⃣ Get default role
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'CUSTOMER')
      .maybeSingle();
    const defaultRoleId = roleData ? roleData.id : null;

    // 3️⃣ Wait a moment for the trigger to create the profile
    // Sometimes the trigger takes a moment to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4️⃣ Check if profile exists (created by trigger)
    const { data: existingProfile, error: checkProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, role_id')
      .eq('id', authUser.id)
      .maybeSingle();

    console.log('[REGISTER PHASE 2] Existing profile from trigger:', existingProfile);

    let profileError = null;

    if (existingProfile) {
      // ✅ Profile exists (created by trigger) - UPDATE it
      console.log('[REGISTER PHASE 2] Profile exists (trigger created), updating...');
      const updateData = {
        full_name: fullName,
        phone_number: cleanedPhone,
        address: address.trim(),
        role_id: defaultRoleId,
        email: email
      };
      
      console.log('[REGISTER PHASE 2] Update data:', updateData);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', authUser.id);
      
      profileError = updateError;
      
      if (!profileError) {
        console.log('[REGISTER PHASE 2] Profile updated successfully');
      } else {
        console.error('[UPDATE PROFILE ERROR]', profileError);
      }
    } else {
      // ❌ Profile doesn't exist - INSERT
      console.log('[REGISTER PHASE 2] No profile found, creating new...');
      const profileData = {
        id: authUser.id,
        full_name: fullName,
        phone_number: cleanedPhone,
        address: address.trim(),
        role_id: defaultRoleId,
        email: email
      };
      
      console.log('[REGISTER PHASE 2] Profile data:', profileData);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([profileData]);
      
      profileError = insertError;
      
      if (!profileError) {
        console.log('[REGISTER PHASE 2] Profile inserted successfully');
      } else {
        console.error('[INSERT PROFILE ERROR]', profileError);
      }
    }

    if (profileError) {
      console.error('[PROFILE ERROR]', profileError);
      
      // Try to delete the auth user if profile creation failed
      try {
        console.log('[REGISTER PHASE 2] Attempting to rollback - deleting auth user...');
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && serviceRoleKey) {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            }
          });
          console.log('[REGISTER PHASE 2] Auth user deleted for rollback');
        }
      } catch (deleteError) {
        console.error('[ROLLBACK ERROR]', deleteError);
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Account created but profile linking failed. Please try again.',
        error: profileError.message,
        details: profileError.details || 'No additional details'
      });
    }

    console.log('[REGISTER PHASE 2] Profile created/updated successfully');

    // 5️⃣ Verify the profile was saved correctly
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, email')
      .eq('id', authUser.id)
      .maybeSingle();

    console.log('[REGISTER PHASE 2] Verified profile:', verifyProfile);

    // 6️⃣ Log registration
    try {
      await logAction(authUser.id, 'REGISTERED', { 
        email,
        method: 'email_password',
        phase: 'two_phase'
      }, req);
    } catch (logError) {
      console.error('[LOG ERROR]', logError);
    }

    // 7️⃣ Create session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError || !sessionData.session) {
      console.log('[REGISTER PHASE 2] Session creation failed, but user is registered');
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please log in.',
        user: {
          id: authUser.id,
          email: authUser.email,
          fullName,
          phone: cleanedPhone,
          address: address.trim(),
          role: 'CUSTOMER',
          hasPassword: true
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      session: sessionData.session,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName,
        phone: cleanedPhone,
        address: address.trim(),
        role: 'CUSTOMER',
        hasPassword: true
      }
    });

  } catch (error) {
    console.error('[REGISTER PHASE 2 ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.',
      error: error.message 
    });
  }
};

/**
 * @desc    Google Sign-In: Create profile with address and phone
 * @route   POST /api/auth/google/create-profile
 */
const createGoogleUserProfile = async (req, res) => {
  try {
    const { address, phone, fullName } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    console.log('[CREATE GOOGLE PROFILE] Received:', { address, phone, fullName, token: !!token });

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (!address || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Address and phone number are required.' 
      });
    }

    // Get user from token
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      console.error('[CREATE GOOGLE PROFILE] Auth error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid session. Please sign in again.' 
      });
    }

    const authUser = authData.user;
    console.log('[CREATE GOOGLE PROFILE] User:', authUser.id, authUser.email);

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, '');
    console.log('[CREATE GOOGLE PROFILE] Cleaned phone:', cleanedPhone);

    // Validate phone number
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid phone number (10-15 digits).' 
      });
    }

    // Check if phone number already exists
    const { data: existingPhoneUser, error: phoneCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', cleanedPhone)
      .maybeSingle();

    if (phoneCheckError) {
      console.error('[PHONE CHECK ERROR]', phoneCheckError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking phone number availability.' 
      });
    }

    if (existingPhoneUser) {
      return res.status(400).json({ 
        success: false, 
        message: `Phone number ${cleanedPhone} is already registered to another account.` 
      });
    }

    // Get default role
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'CUSTOMER')
      .maybeSingle();
    const defaultRoleId = roleData ? roleData.id : null;

    // Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address')
      .eq('id', authUser.id)
      .maybeSingle();

    console.log('[CREATE GOOGLE PROFILE] Existing profile:', existingProfile);

    if (profileCheckError) {
      console.error('[PROFILE CHECK ERROR]', profileCheckError);
    }

    let profileError;

    if (existingProfile) {
      // Update existing profile with address and phone
      console.log('[CREATE GOOGLE PROFILE] Updating existing profile');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || existingProfile.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          phone_number: cleanedPhone,
          address: address.trim(), // ✅ Make sure address is included
          role_id: defaultRoleId,
          email: authUser.email
        })
        .eq('id', authUser.id);
      
      profileError = updateError;
    } else {
      // Create new profile with ALL fields including address
      const profileData = {
        id: authUser.id,
        full_name: fullName || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        phone_number: cleanedPhone,
        address: address.trim(), // ✅ Make sure address is included
        role_id: defaultRoleId,
        email: authUser.email
      };

      console.log('[CREATE GOOGLE PROFILE] Creating profile with data:', profileData);

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([profileData]);
      
      profileError = insertError;
    }

    if (profileError) {
      console.error('[PROFILE ERROR]', profileError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create profile. Please try again.',
        error: profileError.message 
      });
    }

    console.log('[CREATE GOOGLE PROFILE] Profile saved successfully');

    // Log the action
    await logAction(authUser.id, 'GOOGLE_PROFILE_COMPLETED', { 
      email: authUser.email,
      hasAddress: !!address,
      hasPhone: !!phone
    }, req);

    return res.status(200).json({
      success: true,
      message: 'Profile created successfully.',
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: fullName || authUser.user_metadata?.full_name,
        phone: cleanedPhone,
        address: address.trim(),
        role: 'CUSTOMER',
        provider: 'google'
      }
    });

  } catch (error) {
    console.error('[CREATE GOOGLE PROFILE ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};

/**
 * @desc    Google Sign-In: Update existing profile with address and phone
 * @route   PUT /api/auth/google/update-profile
 */
const updateGoogleUserProfile = async (req, res) => {
  try {
    const { address, phone, fullName } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    console.log('[UPDATE GOOGLE PROFILE] Received:', { address, phone, fullName, token: !!token });

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (!address || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Address and phone number are required.' 
      });
    }

    // Get user from token
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      console.error('[UPDATE GOOGLE PROFILE] Auth error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid session. Please sign in again.' 
      });
    }

    const authUser = authData.user;
    console.log('[UPDATE GOOGLE PROFILE] User:', authUser.id);

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, '');
    console.log('[UPDATE GOOGLE PROFILE] Cleaned phone:', cleanedPhone);

    // Validate phone number
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid phone number (10-15 digits).' 
      });
    }

    // Update profile with address and phone
    const updateData = {
      phone_number: cleanedPhone,
      address: address.trim() // ✅ Make sure address is included
    };

    // Only update fullName if provided
    if (fullName) {
      updateData.full_name = fullName;
    }

    console.log('[UPDATE GOOGLE PROFILE] Updating with data:', updateData);

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.id);

    if (updateError) {
      console.error('[UPDATE PROFILE ERROR]', updateError);
      return res.status(400).json({ 
        success: false, 
        message: updateError.message 
      });
    }

    console.log('[UPDATE GOOGLE PROFILE] Profile updated successfully');

    // Log the action
    await logAction(authUser.id, 'GOOGLE_PROFILE_UPDATED', { 
      email: authUser.email,
      hasAddress: !!address,
      hasPhone: !!phone
    }, req);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: fullName || authUser.user_metadata?.full_name,
        phone: cleanedPhone,
        address: address.trim(),
        role: 'CUSTOMER',
        provider: 'google'
      }
    });

  } catch (error) {
    console.error('[UPDATE GOOGLE PROFILE ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};

/**
 * @desc    Register a new user, create auth credentials, and provision a database profile
 * @route   POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, fullName, phone, address } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // 📱 Clean phone number - remove all non-digit characters
    const cleanedPhone = phone.replace(/\D/g, '');

    // 🔍 Check if phone number already exists in profiles
    const { data: existingPhoneUser, error: phoneCheckError } = await supabase
      .from('profiles')
      .select('id, phone_number, full_name')
      .eq('phone_number', cleanedPhone)
      .maybeSingle();

    if (phoneCheckError) {
      console.error('[PHONE CHECK ERROR]', phoneCheckError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking phone number availability.' 
      });
    }

    if (existingPhoneUser) {
      return res.status(400).json({ 
        success: false, 
        message: `Phone number ${cleanedPhone} is already registered to another user. Please use a different number.` 
      });
    }

    // 1️⃣ Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName, 
          phone_number: cleanedPhone
        }
      }
    });

    if (authError) return res.status(400).json({ success: false, message: authError.message });
    const authUser = authData.user;
    if (!authUser) return res.status(400).json({ success: false, message: 'User provisioning failed.' });

    // 2️⃣ Get default role
    const { data: roleData } = await supabase.from('roles').select('id').eq('role_name', 'CUSTOMER').maybeSingle();
    const defaultRoleId = roleData ? roleData.id : null;

    // 3️⃣ Check if profile already exists (due to auto-creation trigger)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    let profileError = null;

    if (existingProfile) {
      // ✅ Profile already exists - UPDATE it instead of INSERT
      console.log('[REGISTER] Profile already exists, updating...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: cleanedPhone,
          address: address || '',
          role_id: defaultRoleId,
          email: email
        })
        .eq('id', authUser.id);
      
      profileError = updateError;
    } else {
      // ✅ Profile doesn't exist - INSERT new profile
      console.log('[REGISTER] Creating new profile...');
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.id,
          full_name: fullName,
          phone_number: cleanedPhone,
          address: address || '',
          role_id: defaultRoleId,
          email: email
        }]);
      
      profileError = insertError;
    }

    if (profileError) {
      console.error('[REGISTER PROFILE ERROR]', profileError);
      return res.status(500).json({ 
        success: false, 
        message: 'Account created but profile linking failed.',
        details: profileError.message 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { 
        id: authUser.id, 
        email: authUser.email, 
        fullName, 
        role: 'CUSTOMER',
        hasPassword: true
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Request Google OAuth authorization link
 * @route   POST /api/auth/google
 */
const initiateGoogleOAuth = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/auth/callback',
        skipBrowserRedirect: true,
        flowType: 'pkce'
      }
    });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, url: data.url });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Exchange Implicit OAuth access token for complete profile
 * @route   POST /api/auth/google/callback
 */
const handleGoogleCallback = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ success: false, message: 'Access token missing.' });

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return res.status(401).json({ success: false, message: 'Invalid token.' });

    const authUser = authData.user;
    
    let profile = null;
    let roleName = 'CUSTOMER';
    let hasPassword = false;
    let authProvider = 'google';
    
    // Check if user has a password
    hasPassword = await userHasPassword(authUser.id);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone_number,
        address,
        role_id,
        status,
        roles ( role_name )
      `)
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profileError && profileData) {
      profile = profileData;

      // Block deactivated accounts
      if (profile.status && profile.status !== 'active') {
        await logAction(profile.id, 'LOGIN_BLOCKED_INACTIVE', { email: authUser.email }, req);
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact an administrator.',
        });
      }

      if (profile.roles && typeof profile.roles === 'object' && profile.roles.role_name) {
        roleName = profile.roles.role_name;
      } else if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', profile.role_id)
          .single();
        roleName = roleData?.role_name || 'CUSTOMER';
      }
    }

    let isNewUser = false;
    let finalFullName = authUser.user_metadata?.full_name || 
                        authUser.user_metadata?.name || 
                        authUser.email.split('@')[0];
    let finalPhone = '';
    let finalAddress = '';

    if (!profile) {
      isNewUser = true;
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'CUSTOMER')
        .maybeSingle();
      const defaultRoleId = roleData ? roleData.id : 3;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.id,
          full_name: finalFullName,
          phone_number: '',
          address: '',
          role_id: defaultRoleId,
          email: authUser.email
        }]);
      
      if (insertError) {
        console.error('Profile insert error:', insertError);
      }
    } else {
      finalFullName = profile.full_name || finalFullName;
      finalPhone = profile.phone_number || '';
      finalAddress = profile.address || '';
    }

    // Determine if profile needs completion
    const needsProfileCompletion = !finalAddress || !finalPhone || 
                                  finalAddress.trim() === '' || 
                                  finalPhone.trim() === '';

    const finalRole = roleName.toUpperCase();

    console.log('[GOOGLE CALLBACK] Profile check:', {
      finalAddress,
      finalPhone,
      needsProfileCompletion,
      isNewUser
    });

    return res.status(200).json({
      success: true,
      message: 'OAuth successful.',
      session: { access_token: accessToken },
      isNewUser,
      hasPassword,
      authProvider,
      needsProfileCompletion, // ✅ Send this to frontend
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: finalFullName,
        phone: finalPhone,
        address: finalAddress,
        role: finalRole,
        hasPassword: hasPassword,
        provider: authProvider
      }
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Validate runtime session token (Get Me)
 * @route   GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Malformed authorization token.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, message: 'Session expired.' });

    // Check if user has password
    const hasPassword = await userHasPassword(user.id);
    
    // Detect if user is from Google
    const identities = user.identities || [];
    const isGoogleUser = identities.some(id => id.provider === 'google');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone_number, address, role_id ( role_name )')
      .eq('id', user.id)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name,
        phone: profile?.phone_number || '',
        address: profile?.address || '',
        role: profile?.role_id?.role_name || 'CUSTOMER',
        hasPassword: hasPassword,
        provider: isGoogleUser ? 'google' : 'email'
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Login user with email and password
 * @route   POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'All fields are required.' });

    // ✅ This should now work because supabase is properly imported
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, status, failed_login_attempts, locked_until, full_name, phone_number, address, role_id ( role_name ), two_factor_enabled, two_factor_secret')
      .eq('email', email)
      .maybeSingle();

    // Check if account is locked
    if (profile?.locked_until) {
      const lockedUntil = new Date(profile.locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          locked: true,
        });
      }
    }

    // Check if user exists and has a password
    if (profile) {
      const hasPassword = await userHasPassword(profile.id);
      
      // If user exists BUT has NO password (Google user who hasn't set password yet)
      if (!hasPassword) {
        // Check if they're a Google-only user (only google identity, no email identity)
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        const identities = userData?.user?.identities || [];
        const hasGoogleIdentity = identities.some(id => id.provider === 'google');
        const hasEmailIdentity = identities.some(id => id.provider === 'email');
        const isGoogleOnly = hasGoogleIdentity && !hasEmailIdentity;
        
        if (isGoogleOnly) {
          return res.status(400).json({
            success: false,
            message: 'This account uses Google login. Please sign in with Google or set a password first.',
            requiresPasswordSetup: true,
            email: email,
            provider: 'google'
          });
        }
      }
    }

    // Security settings
    const { data: securitySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'security')
      .maybeSingle();
    const maxAttempts = parseInt(securitySetting?.value?.loginAttempts || '5', 10);
    const twoFactorEnabledOrgWide = securitySetting?.value?.twoFactorAuth !== false;

    // Actual authentication attempt
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      // Password wrong - failed attempt
      if (profile) {
        const newAttempts = (profile.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= maxAttempts;

        await supabase
          .from('profiles')
          .update({
            failed_login_attempts: newAttempts,
            locked_until: shouldLock
              ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString()
              : null,
          })
          .eq('id', profile.id);

        if (shouldLock) {
          await logAction(profile.id, 'ACCOUNT_LOCKED', { email, attempts: newAttempts }, req);
          return res.status(423).json({
            success: false,
            message: `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`,
            locked: true,
          });
        }

        await logAction(profile.id, 'LOGIN_FAILED', { email, attemptsRemaining: maxAttempts - newAttempts }, req);
        return res.status(401).json({
          success: false,
          message: `Invalid credentials. ${maxAttempts - newAttempts} attempt(s) remaining.`,
        });
      }

      return res.status(401).json({ success: false, message: authError?.message || 'Invalid credentials.' });
    }

    // Login success - reset failed attempts
    if (profile) {
      await supabase
        .from('profiles')
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq('id', profile.id);
    }

    if (profile && profile.status !== 'active') {
      await logAction(profile.id, 'LOGIN_BLOCKED_INACTIVE', { email }, req);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const role = profile?.role_id?.role_name?.toUpperCase() || 'CUSTOMER';

    // 2FA check
    const roleNeeds2FA = ['ADMIN', 'STAFF'].includes(role);
    const requires2FA = twoFactorEnabledOrgWide && roleNeeds2FA;

    if (requires2FA) {
      const tempTokenPayload = {
        userId: profile.id,
        authUserId: authData.user.id,
        email,
        session: authData.session,
      };

      if (!profile.two_factor_enabled) {
        const tempToken = jwt.sign(
          { ...tempTokenPayload, stage: 'setup' },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );
        return res.status(200).json({
          success: false,
          requireTwoFactorSetup: true,
          tempToken,
          message: 'Two-factor authentication setup required.',
        });
      }

      const tempToken = jwt.sign(
        { ...tempTokenPayload, stage: '2fa_pending' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      await logAction(profile.id, 'LOGIN_2FA_PENDING', { email }, req);
      return res.status(200).json({
        success: false,
        requireTwoFactor: true,
        tempToken,
        message: 'Enter your 2FA code.',
      });
    }

    await logAction(authData.user.id, 'LOGIN_SUCCESS', { email }, req);

    // Check if user has password (for Google users who might have set one)
    const hasPassword = await userHasPassword(authData.user.id);
    const identities = authData.user.identities || [];
    const isGoogleUser = identities.some(id => id.provider === 'google');

    return res.status(200).json({
      success: true,
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile?.full_name,
        phone: profile?.phone_number,
        address: profile?.address,
        role: profile?.role_id?.role_name || 'CUSTOMER',
        hasPassword: hasPassword,
        provider: isGoogleUser ? 'google' : 'email'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};


/**
 * @desc    Update user dynamic profile (Name, Phone, Address)
 * @route   PUT /api/auth/profile
 */

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, address, currentPassword } = req.body;

    // CRITICAL: Always require current password for profile updates
    if (!currentPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is required for security.' 
      });
    }

    // Verify the password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });

    if (signInError || !signInData.user) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Update profile
    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (phone) updateData.phone_number = phone;
    if (address) updateData.address = address;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Update address only
 * @route   PUT /api/auth/address
 */
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, currentPassword } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ address })
      .eq('id', userId);

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Address updated successfully.'
    });
  } catch (error) {
    console.error('Update address error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Get complete user profile including created_at
 * @route   GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, email, phone_number, address, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      profile: {
        full_name: profile?.full_name || '',
        email: profile?.email || req.user.email,
        phone_number: profile?.phone_number || '',
        address: profile?.address || '',
        created_at: profile?.created_at || null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Update/Reset User Password
 * @route   PUT /api/auth/update-password
 */
const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if user has password
    const hasPassword = await userHasPassword(userId);

    if (!hasPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'You don\'t have a password set. Please use "Set Password" option.',
        requiresPasswordSetup: true
      });
    }

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    // Verify current password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });

    if (signInError || !signInData.user) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    // Update password - use supabaseAdmin if available
    const client = supabaseAdmin || supabase;
    const { error: updateError } = await client.auth.admin.updateUserById(
      userId, 
      { password: newPassword }
    );

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    // Log the action
    await logAction(userId, 'PASSWORD_CHANGED', { method: 'manual' }, req);

    return res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully.' 
    });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Set password for Google OAuth users
 * @route   POST /api/auth/set-password
 */
const setPasswordForGoogleUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword, confirmPassword } = req.body;

    // Validate password
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both password and confirmation are required.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters.' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match.' 
      });
    }

    // Check if user already has a password
    const hasPassword = await userHasPassword(userId);
    if (hasPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a password set. Use "Change Password" instead.' 
      });
    }

    // Verify the user is actually a Google user
    const client = supabaseAdmin || supabase;
    const { data: user, error: userError } = await client.auth.admin.getUserById(userId);
    if (userError) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const identities = user.user?.identities || [];
    const isGoogleUser = identities.some(id => id.provider === 'google');
    
    if (!isGoogleUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This feature is only for Google-authenticated users.' 
      });
    }

    // Update user's password in Supabase Auth
    const { error: updateError } = await client.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to set password. Please try again.' 
      });
    }

    // Update user metadata to indicate password is set
    await client.auth.admin.updateUserById(userId, {
      user_metadata: { has_password: true }
    });

    // Log the action
    await logAction(userId, 'PASSWORD_SET', { provider: 'google', method: 'first_time' }, req);

    return res.status(200).json({
      success: true,
      message: 'Password set successfully! You can now log in with email and password.',
      hasPassword: true
    });

  } catch (error) {
    console.error('Set password error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};


/**
 * @desc    Delete user account entirely from Auth and Profiles
 * @route   DELETE /api/auth/account
 */

/**
 * @desc    Delete user account entirely from Auth and Profiles
 * @route   DELETE /api/auth/account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // ✅ ALWAYS require password
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required to delete your account.' 
      });
    }

    // ✅ ALWAYS verify password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: password,
    });

    if (signInError || !signInData.user) {
      console.log('❌ Invalid password attempt for user:', userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password. Please try again.' 
      });
    }

    console.log('✅ Password verified for user:', userId);

    // ✅ STEP 1: Handle audit logs first - set user_id to NULL
    console.log('🔄 Updating audit logs (removing user reference)...');
    const { error: auditUpdateError } = await supabase
      .from('audit_logs')
      .update({ user_id: null })
      .eq('user_id', userId);
    
    if (auditUpdateError) {
      console.warn('⚠️ Audit log update warning:', auditUpdateError.message);
      // If update fails, try deleting audit logs
      console.log('🔄 Attempting to delete audit logs...');
      const { error: auditDeleteError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('user_id', userId);
      
      if (auditDeleteError) {
        console.error('❌ Failed to handle audit logs:', auditDeleteError);
        // Continue anyway - we can still try to delete the profile
      } else {
        console.log('✅ Audit logs deleted');
      }
    } else {
      console.log('✅ Audit logs updated (user_id set to NULL)');
    }

    // ✅ STEP 2: Delete from profiles
    console.log('🗑️ Deleting profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('❌ Profile delete error:', profileError);
      // If profile delete fails, try to delete anyway
      // The auth user will still be deleted
    } else {
      console.log('✅ Profile deleted');
    }

    // ✅ STEP 3: Delete from auth using admin API
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error.' 
      });
    }

    console.log(`🗑️ Deleting user ${userId} from auth...`);
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        }
      }
    );

    if (response.ok) {
      console.log(`✅ User ${userId} deleted successfully`);
      return res.status(200).json({ 
        success: true, 
        message: 'Account deleted successfully.' 
      });
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Delete failed:', response.status, errorData);
    
    return res.status(response.status).json({ 
      success: false, 
      message: errorData.message || 'Failed to delete account' 
    });

  } catch (error) {
    console.error('❌ Delete account error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

/**
 * Alternative delete method using direct API call
 */
const deleteUserAlternative = async (userId, res) => {
  try {
    console.log(`🔄 Attempting alternative delete for user ${userId}...`);
    
    // Method 2: Use the REST API directly
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      console.log(`✅ User ${userId} deleted via REST API`);
      return res.status(200).json({ 
        success: true, 
        message: 'Account deleted permanently.' 
      });
    }

    const errorData = await response.json();
    console.error('❌ REST API delete failed:', errorData);
    
    // If user not found, consider it a success
    if (response.status === 404) {
      return res.status(200).json({ 
        success: true, 
        message: 'Account already deleted.' 
      });
    }

    throw new Error(errorData.message || 'Delete failed');
    
  } catch (error) {
    console.error('❌ Alternative delete failed:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to delete account. Please try again or contact support.' 
    });
  }
};


/**
 * @desc    Get permissions for a role (by role name from URL)
 * @route   GET /api/auth/permissions/:roleName
 */
const getPermissionsByRoleName = async (req, res) => {
  try {
    const { roleName } = req.params;
    const roleUpper = roleName.toUpperCase();

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', roleUpper)
      .single();

    if (roleError || !role) {
      return res.status(200).json({ success: true, permissions: [] });
    }

    const { data: rolePerms, error: rpError } = await supabase
      .from('role_permissions')
      .select('permissions ( permission_name )')
      .eq('role_id', role.id);

    if (rpError) throw rpError;

    const permissions = rolePerms.map(rp => rp.permissions.permission_name);
    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    console.error('Get permissions by role error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get current user's permissions based on POSITION or ROLE
 * @route   GET /api/auth/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's role_id from profiles table
    // const { data: profile, error: profileError } = await supabase
    //   .from('profiles')
    //   .select('role_id')
    //   .eq('id', userId)
    //   .single();

    if (profileError || !profile) {
      return res.status(200).json({ success: true, permissions: [] });
    }

    let permissions = [];
    let positionId = null;

    // Get user's position_id from employees table
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('position')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!empError && employee) {
      positionId = employee.position_id;
    }

    // If position exists, get permissions from position (override role)
    if (positionId) {
      const { data: posPerms, error: posError } = await supabase
        .from('position_permissions')
        .select('permissions ( permission_name )')
        .eq('position_id', positionId);

      if (!posError && posPerms && posPerms.length > 0) {
        permissions = posPerms.map(rp => rp.permissions.permission_name);
        console.log(`[POSITION PERMISSIONS] User ${userId} (Position ID: ${positionId}) got ${permissions.length} permissions.`);
        return res.status(200).json({ success: true, permissions });
      }
    }

    // Fallback to role permissions if no position permissions found
    if (profile.role_id) {
      const { data: rolePerms, error: rpError } = await supabase
        .from('role_permissions')
        .select('permissions ( permission_name )')
        .eq('role_id', profile.role_id);

      if (!rpError) {
        permissions = rolePerms.map(rp => rp.permissions.permission_name);
        console.log(`[ROLE PERMISSIONS] User ${userId} fell back to role permissions.`);
      }
    }

    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all roles (for admin switcher)
 * @route   GET /api/auth/roles
 */
const getAllRoles = async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, role_name')
      .order('role_name');

    if (error) throw error;
    return res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error('Get all roles error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Change user email with verification
 * @route   PUT /api/auth/change-email
 */

const changeEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail, currentPassword } = req.body;

    // Validate input
    if (!newEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'New email address is required.' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address.' 
      });
    }

    if (newEmail === req.user.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'New email must be different from current email.' 
      });
    }

    // Check if user has a password
    const hasPassword = await userHasPassword(userId);
    
    if (hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is required to change email.' 
        });
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
      });

      if (signInError || !signInData.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid current password.' 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'This account uses Google login. Please change your email through Google account settings.',
        provider: 'google'
      });
    }

    // ✅ Generate verification token (24 hour expiry)
    const verificationToken = jwt.sign(
      { 
        userId: userId, 
        newEmail: newEmail,
        oldEmail: req.user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ✅ Send verification email
    const verificationLink = `http://localhost:5173/verify-email/${verificationToken}`;
    
    try {
      // Use your existing mailer
      const { sendEmailChangeVerification } = require('../utils/mailer');
      
      await sendEmailChangeVerification({
        to: newEmail,
        newEmail: newEmail,
        oldEmail: req.user.email,
        userName: req.user.fullName || 'User',
        verificationLink: verificationLink,
        token: verificationToken
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    // ✅ Log the email change request
    await logAction(userId, 'EMAIL_CHANGE_REQUESTED', { 
      oldEmail: req.user.email, 
      newEmail,
      status: 'pending_verification'
    }, req);

    return res.status(200).json({
      success: true,
      message: `Verification email sent to ${newEmail}. Please check your inbox and click the confirmation link.`,
      requiresVerification: true,
      newEmail: newEmail,
      emailChangePending: true
    });

  } catch (error) {
    console.error('[EMAIL CHANGE ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error.' 
    });
  }
};

/**
 * @desc    Verify email change
 * @route   GET /api/auth/verify-email/:token
 */

const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('🔍 ========== VERIFICATION START ==========');
    console.log('📝 Token:', token);
    console.log('📝 Password provided:', password ? 'Yes' : 'No');
    
    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required to verify email change.' 
      });
    }
    
    // ✅ Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', decoded);
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification link. Please request a new one.' 
      });
    }

    const { userId, newEmail, oldEmail } = decoded;
    console.log('👤 User ID:', userId);
    console.log('📧 New Email:', newEmail);
    console.log('📧 Old Email:', oldEmail);

    // ✅ Get user's current email
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ User fetch error:', userError);
      return res.status(400).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const currentEmail = user.user.email;
    console.log('📧 Current email in auth:', currentEmail);

    // ✅ Verify the password
    console.log('🔐 Verifying password...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: password,
    });

    if (signInError || !signInData.user) {
      console.error('❌ Password verification failed:', signInError);
      return res.status(401).json({ 
        success: false, 
        message: 'Incorrect password. Please try again.' 
      });
    }
    console.log('✅ Password verified successfully');

    // ✅ Check if email is already updated
    if (currentEmail === newEmail) {
      console.log('ℹ️ Email already updated to:', currentEmail);
      return res.status(200).json({
        success: true,
        message: 'Email already verified! You can now login with your new email.'
      });
    }

    // ✅ Update the email in Supabase Auth
    console.log('🔄 Updating email in auth...');
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Auth update error:', updateError);
      
      if (updateError.message.includes('already exists')) {
        return res.status(400).json({ 
          success: false, 
          message: 'This email is already registered to another account.' 
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to verify email change. Please try again.' 
      });
    }
    console.log('✅ Email updated in auth');

    // ✅ Update the profile
    console.log('🔄 Updating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId);

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
    } else {
      console.log('✅ Profile updated');
    }

    console.log('✅ ========== VERIFICATION COMPLETE ==========');

    return res.status(200).json({
      success: true,
      message: 'Email verified and updated successfully! You can now log in with your new email.'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error. Please try again.' 
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-email-verification
 */

const resendEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required.' 
      });
    }

    // ✅ Generate new verification token
    const verificationToken = jwt.sign(
      { 
        userId: userId, 
        newEmail: email,
        oldEmail: req.user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ✅ Send new verification email
    const verificationLink = `http://localhost:5173/verify-email/${verificationToken}`;
    
    try {
      const { sendEmailChangeVerification } = require('../utils/mailer');
      
      await sendEmailChangeVerification({
        to: email,
        newEmail: email,
        oldEmail: req.user.email,
        userName: req.user.fullName || 'User',
        verificationLink: verificationLink,
        token: verificationToken
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    await logAction(userId, 'EMAIL_VERIFICATION_RESENT', { email }, req);

    return res.status(200).json({
      success: true,
      message: `Verification email resent to ${email}. Please check your inbox.`
    });

  } catch (error) {
    console.error('[RESEND EMAIL ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};

/**
 * @desc    Cancel email change
 * @route   POST /api/auth/cancel-email-change
 */
const cancelEmailChange = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Update the pending request status
    const { data: request, error: requestError } = await supabase
      .from('email_change_requests')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select()
      .single();

    if (requestError || !request) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending email change request found.' 
      });
    }

    await logAction(userId, 'EMAIL_CHANGE_CANCELLED', { 
      newEmail: request.new_email,
      oldEmail: request.old_email
    }, req);

    return res.status(200).json({
      success: true,
      message: 'Email change request cancelled successfully.',
      email: request.old_email
    });

  } catch (error) {
    console.error('[CANCEL EMAIL ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error.' 
    });
  }
};



/**
 * @desc    Login-time 2FA code verification
 * @route   POST /api/auth/login/verify-2fa
 */
const verifyLogin2FA = async (req, res) => {
  try {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) {
      return res.status(400).json({ success: false, message: 'Code is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (decoded.stage !== '2fa_pending') {
      return res.status(401).json({ success: false, message: 'Invalid session. Please log in again.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, role_id ( role_name ), two_factor_secret')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (!profile?.two_factor_secret) {
      return res.status(400).json({ success: false, message: '2FA is not set up for this account.' });
    }

    const verified = speakeasy.totp.verify({
      secret: profile.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code.' });
    }

    await logAction(profile.id, 'LOGIN_SUCCESS', { email: decoded.email, via2FA: true }, req);

    return res.status(200).json({
      success: true,
      session: decoded.session,
      user: {
        id: decoded.authUserId,
        email: decoded.email,
        fullName: profile?.full_name,
        phone: profile?.phone_number,
        address: profile?.address,
        role: profile?.role_id?.role_name || 'CUSTOMER',
      },
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    First-time 2FA setup - Generate QR code
 * @route   POST /api/auth/2fa/setup
 */
const setup2FA = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tempToken = authHeader?.split(' ')[1];
    if (!tempToken) return res.status(401).json({ success: false, message: 'Missing session token.' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (decoded.stage !== 'setup') {
      return res.status(401).json({ success: false, message: 'Invalid session.' });
    }

    const secret = speakeasy.generateSecret({ name: `HanthanaWater (${decoded.email})` });

    await supabase
      .from('profiles')
      .update({ two_factor_temp_secret: secret.base32 })
      .eq('id', decoded.userId);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({ success: true, qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    First-time 2FA setup - Verify code and enable
 * @route   POST /api/auth/2fa/verify-setup
 */
const verifySetup2FA = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tempToken = authHeader?.split(' ')[1];
    const { token } = req.body;
    if (!tempToken) return res.status(401).json({ success: false, message: 'Missing session token.' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, role_id ( role_name ), two_factor_temp_secret')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (!profile?.two_factor_temp_secret) {
      return res.status(400).json({ success: false, message: 'Setup session not found. Please start again.' });
    }

    const verified = speakeasy.totp.verify({
      secret: profile.two_factor_temp_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
    }

    await supabase
      .from('profiles')
      .update({
        two_factor_secret: profile.two_factor_temp_secret,
        two_factor_enabled: true,
        two_factor_temp_secret: null,
      })
      .eq('id', profile.id);

    await logAction(profile.id, 'LOGIN_SUCCESS', { email: decoded.email, twoFactorJustEnabled: true }, req);

    return res.status(200).json({
      success: true,
      session: decoded.session,
      user: {
        id: decoded.authUserId,
        email: decoded.email,
        fullName: profile?.full_name,
        phone: profile?.phone_number,
        address: profile?.address,
        role: profile?.role_id?.role_name || 'CUSTOMER',
      },
    });
  } catch (error) {
    console.error('2FA verify-setup error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Decode token (for frontend to check token validity)
 * @route   GET /api/auth/decode-token/:token
 */
const decodeToken = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('🔍 Decoding token:', token);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', decoded);
    
    return res.json({
      success: true,
      decoded: {
        userId: decoded.userId,
        newEmail: decoded.newEmail,
        oldEmail: decoded.oldEmail,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Token decode error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message === 'jwt expired' ? 'Verification link has expired.' : 'Invalid verification link.'
    });
  }
};


module.exports = {
  // Auth Routes
  registerUser,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getMe,
  loginUser,
  
  //new
  registerPhase1,
  registerPhase2,
  createGoogleUserProfile,
  updateGoogleUserProfile,
  
  // Profile Routes
  updateProfile,
  updateAddress,
  getProfile,
  
  // Password Routes
  updatePassword,
  setPasswordForGoogleUser,
  
  // Email Routes
  changeEmail,
  verifyEmailChange,
  resendEmailVerification,
  cancelEmailChange,
  decodeToken,

  // Account Routes
  deleteAccount,
  
  // Permission Routes
  getUserPermissions,
  getAllRoles,
  getPermissionsByRoleName,
  
  // 2FA Routes
  verifyLogin2FA,
  setup2FA,
  verifySetup2FA,
  
  // Helpers (exported for testing)
  userHasPassword,
  checkPasswordStatus
};