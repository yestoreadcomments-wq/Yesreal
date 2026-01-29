import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

// ====== HARD-CODED REPO INFO (change here if you want) ======
const GITHUB_OWNER = "NilTransfer";
const GITHUB_REPO = "DataBase";
const GITHUB_BRANCH = "main";
const GITHUB_FOLDER = "sounds"; // folder inside repo where files go
// ============================================================

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Server misconfigured: missing GITHUB_TOKEN" });
    }

    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(500).json({ error: "Error parsing upload: " + err.message });
      }

      const file = files.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      try {
        // Read file bytes from temporary filepath
        const buffer = fs.readFileSync(file.filepath);
        // Build unique filename to avoid collisions
        const timestamp = Date.now();
        const safeName = `${timestamp}_${file.originalFilename}`;
        const pathInRepo = `${GITHUB_FOLDER.replace(/^\/|\/$/g, "")}/${safeName}`;

        // GitHub API: create/update file contents (base64 content)
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodeURIComponent(pathInRepo)}`;

        const payload = {
          message: `Upload ${safeName}`,
          content: buffer.toString("base64"),
          branch: GITHUB_BRANCH
        };

        const ghRes = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "github-uploader"
          },
          body: JSON.stringify(payload)
        });

        const ghText = await ghRes.text();
        let ghJson = null;
        try { ghJson = JSON.parse(ghText); } catch (e) { /* ignore */ }

        if (!ghRes.ok) {
          console.error("GitHub PUT failed:", ghRes.status, ghText);
          // forward GitHub message if available
          return res.status(502).json({
            error: "GitHub error (PUT)",
            status: ghRes.status,
            message: ghJson?.message ?? ghText
          });
        }

        // success -> return raw URL
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${pathInRepo}`;
        return res.status(200).send(rawUrl);

      } catch (e) {
        console.error("Upload error:", e);
        return res.status(500).json({ error: "Upload failed: " + (e.message || "server error") });
      }
    });
  } catch (e) {
    console.error("Unexpected server error:", e);
    return res.status(500).json({ error: "Server error: " + (e.message || "unknown") });
  }
}
