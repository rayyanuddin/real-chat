import React, { useState } from "react";
import axios from "axios";
import Register from "./Register";

const Login = ({ setCurrentUser }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [isRegister, setIsRegister] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://192.168.1.78:5000/api/users/login", form);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token);
      setCurrentUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  if (isRegister) return <Register setIsRegister={setIsRegister} />;

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-4 p-3 rounded-lg border"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-4 p-3 rounded-lg border"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white p-3 rounded-lg mb-2 hover:bg-indigo-700"
        >
          Login
        </button>
        <p className="text-center text-gray-500 text-sm">
          Don't have an account?{" "}
          <span
            className="text-indigo-600 cursor-pointer font-semibold"
            onClick={() => setIsRegister(true)}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
