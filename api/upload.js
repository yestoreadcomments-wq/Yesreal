import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rmbbkrpqpogblzilohch.supabase.co"; // your URL
const SUPABASE_KEY = process.env.SUPABASE_KEY; // set in Vercel env

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_KEY env var");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // parse JSON body
    const body = await req.json();
    const { name, data } = body || {};

    if (!name || !data) {
      res.status(400).send("Missing name or data");
      return;
    }

    // decode base64 to buffer
    const buffer = Buffer.from(data, "base64");

    // upload to Supabase storage (bucket 'sounds' must exist and be public)
    const { error: uploadError } = await supabase.storage
      .from("sounds")
      .upload(name, buffer, { upsert: true });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      res.status(500).send("Upload failed: " + uploadError.message);
      return;
    }

    // get public URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from("sounds")
      .getPublicUrl(name);

    if (urlError) {
      console.error("Supabase getPublicUrl error:", urlError);
      res.status(500).send("Failed to get URL: " + urlError.message);
      return;
    }

    res.status(200).send(urlData.publicUrl);
  } catch (e) {
    console.error("Unexpected server error:", e);
    res.status(500).send("Server error");
  }
}
