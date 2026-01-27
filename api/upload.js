const { createClient } = require('@supabase/supabase-js');
const formidable = require('formidable');
const fs = require('fs');

export const config = {
  api: { bodyParser: false }
};

const SUPABASE_URL = "https://rmbbkrpqpogblzilohch.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send("File parse error: " + err.message);

    const file = files.file;
    if (!file) return res.status(400).send("No file uploaded");

    const buffer = fs.readFileSync(file.filepath);

    const { error } = await supabase
      .storage
      .from('sounds')
      .upload(file.originalFilename, buffer, { upsert: true });

    if (error) return res.status(500).send("Upload failed: " + error.message);

    const { publicURL } = supabase
      .storage
      .from('sounds')
      .getPublicUrl(file.originalFilename);

    res.status(200).send(publicURL);
  });
}
