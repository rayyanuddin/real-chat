import React, { useState } from "react";
import axios from "axios";

const Register = ({ setIsRegister }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) return alert("All fields required");
    try {
      await axios.post("http://192.168.1.78:5000/api/users/register", form);
      alert("Registered! Please login.");
      setIsRegister(false);
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full mb-4 p-3 rounded-lg border"
        />
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
          onClick={handleRegister}
          className="w-full bg-indigo-600 text-white p-3 rounded-lg mb-2 hover:bg-indigo-700"
        >
          Register
        </button>
        <p className="text-center text-gray-500 text-sm">
          Already have an account?{" "}
          <span
            className="text-indigo-600 cursor-pointer font-semibold"
            onClick={() => setIsRegister(false)}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
