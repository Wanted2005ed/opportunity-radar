import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const PLAN_CODE = Deno.env.get('RADAR_PRO_PLAN_CODE') || 'PLN_qkucb5ysmguphjm'
const SITE_URL = 'https://wanted2005ed.github.io/opportunity-radar/'
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET)
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json'}})
async function hmacSha512(secret: string, raw: string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-512'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw));return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function requireUser(req: Request){const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return null;const token=auth.slice(7);const {data}=await supabaseAdmin.auth.getUser(token);return data.user||null}
async function checkout(req: Request){
  if(!PAYSTACK_SECRET)return json({error:'PAYMENT_PROVIDER_NOT_CONFIGURED',message:'The secure Paystack server key still needs to be configured.'},503)
  const user=await requireUser(req);if(!user?.email)return json({error:'UNAUTHORIZED'},401)
  const reference=`OR-${crypto.randomUUID().replaceAll('-','')}`
  const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,plan:PLAN_CODE,reference,callback_url:`${SITE_URL}?payment=complete&reference=${encodeURIComponent(reference)}`,metadata:{user_id:user.id,product:'radar_pro'}})})
  const payload=await response.json();if(!response.ok||!payload.status)return json({error:'PAYSTACK_INITIALIZE_FAILED',message:payload.message||'Unable to start checkout.'},502)
  await supabaseAdmin.from('payment_transactions').upsert({user_id:user.id,reference,amount:250000,currency:'NGN',status:'pending',plan:'radar_pro',metadata:{product:'radar_pro'}},{onConflict:'reference'})
  return json({authorization_url:payload.data.authorization_url,reference})
}
async function syncPayment(req: Request,reference: string){
  if(!PAYSTACK_SECRET)return json({error:'PAYMENT_PROVIDER_NOT_CONFIGURED'},503)
  const user=await requireUser(req);if(!user)return json({error:'UNAUTHORIZED'},401)
  const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`}});const payload=await response.json();if(!response.ok||!payload.status)return json({error:'VERIFY_FAILED'},502)
  const d=payload.data||{};if(d.status!=='success')return json({status:d.status,pro:false})
  const metadata=d.metadata||{};if(metadata.user_id&&metadata.user_id!==user.id)return json({error:'REFERENCE_OWNER_MISMATCH'},403)
  await supabaseAdmin.from('payment_transactions').upsert({user_id:user.id,reference,amount:Number(d.amount||250000),currency:d.currency||'NGN',status:'success',plan:'radar_pro',provider_customer_id:d.customer?.customer_code||null,metadata:{verified:true}},{onConflict:'reference'})
  return json({status:'success',pro:true})
}
async function manage(req: Request){
  if(!PAYSTACK_SECRET)return json({error:'PAYMENT_PROVIDER_NOT_CONFIGURED'},503)
  const user=await requireUser(req);if(!user)return json({error:'UNAUTHORIZED'},401)
  const {data:sub}=await supabaseAdmin.from('subscriptions').select('provider_subscription_code').eq('user_id',user.id).maybeSingle();if(!sub?.provider_subscription_code)return json({error:'NO_ACTIVE_SUBSCRIPTION'},404)
  const response=await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(sub.provider_subscription_code)}/manage/link`,{headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`}});const payload=await response.json();if(!response.ok||!payload.status)return json({error:'MANAGE_LINK_FAILED'},502)
  return json({link:payload.data.link})
}
async function adminMetrics(req: Request){
  const user=await requireUser(req);if(user?.app_metadata?.role!=='admin')return json({error:'FORBIDDEN'},403)
  const [subs,partners,tx]=await Promise.all([supabaseAdmin.from('subscriptions').select('id',{count:'exact',head:true}).eq('plan','radar_pro').in('status',['active','non-renewing','attention']),supabaseAdmin.from('partner_leads').select('id',{count:'exact',head:true}).eq('status','new'),supabaseAdmin.from('payment_transactions').select('amount').eq('status','success').limit(5000)])
  const revenue=(tx.data||[]).reduce((sum:any,row:any)=>sum+Number(row.amount||0),0)
  return json({active_pro:subs.count||0,open_partners:partners.count||0,revenue_kobo:revenue})
}
async function webhook(req: Request){
  if(!PAYSTACK_SECRET)return json({error:'WEBHOOK_NOT_CONFIGURED'},503)
  const raw=await req.text();const signature=req.headers.get('x-paystack-signature')||'';const expected=await hmacSha512(PAYSTACK_SECRET,raw);if(!signature||signature!==expected)return json({error:'INVALID_SIGNATURE'},401)
  const event=JSON.parse(raw);const data=event.data||{};const eventId=String(data.id??data.reference??crypto.randomUUID())
  const inserted=await supabaseAdmin.from('subscription_events').insert({provider:'paystack',event_type:event.event,event_id:eventId,reference:data.reference||null,payload:event});if(inserted.error&&inserted.error.code!=='23505')return json({error:'EVENT_RECORD_FAILED'},500)
  const email=data.customer?.email||data.email||null;let userId=data.metadata?.user_id||null
  if(!userId&&email){const {data:list}=await supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000});userId=list.users.find((u:any)=>u.email?.toLowerCase()===email.toLowerCase())?.id||null}
  const subscription=data.subscription||{};const subscriptionCode=subscription.subscription_code||data.subscription_code||null;const customerCode=data.customer?.customer_code||null;const nextPayment=subscription.next_payment_date||null
  if(event.event==='charge.success'||event.event==='subscription.create')if(userId){await supabaseAdmin.from('subscriptions').upsert({user_id:userId,provider:'paystack',provider_customer_id:customerCode,provider_subscription_code:subscriptionCode,plan:'radar_pro',status:'active',provider_status:'active',current_period_end:nextPayment,last_payment_at:data.paid_at||new Date().toISOString(),next_payment_at:nextPayment,plan_code:PLAN_CODE,metadata:{last_event:event.event}},{onConflict:'user_id'});await supabaseAdmin.from('payment_transactions').upsert({user_id:userId,reference:data.reference||`WEBHOOK-${eventId}`,amount:Number(data.amount||250000),currency:data.currency||'NGN',status:'success',plan:'radar_pro',provider_customer_id:customerCode,provider_subscription_code:subscriptionCode,metadata:{event:event.event}},{onConflict:'reference'})}
  if(event.event==='invoice.payment_failed'&&userId)await supabaseAdmin.from('subscriptions').update({status:'attention',provider_status:'attention',metadata:{last_event:event.event},updated_at:new Date().toISOString()}).eq('user_id',userId)
  if(event.event==='subscription.not_renew'&&userId)await supabaseAdmin.from('subscriptions').update({status:'non-renewing',provider_status:'non-renewing',cancel_at_period_end:true,metadata:{last_event:event.event},updated_at:new Date().toISOString()}).eq('user_id',userId)
  if(event.event==='subscription.disable'&&userId)await supabaseAdmin.from('subscriptions').update({status:'inactive',provider_status:'inactive',cancel_at_period_end:false,metadata:{last_event:event.event},updated_at:new Date().toISOString()}).eq('user_id',userId)
  return json({received:true})
}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{const url=new URL(req.url);if(url.pathname.endsWith('/webhook')||req.headers.has('x-paystack-signature'))return await webhook(req);if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);const body=await req.json().catch(()=>({}));if(body.action==='checkout')return await checkout(req);if(body.action==='sync')return await syncPayment(req,String(body.reference||''));if(body.action==='manage')return await manage(req);if(body.action==='admin_metrics')return await adminMetrics(req);return json({error:'UNKNOWN_ACTION'},400)}catch(error){console.error(error);return json({error:'INTERNAL_ERROR'},500)}})
