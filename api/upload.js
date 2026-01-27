import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rmbbkrpqpogblzilohch.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY; // secure key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const data = await req.formData();
  const file = data.get('file');
  if (!file) return res.status(400).send('No file uploaded');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase
    .storage
    .from('sounds')  // your bucket name
    .upload(file.name, buffer, { upsert: true });

  if (error) return res.status(500).send(error.message);

  const { publicURL } = supabase
    .storage
    .from('sounds')
    .getPublicUrl(file.name);

  res.status(200).send(publicURL);
}
