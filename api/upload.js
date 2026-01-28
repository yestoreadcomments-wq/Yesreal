// api/upload.js
// CommonJS style (safe). No external libs. Uses global fetch (Node 24).
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }

    // --- Read request body robustly (works in Vercel Node) ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");

    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      res.statusCode = 400;
      return res.end("Invalid JSON");
    }

    const { name, data } = body || {};
    if (!name || !data) {
      res.statusCode = 400;
      return res.end("Missing name or data");
    }

    // size guard (binary bytes)
    const approxBytes = Math.floor((data.length * 3) / 4);
    const MAX_BYTES = 12 * 1024 * 1024; // ~12MB
    if (approxBytes > MAX_BYTES) {
      res.statusCode = 413;
      return res.end("File too large");
    }

    // --- DECODE ---
    const buffer = Buffer.from(data, "base64");

    // --- HARD-CODE REPO / TOKEN HERE (replace values) ---
    const GITHUB_TOKEN = "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"; // <-- replace with your PAT
    const GITHUB_OWNER = "NilTransfer";
    const GITHUB_REPO  = "DataBase";
    const GITHUB_BRANCH = "main";
    const GITHUB_FOLDER = "sounds"; // folder to put files into
    // --------------------------------------------------------

    // unique filename to avoid collisions
    const timestamp = Date.now();
    const safeName = `${timestamp}_${name}`;

    // build path (no leading slash)
    const filePath = `${GITHUB_FOLDER.replace(/^\/|\/$/g, "")}/${safeName}`;

    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodeURIComponent(filePath)}`;

    const payload = {
      message: `Upload ${filePath}`,
      content: buffer.toString("base64"),
      branch: GITHUB_BRANCH
    };

    // PUT to GitHub
    const putResp = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "github-uploader"
      },
      body: JSON.stringify(payload),
      // no timeout here; Vercel will handle execution limit
    });

    const text = await putResp.text();

    if (!putResp.ok) {
      // include GitHub message to help debugging
      res.statusCode = 502;
      return res.end(`GitHub error (PUT): ${putResp.status} ${text}`);
    }

    // success — raw URL
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/${encodeURIComponent(GITHUB_BRANCH)}/${filePath}`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    return res.end(rawUrl);
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    return res.end("Upload failed: A server error has occurred");
  }
};
