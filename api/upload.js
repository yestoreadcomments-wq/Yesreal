import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const f = files.file;
    if (!f) {
      return res.status(400).json({ error: "No file" });
    }

    try {
      const b = fs.readFileSync(f.filepath).toString("base64");
      const p = `sounds/${Date.now()}_${f.originalFilename}`;

      const r = await fetch(
        "https://api.github.com/repos/NilTransfer/DataBase/contents/" + p,
        {
          method: "PUT",
          headers: {
            "Authorization": "token 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",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "upload " + f.originalFilename,
            content: b,
            branch: "main"
          })
        }
      );

      const j = await r.json();

      if (!r.ok) {
        return res.status(500).json(j);
      }

      res.status(200).send(
        "https://raw.githubusercontent.com/NilTransfer/DataBase/main/" + p
      );

    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
