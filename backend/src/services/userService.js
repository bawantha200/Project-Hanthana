const supabase = require('../config/db');

class UserService {
  // ============================================================
  // GET ALL USERS (Only from profiles – no join with employees)
  // ============================================================
  async getAllUsers() {
    try {
      console.log('[UserService] 🔍 Fetching all users from profiles (no join)...');

      // ✅ Profiles table එකෙන් විතරක් Data ගන්න (roles එක්ක)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (
            id,
            role_name
          )
        `)
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('[UserService] ❌ Profile error:', profileError);
        throw profileError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('[UserService] ⚠️ No profiles found');
        return [];
      }

      console.log(`[UserService] 📊 Found ${profiles.length} profiles`);

      // ✅ Employees data එක attach නොකර Profiles පමණක් Return කරන්න
      return profiles;
    } catch (error) {
      console.error('[UserService] ❌ getAllUsers error:', error);
      throw error;
    }
  }

  // ============================================================
  // GET USER BY ID (From profiles only)
  // ============================================================
  async getUserById(id) {
    try {
      console.log(`[UserService] 🔍 Fetching user by ID: ${id}`);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (
            id,
            role_name
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (profileError) {
        console.error('[UserService] ❌ Profile error:', profileError);
        throw profileError;
      }

      if (!profile) {
        console.log('[UserService] ⚠️ User not found');
        return null;
      }

      return profile;
    } catch (error) {
      console.error('[UserService] ❌ getUserById error:', error);
      throw error;
    }
  }

  // ============================================================
  // CREATE USER (Regular Admin Create)
  // ============================================================
  async createUser(userData) {
    try {
      console.log('[UserService] ➕ Creating user...');

      const { fullName, email, phone, address, role, password } = userData;

      // Check if user exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('User with this email already exists');
      }

      // ✅ Create auth user using SUPABASE ADMIN client
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone_number: phone }
      });

      if (authError) {
        console.error('[UserService] ❌ Auth error:', authError);
        throw authError;
      }

      const userId = authData.user.id;
      console.log(`[UserService] ✅ Auth user created: ${userId}`);

      // ✅ Insert into profiles
      // ✅ Trigger already created the profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email,
          phone_number: phone || '',
          address: address || '',
          role_id: role
        })
        .eq('id', userId);

      if (profileError) {
        console.error('[UserService] ❌ Profile insert error:', profileError);
        await supabase.auth.admin.deleteUser(userId);
        throw profileError;
      }

      console.log('[UserService] ✅ Profile created');
      console.log(`[UserService] 🎯 User created: ${email}`);

      return { id: userId, email, fullName, role };
    } catch (error) {
      console.error('[UserService] ❌ createUser error:', error);
      throw error;
    }
  }

  // ============================================================
  // CREATE USER FROM EMPLOYEE (Pending → Active)
  // ✅ Employee Data අරගෙන Profile එකක් Create කරනවා
  // ✅ Join කරන්නේ නැහැ - වෙන වෙනම Tables
  // ============================================================
  async createUserFromEmployee(employeeId, password) {
    try {
      console.log(`[UserService] 👤 Creating user from employee ID: ${employeeId}`);

      // 1️⃣ Get employee data from employees table
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        console.error('[UserService] ❌ Employee not found:', empError);
        throw new Error('Employee not found');
      }

      console.log(`[UserService] 📋 Employee Data:`, {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        phone: employee.phone,
        address: employee.address
      });

      // 2️⃣ Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', employee.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('User with this email already exists');
      }

      // 3️⃣ Create auth user using SUPABASE ADMIN client
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: employee.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: employee.name,
          phone_number: employee.phone
        }
      });

      if (authError) {
        console.error('[UserService] ❌ Auth error:', authError);
        throw authError;
      }

      const userId = authData.user.id;
      console.log(`[UserService] ✅ Auth user created: ${userId}`);

      // 4️⃣ Insert into profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: userId,
          full_name: employee.name,
          phone_number: employee.phone || '',
          email: employee.email,
          address: employee.address || '',
          role_id: 3 // EMPLOYEE (Default)
        }]);

      if (profileError) {
        console.error('[UserService] ❌ Profile insert error:', profileError);
        await supabase.auth.admin.deleteUser(userId);
        throw profileError;
      }

      console.log('[UserService] ✅ Profile created');

      // 5️⃣ Update employee status to 'active'
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (updateError) {
        console.error('[UserService] ❌ Employee update error:', updateError);
        // Don't fail the whole request, user is already created
      } else {
        console.log(`[UserService] ✅ Employee ${employeeId} status updated to active`);
      }

      console.log(`[UserService] 🎯 User created from employee: ${employee.email}`);
      return {
        id: userId,
        email: employee.email,
        fullName: employee.name,
        role: 'EMPLOYEE'
      };
    } catch (error) {
      console.error('[UserService] ❌ createUserFromEmployee error:', error);
      throw error;
    }
  }

  // ============================================================
  // UPDATE USER (Update profile only)
  // ============================================================
  async updateUser(id, userData) {
    try {
      console.log(`[UserService] ✏️ Updating user: ${id}`);

      const { fullName, email, phone, address, role, status } = userData;

      // Update profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email,
          phone_number: phone,
          address,
          role_id: role
        })
        .eq('id', id);

      if (profileError) {
        console.error('[UserService] ❌ Profile update error:', profileError);
        throw profileError;
      }

      console.log('[UserService] ✅ Profile updated');

      // ✅ Update employee status separately (if status provided)
      if (status) {
        const { error: empError } = await supabase
          .from('employees')
          .update({ status })
          .eq('email', email);

        if (empError) {
          console.error('[UserService] ❌ Employee update error:', empError);
        } else {
          console.log('[UserService] ✅ Employee status updated');
        }
      }

      console.log(`[UserService] 🎯 User updated: ${email}`);
      return { id, email, fullName, role };
    } catch (error) {
      console.error('[UserService] ❌ updateUser error:', error);
      throw error;
    }
  }

  // ============================================================
  // DELETE USER (Delete from profiles only)
  // ============================================================
  async deleteUser(id) {
    try {
      console.log(`[UserService] 🗑️ Deleting user: ${id}`);

      // Get profile email first
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.error('[UserService] ❌ Profile delete error:', profileError);
        throw profileError;
      }

      console.log('[UserService] ✅ Profile deleted');

      // ✅ Update employee status to 'inactive' (if exists)
      if (profile) {
        const { error: empError } = await supabase
          .from('employees')
          .update({ status: 'inactive' })
          .eq('email', profile.email);

        if (empError) {
          console.error('[UserService] ❌ Employee update error:', empError);
        } else {
          console.log('[UserService] ✅ Employee status updated to inactive');
        }
      }

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) {
        console.error('[UserService] ❌ Auth delete error:', authError);
      } else {
        console.log('[UserService] ✅ Auth user deleted');
      }

      console.log(`[UserService] 🎯 User deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('[UserService] ❌ deleteUser error:', error);
      throw error;
    }
  }

  // ============================================================
  // UPDATE USER STATUS (Employee status by email)
  // ============================================================
  async updateUserStatus(id, status) {
    try {
      console.log(`[UserService] 🔄 Updating status for user ${id} to ${status}`);

      // Get user email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      if (!profile) {
        throw new Error('User not found');
      }

      // Update employee status by email
      const { error } = await supabase
        .from('employees')
        .update({ status })
        .eq('email', profile.email);

      if (error) {
        console.error('[UserService] ❌ Status update error:', error);
        throw error;
      }

      console.log(`[UserService] 🎯 Status updated to ${status} for ${profile.email}`);
      return true;
    } catch (error) {
      console.error('[UserService] ❌ updateUserStatus error:', error);
      throw error;
    }
  }

  // ============================================================
  // GET PENDING EMPLOYEES (Direct from employees table)
  // ✅ employees table එකෙන් pending Data විතරක් ගනී
  // ============================================================
  async getPendingEmployees() {
    try {
      console.log('[UserService] 🔍 Fetching pending employees...');

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'pending')
        .order('id', { ascending: false });

      if (error) {
        console.error('[UserService] ❌ Pending employees error:', error);
        throw error;
      }

      console.log(`[UserService] 📊 Found ${data?.length || 0} pending employees`);
      return data || [];
    } catch (error) {
      console.error('[UserService] ❌ getPendingEmployees error:', error);
      throw error;
    }
  }

  // ============================================================
  // GET ALL EMPLOYEES (Direct from employees table)
  // ============================================================
  async getAllEmployees() {
    try {
      console.log('[UserService] 🔍 Fetching all employees...');

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('[UserService] ❌ Employees error:', error);
        throw error;
      }

      console.log(`[UserService] 📊 Found ${data?.length || 0} employees`);
      return data || [];
    } catch (error) {
      console.error('[UserService] ❌ getAllEmployees error:', error);
      throw error;
    }
  }

  // ============================================================
  // UPDATE PASSWORD (for user profile)
  // ============================================================
  async updatePassword(userId, newPassword) {
    try {
      console.log(`[UserService] 🔑 Updating password for user ${userId}`);

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        console.error('[UserService] ❌ Password update error:', error);
        throw error;
      }

      console.log('[UserService] ✅ Password updated');
      return true;
    } catch (error) {
      console.error('[UserService] ❌ updatePassword error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();