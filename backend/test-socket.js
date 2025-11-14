import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  reconnectionAttempts: 3,
  timeout: 5000,
});

socket.on("connect", () => {
  console.log("✅ Connected! ID:", socket.id);

  socket.emit("join-room", "testRoom", "client1");
  console.log("📤 Sent join-room");
});

socket.on("user-connected", (uid) => {
  console.log("📥 user-connected:", uid);
});

socket.on("connect_error", (err) => {
  console.log("❌ connect_error:", err.message);
});

socket.on("disconnect", () => {
  console.log("❌ disconnected");
});
