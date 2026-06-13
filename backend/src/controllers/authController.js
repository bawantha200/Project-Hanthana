const { supabase } = require('../config/db');

/**
 * @desc    Register a new user, create auth credentials, and provision a database profile
 * @route   POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // 1. Sign up the user inside Supabase Auth management system
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

    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }

    const authUser = authData.user;
    if (!authUser) {
      return res.status(400).json({ success: false, message: 'User provisioning failed.' });
    }

    // 2. Fetch the default 'CUSTOMER' role ID (Id: 4 based on our SQL script) from the roles table
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'CUSTOMER')
      .single();

    const defaultRoleId = roleError ? 4 : roleData.id; // Fallback to 4 if query fails

    // 3. Create a corresponding profile record linked to the newly created UUID
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authUser.id,
        full_name: fullName,
        phone_number: phone,
        role_id: defaultRoleId
      }]);

    if (profileError) {
      console.error('Profile creation database error:', profileError);
      return res.status(500).json({ success: false, message: 'Account created but profile linking failed.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Account and profile provisioned completely.',
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName
      }
    });

  } catch (error) {
    console.error('Registration Controller Exception:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Request Google OAuth authorization link from Supabase
 * @route   POST /api/auth/google
 */
const initiateGoogleOAuth = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/auth/callback',
        skipBrowserRedirect: true // Tells Express not to execute response redirect directly
      }
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, url: data.url });

  } catch (error) {
    console.error('Google OAuth URL Init Exception:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Exchange the returned authorization token code for a session payload
 * @route   POST /api/auth/google/callback
 */
const handleGoogleCallback = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization verification code is missing.' });
    }

    // Exchange the application access code for a session payload token state
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'OAuth authorization exchange successful.',
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Google Callback Token Exchange Exception:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Validate session token and parse profile properties along with live permission sets
 * @route   GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. Authorization format malformed.' });
    }

    const token = authHeader.split(' ')[1];

    // Authenticate the user token directly via Supabase Auth server check
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Session invalid or token expired.' });
    }

    // Fetch the user profile along with the dynamic role name from the database table map
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, phone_number, roles ( name, id )')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('User profile parsing error:', profileError);
      return res.status(404).json({ success: false, message: 'User dynamic data profile tracking mapping record not found.' });
    }

    const dynamicRoleName = profile.roles?.name || 'CUSTOMER';
    const dynamicRoleId = profile.roles?.id;

    // Fetch live system execution scope permissions for the evaluated role reference ID
    const { data: permissionRows, error: permissionError } = await supabase
      .from('role_permissions')
      .select('permissions ( name )')
      .eq('role_id', dynamicRoleId);

    if (permissionError) {
      console.error('Permissions resolving database failure:', permissionError);
      return res.status(500).json({ success: false, message: 'Authorization scope matching operational failure.' });
    }

    // Flatten data matrix rows down into standard text lists: ['view_dashboard', 'manage_inventory']
    const flatPermissions = permissionRows
      ? permissionRows.map(p => p.permissions?.name).filter(Boolean)
      : [];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: profile.full_name,
        phone: profile.phone_number,
        role: dynamicRoleName
      },
      permissions: flatPermissions
    });

  } catch (error) {
    console.error('Get Active Self Context Controller Exception:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

/**
 * @desc    Authenticate credentials against Supabase and resolve dynamic profile permissions
 * @route   POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password fields are required.' });
    }

    // 1. Authenticate user credentials directly via Supabase Auth system instance
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({ success: false, message: authError?.message || 'Authentication rejected.' });
    }

    const authUser = authData.user;

    // 2. Query dynamic profile maps to track custom properties and relational table data structures
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, phone_number, roles ( name, id )')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      console.error('User dynamic profile tracking mapping breakdown during login setup:', profileError);
      return res.status(404).json({ success: false, message: 'Profile linkage mapping could not be resolved.' });
    }

    const dynamicRoleName = profile.roles?.name || 'CUSTOMER';
    const dynamicRoleId = profile.roles?.id;

    // 3. Resolve authorization action scopes bound to the user profile's active reference keys
    const { data: permissionRows, error: permissionError } = await supabase
      .from('role_permissions')
      .select('permissions ( name )')
      .eq('role_id', dynamicRoleId);

    const flatPermissions = permissionError || !permissionRows
      ? []
      : permissionRows.map(p => p.permissions?.name).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Authentication validated successfully.',
      session: authData.session,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: profile.full_name,
        phone: profile.phone_number,
        role: dynamicRoleName
      },
      permissions: flatPermissions
    });

  } catch (error) {
    console.error('Core Login Endpoint functional crash exception:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

module.exports = {
  registerUser,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getMe,
  loginUser
};