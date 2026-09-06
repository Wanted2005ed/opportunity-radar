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
const saved=()=>JSON.parse(localStorage.getItem("or_saved")||"[]");
const saveIds=()=>{localStorage.setItem("or_saved",JSON.stringify(saved()));updateSavedCount()};
function updateSavedCount(){const n=saved().length;document.querySelectorAll("[data-saved-count]").forEach(x=>x.textContent=n)}
function toast(msg,ok=true){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;right:18px;bottom:18px;z-index:100;background:#10233a;border:1px solid #356080;color:#fff;padding:13px 16px;border-radius:12px;box-shadow:0 15px 40px rgba(0,0,0,.35);max-width:340px";document.body.appendChild(t)}t.textContent=msg;t.style.borderColor=ok?"#356080":"#8a4450";clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.remove(),3200)}
function renderOpps(){
  const q=$("search").value.toLowerCase();
  const list=opportunities.filter(o=>{
    const matchesFilter=filter==="All"||o.type===filter;
    const haystack=(o.title+" "+o.meta+" "+o.desc).toLowerCase();
    return matchesFilter&&haystack.includes(q);
  });
  $("oppList").innerHTML=list.map(o=>{
    const isSaved=saved().includes(o.id);
    return '<article class="card opp"><span class="trust">'+o.trust+'</span><span class="tag">'+o.type+'</span><h3>'+o.title+'</h3><div class="meta">'+o.meta+'</div><p style="margin-top:10px">'+o.desc+'</p><div style="display:flex;gap:8px;margin-top:15px"><button class="btn primary" onclick="openOpportunity('+o.id+')">View details →</button><button class="btn" onclick="toggleSave('+o.id+')">'+(isSaved?'★ Saved':'☆ Save')+'</button></div></article>';
  }).join('')||'<article class="card"><h3>No matching signals</h3><p>Try another search. The algorithm has not yet conquered the entire universe.</p></article>';
  $("radarCount").textContent=list.length;
  updateSavedCount();
}

function openOpportunity(id){const o=opportunities.find(x=>x.id===id);if(!o)return;if(o.type==="Work"){toast("Work listings are 18+ and cannot be opened from this account.",false);return}openAuth("login");toast(`Sign in to open: ${o.title}`)}
function toggleSave(id){const arr=saved();const i=arr.indexOf(id);if(i>=0){arr.splice(i,1);toast("Removed from your saved radar.")}else{arr.push(id);toast("Saved to your radar.")}localStorage.setItem("or_saved",JSON.stringify(arr));renderOpps()}
function lockScreen(){document.body.dataset.locked="true";openAuth("signup");}
function openAuth(nextMode="signup"){mode=nextMode;$("authModal").classList.remove("hidden");$("emailStep").classList.remove("hidden");$("otpStep").classList.add("hidden");$("authStatus").textContent="";$("otpStatus").textContent="";$("authEmail").value=pendingEmail;$("authTitle").textContent=mode==="signup"?"Create your account":"Welcome back";$("authSubtitle").textContent="Use your Gmail address. We will email you a secure verification link. Access opens only after your email is verified.";$("nameField").classList.toggle("hidden",mode!=="signup");$("switchLogin").classList.toggle("hidden",mode!=="signup");$("authEyebrow").textContent="STEP 1 OF 2";$("step1").classList.add("on");$("step2").classList.remove("on");setTimeout(()=>$("authEmail").focus(),50)}
function closeAuth(){if(!verifiedUser&&document.body.dataset.locked==="true"){toast("Verify your Gmail first. Your account is still locked.",false);return}$("authModal").classList.add("hidden")}
const EMAIL_COOLDOWN_MS=65000;
const emailCooldownKey=email=>`or_email_cooldown_${email}`;
function emailCooldownLeft(email){return Math.max(0,Number(localStorage.getItem(emailCooldownKey(email))||0)-Date.now())}
function armEmailCooldown(email){localStorage.setItem(emailCooldownKey(email),String(Date.now()+EMAIL_COOLDOWN_MS))}
async function sendCode(){const email=$("authEmail").value.trim().toLowerCase();const status=$("authStatus");if(!/^\S+@gmail\.com$/i.test(email)){status.className="status error";status.textContent="Please use a valid Gmail address.";return}if(mode==="signup"&&!$("authName").value.trim()){status.className="status error";status.textContent="Enter your name first.";return}const cooldown=emailCooldownLeft(email);if(cooldown>0){status.className="status error";status.textContent=`Please wait ${Math.ceil(cooldown/1000)} seconds before requesting another email.`;return}pendingEmail=email;status.className="status";status.textContent="Sending your secure verification email…";$("sendOtp").disabled=true;const {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:mode==="signup",data:mode==="signup"?{full_name:$("authName").value.trim()}:undefined,emailRedirectTo:location.href}});$("sendOtp").disabled=false;if(error){status.className="status error";status.textContent=error.message;return}armEmailCooldown(email);$("emailStep").classList.add("hidden");$("otpStep").classList.remove("hidden");$("authEyebrow").textContent="STEP 2 OF 2";$("step1").classList.remove("on");$("step2").classList.add("on");$("otpStatus").className="status ok";$("otpStatus").textContent="Check your Gmail and tap the verification link. This page will unlock automatically."}
async function finishAccess(user){if(!user)return;const confirmed=!!user.email_confirmed_at;if(!confirmed){lockScreen();return}verifiedUser=user;document.body.dataset.locked="false";const name=user.user_metadata?.full_name||user.email?.split("@")[0]||"Member";const {error}=await db.from("profiles").upsert({id:user.id,display_name:name},{onConflict:"id"});if(error)console.warn("Profile sync:",error.message);closeAuth();$("accountArea").classList.remove("hidden");$("loginBtn").classList.add("hidden");$("signupBtn").classList.add("hidden");$("accountEmail").textContent=user.email;$("dashboard").classList.add("show");$("welcome").textContent=`Welcome, ${name}. Your Gmail is verified and your account is unlocked.`;$("savedStat").textContent=saved().length;window.scrollTo({top:document.getElementById("dashboard").offsetTop-80,behavior:"smooth"});toast("Email verified. Opportunity Radar unlocked.")}
async function restoreSession(){const {data}=await db.auth.getSession();if(data.session&&data.session.user?.email_confirmed_at){await finishAccess(data.session.user)}else{verifiedUser=null;$("accountArea").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("signupBtn").classList.remove("hidden");setTimeout(lockScreen,150)}}
async function logout(){await db.auth.signOut();verifiedUser=null;document.body.dataset.locked="true";$("dashboard").classList.remove("show");$("accountArea").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("signupBtn").classList.remove("hidden");toast("Signed out. The radar is locked again.");setTimeout(()=>openAuth("signup"),150)}
document.querySelectorAll("[data-scroll]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:"smooth"})));
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;renderOpps()}));
$("search").addEventListener("input",renderOpps);$("signupBtn").onclick=()=>openAuth("signup");$("heroSignup").onclick=()=>openAuth("signup");$("loginBtn").onclick=()=>openAuth("login");$("closeAuth").onclick=closeAuth;$("sendOtp").onclick=sendCode;$("verifyOtp").onclick=async()=>{const {data}=await db.auth.getSession();if(data.session) await finishAccess(data.session.user);else toast("Open the latest verification email first, then return here.",false)};$("resendOtp").onclick=sendCode;$("changeEmail").onclick=()=>openAuth(mode);$("switchLogin").onclick=()=>openAuth("login");$("logoutBtn").onclick=logout;$("authModal").addEventListener("click",e=>{if(e.target.id==="authModal")closeAuth()});
db.auth.onAuthStateChange((_event,session)=>{if(session?.user)finishAccess(session.user)});
renderOpps();updateSavedCount();restoreSession();


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
    gate('gateVerifyEmail').textContent=email; gate('gateTitle').textContent='Verify your Gmail'; gate('gateSubtitle').textContent='Your account is created, but the platform is still locked.';
    show('gateLoginPane',false);show('gateSignupPane',false);show('gateLoginTab',false);show('gateSignupTab',false);show('gateVerifyPane',true);
    status('Verification email sent. Open Gmail and tap the secure link.','ok');
  };
  gate('gateCheckVerify').onclick=async()=>{status('Checking verification…');const {data}=await db.auth.getSession();if(data.session?.user?.email_confirmed_at){await check()}else status('Not verified yet. Open the latest Gmail verification email, tap the link, then return here.','error')};
  gate('gateResend').onclick=async()=>{const {data}=await db.auth.getSession();const email=(data.session?.user?.email||gate('gateVerifyEmail').textContent||'').trim().toLowerCase();if(!email)return status('Start account creation first.','error');const cooldown=emailCooldownLeft(email);if(cooldown>0){status(`Please wait ${Math.ceil(cooldown/1000)} seconds before requesting another email.` ,'error');return}status('Sending one verification email…','');const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:location.href}});if(!error)armEmailCooldown(email);status(error?(error.message.includes('rate')?'Email sending is temporarily rate-limited. Please wait for the cooldown to finish and use the latest verification email.':error.message):'A new verification email was sent.',''+(error?'error':'ok'))};
  lock(); check();
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
