import fetch from "node-fetch";
import { readFileSync } from "fs";
import formidable from "formidable";
import http from "http";

const GITHUB_TOKEN = "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"; // put your fine-grained token
const OWNER = "NilTransfer";
const REPO = "DataBase";
const BRANCH = "main";
const BASE_PATH = "sounds"; // folder in repo

// Simple HTTP server to handle upload
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload") {
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Upload failed: " + err.message }));
        return;
      }

      const file = files.file;
      if (!file) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No file uploaded" }));
        return;
      }

      try {
        const fileContent = readFileSync(file.filepath);
        const contentB64 = Buffer.from(fileContent).toString("base64");
        const pathInRepo = `${BASE_PATH}/${file.originalFilename}`;

        const response = await fetch(
          `https://api.github.com/repos/${OWNER}/${REPO}/contents/${pathInRepo}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `token ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
              "Accept": "application/vnd.github+json",
            },
            body: JSON.stringify({
              message: `Add ${file.originalFilename}`,
              content: contentB64,
              branch: BRANCH,
            }),
          }
        );

        const json = await response.json();

        if (!response.ok) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Upload failed: GitHub error (PUT): ${json.message}` }));
          return;
        }

        const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${pathInRepo}`;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(rawUrl);

      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Upload failed: " + e.message }));
      }
    });
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<form method="POST" enctype="multipart/form-data">
      <input type="file" name="file">
      <button type="submit">Upload</button>
    </form>`);
  }
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
