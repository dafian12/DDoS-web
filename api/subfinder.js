import axios from 'axios';
export default async function handler(req, res) {
  const { domain } = req.query;
  if(!domain) return res.status(400).json({error:'domain required'});
  try{
    const { data } = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`);
    const subs = [...new Set(data.map(d=>d.name_value))];
    res.json({domain, subdomains:subs});
  }catch(e){
    res.json({domain, subdomains:[]});
  }
}
