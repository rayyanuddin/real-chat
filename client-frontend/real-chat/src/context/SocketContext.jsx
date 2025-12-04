import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://192.168.1.78:5000", {
      transports: ["websocket"],   // 👈 removes polling issues on LAN
      reconnection: true,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);

      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        newSocket.emit("registerUser", user.id); // 👈 Now registers correctly
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      console.log("Socket disconnected");
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
