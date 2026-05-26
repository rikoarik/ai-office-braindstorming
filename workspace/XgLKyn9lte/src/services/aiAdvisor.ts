type Advice = { summary:string; actions:string[]; tone:"supportive"; source:"json"|"plain"|"local" };
export async function fetchAIAdvice(baseUrl:string,key:string,model:string,context:unknown):Promise<Advice>{
  const local:Advice={summary:"Fokus kebutuhan pokok dulu. Catat harian, tekan pos rokok/kopi bila mepet.",actions:["Prioritaskan makan, sewa, transport","Tunda belanja non-esensial","Cek tagihan 7 hari ke depan"],tone:"supportive",source:"local"};
  if(!baseUrl||!key||!model) return local;
  try{
    const res=await fetch(`${baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:"Kamu advisor finansial survival budgeting Indonesia. Balas JSON."},{role:"user",content:JSON.stringify(context)}]})});
    const data=await res.json();
    const text=data?.choices?.[0]?.message?.content ?? "";
    try { const j=JSON.parse(text); return {summary:j.summary??local.summary,actions:j.actions??local.actions,tone:"supportive",source:"json"}; }
    catch { return {summary:text || local.summary,actions:local.actions,tone:"supportive",source:"plain"}; }
  } catch { return local; }
}