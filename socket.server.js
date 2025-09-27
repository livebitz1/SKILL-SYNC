const { Server } = require("socket.io");
const { createServer } = require("http");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Allow connections from your Next.js app
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected to standalone server:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected from standalone server:", socket.id);
  });
});

app.post("/notify-skill-change", (req, res) => {
  const { event, data } = req.body;
  if (event === "skillAdded") {
    io.emit("skillAdded", data);
    console.log("Emitted skillAdded event:", data);
  } else if (event === "skillRemoved") {
    io.emit("skillRemoved", data);
    console.log("Emitted skillRemoved event:", data);
  }
  res.status(200).send("Notification received");
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

module.exports = io;
