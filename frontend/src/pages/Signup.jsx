import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../api/api";

export default function Signup() {
  const [name, setName] = useState("Test User");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/signup", { name, email, password });
      alert("Signup successful — please login");
      navigate("/login");
    } catch (err) {
      alert("Signup failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handle} className="w-96 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl mb-4 font-semibold">Signup</h2>
        <input
          className="w-full p-3 mb-3 rounded bg-gray-700"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full p-3 mb-3 rounded bg-gray-700"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-3 mb-3 rounded bg-gray-700"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full p-3 bg-green-600 rounded">Signup</button>
        <div className="mt-3 text-sm text-gray-300">
          Have an account?{" "}
          <Link to="/login" className="text-blue-400">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}
