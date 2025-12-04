import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";

const ChatArea = ({ selectedUser, socket, goBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  // Auto-scroll to bottom
  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollBottom, [messages]);

  // Load messages from server
  const loadMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://192.168.1.78:5000/api/messages/${selectedUser.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }, [selectedUser.id]);

  // Initial load and reload when selected user changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Socket listeners for receiving & deleting messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      // Check if message is for current chat
      if (
        (data.senderId === selectedUser.id || data.receiverId === selectedUser.id) &&
        (data.senderId === currentUser.id || data.receiverId === currentUser.id)
      ) {
        // Check if message already exists
        setMessages(prev => {
          const exists = prev.some(msg => 
            (msg.id && msg.id === data.id) || 
            (msg._id && msg._id === data._id)
          );
          
          if (!exists) {
            const highlighted = { ...data, isNew: true };
            
            // Remove highlight after 1.5s
            setTimeout(() => {
              setMessages(prevMsgs =>
                prevMsgs.map((m) =>
                  (m.id === data.id || m._id === data._id)
                    ? { ...m, isNew: false }
                    : m
                )
              );
            }, 1500);
            
            return [...prev, highlighted];
          }
          return prev;
        });
      }
    };

    const handleDeleteMessage = (data) => {
      setMessages(prev =>
        prev.map((m) =>
          m.id === data.id
            ? { 
                ...m, 
                message: "This message was deleted", 
                isDeleted: true,
                file: null 
              }
            : m
        )
      );
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageDeleted", handleDeleteMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageDeleted", handleDeleteMessage);
    };
  }, [socket, selectedUser.id, currentUser.id]);

  // Send message
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const token = localStorage.getItem("token");
    const data = {
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      message: text,
    };

    try {
      await axios.post("http://192.168.1.78:5000/api/messages/send", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh messages to get the latest from DB
      loadMessages();
      
    } catch (err) {
      console.error("Error sending message:", err);
    }

    socket.emit("sendMessage", data);
    setNewMsg("");
    setShowEmoji(false);
  };

  const handleSend = () => handleSendMessage(newMsg);

  // Delete message
  const handleDeleteMessage = async (msgId) => {
    try {
      const token = localStorage.getItem("token");
      
      // Call backend API
      await axios.delete(
        `http://192.168.1.78:5000/api/messages/delete/${msgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Emit socket event with proper data
      socket.emit("deleteMessage", { 
        messageId: msgId,
        senderId: currentUser.id,
        receiverId: selectedUser.id
      });

      // Update local state immediately
      setMessages(prev =>
        prev.map((m) =>
          m.id === msgId
            ? { 
                ...m, 
                message: "This message was deleted", 
                isDeleted: true,
                file: null 
              }
            : m
        )
      );

    } catch (err) {
      console.error("Error deleting message:", err);
      alert(err.response?.data?.error || "Failed to delete message");
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-lg rounded-xl">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-purple-600 text-white shadow-md">
        <button onClick={goBack} className="md:hidden text-xl hover:opacity-80 transition">←</button>
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-600 uppercase font-bold">
          {selectedUser.name?.[0] || "U"}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{selectedUser.name}</h2>
          <p className="text-sm text-purple-200">Online</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const me = msg.senderId === currentUser.id;
            const msgId = msg.id || msg._id;
            const isDeleted = msg.isDeleted || msg.message === "This message was deleted";

            return (
              <div key={msgId} className={`flex ${me ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group px-4 py-2 pr-12 rounded-2xl max-w-[70%] relative transition-all duration-300
                    ${me
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none shadow-md"}
                    ${isDeleted ? "italic text-gray-400 bg-gray-100" : ""}
                    ${msg.isNew ? "ring-2 ring-yellow-300 animate-pulse" : ""}`}
                >
                  {isDeleted ? "This message was deleted" : msg.message}
                  
                  {msg.file && !isDeleted && (
                    <div className="mt-2">
                      <a 
                        href={`http://192.168.1.78:5000${msg.file}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        📎 Attachment
                      </a>
                    </div>
                  )}

                  {/* Delete button - only show for own non-deleted messages */}
                  {me && !isDeleted && (
                    <div className="absolute top-1 right-1 flex items-center">
                      <span className="absolute -top-6 right-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition duration-200 whitespace-nowrap">
                        Delete
                      </span>
                      <button
                        onClick={() => handleDeleteMessage(msgId)}
                        className="text-xs text-gray-200 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                        title="Delete message"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className={`text-xs mt-1 ${me ? 'text-purple-200' : 'text-gray-500'}`}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'Now'}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t flex items-center gap-2 relative bg-gray-100">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="text-2xl px-2 hover:bg-gray-200 rounded-full transition"
          title="Emoji"
        >
          😊
        </button>

        {showEmoji && (
          <div className="absolute bottom-16 left-3 z-50 bg-white shadow-lg rounded-xl">
            <EmojiPicker
              height={350}
              width={300}
              onEmojiClick={(emojiData) =>
                setNewMsg((prev) => prev + emojiData.emoji)
              }
            />
          </div>
        )}

        <input
          className="flex-1 p-3 border rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Type a message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!newMsg.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatArea;