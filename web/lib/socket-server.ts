import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

/**
 * Initialises the Socket.IO server on the given HTTP server.
 * Safe to call multiple times — returns the existing instance if already set up.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket",
  });

  io.on("connection", (socket) => {
    console.log("[Socket.IO] Admin dashboard connected:", socket.id);

    // Admin joins a per-election room to receive real-time updates
    socket.on("join:election", (electionId: string) => {
      socket.join(`election:${electionId}`);
      console.log(
        `[Socket.IO] Socket ${socket.id} joined room election:${electionId}`
      );
    });

    socket.on("leave:election", (electionId: string) => {
      socket.leave(`election:${electionId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[Socket.IO] Admin dashboard disconnected: ${socket.id} (${reason})`
      );
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

// ─── Emitters ────────────────────────────────────────────────────────────────

/**
 * Broadcasts a successful vote-cast event to all admin dashboards
 * watching the given election room.
 */
export function emitVoteCast(
  electionId: string,
  data: {
    candidateId: number;
    timestamp: number;
    txHash: string;
  }
): void {
  io?.to(`election:${electionId}`).emit("vote:cast", data);
}

/**
 * Broadcasts a flagged-vote alert to all admin dashboards watching
 * the given election room.
 */
export function emitFlaggedVote(
  electionId: string,
  data: {
    attemptId: string;
    riskScore: number;
    reasonCodes: string[];
  }
): void {
  io?.to(`election:${electionId}`).emit("vote:flagged", data);
}

/**
 * Broadcasts an election status change (e.g. Open → Closed).
 */
export function emitElectionStatusChange(
  electionId: string,
  status: "Scheduled" | "Open" | "Closed" | "Audited"
): void {
  io?.to(`election:${electionId}`).emit("election:statusChange", {
    electionId,
    status,
    timestamp: Date.now(),
  });
}
