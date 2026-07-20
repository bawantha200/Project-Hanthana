const supabase = require('../config/db');

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
    const defaultRoleId = roleData ? roleData.id : 3;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authUser.id,
        full_name: fullName,
        phone_number: phone,
        address: address || '',
        role_id: defaultRoleId
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
          role_id: defaultRoleId
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
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'All fields are required.' });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) return res.status(401).json({ success: false, message: authError.message });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone_number, address, role_id ( role_name )')
      .eq('id', authData.user.id)
      .maybeSingle();

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
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password,
    });

    if (signInError || !signInData.user) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true, message: 'Account deleted permanently.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
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
 * @desc    Get current user's permissions based on POSITION (from employees table) or ROLE (fallback)
 * @route   GET /api/auth/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const userId = req.user.id;

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

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('position_id')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!empError && employee) {
      positionId = employee.position_id;
    }

    if (positionId) {
      const { data: posPerms, error: posError } = await supabase
        .from('position_permissions')
        .select('permissions ( permission_name )')
        .eq('position_id', positionId);

      if (!posError && posPerms && posPerms.length > 0) {
        permissions = posPerms.map(rp => rp.permissions.permission_name);
        return res.status(200).json({ success: true, permissions });
      }
    }

    if (profile.role_id) {
      const { data: rolePerms, error: rpError } = await supabase
        .from('role_permissions')
        .select('permissions ( permission_name )')
        .eq('role_id', profile.role_id);

      if (!rpError) {
        permissions = rolePerms.map(rp => rp.permissions.permission_name);
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
  getProfile
};