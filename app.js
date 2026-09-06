const SUPABASE_URL = 'https://dspemuisfagoxwkpluyh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nuMjOyMSW6hRYKTSndknNg_b1gP6dox';

const demoFallback = [];
let opportunities = [];

const feed = document.querySelector('#feed');
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const empty = document.querySelector('#empty');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[char]));
}

function formatDeadline(value) {
  if (!value) return 'No deadline listed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Deadline unavailable';
  return date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function daysLeft(value) {
  if (!value) return '';
  const diff = new Date(value).getTime() - Date.now();
  if (diff < 0) return 'Closed';
  const days = Math.ceil(diff / 86400000);
  return days === 1 ? '1 day left' : `${days} days left`;
}

function isSaved(id) {
  return JSON.parse(localStorage.getItem('radar_saved') || '[]').includes(id);
}

function toggleSaved(id) {
  const saved = new Set(JSON.parse(localStorage.getItem('radar_saved') || '[]'));
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  localStorage.setItem('radar_saved', JSON.stringify([...saved]));
  render();
}

function card(o) {
  const source = o.source_url ? `<a href="${escapeHtml(o.source_url)}" target="_blank" rel="noopener noreferrer">View source ↗</a>` : '';
  const saved = isSaved(o.id);
  return `<article class="card">
    <div class="tag-row"><span class="tag">${escapeHtml(o.category)}</span><span class="verified">✓ Verified</span></div>
    <h3>${escapeHtml(o.title)}</h3>
    <p>${escapeHtml(o.description || '')}</p>
    <div class="meta"><span>${escapeHtml(o.region || 'Global')}</span><span>${escapeHtml(o.estimated_value || 'Value varies')}</span><span>${escapeHtml(o.difficulty || 'Varies')}</span></div>
    <div class="meta"><span>Deadline: ${escapeHtml(formatDeadline(o.deadline))}</span><span>${escapeHtml(daysLeft(o.deadline))}</span><span>Radar ${escapeHtml(o.score || 0)}/100</span></div>
    <p class="muted">${escapeHtml(o.why_it_fits || '')}</p>
    <div class="card-actions"><button class="btn ghost save-btn" data-save="${escapeHtml(o.id)}">${saved ? '★ Saved' : '☆ Save'}</button>${source}</div>
  </article>`;
}

function render() {
  const q = (search?.value || '').trim().toLowerCase();
  const c = category?.value || 'all';
  const rows = opportunities.filter(o => {
    const text = `${o.title || ''} ${o.description || ''} ${o.region || ''} ${(o.skills || []).join(' ')}`.toLowerCase();
    return (c === 'all' || o.category === c) && text.includes(q);
  });
  feed.innerHTML = rows.map(card).join('');
  empty.hidden = rows.length > 0;
  document.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => toggleSaved(button.dataset.save)));
}

async function loadSupabase() {
  await new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadLiveOpportunities() {
  try {
    await loadSupabase();
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await client
      .from('opportunities')
      .select('id,title,category,region,deadline,estimated_value,difficulty,description,why_it_fits,source_name,source_url,score,verified,published_at,skills')
      .eq('verified', true)
      .order('score', { ascending: false })
      .order('deadline', { ascending: true });
    if (error) throw error;
    opportunities = (data || []).filter(o => !o.deadline || new Date(o.deadline).getTime() >= Date.now());
    render();
    const badge = document.querySelector('.demo');
    if (badge) { badge.textContent = 'LIVE VERIFIED FEED'; badge.classList.add('verified'); }
  } catch (error) {
    console.warn('Live opportunity feed unavailable:', error);
    opportunities = demoFallback;
    render();
  }
}

search?.addEventListener('input', render);
category?.addEventListener('change', render);
document.addEventListener('DOMContentLoaded', loadLiveOpportunities);
