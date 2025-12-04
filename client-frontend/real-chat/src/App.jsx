import React, { useState } from "react";
import Login from "./pages/Login";
import Chat from "./pages/Chat";

const App = () => {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );

  return (
    <>
      {!currentUser ? (
        <Login setCurrentUser={setCurrentUser} />
      ) : (
        <Chat setCurrentUser={setCurrentUser} />
      )}
    </>
  );
};

export default App;
