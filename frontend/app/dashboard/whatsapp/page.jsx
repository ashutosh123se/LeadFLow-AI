'use client';
import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, CheckCheck, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function WhatsappPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variable, setVariable] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [convRes, tplRes] = await Promise.all([api.get('/whatsapp/conversations'), api.get('/whatsapp/templates')]);
        if (convRes.success) { setConversations(convRes.data); if (convRes.data.length > 0) handleSelectChat(convRes.data[0]); }
        if (tplRes.success) setTemplates(tplRes.data);
      } catch {}
    })();
  }, []);

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    try {
      const res = await api.get(`/whatsapp/conversations/${chat.leadId}`);
      if (res.success) setMessages(res.data);
    } catch {}
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) { toast.error('Select a template.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/send', { leadId: activeChat.leadId, templateName: selectedTemplate, variables: variable ? [variable] : [] });
      if (res.success) {
        toast.success('Template dispatched!');
        setMessages(prev => [...prev, { id: Math.random().toString(), direction: 'OUTBOUND', content: `[Template: ${selectedTemplate}]`, sentAt: new Date() }]);
        setSelectedTemplate(''); setVariable('');
      }
    } catch (err) { toast.error('Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" /> WhatsApp Live Chat
        </h2>
        <p className="text-sm text-slate-400 mt-1">Official Meta Business API Inbox.</p>
      </div>
      <div className="flex-1 flex gap-6 overflow-hidden rounded-3xl border border-slate-900 glass min-h-[500px]">
        <div className="w-72 border-r border-slate-900/80 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-900 bg-slate-950/40 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Threads</div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {conversations.map((chat) => (
              <div key={chat.leadId} onClick={() => handleSelectChat(chat)}
                className={`p-4 cursor-pointer hover:bg-slate-900/20 transition-all flex items-start gap-3 ${activeChat?.leadId === chat.leadId ? 'bg-indigo-500/5' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">{chat.name.charAt(0)}</div>
                <div className="overflow-hidden flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-xs truncate text-slate-200">{chat.name}</span>
                    <span className="text-[9px] text-slate-500">{new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1">{chat.lastMessage}</div>
                </div>
              </div>
            ))}
            {conversations.length === 0 && <div className="text-center py-20 text-xs text-slate-600">No threads yet.</div>}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-slate-900 bg-slate-950/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{activeChat.name.charAt(0)}</div>
                <div>
                  <h4 className="font-bold text-xs">{activeChat.name}</h4>
                  <span className="text-[9px] text-slate-400">{activeChat.phone}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm p-3.5 rounded-2xl text-xs leading-normal border ${isOut ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-500' : 'bg-slate-900 text-slate-100 rounded-tl-none border-slate-800'}`}>
                        {msg.content}
                        <div className="flex items-center justify-end gap-1 text-[8px] opacity-60 mt-1.5">
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isOut && <CheckCheck className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="p-4 border-t border-slate-900 bg-slate-950/60 flex gap-3">
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-400 focus:outline-none">
                  <option value="">Select Template...</option>
                  {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <input type="text" value={variable} onChange={(e) => setVariable(e.target.value)} placeholder="Parameter..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none" />
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 text-xs font-semibold disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-700 space-y-2">
              <Bot className="w-8 h-8 text-slate-800 animate-bounce" />
              <div className="text-xs">Select a conversation thread.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
