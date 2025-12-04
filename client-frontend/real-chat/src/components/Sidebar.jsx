import React, { useEffect, useState } from "react";
import axios from "axios";

const Sidebar = ({
  setSelectedUser,
  openChat,
  socket,
  currentUser,
  handleLogout,
  selectedUser,
}) => {
  const [users, setUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://192.168.1.78:5000/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(res.data.filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error(err);
      }
    };

    loadUsers();
  }, [currentUser]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.senderId !== currentUser.id) {
        setUnreadMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));

        // Move sender to top
        setUsers((prevUsers) => {
          const index = prevUsers.findIndex((u) => u.id === msg.senderId);
          if (index === -1) return prevUsers;

          const updated = [...prevUsers];
          const [sender] = updated.splice(index, 1);
          updated.unshift(sender);
          return updated;
        });
      }
    };

    socket.on("receiveMessage", handleMessage);
    return () => socket.off("receiveMessage", handleMessage);
  }, [socket, currentUser]);

  // Open chat and clear unread
  const openChatLocal = (user) => {
    setSelectedUser(user);
    openChat(user);

    setUnreadMessages((prev) => ({
      ...prev,
      [user.id]: 0,
    }));

    setUsers((prev) => {
      const index = prev.findIndex((u) => u.id === user.id);
      if (index === -1) return prev;

      const updated = [...prev];
      const [sel] = updated.splice(index, 1);
      updated.unshift(sel);
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg">{currentUser.name}</h2>
        <button onClick={handleLogout} className="text-sm text-blue-500">
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <input
          className="w-full p-2 border rounded-xl bg-gray-100 text-sm"
          placeholder="Search"
        />
      </div>

      {/* Users */}
      <div className="flex-1 overflow-y-auto">
        {users.map((user) => {
          const unread = unreadMessages[user.id] || 0;

          const isActive = selectedUser?.id === user.id;

          return (
            <div
              key={user.id}
              onClick={() => openChatLocal(user)}
              className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-all
                hover:bg-gray-100
                ${unread > 0 ? "bg-yellow-100" : ""}
                ${isActive ? "bg-purple-100 border-l-4 border-purple-500" : ""}`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-gray-700 font-semibold uppercase">
                  {user.name?.[0] || user.email[0]}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="font-semibold flex items-center justify-between">
                  <span>{user.name || user.email}</span>
                  {unread > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unread}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">Tap to chat</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
