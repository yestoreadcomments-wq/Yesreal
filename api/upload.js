import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

// Hardcoded Supabase anon key (works for public storage)
const SUPABASE_URL = "https://rmbbkrpqpogblzilohch.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYmJya3BxcG9nYmx6aWxvaGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjMxNDAsImV4cCI6MjA3MzQzOTE0MH0.nWvLwhZiegzp3xw9FxW5U8yimrzCcG4JT026cd7uA9M";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString();

    let parsed;
    try { parsed = JSON.parse(rawBody); } 
    catch(e) { return res.status(400).send("Invalid JSON"); }

    const { name, data } = parsed;
    if (!name || !data) return res.status(400).send("Missing name or data");

    const buffer = Buffer.from(data, "base64");

    // UPLOAD directly — no bucket listing
    const { error } = await supabase.storage
      .from("sounds") // make sure bucket 'sounds' exists
      .upload(name, buffer, { upsert: true });

    if (error) return res.status(500).send("Upload failed: " + error.message);

    const { data: urlData, error: urlError } = supabase.storage.from("sounds").getPublicUrl(name);
    if (urlError) return res.status(500).send("Failed to get public URL: " + urlError.message);

    res.status(200).send(urlData.publicUrl);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
}
