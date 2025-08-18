import axios from 'axios';
export default async function handler(req, res){
  const { host } = req.query;
  if(!host) return res.status(400).json({error:'host required'});
  try{
    const { headers } = await axios.get(`https://${host}`,{timeout:5000});
    res.json({host,headers});
  }catch(e){
    res.json({host,headers:{},error:e.message});
  }
}
