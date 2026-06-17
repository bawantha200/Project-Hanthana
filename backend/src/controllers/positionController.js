const { supabase } = require("../config/db");

const getPositions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("position_name");

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
  getPositions,
};