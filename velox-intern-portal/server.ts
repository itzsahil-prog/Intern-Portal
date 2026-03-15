import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Automation Endpoints (Simulated)
  app.post("/api/automation/send-email", (req, res) => {
    const { to, subject, body } = req.body;
    console.log(`[Automation] Sending email to ${to}: ${subject}`);
    // In a real app, use nodemailer here
    res.json({ success: true, message: "Email sent (simulated)" });
  });

  app.post("/api/automation/send-whatsapp", (req, res) => {
    const { to, message } = req.body;
    console.log(`[Automation] Sending WhatsApp to ${to}: ${message}`);
    // In a real app, use Twilio or similar here
    res.json({ success: true, message: "WhatsApp sent (simulated)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
