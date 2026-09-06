const SUPABASE_URL = 'https://dspemuisfagoxwkpluyh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nuMjOYMSW68RYKTSndkkNg_b1gP6dox';

const demoOpportunities = [
  {title:'Remote Junior Cybersecurity Analyst',category:'Remote Job',value:'Paid',difficulty:'Intermediate',region:'Global',description:'Demo fallback listing. Live verified opportunities will appear here when the database has published records.',source_name:'Opportunity Radar',source_url:'#',score:72,verified:false},
  {title:'Open Innovation Challenge',category:'Competition',value:'Prize',difficulty:'Intermediate',region:'Africa',description:'Demo fallback listing for the opportunity discovery interface.',source_name:'Opportunity Radar',source_url:'#',score:68,verified:false},
  {title:'Student Technology Scholarship',category:'Scholarship',value:'Funding',difficulty:'Beginner',region:'Global',description:'Demo fallback listing. Eligibility and deadline must be verified before publication.',source_name:'Opportunity Radar',source_url:'#',score:65,verified:false},
  {title:'Freelance Frontend Project',category:'Freelance',value:'Paid',difficulty:'Intermediate',region:'Remote',description:'Demo fallback listing for search and category filtering.',source_name:'Opportunity Radar',source_url:'#',score:63,verified:false},
  {title:'Early-Stage Startup Grant',category:'Grant',value:'Funding',difficulty:'Advanced',region:'Africa',description:'Demo fallback listing. Original grant source must be attached before launch.',source_name:'Opportunity Radar',source_url:'#',score:61,verified:false},
  {title:'B2B Lead Discovery Opportunity',category:'Business',value:'Revenue',difficulty:'Intermediate',region:'Global',description:'Demo fallback listing for the business-opportunity workflow.',source_name:'Opportunity Radar',source_url:'#',score:58,verified:false}
];

const feed = document.querySelector('#feed');
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const empty = document.querySelector('#empty');
let opportunities = [];

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
}

function card(o) {
  const source = o.source_url && o.source_url !== '#' ? `<a href="${escapeHtml(o.source_url)}" target="_blank" rel="noopener noreferrer">View source ↗</a>` : '<span class="muted">Demo listing</span>';
  const verified = o.verified ? '<span class="verified">Verified</span>' : '<span class="demo">Demo</span>';
  const score = Number.isFinite(Number(o.score)) ? `<span>Radar score ${escapeHtml(o.score)}/100</span>` : '';
  return `<article class="card"><div class="tag-row"><span class="tag">${escapeHtml(o.category || 'Opportunity')}</span>${verified}</div><h3>${escapeHtml(o.title)}</h3><p>${escapeHtml(o.description || '')}</p><div class="meta"><span>${escapeHtml(o.region || 'Global')}</span><span>${escapeHtml(o.value || 'Value varies')} · ${escapeHtml(o.difficulty || 'Varies')}</span>${score}</div>${source}</article>`;
}

function render() {
  const q = (search?.value || '').trim().toLowerCase();
  const c = category?.value || 'all';
  const rows = opportunities.filter(o => {
    const text = `${o.title || ''} ${o.description || ''} ${o.region || ''} ${o.category || ''}`.toLowerCase();
    return (c === 'all' || o.category === c) && text.includes(q);
  });
  feed.innerHTML = rows.map(card).join('');
  empty.hidden = rows.length > 0;
}

async function loadSupabaseLibrary() {
  if (window.supabase) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadLiveOpportunities() {
  try {
    await loadSupabaseLibrary();
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await client
      .from('opportunities')
      .select('id,title,category,region,deadline,estimated_value,difficulty,competition,skills,description,why_it_fits,source_name,source_url,score,verified,published_at')
      .eq('verified', true)
      .order('score', { ascending: false })
      .order('published_at', { ascending: false });
    if (error) throw error;
    opportunities = data || [];
    if (!opportunities.length) opportunities = demoOpportunities;
    const badge = document.querySelector('.demo');
    if (opportunities.length && opportunities.some(o => o.verified)) {
      document.querySelector('.demo')?.replaceWith(Object.assign(document.createElement('span'), {className:'verified', textContent:'LIVE'}));
    }
    render();
  } catch (error) {
    console.warn('Supabase live feed unavailable; using safe demo fallback.', error);
    opportunities = demoOpportunities;
    render();
  }
}

search?.addEventListener('input', render);
category?.addEventListener('change', render);

document.addEventListener('DOMContentLoaded', loadLiveOpportunities);
