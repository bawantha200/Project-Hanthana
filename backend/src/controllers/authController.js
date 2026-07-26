const supabase = require('../config/db');
const supabaseAdmin = supabase.supabaseAdmin;

const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const LOCK_DURATION_MINUTES = 15;
const { logAction } = require('../utils/auditLogger');

// ============================================================
// ==================== HELPER FUNCTIONS ======================


/**
 * Helper function to check if a user has a password
 * Checks both email identity and metadata flag
 */
const userHasPassword = async (userId) => {
  try {
    // Try using supabaseAdmin first, fallback to supabase
    const client = supabaseAdmin || supabase;
    const { data: user, error } = await client.auth.admin.getUserById(userId);
    if (error || !user) return false;
    
    const identities = user.user?.identities || [];
    
    // Check if user has an email identity (means they have a password)
    const hasEmailIdentity = identities.some(id => id.provider === 'email');
    
    // Also check if they have password in metadata (backup check)
    const hasPasswordInMetadata = user.user?.user_metadata?.has_password === true;
    
    // Return true if they have email identity OR password metadata
    return hasEmailIdentity || hasPasswordInMetadata;
  } catch (error) {
    console.error('Error checking user password:', error);
    return false;
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

    // 1️⃣ Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName, 
          phone_number: phone
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
          phone_number: phone,
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
          phone_number: phone,
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
        roles ( role_name )
      `)
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profileError && profileData) {
      profile = profileData;
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
    let finalPhone = authUser.user_metadata?.phone_number || '';
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
          phone_number: finalPhone,
          address: finalAddress,
          role_id: defaultRoleId,
          email: authUser.email
        }]);
      
      if (insertError) console.error('Profile insert error:', insertError);
    } else {
      finalFullName = profile.full_name || finalFullName;
      finalPhone = profile.phone_number || '';
      finalAddress = profile.address || '';
    }

    const finalRole = roleName.toUpperCase();

    return res.status(200).json({
      success: true,
      message: 'OAuth successful.',
      session: { access_token: accessToken },
      isNewUser,
      hasPassword,
      authProvider,
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

    // CRITICAL: Always require current password for address updates
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

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Check if user has password
    const hasPassword = await userHasPassword(userId);

    // If user has password, verify it
    if (hasPassword) {
      if (!password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password is required to delete account.' 
        });
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password,
      });

      if (signInError || !signInData.user) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    // ✅ STEP 1: Keep audit logs - just remove the user_id reference
    console.log('🔄 Updating audit logs (keeping history)...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .update({ user_id: null })
      .eq('user_id', userId);
    
    if (auditError) {
      console.warn('⚠️ Audit log update warning:', auditError.message);
      // If update fails, try soft delete approach
    } else {
      console.log('✅ Audit logs preserved (user_id set to NULL)');
    }

    // ✅ STEP 2: Delete from profiles
    console.log('🗑️ Deleting profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.warn('⚠️ Profile delete warning:', profileError.message);
    } else {
      console.log('✅ Profile deleted');
    }

    // ✅ STEP 3: Delete from auth using REST API
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
        message: 'Account deleted permanently. Audit logs preserved.' 
      });
    }

    if (response.status === 404) {
      return res.status(200).json({ 
        success: true, 
        message: 'Account already deleted.' 
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(200).json({ success: true, permissions: [] });
    }

    let permissions = [];
    let positionId = null;

    // Get user's position_id from employees table
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('position_id')
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


module.exports = {
  // Auth Routes
  registerUser,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getMe,
  loginUser,
  
  // Profile Routes
  updateProfile,
  updateAddress,
  getProfile,
  
  // Password Routes
  updatePassword,
  setPasswordForGoogleUser,
  
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
  userHasPassword
};