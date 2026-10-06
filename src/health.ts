import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 10000);
const HOST = "0.0.0.0";

export function startHealthServer(): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          status: "ok",
          service: "streamer-alerts-discord-bot",
        }),
      );

      return;
    }

    res.writeHead(404, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        error: "Not found",
      }),
    );
  });

  server.listen(PORT, HOST, () => {
    console.log(`Health server listening on ${HOST}:${PORT}`);
  });

  return server;
}