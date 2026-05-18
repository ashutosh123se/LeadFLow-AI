import { create } from 'zustand';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  socket: null,

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
      toast.success(`New lead received: ${data.lead.name}`);
      set((state) => ({
        notifications: [
          {
            id: Math.random().toString(),
            title: 'New Lead Captured',
            message: `Lead "${data.lead.name}" captured from ${data.lead.source}`,
            time: new Date(),
          },
          ...state.notifications,
        ],
      }));
    });

    socket.on('call:completed', (data) => {
      const { scoreLabel, score, summary } = data;
      const msg = `AI Call done — Lead scored ${score}/100 (${scoreLabel}). ${summary || ''}`;
      if (scoreLabel === 'HOT') {
        toast.success(msg, { duration: 6000 });
      } else {
        toast(msg, { duration: 6000 });
      }
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
