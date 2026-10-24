// Additive, idempotent DNS-AID organization-index publication. Never changes web or email routing.
const zoneName="llmmargin.com";
const record={type:"SVCB",name:`_index._agents.${zoneName}`,ttl:3600,proxied:false,data:{priority:1,target:zoneName,value:'alpn="h2,h3" port=443'},comment:"DNS-AID organization index. HTTPS root supports Accept: application/json and links to agent cards."};
console.log(JSON.stringify({plannedRecord:record},null,2));
if(!process.argv.includes("--apply")) { console.log("Plan only. To publish, set CLOUDFLARE_API_TOKEN with Zone Read and DNS Edit for llmmargin.com and rerun with --apply.");process.exit(0); }
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token) throw new Error("CLOUDFLARE_API_TOKEN is required; do not commit it or paste it into chat.");
async function api(path,options={}) {
  const result=await fetch(`https://api.cloudflare.com/client/v4${path}`,{...options,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}});
  const data=await result.json();
  if(!result.ok || !data.success) throw new Error(`Cloudflare ${result.status}: ${data.errors?.map(e=>e.message).join("; ") || "request failed"}`);
  return data.result;
}
const zones=await api(`/zones?name=${zoneName}`);
if(zones.length!==1 || zones[0].name!==zoneName) throw new Error("Expected exactly the llmmargin.com zone.");
const zoneId=zones[0].id;
const existing=await api(`/zones/${zoneId}/dns_records?name=${record.name}`);
if(existing.length) {
  if(existing.length===1 && existing[0].type==="SVCB" && existing[0].data?.priority===1 && existing[0].data?.target?.replace(/\.$/,"")===zoneName && existing[0].data?.value===record.data.value) console.log("Matching DNS-AID record already exists; no change.");
  else throw new Error("An existing discovery record differs. Review it before making changes; nothing was overwritten.");
} else {
  const created=await api(`/zones/${zoneId}/dns_records`,{method:"POST",body:JSON.stringify(record)});
  console.log(JSON.stringify({created:created.name,type:created.type,id:created.id}));
}
const verify=await fetch(`https://cloudflare-dns.com/dns-query?name=${record.name}&type=64`,{headers:{Accept:"application/dns-json"}});
const dns=await verify.json();console.log(JSON.stringify({dnsStatus:dns.Status,answers:dns.Answer,dnssecValidated:dns.AD}));
