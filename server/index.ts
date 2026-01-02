import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { supabase } from "../shared/supabase";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const httpServer = createServer(app);

  // Socket.IO setup for real-time notifications
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Store connected users
  const connectedUsers = new Map<string, string>();

  io.on("connection", async (socket) => {
    log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle authentication from handshake
    const userId = socket.handshake.auth?.token;
    if (userId) {
      // Verify user exists in database
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (user) {
        log(`[Socket.IO] User authenticated: ${userId}`);
        socket.data.userId = userId;
        connectedUsers.set(userId, socket.id);
        socket.join(`user:${userId}`);
      } else {
        log(`[Socket.IO] Invalid user ID: ${userId}`);
        socket.disconnect();
        return;
      }
    }

    socket.on("authenticate", async (authUserId: string) => {
      // Verify user exists
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .single();

      if (user) {
        log(`[Socket.IO] User re-authenticated: ${authUserId}`);
        socket.data.userId = authUserId;
        connectedUsers.set(authUserId, socket.id);
        socket.join(`user:${authUserId}`);
      } else {
        log(`[Socket.IO] Invalid authentication attempt: ${authUserId}`);
        socket.disconnect();
      }
    });

    socket.on("disconnect", () => {
      log(`[Socket.IO] Client disconnected: ${socket.id}`);
      if (socket.data.userId) {
        connectedUsers.delete(socket.data.userId);
      }
    });
  });

  // Export io and connectedUsers for use in routes
  (global as any).io = io;
  (global as any).connectedUsers = connectedUsers;

  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();