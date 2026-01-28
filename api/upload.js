// api/upload.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_BASE_PATH = process.env.GITHUB_BASE_PATH || "sounds";

function encodePathSegments(p){return p.split("/").map(encodeURIComponent).join("/")}

export default async function handler(req,res){
  try{
    if(req.method!=="POST") return res.status(405).send("Method Not Allowed");

    const body = await req.json().catch(()=>null);
    if(!body) return res.status(400).send("Invalid JSON body");
    const { name, data } = body;
    if(!name || !data) return res.status(400).send("Missing name or data");

    const filePath = `${GITHUB_BASE_PATH.replace(/(^\/|\/$)/g,"")}/${name}`;
    const encodedPath = encodePathSegments(filePath);
    const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;

    // Check if file exists to get SHA
    let sha;
    const getResp = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`,{
      method:"GET",
      headers:{
        Authorization:`token ${GITHUB_TOKEN}`,
        Accept:"application/vnd.github+json"
      }
    });
    if(getResp.status===200){
      const j = await getResp.json().catch(()=>null);
      if(j && j.sha) sha=j.sha;
    } else if(getResp.status!==404){
      const txt = await getResp.text().catch(()=>"(no message)");
      return res.status(502).send("GitHub error (GET): "+getResp.status+" "+txt);
    }

    const payload = { message: sha?`Update ${filePath}`:`Add ${filePath}`, content: data, branch: GITHUB_BRANCH };
    if(sha) payload.sha=sha;

    const putResp = await fetch(apiBase,{
      method:"PUT",
      headers:{
        Authorization:`token ${GITHUB_TOKEN}`,
        Accept:"application/vnd.github+json",
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    });

    if(!putResp.ok){
      const eTxt = await putResp.text().catch(()=>"(no body)");
      return res.status(502).send("GitHub error (PUT): "+putResp.status+" "+eTxt);
    }

    const rawUrl=`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
    return res.status(200).send(rawUrl);

  }catch(err){
    console.error("Server error:",err);
    return res.status(500).send("Server error: "+(err.message||"unknown"));
  }
}
