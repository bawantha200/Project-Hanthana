const supabase = require('../config/db.js');
const { sendOrderConfirmationEmail } = require('../utils/mailer');

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

// 4. Admin replies to a customer's message via email
const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty.' });
    }

    // Look up the original message so we know who to email
    const { data: original, error: fetchError } = await supabase
      .from('contact_message')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // Reuse the team's existing mailer utility to send the email
    await sendOrderConfirmationEmail({
      customerEmail: original.email,
      subject: original.subject ? `Re: ${original.subject}` : 'Re: Your inquiry to Hanthana',
      message: `Hi ${original.name || 'there'},\n\n${replyMessage}\n\nBest regards,\nHanthana Water Support Team`,
    });

    // Record that this message has been replied to
    const { data, error } = await supabase
      .from('contact_message')
      .update({
        status: 'replied',
        reply_message: replyMessage,
        replied_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Reply sent successfully!',
      data: data[0],
    });
  } catch (error) {
    console.error('Reply to message error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to send reply. Please try again later.' });
  }
};

module.exports = {
  createContactMessage,
  getAllContactMessages,
  deleteContactMessage,
  replyToMessage,
};
