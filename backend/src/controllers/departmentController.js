const { supabase } = require("../config/db");

const getDepartments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("department_name");

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getDepartments,
};