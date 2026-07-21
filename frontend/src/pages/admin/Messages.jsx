// pages/ContactMessages.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Search, Trash2, AlertTriangle, X, MessageSquare, Calendar, User, Phone, Reply, Send, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Reply modal state
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch Messages
  const fetchMessages = async (searchTerm = '') => {
    try {
      const url = new URL(`${API_BASE}/contact`);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open delete confirm
  const openDeleteModal = (msg, e) => {
    e.stopPropagation();
    setMsgToDelete(msg);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!msgToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/contact/${msgToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete message');

      toast.success('Message deleted successfully!');
      setShowDeleteModal(false);
      setMsgToDelete(null);
      if (selectedMessage?.id === msgToDelete.id) setSelectedMessage(null);
      fetchMessages(search);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Open reply modal
  const openReplyModal = (msg, e) => {
    if (e) e.stopPropagation();
    setReplyTarget(msg);
    setReplyText('');
  };

  // Send reply
  const handleSendReply = async () => {
    if (!replyTarget || !replyText.trim()) {
      toast.error('Please write a reply before sending.');
      return;
    }

    try {
      setSendingReply(true);
      const res = await fetch(`${API_BASE}/contact/${replyTarget.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyMessage: replyText }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send reply');
      }

      toast.success(`Reply sent to ${replyTarget.email}!`);
      setReplyTarget(null);
      setReplyText('');
      if (selectedMessage?.id === data.data.id) setSelectedMessage(data.data);
      fetchMessages(search);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const totalMessages = messages.length;
  const pendingCount = messages.filter((m) => m.status !== 'replied').length;

  if (loading) return <div className="p-6 text-center text-sm text-gray-500">Loading contact messages...</div>;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteModal && msgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Message</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete the message from <strong>{msgToDelete.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== VIEW FULL MESSAGE MODAL ===== */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setSelectedMessage(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="text-base font-semibold text-gray-900 truncate">Subject: {selectedMessage.subject || 'No Subject'}</h3>
              <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 text-gray-900 font-medium"><User size={16} className="text-gray-400"/> {selectedMessage.name}</div>
              <div className="flex items-center gap-2"><Mail size={16} className="text-gray-400"/> {selectedMessage.email}</div>
              {selectedMessage.phone && <div className="flex items-center gap-2"><Phone size={16} className="text-gray-400"/> {selectedMessage.phone}</div>}
              <div className="flex items-center gap-2 text-gray-400 text-xs"><Calendar size={14}/> {new Date(selectedMessage.created_at).toLocaleString()}</div>
              <hr className="my-2" />
              <div className="bg-gray-50 p-4 rounded-xl whitespace-pre-line text-gray-600 border border-gray-100 leading-relaxed">
                {selectedMessage.message}
              </div>

              {selectedMessage.status === 'replied' && selectedMessage.reply_message && (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1.5">
                    <CheckCircle2 size={14} /> Your reply
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl whitespace-pre-line text-gray-700 border border-emerald-100 leading-relaxed">
                    {selectedMessage.reply_message}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { setSelectedMessage(null); openReplyModal(selectedMessage); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Reply size={15} /> {selectedMessage.status === 'replied' ? 'Reply again' : 'Reply'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== REPLY MODAL ===== */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => !sendingReply && setReplyTarget(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900">Reply to {replyTarget.name}</h3>
              <button onClick={() => !sendingReply && setReplyTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">This will be emailed directly to <span className="font-medium text-gray-700">{replyTarget.email}</span></p>

            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 mb-4 border border-gray-100">
              <span className="font-semibold text-gray-600">Their message: </span>
              <span className="line-clamp-2">{replyTarget.message}</span>
            </div>

            <textarea
              rows={6}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply here..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              disabled={sendingReply}
            />

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setReplyTarget(null)}
                disabled={sendingReply}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                <Send size={15} /> {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbound Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage client inquiries from the Contact Us form.</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <MessageSquare size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Inquiries</p>
                <p className="text-xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Mail size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Awaiting Reply</p>
                <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">Messages List</span>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-60"
            />
          </div>
        </div>

        {/* 💻 ===== DATA TABLE VIEW ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <table className="w-full text-left border-collapse sticky-header">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Phone</th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-semibold text-gray-900">{msg.name}</td>
                    <td className="py-3.5 px-5 text-gray-500">{msg.email}</td>
                    <td className="py-3.5 px-5 text-gray-500">{msg.phone || '-'}</td>
                    <td className="py-3.5 px-5 text-gray-600 max-w-[180px] truncate">{msg.subject || 'No Subject'}</td>
                    <td className="py-3.5 px-5">
                      {msg.status === 'replied' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Replied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-gray-400 text-xs">{new Date(msg.created_at).toLocaleDateString()}</td>

                    {/* Action Column */}
                    <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => openReplyModal(msg, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Reply to this message"
                        >
                          <Reply size={15} />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(msg, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Delete Message"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {messages.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-400 text-sm">No messages found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
