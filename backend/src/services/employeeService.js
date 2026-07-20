const supabase = require('../../config/db');

class EmployeeService {
  // Get all employees with filters
  async getAllEmployees(filters = {}) {
    try {
      let query = supabase.from('employees').select('*');
      
      if (filters.position && filters.position !== 'All') {
        query = query.eq('position', filters.position);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,position.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get employee by ID
  async getEmployeeById(id) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create new employee
  async createEmployee(employeeData) {
    try {
      // Check if email exists
      const { data: existingEmail } = await supabase
        .from('employees')
        .select('email')
        .eq('email', employeeData.email)
        .maybeSingle();
      
      if (existingEmail) {
        return { success: false, error: 'Email already exists' };
      }
      
      const formattedData = {
        name: employeeData.name,
        position: employeeData.position,
        phone: employeeData.phone,
        email: employeeData.email,
        hire_date: employeeData.hireDate,
        status: employeeData.status || 'active',
        role: employeeData.role || 'EMPLOYEE',
        branch: employeeData.branch || 'Main Branch',
        base_salary: employeeData.baseSalary || 25000,
        ot_rate: employeeData.otRate || 500,
        birthday: employeeData.birthday,
        gender: employeeData.gender,
        nic: employeeData.nic,
        address: employeeData.address,
        marriage_status: employeeData.marriageStatus,
        job_type: employeeData.jobType,
        profile_image: employeeData.profileImage,
        avatar: employeeData.name.charAt(0).toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('employees')
        .insert([formattedData])
        .select();
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update employee
  async updateEmployee(id, updateData) {
    try {
      // Check if employee exists
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (!existing) {
        return { success: false, error: 'Employee not found' };
      }
      
      // Check email uniqueness if updating
      if (updateData.email) {
        const { data: emailCheck } = await supabase
          .from('employees')
          .select('email')
          .eq('email', updateData.email)
          .neq('id', id)
          .maybeSingle();
        
        if (emailCheck) {
          return { success: false, error: 'Email already in use' };
        }
      }
      
      const formattedData = {};
      if (updateData.name) formattedData.name = updateData.name;
      if (updateData.position) formattedData.position = updateData.position;
      if (updateData.phone) formattedData.phone = updateData.phone;
      if (updateData.email) formattedData.email = updateData.email;
      if (updateData.hireDate) formattedData.hire_date = updateData.hireDate;
      if (updateData.status) formattedData.status = updateData.status;
      if (updateData.role) formattedData.role = updateData.role;
      if (updateData.branch) formattedData.branch = updateData.branch;
      if (updateData.baseSalary) formattedData.base_salary = updateData.baseSalary;
      if (updateData.otRate) formattedData.ot_rate = updateData.otRate;
      if (updateData.birthday) formattedData.birthday = updateData.birthday;
      if (updateData.gender) formattedData.gender = updateData.gender;
      if (updateData.nic) formattedData.nic = updateData.nic;
      if (updateData.address) formattedData.address = updateData.address;
      if (updateData.marriageStatus) formattedData.marriage_status = updateData.marriageStatus;
      if (updateData.jobType) formattedData.job_type = updateData.jobType;
      if (updateData.profileImage) formattedData.profile_image = updateData.profileImage;
      if (updateData.name) formattedData.avatar = updateData.name.charAt(0).toUpperCase();
      
      formattedData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('employees')
        .update(formattedData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete employee
  async deleteEmployee(id) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', id)
        .maybeSingle();
      
      if (!existing) {
        return { success: false, error: 'Employee not found' };
      }
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true, data: existing };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get employee statistics
  async getEmployeeStats() {
    try {
      const { data: total } = await supabase
        .from('employees')
        .select('id', { count: 'exact' });
      
      const { data: active } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('status', 'active');
      
      const { data: onLeave } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('status', 'on_leave');
      
      const { data: managers } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('role', 'MANAGER');
      
      return {
        success: true,
        data: {
          total: total.length,
          active: active.length,
          onLeave: onLeave.length,
          managers: managers.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmployeeService();
