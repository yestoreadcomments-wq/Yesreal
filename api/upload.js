import fetch from "node-fetch";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // ✅ ONLY CHANGE
const OWNER = "NilTransfer";
const REPO = "DataBase";
const BRANCH = "main";
const PATH = "uploads/test.txt";

export default async function handler(req, res) {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "Missing GITHUB_TOKEN env var" });
    }

    const content = Buffer.from("Hello from Vercel").toString("base64");

    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Upload from Vercel",
          content: content,
          branch: BRANCH
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: "Upload failed", details: err.message });
  }
}
