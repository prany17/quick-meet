// src/pages/JoinRoom.jsx
import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import VideoCall from "../components/VideoCall";
import { AuthContext } from "../context/AuthContext";

export default function JoinRoom() {
  const { id } = useParams();
  const { auth } = useContext(AuthContext);

  console.log("🎯 JoinRoom loaded. Room ID:", id);
  console.log("🔑 Auth data:", auth);

  // pass user (may be null briefly)
  return <VideoCall roomId={id} user={auth?.user} />;
}
