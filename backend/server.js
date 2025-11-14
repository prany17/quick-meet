import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";

dotenv.config();
connectDB();

const app = express();

// ---------- CORS CONFIG ----------
const allowedOrigins = [
  "http://localhost:5173", // local dev
  process.env.FRONTEND_URL, // deployed frontend
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

// ---------- SOCKET.IO SERVER ----------
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const count = clients ? clients.size : 0;

    console.log(`📞 ${userId} joined room ${roomId} (${count} clients)`);

    if (count === 2) {
      // Pick caller (first user in the room)
      const caller = Array.from(clients)[0];

      io.to(roomId).emit("ready-for-call", { creator: caller });
    }
  });

  socket.on("leave-room", ({ roomId, userId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-disconnected", userId);
  });

  socket.on("offer", (data) => socket.to(data.roomId).emit("offer", data));

  socket.on("answer", (data) => socket.to(data.roomId).emit("answer", data));

  socket.on("candidate", (data) =>
    socket.to(data.roomId).emit("candidate", data)
  );

  socket.on("send-message", (data) => {
    const { roomId, ...msg } = data;
    io.to(roomId).emit("receive-message", msg);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server & Socket.IO running on port ${PORT}`)
);
