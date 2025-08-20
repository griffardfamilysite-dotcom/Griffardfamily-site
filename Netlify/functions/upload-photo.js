export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const { Family123$, dry0htblg, 732731825632612 } = process.env;
    const pass = event.headers["x-upload-pass"] || "";
    if (!UPLOAD_PASSWORD || pass !== UPLOAD_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return { statusCode: 400, body: JSON.stringify({ error: "multipart/form-data required" }) };
    }
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) return { statusCode: 400, body: JSON.stringify({ error: "Bad multipart" }) };

    const buf = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    const parts = buf.toString("binary").split(`--${boundary}`);
    const files = [];
    let album = "other-pictures";
    let folder = "griffard/other-pictures";

    for (const part of parts) {
      if (part.indexOf("Content-Disposition: form-data;") === -1) continue;
      const nameMatch = /name="([^"]+)"/.exec(part);
      const filenameMatch = /filename="([^"]+)"/.exec(part);

      if (filenameMatch) {
        const start = part.indexOf("\r\n\r\n");
        const content = part.slice(start + 4, part.lastIndexOf("\r\n"));
        const fileBuf = Buffer.from(content, "binary");
        files.push({ filename: filenameMatch[1], data: fileBuf });
      } else if (nameMatch) {
        const key = nameMatch[1];
        const start = part.indexOf("\r\n\r\n");
        const value = part.slice(start + 4, part.lastIndexOf("\r\n")).trim();
        if (key === "album") {
          album = value;
          folder = `griffard/${album}`;
        }
      }
    }

    if (!files.length) return { statusCode: 400, body: JSON.stringify({ error: "No files" }) };
    if (files.length > 5) return { statusCode: 400, body: JSON.stringify({ error: "Max 5 files" }) };

    // Use unsigned uploads via upload preset (easier—no secret in code)
    const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET; // create this in Cloudinary
    if (!UPLOAD_PRESET) return { statusCode: 500, body: JSON.stringify({ error: "Missing CLOUDINARY_UPLOAD_PRESET" }) };

    const results = [];
    for (const f of files) {
      const form = new FormData();
      form.set("file", new Blob([f.data]), f.filename);
      form.set("api_key", CLOUDINARY_API_KEY);
      form.set("upload_preset", UPLOAD_PRESET);
      form.set("folder", folder);

      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form
      });
      if (!resp.ok) {
        const txt = await resp.text();
        return { statusCode: 500, body: JSON.stringify({ error: "Upload failed", details: txt }) };
      }
      const data = await resp.json();
      results.push({
        public_id: data.public_id,
        url: data.secure_url,
        thumb: data.secure_url.replace('/upload/', '/upload/c_scale,w_400/')
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, items: results }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};