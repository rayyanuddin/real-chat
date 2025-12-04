import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Routes
import path from "path";
import { fileURLToPath } from 'url';

import userRoutes from './Routes/userRoutes.js';
import messageRoutes from './Routes/messageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Create HTTP + Socket Server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

// Store io instance to use in controllers
app.set("io", io);

// Store online users
const onlineUsers = new Map(); // Map<userId, Set<socketId>>

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register user
  socket.on("registerUser", (userId) => {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    console.log("Online users:", Array.from(onlineUsers.keys()));
  });

  // ------------------------------
  // 🔹 PRIVATE CHAT HANDLERS
  // ------------------------------

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const data = {
      senderId,
      receiverId,
      message,
      _id: Date.now(), // Temporary ID for real-time
      isDeleted: false
    };

    // Send to receiver
    if (onlineUsers.has(receiverId)) {
      onlineUsers.get(receiverId).forEach(socketId =>
        io.to(socketId).emit("receiveMessage", data)
      );
    }

    // Send to sender (self)
    if (onlineUsers.has(senderId)) {
      onlineUsers.get(senderId).forEach(socketId =>
        io.to(socketId).emit("receiveMessage", data)
      );
    }
  });

  // Handle delete message event from client
  socket.on("deleteMessage", (messageData) => {
    const { messageId, senderId, receiverId } = messageData;
    
    // Emit to both sender and receiver
    io.emit("messageDeleted", { 
      id: messageId,
      senderId,
      receiverId,
      isDeleted: true
    });
  });

  // Typing indicators
  socket.on("typing", (data) => {
    if (onlineUsers.has(data.receiverId)) {
      onlineUsers.get(data.receiverId).forEach(socketId =>
        io.to(socketId).emit("typing", data)
      );
    }
  });

  socket.on("stopTyping", (data) => {
    if (onlineUsers.has(data.receiverId)) {
      onlineUsers.get(data.receiverId).forEach(socketId =>
        io.to(socketId).emit("stopTyping", data)
      );
    }
  });

  // ------------------------------
  // Disconnect
  // ------------------------------
  socket.on("disconnect", () => {
    for (let [userId, socketSet] of onlineUsers.entries()) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) onlineUsers.delete(userId);
    }
    console.log("User disconnected:", socket.id);
  });
});

// Start server
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});