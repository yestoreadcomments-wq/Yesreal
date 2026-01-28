import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const data = fs.readFileSync(file.filepath);
      const contentB64 = Buffer.from(data).toString("base64");
      const pathInRepo = `sounds/${file.originalFilename}`; // folder inside your repo

      const response = await fetch(
        `https://api.github.com/repos/NilTransfer/DataBase/contents/${pathInRepo}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token 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`, // <- replace with your PAT
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: `Add ${file.originalFilename}`,
            content: contentB64,
            branch: "main",
          })
        }
      );

      const json = await response.json();
      if (!response.ok) return res.status(500).json({ error: `GitHub error: ${json.message}` });

      const rawUrl = `https://raw.githubusercontent.com/NilTransfer/DataBase/main/${pathInRepo}`;
      res.status(200).send(rawUrl);

    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
