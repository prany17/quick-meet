import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { logout, auth } = useContext(AuthContext);
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 9);
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return alert("Enter room id");
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="px-4 py-2 bg-red-600 rounded"
        >
          Logout
        </button>
      </div>

      <h1 className="text-3xl font-bold">
        Welcome, {auth?.user?.name || "User"}
      </h1>
      <div className="flex gap-3">
        <input
          className="p-3 rounded bg-gray-700"
          placeholder="Enter room id"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom} className="px-4 py-2 bg-blue-600 rounded">
          Join
        </button>
        <button onClick={createRoom} className="px-4 py-2 bg-green-600 rounded">
          Create
        </button>
      </div>
    </div>
  );
}
