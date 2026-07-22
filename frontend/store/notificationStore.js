import { create } from 'zustand';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  socket: null,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [
        {
          id: Math.random().toString(36).substring(7),
          time: new Date(),
          ...notification,
        },
        ...state.notifications,
      ],
    }));
  },

  initSocket: (orgId) => {
    if (get().socket) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
      : 'https://api.leadflowai.com';

    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socket.on('connect', () => {
      console.log('Realtime WebSocket connected.');
    });

    // Real-time events
    socket.on('lead:created', (data) => {
      const name = data.name || data.lead?.name || 'New Lead';
      const source = data.source || data.lead?.source || 'Form';
      const leadId = data.leadId || data.lead?.id;

      toast.success(`New lead received: ${name} (${source})`);
      
      get().addNotification({
        title: 'New Lead Captured',
        message: `Lead "${name}" captured from ${source}`,
      });

      // Dynamically import to update leadStore
      import('./leadStore').then((store) => {
        if (leadId) {
          store.default.getState().addLead({
            id: leadId,
            name,
            source,
            status: 'NEW',
            createdAt: new Date(),
            phone: data.phone || '',
          });
        }
      });
    });

    socket.on('call:initiated', (data) => {
      const name = data.leadName || 'Lead';
      toast(`AI Call initiated for ${name}...`, { icon: '📞' });

      get().addNotification({
        title: 'AI Call Dialing',
        message: `Calling lead ${name} (${data.phone})`,
      });

      import('./leadStore').then((store) => {
        store.default.getState().updateLead({
          id: data.leadId,
          status: 'CONTACTED',
          lastContactedAt: new Date(),
        });
      });
    });

    socket.on('call:failed', (data) => {
      toast.error(`Call failed: ${data.reason || 'Unreachable'}`);
      
      get().addNotification({
        title: 'AI Call Failed',
        message: `Failed to qualify: ${data.reason || 'Unknown error'}`,
      });
    });

    socket.on('call:completed', (data) => {
      const { leadId, score, scoreLabel, summary } = data;
      const msg = `AI Call complete. Lead score: ${score}/100 [${scoreLabel}]. ${summary || ''}`;
      
      if (scoreLabel === 'HOT') {
        toast.success(msg, { duration: 6000 });
      } else {
        toast(msg, { duration: 6000, icon: '📊' });
      }

      get().addNotification({
        title: `Lead Qualified: ${scoreLabel}`,
        message: `AI call completed. Score: ${score}/100. ${summary || ''}`,
      });

      import('./leadStore').then((store) => {
        store.default.getState().updateLead({
          id: leadId,
          score,
          scoreLabel,
          status: scoreLabel === 'HOT' || scoreLabel === 'WARM' ? 'QUALIFIED' : 'CONTACTED',
          scoredAt: new Date(),
          isQualified: scoreLabel === 'HOT' || scoreLabel === 'WARM',
        });
      });
    });

    socket.on('whatsapp:sent', (data) => {
      toast.success(`WhatsApp message sent: ${data.templateName || 'Template'}`);
    });

    socket.on('whatsapp:received', (data) => {
      toast(`WhatsApp response received from ${data.leadName || 'Lead'}`, { icon: '💬' });
      
      get().addNotification({
        title: 'WhatsApp Response',
        message: `Reply received: "${data.message}"`,
      });

      import('./leadStore').then((store) => {
        store.default.getState().updateLead({
          id: data.leadId,
          lastContactedAt: new Date(),
        });
      });
    });

    set({ socket });
  },

  disconnect: () => {
    if (get().socket) {
      get().socket.disconnect();
      set({ socket: null });
    }
  },
}));

export default useNotificationStore;
