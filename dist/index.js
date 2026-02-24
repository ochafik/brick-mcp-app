#!/usr/bin/env node
// main.ts
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "./server.js";
async function startStreamableHTTPServer(createServer2) {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());
  const sessions = new Map;
  app.get("/test", (_req, res) => {
    const harnessPath = path.resolve(import.meta.dirname, import.meta.filename.endsWith(".ts") ? "." : "..", "test-harness.html");
    if (fs.existsSync(harnessPath)) {
      res.type("html").send(fs.readFileSync(harnessPath, "utf-8"));
    } else {
      res.status(404).send("test-harness.html not found");
    }
  });
  app.all("/mcp", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    const sessionId = req.headers["mcp-session-id"];
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("MCP error (existing session):", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null
          });
        }
      }
      return;
    }
    const server = createServer2();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID()
    });
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        sessions.delete(sid);
      }
    };
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      const sid = transport.sessionId;
      if (sid) {
        sessions.set(sid, { server, transport });
      }
    } catch (error) {
      console.error("MCP error (new session):", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });
  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`Brick Builder MCP server listening on http://localhost:${port}/mcp`);
  });
  const shutdown = () => {
    console.log(`
Shutting down...`);
    for (const [, session] of sessions) {
      session.server.close().catch(() => {});
    }
    sessions.clear();
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
async function startStdioServer(createServer2) {
  await createServer2().connect(new StdioServerTransport);
}
async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
export {
  startStreamableHTTPServer,
  startStdioServer
};
