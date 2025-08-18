import axios from 'axios';
const PAYLOADS={
  xss:"<script>alert('xss')</script>",
  sqli:"' OR 1=1--",
  orl:"http://evil.com"
};
export default async function handler(req, res){
  if(req.method!=='POST') return res.status(405).send('POST only');
  const { url } = req.body;
  if(!url) return res.status(400).json({error:'url required'});
  const out={};
  for(const [k,p] of Object.entries(PAYLOADS)){
    try{
      const { data } = await axios.get(`${url}?q=${encodeURIComponent(p)}`,{timeout:5000});
      out[k]=data.includes(p);
    }catch{ out[k]=false; }
  }
  res.json({url,results:out});
}
