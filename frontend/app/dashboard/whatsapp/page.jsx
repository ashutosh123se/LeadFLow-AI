'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquare, Send, CheckCheck, Bot, User, Phone, Mail, 
  Sparkles, Layers, FileText, ArrowLeft, RefreshCw, Calendar, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import useSocket from '../../../hooks/useSocket';

export default function WhatsappPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variable, setVariable] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingThreads, setFetchingThreads] = useState(false);
  const messagesEndRef = useRef(null);

  const { on } = useSocket();

  const fetchConversations = async () => {
    setFetchingThreads(true);
    try {
      const convRes = await api.get('/whatsapp/conversations');
      if (convRes.success) {
        setConversations(convRes.data);
        if (convRes.data.length > 0 && !activeChat) {
          handleSelectChat(convRes.data[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to load conversations.');
    } finally {
      setFetchingThreads(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const tplRes = await api.get('/whatsapp/templates');
      if (tplRes.success) {
        setTemplates(tplRes.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle incoming real-time WhatsApp messages via hook
  useEffect(() => {
    if (!on) return;

    const cleanup = on('whatsapp:received', (data) => {
      // If the incoming message belongs to the active chat
      if (activeChat && data.leadId === activeChat.leadId) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId || Math.random().toString(36).substring(7),
            direction: 'INBOUND',
            content: data.message,
            sentAt: new Date()
          }
        ]);
      }

      // Update conversations list in sidebar
      setConversations((prevList) => {
        const index = prevList.findIndex(c => c.leadId === data.leadId);
        if (index > -1) {
          const updated = [...prevList];
          updated[index] = {
            ...updated[index],
            lastMessage: data.message,
            lastMessageTime: new Date()
          };
          // Move updated conversation to the top
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          // New conversation thread
          return [{
            leadId: data.leadId,
            name: data.leadName || 'Lead',
            phone: data.phone || '',
            lastMessage: data.message,
            lastMessageTime: new Date()
          }, ...prevList];
        }
      });
    });

    return cleanup;
  }, [activeChat, on]);

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    setLoading(true);
    try {
      const res = await api.get(`/whatsapp/conversations/${chat.leadId}`);
      if (res.success) {
        setMessages(res.data);
      }
    } catch {
      toast.error('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTemplate = async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!selectedTemplate) {
      toast.error('Please select a template to send.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/send', {
        leadId: activeChat.leadId,
        templateName: selectedTemplate,
        variables: variable ? [variable] : []
      });
      if (res.success) {
        toast.success('Template sent!');
        const templateContent = `[Meta Template: ${selectedTemplate}] ${variable ? `(${variable})` : ''}`;
        
        // Append message locally
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            direction: 'OUTBOUND',
            content: templateContent,
            sentAt: new Date()
          }
        ]);

        // Update sidebar last message
        setConversations(prev => prev.map(c => 
          c.leadId === activeChat.leadId 
            ? { ...c, lastMessage: templateContent, lastMessageTime: new Date() } 
            : c
        ));

        setSelectedTemplate('');
        setVariable('');
      }
    } catch (err) {
      toast.error(err.message || 'Template send failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden relative">
      {/* Header Panel */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-400" /> WhatsApp Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage outbound templates and real-time customer replies.</p>
        </div>
        <button 
          onClick={fetchConversations}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Threads
        </button>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-slate-900 glass min-h-[500px]">
        {/* Left Side: Threads list */}
        <div className="w-80 border-r border-slate-900 flex flex-col overflow-hidden bg-slate-950/20">
          <div className="p-4 border-b border-slate-900/80 bg-slate-950/40 text-[10px] text-slate-400 uppercase tracking-widest font-bold flex justify-between items-center">
            <span>Conversations</span>
            {fetchingThreads && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {conversations.length > 0 ? (
              conversations.map((chat) => {
                const isActive = activeChat?.leadId === chat.leadId;
                return (
                  <div 
                    key={chat.leadId} 
                    onClick={() => handleSelectChat(chat)}
                    className={`p-4 cursor-pointer hover:bg-slate-900/20 transition-all flex items-start gap-3 ${
                      isActive ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 text-slate-300">
                      {chat.name ? chat.name.charAt(0) : 'L'}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-xs truncate text-slate-200">{chat.name}</span>
                        {chat.lastMessageTime && (
                          <span className="text-[8px] text-slate-500 flex-shrink-0">
                            {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-1">{chat.lastMessage || 'No messages yet'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-24 text-xs text-slate-700">No message threads found.</div>
            )}
          </div>
        </div>

        {/* Middle Pane: Chat Screen */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/10">
          {activeChat ? (
            <>
              {/* Chat Window Header */}
              <div className="p-4 border-b border-slate-900 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase text-indigo-400">
                    {activeChat.name ? activeChat.name.charAt(0) : 'L'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{activeChat.name}</h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {activeChat.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message History Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isOut = msg.direction === 'OUTBOUND';
                    return (
                      <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-normal border shadow-md ${
                          isOut 
                            ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-500/40' 
                            : 'bg-slate-900 text-slate-200 rounded-tl-none border-slate-800'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 text-[8px] opacity-60 mt-2">
                            <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOut && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 text-xs text-slate-700">No dialogue exchange. Send a template message.</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer (Meta Template Sender) */}
              <form onSubmit={handleSendTemplate} className="p-4 border-t border-slate-900 bg-slate-950/60 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-400 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select template notification...</option>
                    {templates.map((t) => (
                      <option key={t.name} value={t.name}>{t.name} ({t.language || 'en'})</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    value={variable} 
                    onChange={(e) => setVariable(e.target.value)} 
                    placeholder="Enter variable parameter (e.g. Rahul)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" 
                  />
                  <button 
                    type="submit" 
                    disabled={loading || !selectedTemplate} 
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-bold text-white shadow-lg transition-colors"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Dispatch</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  ⚠️ Note: Per Meta guidelines, you can only initiate chat sessions with template notifications. Once the client replies, the session opens.
                </p>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-700 space-y-2">
              <Bot className="w-8 h-8 text-slate-800 animate-bounce" />
              <div className="text-xs">Choose a conversation thread from sidebar.</div>
            </div>
          )}
        </div>

        {/* Right Side: Contact details context */}
        {activeChat && (
          <div className="w-64 border-l border-slate-900 bg-slate-950/40 p-5 hidden xl:flex flex-col gap-6 overflow-y-auto">
            <div>
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Lead Context</h5>
              <div className="glass p-4 border border-slate-900 rounded-2xl flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
                  {activeChat.name ? activeChat.name.charAt(0) : 'L'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white truncate max-w-[160px]">{activeChat.name}</h4>
                  <span className="text-[9px] text-slate-500 block truncate mt-0.5">{activeChat.phone}</span>
                </div>
              </div>
            </div>

            {/* Profile Info fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Status & Stage</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs text-slate-300 font-semibold uppercase">{activeChat.stageName || 'Lead Captured'}</span>
                </div>
              </div>

              {activeChat.score && (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">AI Rating</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-black text-white">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>{activeChat.score}/100</span>
                    <span className="text-[9px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-bold text-red-400 uppercase">HOT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Quick Dial */}
            <div className="mt-auto">
              <button 
                onClick={async () => {
                  try {
                    const res = await api.post(`/leads/${activeChat.leadId}/call`);
                    if (res.success) {
                      toast.success('AI Call Dialing...');
                    }
                  } catch (err) {
                    toast.error(err.message || 'Call trigger failed.');
                  }
                }}
                className="w-full py-2.5 rounded-xl border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" /> Dial AI Qualifier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
