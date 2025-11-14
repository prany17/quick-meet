import Room from "../models/Room.js";
import { nanoid } from "nanoid";

// @desc Create a new room
// @route POST /api/room/create
export const createRoom = async (req, res) => {
  try {
    const roomId = nanoid(10);
    const newRoom = await Room.create({
      roomId,
      createdBy: req.body.userId,
      participants: [req.body.userId],
    });
    res.status(201).json(newRoom);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create room", error: error.message });
  }
};

// @desc Join an existing room
// @route POST /api/room/join
export const joinRoom = async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const room = await Room.findOne({ roomId });

    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to join room", error: error.message });
  }
};
