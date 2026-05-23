import { useEffect, useState } from 'react';
import useNotificationStore from '../store/notificationStore';

export default function useSocket() {
  const socket = useNotificationStore((state) => state.socket);
  const [isConnected, setIsConnected] = useState(socket ? socket.connected : false);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  };

  return {
    socket,
    isConnected,
    emit,
    on,
  };
}
