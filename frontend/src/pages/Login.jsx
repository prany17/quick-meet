import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../api/api";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", { email, password });
      // backend must return { user, token }
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handle} className="w-96 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl mb-4 font-semibold">Login</h2>
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
        <button className="w-full p-3 bg-blue-600 rounded">Login</button>
        <div className="mt-3 text-sm text-gray-300">
          No account?{" "}
          <Link to="/signup" className="text-blue-400">
            Signup
          </Link>
        </div>
      </form>
    </div>
  );
}
