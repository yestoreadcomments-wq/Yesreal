// api/upload.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_BASE_PATH = process.env.GITHUB_BASE_PATH || "sounds";

function encodePathSegments(p){ return p.split("/").map(encodeURIComponent).join("/"); }
function uniqueName(name){
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.replace(ext,"");
  return `${base}_${Date.now()}${ext}`;
}

async function readJsonFromReq(req){
  // If running in an environment that provides req.json(), use it.
  if (typeof req.json === "function") {
    return req.json();
  }
  // Otherwise collect chunks and parse
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  return JSON.parse(raw);
}

export default async function handler(req, res){
  try{
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // parse body safely
    let body;
    try {
      body = await readJsonFromReq(req);
    } catch (err) {
      console.error("Bad JSON:", err);
      return res.status(400).send("Invalid JSON body");
    }

    let { name, data } = body || {};
    if (!name || !data) return res.status(400).send("Missing name or data");

    // guard size: base64 length -> approx bytes
    const approxBytes = Math.floor((data.length * 3) / 4);
    const MAX_BYTES = 12 * 1024 * 1024; // 12 MB binary (adjust if needed)
    if (approxBytes > MAX_BYTES) {
      return res.status(413).send("File too large");
    }

    // unique name to avoid collisions
    name = uniqueName(name);

    const filePath = `${GITHUB_BASE_PATH.replace(/(^\/|\/$)/g,"")}/${name}`;
    const encodedPath = encodePathSegments(filePath);
    const apiBase = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}`;

    // commit payload (create new file)
    const payload = {
      message: `Add ${filePath}`,
      content: data,
      branch: GITHUB_BRANCH
    };

    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!putResp.ok) {
      const txt = await putResp.text().catch(()=>"(no body)");
      console.error("GitHub PUT error:", putResp.status, txt);
      return res.status(502).send("GitHub error (PUT): " + putResp.status + " " + txt);
    }

    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/${encodeURIComponent(GITHUB_BRANCH)}/${filePath}`;
    return res.status(200).send(rawUrl);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).send("Server error: " + (err && err.message ? err.message : "unknown"));
  }
}
