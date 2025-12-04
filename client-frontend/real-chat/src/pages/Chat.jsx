import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Sidebar from "../components/Sidebar";
import ChatArea from "./ChatArea";

const Chat = ({ setCurrentUser }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [socket] = useState(() => io("http://192.168.1.78:5000"));
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (currentUser && socket) {
      socket.emit("registerUser", currentUser.id);
    }
  }, [currentUser, socket]);

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null);
    socket.disconnect();
  };

  // Only set selected user (no mobile animation)
  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  // Open chat + animate for mobile
  const openChat = (user) => {
    setSelectedUser(user);
    setMobileChatOpen(true);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Sidebar */}
      <div
        className={`w-full md:w-1/3 max-w-sm h-full border-r bg-white fixed md:relative z-20
        transition-transform duration-300
        ${mobileChatOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0"}`}
      >
        <Sidebar
          setSelectedUser={handleSelectUser}
          openChat={openChat}
          socket={socket}
          currentUser={currentUser}
          handleLogout={handleLogout}
          selectedUser={selectedUser}
        />
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 h-full transition-transform duration-300 bg-white
        ${mobileChatOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        {selectedUser ? (
          <ChatArea
            selectedUser={selectedUser}
            socket={socket}
            goBack={() => setMobileChatOpen(false)}
          />
        ) : (
          <div className="hidden md:flex justify-center items-center h-full text-gray-400">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
