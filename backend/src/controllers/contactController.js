const supabase = require('../config/db.js'); 


const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, Email and Message fields are required' });
    }

    const { data, error } = await supabase
      .from('contact_message')
      .insert([{ name, email, phone, subject, message }])
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully!',
      data: data[0]
    });

  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// 2. Get all messages for Admins 
const getAllContactMessages = async (req, res) => {
  try {
    const { search } = req.query;
    

    let query = supabase
      .from('contact_message')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error('Fetch contact messages error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching messages.' });
  }
};


const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('contact_message')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Delete contact message error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error deleting message.' });
  }
};


module.exports = {
  createContactMessage,
  getAllContactMessages,
  deleteContactMessage
};