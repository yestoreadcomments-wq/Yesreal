import { writeFile } from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const data = await req.formData();
  const file = data.get("file");
  if (!file) return res.status(400).send("No file uploaded");

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = path.join("./public", file.name);
  await writeFile(filePath, buffer);

  const url = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host")}/` + file.name;
  res.send(url);
}
