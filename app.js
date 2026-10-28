const BACK = 7;
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ---------- state ----------
function load(){
  try { return JSON.parse(localStorage.getItem('habits-v1')) || {habits: [], tz: 'auto'}; }
  catch(e){ return {habits: [], tz: 'auto'}; }
}
function save(){ try { localStorage.setItem('habits-v1', JSON.stringify(S)); } catch(e){} }
let S = load();
let view = 'habits';
const zone = () => S.tz === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : S.tz;
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function schedText(h){
  if (h.type === 'daily') return 'Every day';
  if (h.type === 'weekly') return h.times + 'x per week';
  return h.days.slice().sort().map(d => DAYS[d]).join(', ');
}

// ---------- rendering ----------
function heat(h, today){
  const done = new Set(h.done), start = startOf(h);
  const last = addDays(weekStart(today), 6);
  let out = '';
  for (let d = weekStart(addDays(today, -182)); d <= last; d = addDays(d, 1)){
    let cls = 'f';
    if (d <= today){
      if (done.has(d)) cls = 'on';
      else if (h.type === 'weekdays' && d >= start && d < today && isDue(h, d)) cls = 'miss';
      else cls = '';
    }
    out += '<i class="' + cls + '" title="' + d + '"></i>';
  }
  return '<div class="scroll"><div class="heat">' + out + '</div></div>';
}

function card(h, today){
  const st = streaks(h, today), done = new Set(h.done);
  let strip = '';
  for (let i = BACK; i >= 0; i--){
    const d = addDays(today, -i);
    const cls = 'day' + (done.has(d) ? ' on' : '') + (i === 0 ? ' today' : '') + (isDue(h, d) ? '' : ' skip');
    strip += '<button class="' + cls + '" data-act="toggle" data-id="' + h.id + '" data-d="' + d + '" aria-pressed="' + done.has(d) + '" title="' + d + '">' +
             DAYS[dow(d)] + '<b>' + Number(d.slice(8)) + '</b></button>';
  }
  return '<div class="box" style="--c:var(--k' + (S.habits.indexOf(h) % 5) + ')"><div class="hh"><div><h3><span>' + esc(h.name) + '</span></h3><div class="sub">' + schedText(h) + '</div></div>' +
    '<div class="nums"><b>' + st.current + '</b><span>' + st.unit + ' streak</span><span>best ' + st.longest + '</span></div></div>' +
    '<div class="strip">' + strip + '</div>' + heat(h, today) +
    '<div class="acts"><button data-act="archive" data-id="' + h.id + '">Archive</button></div></div>';
}

function render(){
  const today = todayIn(zone());
  const live = S.habits.filter(h => !h.archived), old = S.habits.filter(h => h.archived);
  let html = '';
  if (view === 'habits'){
    html = live.length ? live.map(h => card(h, today)).join('') :
      '<div class="empty">No habits yet. Add one above and tick it off each day.</div>';
  } else {
    html = live.length ? live.map(h => {
      const r = rate30(h, today), pct = Math.round(r.rate * 100);
      return '<div class="box" style="--c:var(--k' + (S.habits.indexOf(h) % 5) + ')"><div class="hh"><h3><span>' + esc(h.name) + '</span></h3><b>' + pct + '%</b></div>' +
        '<div class="bar"><div style="width:' + pct + '%"></div></div>' +
        '<div class="sub">' + r.hits + ' done, ' + Math.round(r.target * 10) / 10 + ' expected in the last 30 days</div></div>';
    }).join('') : '<div class="empty">Stats show up once you have a habit.</div>';
  }
  if (old.length){
    html += '<details class="box"><summary>Archived (' + old.length + ')</summary>' + old.map(h =>
      '<div class="row" style="justify-content:space-between;margin-top:10px"><span>' + esc(h.name) +
      ' <span class="sub">' + schedText(h) + '</span></span><span class="row">' +
      '<button data-act="restore" data-id="' + h.id + '">Restore</button>' +
      '<button data-act="del" data-id="' + h.id + '">Delete</button></span></div>').join('') + '</details>';
  }
  $('list').innerHTML = html;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const h = S.habits.find(x => x.id === b.dataset.id), a = b.dataset.act;
  if (a === 'tab') view = b.dataset.v;
  if (a === 'toggle' && h){
    const d = b.dataset.d, i = h.done.indexOf(d);
    if (i >= 0) h.done.splice(i, 1); else h.done.push(d);
  }
  if (a === 'archive' && h) h.archived = true;
  if (a === 'restore' && h) h.archived = false;
  if (a === 'del' && h && confirm('Delete "' + h.name + '" and its history for good?')) S.habits = S.habits.filter(x => x !== h);
  save(); render();
});

$('wdBox').innerHTML = [1,2,3,4,5,6,0].map(d =>
  '<label><input type="checkbox" value="' + d + '"> ' + DAYS[d] + '</label>').join('');
$('sched').addEventListener('change', () => {
  $('wdBox').hidden = $('sched').value !== 'weekdays';
  $('timesBox').hidden = $('sched').value !== 'weekly';
});

$('form').addEventListener('submit', e => {
  e.preventDefault();
  const type = $('sched').value;
  const days = [...document.querySelectorAll('#wdBox input:checked')].map(i => Number(i.value));
  if (type === 'weekdays' && !days.length){ alert('Pick at least one weekday.'); return; }
  S.habits.push({
    id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: $('name').value.trim(), type, days,
    times: Math.min(7, Math.max(1, Number($('times').value) || 1)),
    created: todayIn(zone()), done: [], archived: false
  });
  $('name').value = '';
  save(); render();
});

// time zone picker
(function(){
  let zones = [];
  try { zones = Intl.supportedValuesOf('timeZone'); } catch(e){}
  const auto = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('tz').innerHTML = '<option value="auto">My device (' + auto + ')</option>' +
    zones.map(z => '<option>' + z + '</option>').join('');
  $('tz').value = S.tz;
  $('tz').addEventListener('change', () => { S.tz = $('tz').value; save(); render(); });
})();

render();