'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, CheckCheck, Phone, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, isDemoMode } from '../../../lib/api';
import {
  DEMO_WHATSAPP_CONVERSATIONS,
  DEMO_WHATSAPP_TEMPLATES,
  getDemoWhatsAppMessages,
} from '../../../lib/demoData';
import useSocket from '../../../hooks/useSocket';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';

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
    if (isDemoMode()) {
      setConversations(DEMO_WHATSAPP_CONVERSATIONS);
      if (DEMO_WHATSAPP_CONVERSATIONS.length > 0 && !activeChat) {
        handleSelectChat(DEMO_WHATSAPP_CONVERSATIONS[0], true);
      }
      setFetchingThreads(false);
      return;
    }
    try {
      const convRes = await api.get('/whatsapp/conversations');
      if (convRes.success) {
        setConversations(convRes.data);
        if (convRes.data.length > 0 && !activeChat) handleSelectChat(convRes.data[0]);
      }
    } catch {
      setConversations(DEMO_WHATSAPP_CONVERSATIONS);
      if (DEMO_WHATSAPP_CONVERSATIONS.length > 0 && !activeChat) {
        handleSelectChat(DEMO_WHATSAPP_CONVERSATIONS[0], true);
      }
    } finally {
      setFetchingThreads(false);
    }
  };

  const fetchTemplates = async () => {
    if (isDemoMode()) { setTemplates(DEMO_WHATSAPP_TEMPLATES); return; }
    try {
      const tplRes = await api.get('/whatsapp/templates');
      if (tplRes.success) setTemplates(tplRes.data);
    } catch {
      setTemplates(DEMO_WHATSAPP_TEMPLATES);
    }
  };

  useEffect(() => { fetchConversations(); fetchTemplates(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!on) return;
    const cleanup = on('whatsapp:received', (data) => {
      if (activeChat && data.leadId === activeChat.leadId) {
        setMessages((prev) => [...prev, {
          id: data.messageId || Math.random().toString(36).substring(7),
          direction: 'INBOUND', content: data.message, sentAt: new Date(),
        }]);
      }
      setConversations((prevList) => {
        const index = prevList.findIndex((c) => c.leadId === data.leadId);
        if (index > -1) {
          const updated = [...prevList];
          updated[index] = { ...updated[index], lastMessage: data.message, lastMessageTime: new Date() };
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        }
        return [{ leadId: data.leadId, name: data.leadName || 'Lead', phone: data.phone || '', lastMessage: data.message, lastMessageTime: new Date() }, ...prevList];
      });
    });
    return cleanup;
  }, [activeChat, on]);

  const handleSelectChat = async (chat, demo = false) => {
    setActiveChat(chat);
    setLoading(true);
    if (demo || isDemoMode()) {
      setMessages(getDemoWhatsAppMessages(chat.leadId));
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/whatsapp/conversations/${chat.leadId}`);
      if (res.success) setMessages(res.data);
    } catch {
      setMessages(getDemoWhatsAppMessages(chat.leadId));
    } finally {
      setLoading(false);
    }
  };

  const handleSendTemplate = async (e) => {
    e.preventDefault();
    if (!activeChat || !selectedTemplate) {
      toast.error('Please select a template.');
      return;
    }
    setLoading(true);
    const templateContent = `[Template: ${selectedTemplate}]${variable ? ` (${variable})` : ''}`;
    if (isDemoMode()) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'OUTBOUND', content: templateContent, sentAt: new Date() }]);
      setConversations((prev) => prev.map((c) => c.leadId === activeChat.leadId ? { ...c, lastMessage: templateContent, lastMessageTime: new Date() } : c));
      toast.success('Template sent.');
      setSelectedTemplate(''); setVariable(''); setLoading(false);
      return;
    }
    try {
      const res = await api.post('/whatsapp/send', { leadId: activeChat.leadId, templateName: selectedTemplate, variables: variable ? [variable] : [] });
      if (res.success) {
        toast.success('Template sent.');
        setMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'OUTBOUND', content: templateContent, sentAt: new Date() }]);
        setConversations((prev) => prev.map((c) => c.leadId === activeChat.leadId ? { ...c, lastMessage: templateContent, lastMessageTime: new Date() } : c));
        setSelectedTemplate(''); setVariable('');
      }
    } catch (err) {
      toast.error(err.message || 'Send failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="WhatsApp"
        description="Outbound template messages and inbound customer replies."
        action={
          <button onClick={fetchConversations} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="flex-1 flex overflow-hidden card min-h-[500px]">
        <div className="w-72 border-r border-border flex flex-col bg-muted-surface/40">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Conversations</span>
            {fetchingThreads && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {conversations.length > 0 ? conversations.map((chat) => {
              const isActive = activeChat?.leadId === chat.leadId;
              return (
                <div key={chat.leadId} onClick={() => handleSelectChat(chat)}
                  className={`p-4 cursor-pointer flex items-start gap-3 transition-colors ${isActive ? 'bg-primary-light border-l-2 border-l-primary' : 'hover:bg-muted-surface'}`}>
                  <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-xs font-semibold text-muted flex-shrink-0">
                    {chat.name?.charAt(0) || 'L'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-sm font-medium truncate">{chat.name}</span>
                      {chat.lastMessageTime && (
                        <span className="text-2xs text-muted flex-shrink-0">
                          {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{chat.lastMessage || 'No messages'}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-sm text-muted py-16">No conversations found.</p>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {activeChat ? (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                  {activeChat.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <h4 className="text-sm font-medium">{activeChat.name}</h4>
                  <span className="text-xs text-muted flex items-center gap-1"><Phone className="w-3 h-3" />{activeChat.phone}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-background">
                {messages.length > 0 ? messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md px-3.5 py-2.5 rounded-md text-sm border ${
                        isOut ? 'bg-primary text-primary-foreground border-primary rounded-tr-sm' : 'bg-card border-border rounded-tl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 text-2xs opacity-70 mt-1.5">
                          <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOut && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-sm text-muted py-16">No messages. Send a template to initiate contact.</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendTemplate} className="p-4 border-t border-border space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="select flex-1">
                    <option value="">Select template...</option>
                    {templates.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.language || 'en'})</option>)}
                  </select>
                  <input type="text" value={variable} onChange={(e) => setVariable(e.target.value)}
                    placeholder="Variable (optional)" className="input flex-1" />
                  <button type="submit" disabled={loading || !selectedTemplate} className="btn-primary px-4">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
                  </button>
                </div>
                <p className="text-2xs text-muted">Per Meta policy, outbound sessions must begin with an approved template message.</p>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2">
              <MessageSquare className="w-8 h-8" />
              <p className="text-sm">Select a conversation to view messages.</p>
            </div>
          )}
        </div>

        {activeChat && (
          <div className="w-56 border-l border-border p-4 hidden xl:flex flex-col gap-5 bg-muted-surface/30">
            <div>
              <p className="text-2xs font-semibold text-muted uppercase tracking-wide mb-3">Lead context</p>
              <div className="card p-4 text-center">
                <div className="w-10 h-10 rounded-md bg-primary-light text-primary mx-auto flex items-center justify-center font-semibold text-sm">
                  {activeChat.name?.charAt(0) || 'L'}
                </div>
                <p className="text-sm font-medium mt-2 truncate">{activeChat.name}</p>
                <p className="text-xs text-muted truncate">{activeChat.phone}</p>
              </div>
            </div>
            <div>
              <p className="text-2xs text-muted uppercase font-semibold mb-1">Stage</p>
              <p className="text-sm">{activeChat.stageName || 'Lead captured'}</p>
            </div>
            {activeChat.score && (
              <div>
                <p className="text-2xs text-muted uppercase font-semibold mb-1">AI score</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{activeChat.score}/100</span>
                  <Badge variant="HOT">Hot</Badge>
                </div>
              </div>
            )}
            <button onClick={() => toast.success('AI qualifier call queued.')} className="btn-secondary w-full text-xs mt-auto">
              Schedule qualifier call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
