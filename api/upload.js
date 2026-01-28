// api/upload.js
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false, // we use formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Error parsing file" });

    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const fileBuffer = fs.readFileSync(file.filepath);
      const fileName = `${Date.now()}_${file.originalFilename}`;

      // -------------------------------
      // ✅ Hardcoded GitHub info
      const GITHUB_TOKEN = "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"; // <-- replace with your PAT
      const GITHUB_OWNER = "NilTransfer";
      const GITHUB_REPO = "DataBase";
      const GITHUB_BRANCH = "main";
      const GITHUB_PATH = "sounds"; // folder in repo
      // -------------------------------

      const path = `${GITHUB_PATH}/${fileName}`;

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "upload-uploader",
          },
          body: JSON.stringify({
            message: `Upload ${fileName}`,
            content: fileBuffer.toString("base64"),
            branch: GITHUB_BRANCH,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: `GitHub error (PUT): ${response.status}`,
          message: data.message,
        });
      }

      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
      return res.status(200).send(rawUrl);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Upload failed: Server error" });
    }
  });
}
