const SUPABASE_URL="https://dspemuisfagoxwkpluyh.supabase.co";
const SUPABASE_KEY="sb_publishable_Lnq7CwIrAV9AJQjOVtFijw_CbD96Jar";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let mode="signup", pendingEmail="", filter="All", verifiedUser=null;
const opportunities=[
 {id:1,type:"Learn",title:"Cybersecurity learning path",meta:"Self-paced · Skills · Global",trust:"✓ Verified source",desc:"Build practical security foundations and collect proof as you progress."},
 {id:2,type:"Compete",title:"Open technology challenge",meta:"Project challenge · Free entry · Global",trust:"✓ Verified source",desc:"Create a practical project and turn the result into portfolio evidence."},
 {id:3,type:"Learn",title:"AI & automation sprint",meta:"Beginner friendly · Online",trust:"✓ Verified source",desc:"A focused sprint for learning useful AI workflows through practice."},
 {id:4,type:"Work",title:"Career opportunities · 18+",meta:"Eligibility required · Adult roles",trust:"🔒 Age-gated",desc:"Adult work opportunities are kept behind an 18+ eligibility gate."},
 {id:5,type:"Compete",title:"Security skills sprint",meta:"Short challenge · Portfolio proof",trust:"✓ Verified source",desc:"Practice defensive security thinking and record your achievement."},
 {id:6,type:"Learn",title:"Scholarship research hub",meta:"Funding · Global · Free",trust:"✓ Verified source",desc:"Discover funding research methods and organize application evidence."}
];
const opportunityUrlMap={1:"https://www.cybrary.it/",2:"https://solve.mit.edu/challenges",3:"https://www.coursera.org/",4:"https://jobs.unicef.org/en-us/listing/",5:"https://www.cybrary.it/",6:"https://www.globalyouthinitiatives.com/opportunities"};
opportunities.forEach(o=>{if(!o.url&&opportunityUrlMap[o.id])o.url=opportunityUrlMap[o.id]});
const externalOpportunityHubs=[
 {type:"Jobs & internships",title:"UNICEF Careers",meta:"Global · 18+ · Official source",trust:"Official source",url:"https://jobs.unicef.org/en-us/listing/",desc:"Explore current UNICEF vacancies and internships. Work listings remain age-gated for adult eligibility."},
 {type:"Scholarships & programs",title:"Global Youth Initiatives",meta:"Global · Scholarships · Programs · Competitions",trust:"External source",url:"https://www.globalyouthinitiatives.com/opportunities",desc:"A large opportunity index covering scholarships, summer programs, competitions, internships and study opportunities."},
 {type:"Competitions",title:"MIT Solve Challenges",meta:"Global · Innovation · Open challenges",trust:"Official source",url:"https://solve.mit.edu/challenges",desc:"Global open-innovation challenges where people and teams can submit solutions to real-world problems."},
 {type:"Learning",title:"UNICEF Internship Programme",meta:"Global · Students & recent graduates",trust:"Official source",url:"https://www.unicef.org/careers/internships",desc:"Official information about UNICEF internships, requirements and how to apply."},
 {type:"Opportunities",title:"Opportunity Radar Sources",meta:"Jobs · Scholarships · Competitions · Learning",trust:"Radar network",url:"https://wanted2005ed.github.io/opportunity-radar/",desc:"Opportunity Radar will keep expanding its verified-source network so useful opportunities can be discovered from one place."}
];
const saved=()=>JSON.parse(localStorage.getItem("or_saved")||"[]");
const saveIds=()=>{localStorage.setItem("or_saved",JSON.stringify(saved()));updateSavedCount()};
function updateSavedCount(){const n=saved().length;document.querySelectorAll("[data-saved-count]").forEach(x=>x.textContent=n)}
function toast(msg,ok=true){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;right:18px;bottom:18px;z-index:100;background:#10233a;border:1px solid #356080;color:#fff;padding:13px 16px;border-radius:12px;box-shadow:0 15px 40px rgba(0,0,0,.35);max-width:340px";document.body.appendChild(t)}t.textContent=msg;t.style.borderColor=ok?"#356080":"#8a4450";clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.remove(),3200)}
const scholarshipAccessCache=new Set();
function isPaidScholarship(o){return /scholarship|scholarships|funding opportunity/i.test(`${o.title} ${o.type} ${o.meta}`)}
async function hasScholarshipAccess(opportunityId){
  if(scholarshipAccessCache.has(opportunityId)) return true;
  if(!verifiedUser) return false;
  const {data,error}=await db.from('scholarship_access').select('id').eq('user_id',verifiedUser.id).eq('opportunity_id',opportunityId).maybeSingle();
  if(!error&&data){scholarshipAccessCache.add(opportunityId);return true}
  return false;
}
async function scholarshipPayment(o){
  if(!verifiedUser){openAuth('login');return}
  const existing=await hasScholarshipAccess(o.id); if(existing){showOpportunityDetail(o);return}
  let m=document.getElementById('scholarshipPayModal');
  if(!m){m=document.createElement('div');m.id='scholarshipPayModal';m.className='modal hidden';m.innerHTML='<div class="detail-card scholarship-pay-modal"><button class="close" id="scholarshipPayClose">×</button><div class="eyebrow">SCHOLARSHIP ACCESS</div><h2 id="scholarshipPayTitle">Unlock this scholarship</h2><div class="quote" id="scholarshipQuote">Loading local price…</div><p class="fine">Base access is €4. The amount shown is the €4 equivalent in the supported payment currency for your profile/country. Payment is processed securely by Paystack.</p><div class="pay-status" id="scholarshipPayStatus"></div><button class="btn primary" id="scholarshipPayButton">Continue to secure payment</button></div>';document.body.appendChild(m);m.onclick=e=>{if(e.target===m)m.classList.add('hidden')};document.getElementById('scholarshipPayClose').onclick=()=>m.classList.add('hidden')}
  m.classList.remove('hidden');document.getElementById('scholarshipPayTitle').textContent=`Unlock: ${o.title}`;const qel=document.getElementById('scholarshipQuote'), status=document.getElementById('scholarshipPayStatus'), pay=document.getElementById('scholarshipPayButton');qel.textContent='Loading local price…';status.textContent='';pay.disabled=true;
  const {data:quote,error}=await db.functions.invoke('scholarship-access',{body:{action:'quote'}});
  if(error||!quote){status.textContent='Could not calculate the local price right now. Please try again.';status.className='pay-status error';return}
  const symbols={NGN:'₦',GHS:'GH₵',KES:'KSh',ZAR:'R',USD:'$',XOF:'CFA'};qel.textContent=`${symbols[quote.currency]||quote.currency} ${Number(quote.amount).toLocaleString()} · €4 equivalent`;pay.disabled=false;
  pay.onclick=async()=>{pay.disabled=true;status.textContent='Preparing secure checkout…';status.className='pay-status';const {data:init,error:initErr}=await db.functions.invoke('scholarship-access',{body:{action:'initialize',opportunityId:o.id,callbackUrl:location.href}});if(initErr||!init?.authorization_url){status.textContent=initErr?.message||init?.error||'Could not start payment.';status.className='pay-status error';pay.disabled=false;return}location.href=init.authorization_url};
}
async function handleScholarshipReturn(){const ref=new URLSearchParams(location.search).get('reference');if(!ref)return;const {data,error}=await db.functions.invoke('scholarship-access',{body:{action:'verify',reference:ref}});if(!error&&data?.unlocked){if(data.opportunity_id)scholarshipAccessCache.add(data.opportunity_id);history.replaceState({},'',location.pathname+location.hash);renderOpps();toast('Scholarship unlocked successfully.');const o=opportunities.find(x=>String(x.id)===String(data.opportunity_id));if(o)showOpportunityDetail(o)}else{history.replaceState({},'',location.pathname+location.hash);toast('Payment could not be verified yet. If you completed it, refresh shortly.',false)}}
function renderOpps(){
  const q=$("search").value.toLowerCase();
  const list=opportunities.filter(o=>{
    const matchesFilter=filter==="All"||o.type===filter;
    const haystack=(o.title+" "+o.meta+" "+o.desc).toLowerCase();
    return matchesFilter&&haystack.includes(q);
  });
  $("oppList").innerHTML=list.map(o=>{
    const isSaved=saved().includes(o.id);
    const paid=isPaidScholarship(o); return '<article class="card opp '+(paid?'scholarship-locked':'')+'"><span class="trust">'+o.trust+'</span><span class="tag">'+o.type+'</span><h3>'+o.title+'</h3><div class="meta">'+o.meta+'</div><p style="margin-top:10px">'+o.desc+'</p>'+(paid?'<div class="scholarship-lock"><div><strong>🔒 Scholarship access</strong><small>€4 equivalent in your supported currency</small></div><button class="btn primary" onclick="scholarshipPayment('+o.id+')">Unlock</button></div>':'')+'<div style="display:flex;gap:8px;margin-top:15px"><button class="btn primary" onclick="openOpportunity('+o.id+')">'+(paid?'View locked details →':'View details →')+'</button><button class="btn" onclick="toggleSave('+o.id+')">'+(isSaved?'★ Saved':'☆ Save')+'</button></div></article>';
  }).join('')||'<article class="card"><h3>No matching signals</h3><p>Try another search. The algorithm has not yet conquered the entire universe.</p></article>';
  $("radarCount").textContent=list.length;
  updateSavedCount();
}

function openOpportunity(id){const o=opportunities.find(x=>x.id===id);if(!o)return;if(o.type==="Work"){toast("Work listings are 18+ and are shown for discovery only.",false);return}if(!verifiedUser){openAuth("login");return}if(isPaidScholarship(o)){hasScholarshipAccess(o.id).then(ok=>ok?showOpportunityDetail(o):scholarshipPayment(o));return}showOpportunityDetail(o)}
function showOpportunityDetail(o){
  let m=$("opportunityDetail");
  if(!m){
    m=document.createElement("div");
    m.id="opportunityDetail";
    m.className="modal hidden";
    m.innerHTML="<button class=\"close\" id=\"closeOpportunityDetail\">×</button><div class=\"detail-card\"><div class=\"eyebrow\" id=\"detailType\"></div><h2 id=\"detailTitle\"></h2><p id=\"detailMeta\"></p><p id=\"detailDesc\"></p><div class=\"detail-actions\"><button class=\"btn primary\" id=\"detailAction\">Open opportunity</button><button class=\"btn\" id=\"detailSave\">Save to My Radar</button></div><div class=\"detail-note\">Trust status: <strong id=\"detailTrust\"></strong></div></div>";
    document.body.appendChild(m);
    $("closeOpportunityDetail").onclick=()=>m.classList.add("hidden");
    m.onclick=e=>{if(e.target===m)m.classList.add("hidden")};
  }
  $("detailType").textContent=o.type;
  $("detailTitle").textContent=o.title;
  $("detailMeta").textContent=o.meta;
  $("detailDesc").textContent=o.desc;
  $("detailTrust").textContent=o.trust;
  const url=o.url||"#";
  $("detailAction").onclick=()=>{if(url!=="#")window.open(url,"_blank","noopener,noreferrer");else toast("This listing is currently being verified. Check back soon.",false)};
  $("detailSave").onclick=()=>toggleSave(o.id);
  m.classList.remove("hidden");
}
function toggleSave(id){const arr=saved();const i=arr.indexOf(id);if(i>=0){arr.splice(i,1);toast("Removed from your saved radar.")}else{arr.push(id);toast("Saved to your radar.")}localStorage.setItem("or_saved",JSON.stringify(arr));renderOpps()}
function lockScreen(){document.body.dataset.locked="true";openAuth("signup");}
function openAuth(nextMode="signup"){if(verifiedUser){closeAuth();toast("You are already signed in. Your Radar is unlocked.");return}mode=nextMode;$("authModal").classList.remove("hidden");$("emailStep").classList.remove("hidden");$("otpStep").classList.add("hidden");$("authStatus").textContent="";$("otpStatus").textContent="";$("authEmail").value=pendingEmail;$("authTitle").textContent=mode==="signup"?"Create your account":"Welcome back";$("authSubtitle").textContent="Use your Gmail address. We will email you a secure verification link. Access opens only after your email is verified.";$("nameField").classList.toggle("hidden",mode!=="signup");$("switchLogin").classList.toggle("hidden",mode!=="signup");$("authEyebrow").textContent="STEP 1 OF 2";$("step1").classList.add("on");$("step2").classList.remove("on");setTimeout(()=>$("authEmail").focus(),50)}
function closeAuth(){if(!verifiedUser&&document.body.dataset.locked==="true"){toast("Verify your Gmail first. Your account is still locked.",false);return}$("authModal").classList.add("hidden")}
const EMAIL_COOLDOWN_MS=65000;
const emailCooldownKey=email=>`or_email_cooldown_${email}`;
function emailCooldownLeft(email){return Math.max(0,Number(localStorage.getItem(emailCooldownKey(email))||0)-Date.now())}
function armEmailCooldown(email){localStorage.setItem(emailCooldownKey(email),String(Date.now()+EMAIL_COOLDOWN_MS))}
async function requestEmailSlot(email,type){
  try{
    const {data,error}=await db.rpc('record_email_verification_request',{p_email:email,p_request_type:type});
    if(error)return {allowed:true};
    if(data?.allowed===false)return data;
    return {allowed:true};
  }catch(_){return {allowed:true}}
}
async function sendCode(){const email=$("authEmail").value.trim().toLowerCase();const status=$("authStatus");if(!/^\S+@gmail\.com$/i.test(email)){status.className="status error";status.textContent="Please use a valid Gmail address.";return}if(mode==="signup"&&!$("authName").value.trim()){status.className="status error";status.textContent="Enter your name first.";return}const cooldown=emailCooldownLeft(email);if(cooldown>0){status.className="status error";status.textContent=`Please wait ${Math.ceil(cooldown/1000)} seconds before requesting another email.`;return}pendingEmail=email;status.className="status";status.textContent="Sending your secure verification email…";$("sendOtp").disabled=true;const {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:mode==="signup",data:mode==="signup"?{full_name:$("authName").value.trim()}:undefined,emailRedirectTo:location.href}});$("sendOtp").disabled=false;if(error){status.className="status error";status.textContent=error.message;return}armEmailCooldown(email);$("emailStep").classList.add("hidden");$("otpStep").classList.remove("hidden");$("authEyebrow").textContent="STEP 2 OF 2";$("step1").classList.remove("on");$("step2").classList.add("on");$("otpStatus").className="status ok";$("otpStatus").textContent="Check your Gmail and tap the verification link. This page will unlock automatically."}
async function finishAccess(user){if(!user)return;const confirmed=!!user.email_confirmed_at;if(!confirmed){lockScreen();return}verifiedUser=user;document.body.dataset.locked="false";const name=user.user_metadata?.full_name||user.email?.split("@")[0]||"Member";const {error}=await db.from("profiles").upsert({id:user.id,display_name:name},{onConflict:"id"});if(error)console.warn("Profile sync:",error.message);closeAuth();$("accountArea").classList.remove("hidden");$("loginBtn").classList.add("hidden");setTimeout(()=>{refreshBilling();loadAdminConsole()},120);$("signupBtn").classList.add("hidden");$("accountEmail").textContent=user.email;$("dashboard").classList.add("show");$("welcome").textContent=`Welcome, ${name}. Your Gmail is verified and your account is unlocked.`;$("savedStat").textContent=saved().length;window.scrollTo({top:document.getElementById("dashboard").offsetTop-80,behavior:"smooth"});toast("Email verified. Opportunity Radar unlocked.")}
async function restoreSession(){const {data}=await db.auth.getSession();if(data.session&&data.session.user?.email_confirmed_at){await finishAccess(data.session.user)}else{verifiedUser=null;$("accountArea").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("signupBtn").classList.remove("hidden");setTimeout(lockScreen,150)}}
async function logout(){await db.auth.signOut();verifiedUser=null;document.body.dataset.locked="true";$("dashboard").classList.remove("show");$("accountArea").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("signupBtn").classList.remove("hidden");toast("Signed out. The radar is locked again.");setTimeout(()=>openAuth("signup"),150)}
document.querySelectorAll("[data-scroll]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:"smooth"})));
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;renderOpps()}));
$("search").addEventListener("input",renderOpps);$("signupBtn").onclick=()=>openAuth("signup");$("heroSignup").onclick=()=>openAuth("signup");$("loginBtn").onclick=()=>openAuth("login");$("closeAuth").onclick=closeAuth;$("sendOtp").onclick=sendCode;$("verifyOtp").onclick=async()=>{const {data}=await db.auth.getSession();if(data.session) await finishAccess(data.session.user);else toast("Open the latest verification email first, then return here.",false)};$("resendOtp").onclick=sendCode;$("changeEmail").onclick=()=>openAuth(mode);$("switchLogin").onclick=()=>openAuth("login");$("logoutBtn").onclick=logout;$("authModal").addEventListener("click",e=>{if(e.target.id==="authModal")closeAuth()});
db.auth.onAuthStateChange((_event,session)=>{if(session?.user)finishAccess(session.user)});
renderOpps();updateSavedCount();restoreSession();handleScholarshipReturn();setTimeout(()=>{refreshBilling();loadAdminConsole()},500);


/* AUTH-FIRST ENTRY GATE */
(function(){
  const gate=id=>document.getElementById(id);
  const status=(msg,type='')=>{const el=gate('gateStatus');el.textContent=msg;el.className='gate-status '+type};
  const show=(id,on)=>gate(id).classList.toggle('hidden',!on);
  const setTab=tab=>{
    gate('gateLoginTab').classList.toggle('active',tab==='login');
    gate('gateSignupTab').classList.toggle('active',tab==='signup');
    show('gateLoginPane',tab==='login'); show('gateSignupPane',tab==='signup');
    show('gateVerifyPane',false); status('');
  };
  const unlock=()=>{document.body.classList.remove('auth-locked');gate('authGate').classList.add('hidden');};
  const lock=()=>{document.body.classList.add('auth-locked');gate('authGate').classList.remove('hidden');};
  async function check(){
    const {data}=await db.auth.getSession(); const u=data.session?.user;
    if(!u){lock();setTab('login');return}
    if(!u.email_confirmed_at){
      gate('gateVerifyEmail').textContent=u.email||''; show('gateLoginPane',false);show('gateSignupPane',false);show('gateLoginTab',false);show('gateSignupTab',false);show('gateVerifyPane',true);
      gate('gateTitle').textContent='Verify your Gmail'; gate('gateSubtitle').textContent='One last step before your Opportunity Radar access opens.'; lock(); return;
    }
    unlock();
    if(typeof finishAccess==='function') await finishAccess(u);
  }
  gate('gateLoginTab').onclick=()=>setTab('login'); gate('gateSignupTab').onclick=()=>setTab('signup');
  gate('gateLoginBtn').onclick=async()=>{
    const email=gate('gateLoginEmail').value.trim().toLowerCase(), password=gate('gateLoginPassword').value;
    if(!email.endsWith('@gmail.com')) return status('Use a Gmail address.','error');
    if(!password) return status('Enter your password.','error');
    status('Signing you in…');
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error)return status(error.message,'error');
    if(!data.user?.email_confirmed_at){return check()}
    await check();
  };
  gate('gateSignupBtn').onclick=async()=>{
    const name=gate('gateSignupName').value.trim(), email=gate('gateSignupEmail').value.trim().toLowerCase(), password=gate('gateSignupPassword').value;
    if(!name)return status('Enter your name.','error');
    if(!email.endsWith('@gmail.com'))return status('Use a Gmail address.','error');
    if(password.length<8)return status('Use at least 8 characters for your password.','error');
    status('Creating your account…');
    const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:location.href}});
    if(error)return status(error.message,'error');
    if(data.user?.email_confirmed_at)return check();
    await requestEmailSlot(email,'signup');
    armEmailCooldown(email);
    gate('gateVerifyEmail').textContent=email; gate('gateTitle').textContent='Verify your Gmail'; gate('gateSubtitle').textContent='Your account is created, but the platform is still locked.';
    show('gateLoginPane',false);show('gateSignupPane',false);show('gateLoginTab',false);show('gateSignupTab',false);show('gateVerifyPane',true);
    status('Verification email sent. Open Gmail and tap the secure link.','ok');
  };
  gate('gateCheckVerify').onclick=async()=>{status('Checking verification…');const {data}=await db.auth.getSession();if(data.session?.user?.email_confirmed_at){await check()}else status('Not verified yet. Open the latest Gmail verification email, tap the link, then return here.','error')};
  gate('gateResend').onclick=async()=>{const {data}=await db.auth.getSession();const email=(data.session?.user?.email||gate('gateVerifyEmail').textContent||'').trim().toLowerCase();if(!email)return status('Start account creation first.','error');const cooldown=emailCooldownLeft(email);if(cooldown>0){status(`Please wait ${Math.ceil(cooldown/1000)} seconds before requesting another email.` ,'error');return}const slot=await requestEmailSlot(email,'resend');if(slot?.allowed===false){const wait=slot.retry_after?` Try again in about ${slot.retry_after} seconds.`:'';status(slot.reason==='provider_window'?'Email delivery is temporarily at its provider limit. Use the latest verification email.'+wait:'A verification email was requested recently.'+wait,'error');return}status('Sending one verification email…','');const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:location.href}});if(!error)armEmailCooldown(email);status(error?(error.message.includes('rate')?'Email delivery is temporarily rate-limited. Use the latest verification email and wait before requesting another.':error.message):'A new verification email was sent.',''+(error?'error':'ok'))};
  lock(); check();
})();



/* BILLING + PARTNERS */
const RADAR_PRO_PLAN_CODE='PLN_qkucb5ysmguphjm';
const RADAR_PRO_PAYMENT_PAGE='https://paystack.com/pay/opportunity-radar-pro';
async function getSubscription(){
  if(!verifiedUser)return null;
  const {data,error}=await db.from('subscriptions').select('*').eq('user_id',verifiedUser.id).maybeSingle();
  if(error){console.warn('Subscription read:',error.message);return null}
  return data;
}
function renderBilling(sub){
  const pro=!!sub&&sub.plan==='radar_pro'&&['active','non-renewing','attention'].includes(sub.status);
  const badge=$('planBadge'),title=$('planTitle'),summary=$('planSummary'),status=$('planStatus'),renewal=$('planRenewal'),up=$('billingUpgradeBtn'),manage=$('manageSubscriptionBtn');
  if(!badge)return;
  badge.textContent=pro?'RADAR PRO':'FREE'; title.textContent=pro?'Radar Pro':'Radar Free';
  summary.textContent=pro?'Your advanced Radar tools are active.':'Core opportunity discovery is free for everyone.';
  status.textContent=pro?`Status: ${sub.status}`:'Status: Free';
  renewal.textContent=pro?(sub.next_payment_at?`Next payment: ${new Date(sub.next_payment_at).toLocaleDateString()}`:'Renewal date pending'):'No renewal scheduled';
  up.classList.toggle('hidden',pro); manage.classList.toggle('hidden',!pro);
  document.body.dataset.pro=pro?'true':'false';
  document.querySelectorAll('[data-pro-only]').forEach(el=>el.classList.toggle('pro-locked',!pro));
}
async function refreshBilling(){
  const sub=await getSubscription(); renderBilling(sub); return sub;
}
async function startProCheckout(){
  if(!verifiedUser){openAuth('login');return}
  const email=verifiedUser.email||'';
  try{
    const {data,error}=await db.functions.invoke('radar-billing',{body:{action:'checkout'}});
    if(!error&&data?.authorization_url){location.href=data.authorization_url;return}
  }catch(err){console.warn('Secure checkout endpoint unavailable:',err)}
  const fallback=`${RADAR_PRO_PAYMENT_PAGE}?email=${encodeURIComponent(email)}&read-only=email`;
  toast('Opening the secure Paystack checkout. After payment, return here and refresh your plan.',true);
  window.open(fallback,'_blank','noopener');
}
async function submitPartnerLead(e){
  e.preventDefault(); if(!verifiedUser){openAuth('login');return}
  const row={user_id:verifiedUser.id,organization_name:$('partnerOrg').value.trim(),email:$('partnerEmail').value.trim(),request_type:$('partnerType').value,message:$('partnerMessage').value.trim()};
  if(!row.organization_name||!row.email)return;
  const {error}=await db.from('partner_leads').insert(row);
  if(error){toast('We could not submit the partnership request yet.',false);console.warn(error.message);return}
  $('partnerForm').reset(); toast('Partnership request received. It will be reviewed before publication.');
}
async function loadAdminConsole(){
  if(!verifiedUser||verifiedUser.app_metadata?.role!=='admin')return;
  $('adminConsole')?.classList.remove('hidden');
  try{
    const {data,error}=await db.functions.invoke('radar-billing',{body:{action:'admin_metrics'}});
    if(error||!data)return;
    $('adminSubCount').textContent=String(data.active_pro??0);
    $('adminPartnerCount').textContent=String(data.open_partners??0);
    $('adminRevenue').textContent=`₦${(Number(data.revenue_kobo||0)/100).toLocaleString()}`;
  }catch(err){console.warn('Admin metrics:',err)}
}
function bindBilling(){
  $('upgradeProBtn')?.addEventListener('click',startProCheckout);
  $('billingUpgradeBtn')?.addEventListener('click',startProCheckout);
  $('manageSubscriptionBtn')?.addEventListener('click',async()=>{try{const {data,error}=await db.functions.invoke('radar-billing',{body:{action:'manage'}});if(!error&&data?.link){window.open(data.link,'_blank','noopener');return}}catch(err){console.warn(err)}toast('Subscription management is temporarily unavailable.',false)});
  $('partnerBtn')?.addEventListener('click',()=>document.getElementById('partner')?.scrollIntoView({behavior:'smooth'}));
  $('partnerForm')?.addEventListener('submit',submitPartnerLead);
}
bindBilling();
(async function(){
  const ref=new URLSearchParams(location.search).get('reference');
  if(ref&&verifiedUser){try{const {data}=await db.functions.invoke('radar-billing',{body:{action:'sync',reference:ref}});if(data?.pro){toast('Payment verified. Radar Pro is being activated.');await refreshBilling()}}catch(err){console.warn('Payment sync:',err)}}
})();

/* INTERACTION LAYER */
(function(){
 const add=(tag,props={})=>{const e=document.createElement(tag);Object.assign(e,props);return e};
 const progress=add('div',{id:'scrollProgress'});document.body.appendChild(progress);
 const glow=add('div',{id:'cursorGlow'});document.body.appendChild(glow);
 window.addEventListener('scroll',()=>{const d=document.documentElement;progress.style.width=((d.scrollTop/(d.scrollHeight-d.clientHeight))*100)+'%'} ,{passive:true});
 window.addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});
 const reveal=()=>{document.querySelectorAll('[data-reveal]').forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight*.88){setTimeout(()=>el.classList.add('revealed'),Math.min(i*55,350))}})};
 const mark=()=>document.querySelectorAll('main section,.hero,.card,.signal,.dashbar').forEach((el,i)=>{if(!el.hasAttribute('data-reveal'))el.setAttribute('data-reveal','')});
 mark();reveal();window.addEventListener('scroll',reveal,{passive:true});
 document.addEventListener('click',e=>{const b=e.target.closest('button,.btn');if(!b||b.disabled)return;const r=b.getBoundingClientRect(),s=add('span',{className:'ripple'});s.style.width=s.style.height=Math.max(r.width,r.height)+'px';s.style.left=e.clientX-r.left-Math.max(r.width,r.height)/2+'px';s.style.top=e.clientY-r.top-Math.max(r.width,r.height)/2+'px';b.style.position='relative';b.style.overflow='hidden';b.appendChild(s);setTimeout(()=>s.remove(),600)});
 document.querySelectorAll('.card').forEach(card=>{card.addEventListener('pointermove',e=>{if(innerWidth<800)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-2.5}deg) rotateY(${x*3}deg) translateY(-6px)`});card.addEventListener('pointerleave',()=>card.style.transform='')});
 document.querySelectorAll('.btn.primary,.hero button').forEach(b=>{b.classList.add('magnetic');b.addEventListener('pointermove',e=>{if(innerWidth<700)return;const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.08}px)`});b.addEventListener('pointerleave',()=>b.style.transform='')});
 // Make navigation feel app-like and close to the current viewport.
 document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{const target=document.getElementById(b.dataset.scroll);if(target)target.scrollIntoView({behavior:'smooth',block:'start'})}));
 // Keyboard shortcut: / focuses the opportunity search.
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();document.getElementById('search')?.focus()}});
 setTimeout(reveal,100);
})();
