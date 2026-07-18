const supabase  = require('../config/db');

/**
 * @desc    Register a new user, create auth credentials, and provision a database profile
 * @route   POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, fullName, phone, address } = req.body;
    console.log("\n--- [BACKEND REGISTER] New registration attempt ---");

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    console.log("Registering user in Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone_number: phone }
      }
    });

    if (authError) return res.status(400).json({ success: false, message: authError.message });
    const authUser = authData.user;
    if (!authUser) return res.status(400).json({ success: false, message: 'User provisioning failed.' });

    const { data: roleData } = await supabase.from('roles').select('id').eq('role_name', 'CUSTOMER').maybeSingle();
    const defaultRoleId = roleData ? roleData.id : null; 

    console.log("Inserting profile record into PostgreSQL...");
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authUser.id,
        full_name: fullName,
        phone_number: phone,
        address: address || '', 
        role_id: defaultRoleId,
        email: email
      }]);

    if (profileError) {
      console.error('[REGISTER ERROR]', profileError);
      return res.status(500).json({ success: false, message: 'Account created but profile linking failed.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { id: authUser.id, email: authUser.email, fullName, role: 'CUSTOMER' }
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
    
    // 1. Try to get existing profile with role name using a join
    let profile = null;
    let roleName = 'CUSTOMER';
    
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
      // Extract role name from the joined 'roles' object
      if (profile.roles && typeof profile.roles === 'object' && profile.roles.role_name) {
        roleName = profile.roles.role_name;
      } else if (profile.role_id) {
        // Fallback: fetch role name directly from roles table
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', profile.role_id)
          .single();
        roleName = roleData?.role_name || 'CUSTOMER';
      }
    }

    // 2. If profile doesn't exist, create a new one with default CUSTOMER role
    let isNewUser = false;
    let finalFullName = authUser.user_metadata?.full_name || 
                        authUser.user_metadata?.name || 
                        authUser.email.split('@')[0];
    let finalPhone = authUser.user_metadata?.phone_number || '';
    let finalAddress = '';

    if (!profile) {
      isNewUser = true;
      // Get default role ID for CUSTOMER
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'CUSTOMER')
        .maybeSingle();
      const defaultRoleId = roleData ? roleData.id : 3; // fallback ID

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.id,
          full_name: finalFullName,
          phone_number: finalPhone,
          address: finalAddress,
          role_id: defaultRoleId
        }]);
      
      if (insertError) console.error('Profile insert error:', insertError);
    } else {
      finalFullName = profile.full_name || finalFullName;
      finalPhone = profile.phone_number || '';
      finalAddress = profile.address || '';
    }

    // Convert role name to uppercase for consistency
    const finalRole = roleName.toUpperCase();

    console.log(`[GOOGLE CALLBACK] User ${authUser.email} has role: ${finalRole}`);

    return res.status(200).json({
      success: true,
      message: 'OAuth successful.',
      session: { access_token: accessToken },
      isNewUser,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: finalFullName,
        phone: finalPhone,
        address: finalAddress,
        role: finalRole
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
        role: profile?.role_id?.role_name || 'CUSTOMER'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Login user with email and password
 * @route   POST /api/auth/login
 */
// const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ success: false, message: 'All fields are required.' });

//     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
//     if (authError || !authData.user) return res.status(401).json({ success: false, message: authError.message });

//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('full_name, phone_number, address, role_id ( role_name )')
//       .eq('id', authData.user.id)
//       .maybeSingle();

//     return res.status(200).json({
//       success: true,
//       session: authData.session,
//       user: {
//         id: authData.user.id,
//         email: authData.user.email,
//         fullName: profile?.full_name,
//         phone: profile?.phone_number,
//         address: profile?.address,
//         role: profile?.role_id?.role_name || 'CUSTOMER'
//       }
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: 'Internal Server Error.' });
//   }
// };


const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const LOCK_DURATION_MINUTES = 15; // Fixed lock duration
const { logAction } = require('../utils/auditLogger');

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'All fields are required.' });

    // 1️⃣ Profile එක email එකෙන් fetch කරන්න (lock status check කරන්න)
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, failed_login_attempts, locked_until, full_name, phone_number, address, role_id ( role_name ), two_factor_enabled, two_factor_secret')
      .eq('email', email)
      .maybeSingle();

    // 2️⃣ Account එක දැනටමත් locked ද check කරන්න
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

    // 3️⃣ Security settings එකෙන් max attempts limit එකයි, 2FA required ද කියලාත් ගන්න
    const { data: securitySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'security')
      .maybeSingle();
    const maxAttempts = parseInt(securitySetting?.value?.loginAttempts || '5', 10);

    // 🆕 Security page එකේ toggle එකෙන් control වෙන field එක - default true (safer default)
    const twoFactorEnabledOrgWide = securitySetting?.value?.twoFactorAuth !== false;

    // 4️⃣ Actual authentication attempt
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      // Password wrong - failed attempt count එක increment කරන්න
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
          // ✅ POSITION 1 - Account lock unahama log karanna
          await logAction(profile.id, 'ACCOUNT_LOCKED', { email, attempts: newAttempts }, req);

          return res.status(423).json({
            success: false,
            message: `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`,
            locked: true,
          });
        }

        // ✅ POSITION 2 - Failed login attempt eka log karanna (lock unoth witharak nemei, hæma fail ekakma)
        await logAction(profile.id, 'LOGIN_FAILED', { email, attemptsRemaining: maxAttempts - newAttempts }, req);

        return res.status(401).json({
          success: false,
          message: `Invalid credentials. ${maxAttempts - newAttempts} attempt(s) remaining.`,
        });
      }

      return res.status(401).json({ success: false, message: authError?.message || 'Invalid credentials.' });
    }

    // 5️⃣ Login success - reset failed attempts
    if (profile) {
      await supabase
        .from('profiles')
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq('id', profile.id);
    }

    const role = profile?.role_id?.role_name?.toUpperCase() || 'CUSTOMER';

    // ============ 🆕 2FA GATE - toggle එකෙන් + role එකෙන් dynamically decide කරනවා ============
    const roleNeeds2FA = ['ADMIN', 'STAFF'].includes(role);
    const requires2FA = twoFactorEnabledOrgWide && roleNeeds2FA;

    if (requires2FA) {
      // Supabase session එක already issue වෙලා - ඒක තාවකාලිකව signed tempToken එකක් ඇතුලේ carry කරනවා,
      // 2FA verify උනාට පස්සේ ඒක client ට release කරන්න
      const tempTokenPayload = {
        userId: profile.id,
        authUserId: authData.user.id,
        email,
        session: authData.session,
      };

      if (!profile.two_factor_enabled) {
        // ✅ Setup වෙලා නෑ - QR scan කරලා enable කරන්නම ඕන
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

      // ✅ Setup වෙලා තියෙනවා - code එක type කරන්නම ඕන
      const tempToken = jwt.sign(
        { ...tempTokenPayload, stage: '2fa_pending' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      // POSITION - password correct, 2FA code එකට wait කරනවා කියලා log කරන්න
      await logAction(profile.id, 'LOGIN_2FA_PENDING', { email }, req);

      return res.status(200).json({
        success: false,
        requireTwoFactor: true,
        tempToken,
        message: 'Enter your 2FA code.',
      });
    }
    // ============ 🆕 2FA GATE ඉවරයි ============
    // Note: toggle එක off කරලා තියෙනවා නම්, හෝ user ට 2FA already enabled කරලා තියෙනවා ඒත් 
    // toggle off නම් - මේ user ට 2FA skip වෙනවා. two_factor_enabled DB එකේ true වෙලා 
    // තිබ්බත් org-wide toggle එක off නම් require කරන්නෙ නෑ.

    // ✅ POSITION 3 - Login success eka log karanna
    await logAction(authData.user.id, 'LOGIN_SUCCESS', { email }, req);

    return res.status(200).json({
      success: true,
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile?.full_name,
        phone: profile?.phone_number,
        address: profile?.address,
        role: profile?.role_id?.role_name || 'CUSTOMER'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

// ---- STEP: Login-time 2FA code verify කරනවා ----
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

    // Password check එකේදී Supabase session එක already generate වෙලා tempToken එකේ carry කරගෙන ආවේ,
    // දැන් ඒක client ට release කරනවා
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

// ---- STEP: First-time 2FA setup - QR code generate කරනවා ----
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

// ---- STEP: First-time 2FA setup - code verify කරලා enable කරනවා ----
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

    // Setup enable කරගත්තට පස්සේ, password check එකේදී generate උනු session එකම release කරනවා -
    // user ට ආපහු password type කරන්න වෙන්නෙ නෑ
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

module.exports = { loginUser };

/**
 * @desc    Update user dynamic profile (Name, Phone, Address)
 * @route   PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { fullName, phone, address } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phone,
        address: address
      })
      .eq('id', userId);

    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Update/Reset User Password
 * @route   PUT /api/auth/update-password
 */
const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: 'New password is required.' });

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: newPassword });

    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Delete user account entirely from Auth and Profiles
 * @route   DELETE /api/auth/account
 */
// DELETE /api/auth/account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;   // user must send password

    // 1. Verify current password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password,
    });

    if (signInError || !signInData.user) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // 2. Delete the Auth user (this will cascade to profiles if foreign key is set)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true, message: 'Account deleted permanently.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


// In authController.js
const getPermissionsForRole = async (req, res) => {
  try {
    const { role } = req.params;
    const roleUpper = role.toUpperCase();

    // Find role id
    const { data: roleData } = await supabase.from('roles').select('id').eq('role_name', roleUpper).single();
    if (!roleData) return res.status(404).json({ success: false, message: 'Role not found' });

    // Get permission names from role_permissions join
    const { data } = await supabase
      .from('role_permissions')
      .select('permissions (permission_name)')
      .eq('role_id', roleData.id);

    const permissions = data.map(rp => rp.permissions.permission_name);

    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get current user's permissions based on POSITION (from employees table) or ROLE (fallback)
 * @route   GET /api/auth/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ User ගේ profile එකෙන් role_id ගන්න (profiles table)
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

    // 2️⃣ User ගේ position_id එක employees table එකෙන් ගන්න
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('position_id')
      .eq('profile_id', userId)
      .maybeSingle();  // maybeSingle() නිසා Employee record එකක් නැති වුනත් Error එන්නේ නැහැ

    if (!empError && employee) {
      positionId = employee.position_id;
    }

    // 3️⃣ 🆕 Position එක තියෙනවා නම්, එයින් Permissions ගන්න (Override - Role අමතක කරන්න)
    if (positionId) {
      const { data: posPerms, error: posError } = await supabase
        .from('position_permissions')
        .select('permissions ( permission_name )')
        .eq('position_id', positionId);

      // Position permissions තියෙනවා නම්, ඒවා පමණක් යවන්න
      if (!posError && posPerms && posPerms.length > 0) {
        permissions = posPerms.map(rp => rp.permissions.permission_name);
        console.log(`[POSITION PERMISSIONS] User ${userId} (Position ID: ${positionId}) got ${permissions.length} permissions.`);
        return res.status(200).json({ success: true, permissions });
      }
    }

    // 4️⃣ ⬇️ Position නැතිනම් හෝ එහි permissions නැතිනම්, පැරණි Role permissions වෙත යන්න (Fallback)
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
 * @desc    Get permissions for a specific role by role name
 * @route   GET /api/auth/permissions/:roleName
 */
const getPermissionsByRoleName = async (req, res) => {
  try {
    const { roleName } = req.params;
    const roleUpper = roleName.toUpperCase();

    // Find role id
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', roleUpper)
      .single();

    if (roleError || !role) {
      return res.status(200).json({ success: true, permissions: [] });
    }

    // Fetch permissions for that role
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


module.exports = {
  registerUser,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getMe,
  loginUser,
  updateProfile,
  updatePassword,
  deleteAccount,
  getUserPermissions,      
  getAllRoles,             
  getPermissionsByRoleName,
  getProfile ,
  verifyLogin2FA, setup2FA, verifySetup2FA
};