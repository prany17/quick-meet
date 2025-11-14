import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startTime: Date,
    endTime: Date,
    duration: Number,
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
