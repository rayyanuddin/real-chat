import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";

const ChatArea = ({ selectedUser, socket, goBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  // Auto-scroll
  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollBottom, [messages]);

  // Load message history on user change
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/messages/${selectedUser.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadMessages();
  }, [selectedUser.id]);

  // SOCKET RECEIVER — FIXED VERSION
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      if (
        data.senderId === selectedUser.id ||
        data.receiverId === selectedUser.id
      ) {
        const highlighted = { ...data, isNew: true };

        setMessages((prev) => [...prev, highlighted]);

        // turn off highlight after 1.5 sec
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              (m._id || m.id) === (data._id || data.id)
                ? { ...m, isNew: false }
                : m
            )
          );
        }, 1500);
      }
    };

    const handleDeleteMessage = (msgId) => {
      setMessages((prev) =>
        prev.map((m) =>
          (m._id || m.id) === msgId
            ? { ...m, message: "This message was deleted", isDeleted: true }
            : m
        )
      );
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("deleteMessage", handleDeleteMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("deleteMessage", handleDeleteMessage);
    };
  }, [socket, selectedUser.id]);

  // SEND MESSAGE — FIXED: No double message
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const data = {
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      message: text,
    };

    // Emit to socket
    socket.emit("sendMessage", data);

    // Save to DB
    const token = localStorage.getItem("token");
    await axios.post("http://localhost:5000/api/messages/send", data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // ❌ removed adding message manually
    // server will send it back through socket

    setNewMsg("");
    setShowEmoji(false);
  };

  const handleSend = () => {
    handleSendMessage(newMsg);
  };

  // DELETE MESSAGE
  const handleDeleteMessage = async (msgId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/messages/delete/${msgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("deleteMessage", msgId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <button onClick={goBack} className="md:hidden text-lg">←</button>

        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white uppercase">
          {selectedUser.name[0]}
        </div>

        <h2 className="font-semibold text-lg">{selectedUser.name}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const me = msg.senderId === currentUser.id;
          const msgId = msg._id || msg.id || `temp-${i}`;

          return (
            <div key={msgId} className={`flex ${me ? "justify-end" : "justify-start"}`}>
              <div
                className={`group px-4 py-2 pr-12 rounded-2xl max-w-[70%] relative
                  ${me
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-none"
                    : "bg-gray-200 text-black rounded-bl-none"}
                  ${msg.isDeleted ? "italic text-gray-400" : ""}
                  ${msg.isNew ? "animate-pulse bg-yellow-200" : ""}`}
              >
                {msg.message}

                {/* Delete icon */}
                {me && !msg.isDeleted && (
                  <div className="absolute top-1 right-1">
                    <span
                      className="absolute -top-6 right-0 bg-black text-white text-xs px-2 py-1 rounded 
                      opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      Delete
                    </span>

                    <button
                      onClick={() => handleDeleteMessage(msgId)}
                      className="text-xs text-gray-200 hover:text-white opacity-0 
                                 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <div className="p-3 border-t flex items-center gap-2 relative">
        <button onClick={() => setShowEmoji(!showEmoji)} className="text-2xl px-2">
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
          className="flex-1 p-2 border rounded-full bg-gray-100"
          placeholder="Message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button
          className="px-4 py-2 bg-purple-600 text-white rounded-full"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatArea;
