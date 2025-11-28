import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import userRoutes from './Routes/userRoutes.js';
import messageRoutes from './Routes/messageRoutes.js';

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Create HTTP + Socket Server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Store online users
const onlineUsers = new Map(); // Map<userId, Set<socketId>>

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register user to online users map
  socket.on('registerUser', (userId) => {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    console.log('Online users:', onlineUsers);
  });

  // Send message
  socket.on('sendMessage', ({ senderId, receiverId, message, _id }) => {
    const data = { senderId, receiverId, message, _id: _id || Date.now() };

    // Send to receiver
    if (onlineUsers.has(receiverId)) {
      onlineUsers.get(receiverId).forEach(socketId => {
        io.to(socketId).emit('receiveMessage', data);
      });
    }

    // Send to sender (for multiple tabs)
    if (onlineUsers.has(senderId)) {
      onlineUsers.get(senderId).forEach(socketId => {
        io.to(socketId).emit('receiveMessage', data);
      });
    }
  });

  // Typing events
  socket.on('typing', (data) => {
    if (onlineUsers.has(data.receiverId)) {
      onlineUsers.get(data.receiverId).forEach(socketId => {
        io.to(socketId).emit('typing', data);
      });
    }
  });

  socket.on('stopTyping', (data) => {
    if (onlineUsers.has(data.receiverId)) {
      onlineUsers.get(data.receiverId).forEach(socketId => {
        io.to(socketId).emit('stopTyping', data);
      });
    }
  });

  // Message delivered & seen
  socket.on('messageDelivered', (data) => {
    if (onlineUsers.has(data.senderId)) {
      onlineUsers.get(data.senderId).forEach(socketId => {
        io.to(socketId).emit('messageDelivered', data);
      });
    }
  });

  socket.on('messageSeen', (data) => {
    if (onlineUsers.has(data.senderId)) {
      onlineUsers.get(data.senderId).forEach(socketId => {
        io.to(socketId).emit('messageSeen', data);
      });
    }
  });

  // Delete message
  socket.on('deleteMessage', (msgId) => {
    // Emit delete event to all connected users
    io.emit('deleteMessage', msgId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (let [userId, socketSet] of onlineUsers.entries()) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) onlineUsers.delete(userId);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(port, () => console.log(`Server running on port ${port}`));
