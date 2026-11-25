import { Router, raw } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { dashboardSessionPermitted } from "../auth/dashboardSession";

export const blogMediaRouter = Router();
const MAX_BYTES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function imageFormat(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// The /api/dashboard prefix is already protected by index.ts's fail-closed
// founder-session guard. Repeat the guard to keep router integration safe.
blogMediaRouter.post("/api/dashboard/blog-media",
  raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: MAX_BYTES }),
  async (req, res) => {
    if (!dashboardSessionPermitted((req as any).session, req.method)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length < 16 || req.body.length > MAX_BYTES) {
      return res.status(400).json({ message: "Upload a PNG, JPEG or WebP image up to 2 MB." });
    }
    const mime = imageFormat(req.body);
    if (!mime || req.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== mime) {
      return res.status(415).json({ message: "Unsupported or mismatched image format." });
    }
    const id = randomUUID();
    try {
      await pool.query(
        "INSERT INTO blog_media (id, mime_type, byte_length, bytes) VALUES ($1::uuid, $2, $3, $4)",
        [id, mime, req.body.length, req.body],
      );
      res.status(201).json({ url: `/api/blog-media/${id}`, mimeType: mime, bytes: req.body.length });
    } catch {
      console.error("[blog-media] durable image storage unavailable");
      res.status(503).json({ message: "Media storage is not ready. No article changes were made." });
    }
  },
);

// An opaque URL is only made public when it is inserted into an approved
// article. Images are served read-only with nosniff and no HTML/SVG support.
blogMediaRouter.get("/api/blog-media/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!UUID.test(id)) return res.status(404).end();
  try {
    const result = await pool.query(
      "SELECT mime_type, bytes FROM blog_media WHERE id = $1::uuid LIMIT 1", [id],
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.setHeader("Content-Type", row.mime_type);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(row.bytes);
  } catch {
    return res.status(503).end();
  }
});
