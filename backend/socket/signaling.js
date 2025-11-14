export const socketHandler = (io, socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data.offer);
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", data.answer);
  });

  socket.on("candidate", (data) => {
    socket.to(data.roomId).emit("candidate", data.candidate);
  });

  socket.on("send-message", (data) => {
    io.to(data.roomId).emit("receive-message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
};
