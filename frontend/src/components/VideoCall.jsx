// src/components/VideoCall.jsx
import React, { useEffect, useRef, useState, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Basic STUN server; add TURN for production if needed
const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoCall({ roomId }) {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  // refs
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  // guards to avoid duplicates and races
  const hasStartedCallRef = useRef(false);
  const makingOfferRef = useRef(false);

  // state
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // safe emit (only send when socket connected)
  const safeEmit = (ev, data) => {
    if (socketRef.current?.connected) socketRef.current.emit(ev, data);
  };

  // Attach local tracks to PC (idempotent)
  const attachLocalTracksToPC = (pc) => {
    if (!pc || !localStreamRef.current) return;
    try {
      // Avoid adding duplicate senders by checking existing senders' track kind
      const existingSenders = pc.getSenders?.() || [];
      const existingKinds = existingSenders
        .map((s) => s.track?.kind)
        .filter(Boolean);
      localStreamRef.current.getTracks().forEach((track) => {
        // If a sender for this kind already exists with same track, skip
        if (existingSenders.some((s) => s.track === track)) return;
        // Otherwise add track
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (e) {
          // ignore duplicate-add errors
        }
      });
    } catch (err) {
      console.warn("attachLocalTracksToPC error", err);
    }
  };

  // Create peer connection (single instance)
  const createPeerConnection = () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // If local stream already exists, attach tracks
    attachLocalTracksToPC(pc);

    // If stream not ready yet, poll briefly to attach when available
    if (!localStreamRef.current) {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (localStreamRef.current) {
          attachLocalTracksToPC(pc);
          clearInterval(poll);
        } else if (attempts > 50) {
          clearInterval(poll);
          console.warn("local stream not ready after polling");
        }
      }, 100);
    }

    pc.ontrack = (e) => {
      console.log("🎥 Remote track received");
      if (remoteRef.current && remoteRef.current.srcObject !== e.streams[0]) {
        remoteRef.current.srcObject = e.streams[0];
      }
      setConnected(true);
      hasStartedCallRef.current = true;
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        safeEmit("candidate", { roomId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔄 Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") setConnected(true);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setConnected(false);
        try {
          pc.restartIce?.();
        } catch (err) {
          console.warn("restartIce error", err);
        }
      }
    };

    return pc;
  };

  // Wait for local stream to be ready then start call (caller only)
  const waitForLocalStreamThenStartCall = () => {
    if (localStreamRef.current) {
      startCall();
      return;
    }

    let attempts = 0;
    const t = setInterval(() => {
      attempts++;
      if (localStreamRef.current) {
        clearInterval(t);
        startCall();
      } else if (attempts > 50) {
        clearInterval(t);
        console.warn("Local stream not ready after waiting — forcing start");
        startCall();
      }
    }, 100);
  };

  // start call (create offer) — guarded
  const startCall = async () => {
    if (hasStartedCallRef.current) {
      console.log("StartCall skipped: handshake already started");
      return;
    }
    if (makingOfferRef.current) {
      console.log("StartCall skipped: already creating offer");
      return;
    }

    makingOfferRef.current = true;
    try {
      const pc = createPeerConnection();
      // ensure tracks attached before creating offer
      attachLocalTracksToPC(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      safeEmit("offer", { roomId, offer });
      console.log("📤 Offer sent");
      hasStartedCallRef.current = true;
    } catch (err) {
      console.error("startCall error", err);
    } finally {
      makingOfferRef.current = false;
    }
  };

  // handle incoming offer
  const handleOffer = async (offer) => {
    // ignore if handshake already started
    if (hasStartedCallRef.current) {
      console.log("Duplicate offer ignored (handshake already started).");
      return;
    }

    try {
      const pc = createPeerConnection();
      attachLocalTracksToPC(pc);

      console.log("📥 Setting remote desc (offer)");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      safeEmit("answer", { roomId, answer });
      console.log("📤 Answer sent");
      hasStartedCallRef.current = true;
    } catch (err) {
      console.error("handleOffer error", err);
    }
  };

  // handle incoming answer
  const handleAnswer = async (answer) => {
    try {
      const pc = createPeerConnection();
      if (!pc) {
        console.warn("No PC to apply answer");
        return;
      }
      console.log("📥 Applying remote answer");
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      hasStartedCallRef.current = true;
    } catch (err) {
      console.error("handleAnswer error", err);
    }
  };

  // handle ICE candidate
  const handleCandidate = async (candidate) => {
    try {
      const pc = createPeerConnection();
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("addIceCandidate error", err);
    }
  };

  // reset connection state (on remote disconnect)
  const resetCallState = () => {
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    hasStartedCallRef.current = false;
    makingOfferRef.current = false;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    setConnected(false);
  };

  // send chat message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const msg = { from: auth.user.name, text: input.trim(), time: Date.now() };

    // send to server
    safeEmit("send-message", { roomId, ...msg });

    // DO NOT add message to local state here → avoids duplication
    setInput("");
  };

  // end call
  const endCall = () => {
    safeEmit("leave-room", { roomId, userId: auth.user._id });
    try {
      socketRef.current?.disconnect();
    } catch {}
    resetCallState();
    try {
      localStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    navigate("/dashboard");
  };

  // MAIN EFFECT: get media, connect socket, set handlers
  useEffect(() => {
    if (!auth?.user?._id) {
      console.warn("User not ready — VideoCall waiting for auth");
      return;
    }

    console.log("🎯 Initializing VideoCall for room:", roomId);

    let mounted = true;

    // get local media
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        console.log("🎥 Local stream ready");
      } catch (err) {
        console.error("getUserMedia error", err);
        alert(
          "Camera/Microphone permission is required: " + (err.message || err)
        );
      }
    })();

    // connect socket
    const socket = io(BACKEND, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);

      // Wait for local stream before emitting join-room so caller won't start too early
      const tryJoin = () => {
        if (localStreamRef.current) {
          safeEmit("join-room", { roomId, userId: auth.user._id });
          return true;
        }
        return false;
      };

      if (!tryJoin()) {
        let attempts = 0;
        const pollJoin = setInterval(() => {
          attempts++;
          if (tryJoin() || attempts > 50) {
            clearInterval(pollJoin);
            if (attempts > 50 && !localStreamRef.current) {
              // fallback: join anyway
              console.warn("Joining room without local stream after waiting");
              safeEmit("join-room", { roomId, userId: auth.user._id });
            }
          }
        }, 100);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    socket.on("ready-for-call", ({ creator }) => {
      console.log("⚡ ready-for-call. Creator:", creator);
      // ensure PC exists and tracks attached
      createPeerConnection();
      // If I'm the creator, wait for local stream then start
      if (creator === socket.id) {
        console.log("📞 I am caller — waiting for local stream then starting");
        waitForLocalStreamThenStartCall();
      } else {
        console.log("🤝 I am callee — waiting for incoming offer");
      }
    });

    socket.on("offer", ({ offer }) => {
      console.log("socket: offer received");
      handleOffer(offer);
    });

    socket.on("answer", ({ answer }) => {
      console.log("socket: answer received");
      handleAnswer(answer);
    });

    socket.on("candidate", ({ candidate }) => {
      if (candidate) {
        console.log("socket: candidate received");
        handleCandidate(candidate);
      }
    });

    socket.on("receive-message", (msg) => setMessages((m) => [...m, msg]));

    socket.on("user-disconnected", (uid) => {
      console.log("👋 user-disconnected:", uid);
      resetCallState();
    });

    socket.on("disconnect", (reason) => {
      console.log("socket disconnected:", reason);
      resetCallState();
    });

    return () => {
      mounted = false;
      try {
        socket.disconnect();
      } catch {}
      resetCallState();
      try {
        localStreamRef.current?.getTracks()?.forEach((t) => t.stop());
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, roomId]);

  // UI (kept same as your preferred simple layout A)
  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <div className="p-4 bg-gray-900 flex justify-between items-center">
        <div>
          <div className="font-bold text-lg">Room: {roomId}</div>
          <div className="text-sm text-gray-300">
            {connected ? "🟢 Connected" : "🔴 Waiting for user..."}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              // mute/unmute toggle: toggle track enabled
              localStreamRef.current
                ?.getAudioTracks()
                .forEach((t) => (t.enabled = !t.enabled));
              setMuted((s) => !s);
            }}
            className="px-3 py-2 bg-gray-700 rounded"
          >
            {muted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={() => {
              localStreamRef.current
                ?.getVideoTracks()
                .forEach((t) => (t.enabled = !t.enabled));
              setVideoOff((s) => !s);
            }}
            className="px-3 py-2 bg-gray-700 rounded"
          >
            {videoOff ? "Show Video" : "Hide Video"}
          </button>

          <button onClick={endCall} className="px-3 py-2 bg-red-600 rounded">
            End Call
          </button>
        </div>
      </div>

      {/* Videos */}
      <div className="flex-1 flex items-center justify-center gap-5 p-5">
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="w-1/2 h-[70vh] bg-gray-800 rounded-lg object-cover"
        ></video>

        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="w-1/2 h-[70vh] bg-gray-800 rounded-lg object-cover"
        ></video>
      </div>

      {/* Chat toggle */}
      <div className="p-4">
        <button
          onClick={() => setChatOpen((s) => !s)}
          className="px-3 py-2 bg-gray-700 rounded"
        >
          {chatOpen ? "Close Chat" : "Open Chat"}
        </button>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute right-6 bottom-24 bg-gray-800 p-4 rounded-lg w-80 max-h-[50vh] overflow-y-auto">
          <div className="space-y-2">
            {messages.map((m, i) => (
              <div key={i}>
                <span className="font-bold text-blue-300">{m.from}:</span>{" "}
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 mt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-700 p-2 rounded"
              placeholder="Type..."
            />
            <button className="px-3 bg-blue-600 rounded">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
