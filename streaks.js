// Streak, stats and date logic. No DOM in here so it can be tested on its own.

// ---------- date helpers ----------
// Dates are plain "YYYY-MM-DD" strings. All the math goes through UTC so
// daylight saving can never shift a day by accident.

function parse(s){ const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); }
function fmt(dt){ return dt.toISOString().slice(0,10); }
function addDays(s, n){ const dt = parse(s); dt.setUTCDate(dt.getUTCDate() + n); return fmt(dt); }
function dow(s){ return parse(s).getUTCDay(); }
function diffDays(a, b){ return Math.round((parse(b) - parse(a)) / 864e5); }
function weekStart(s){ return addDays(s, -((dow(s) + 6) % 7)); } // weeks run Mon-Sun

// "today" in whatever zone the user picked, not the server/browser default
function todayIn(tz, now = new Date()){
  return new Intl.DateTimeFormat('en-CA', {timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}

// ---------- streak logic ----------
function isDue(h, d){
  if (h.type === 'weekdays') return h.days.includes(dow(d));
  return true;
}
function startOf(h){ return [h.created, ...h.done].sort()[0]; }

function streaks(h, today){
  const done = new Set(h.done);
  const start = startOf(h);
  if (h.type === 'weekly') return weeklyStreaks(h, done, start, today);

  // longest: walk forward through the days the habit was actually due
  let longest = 0, run = 0;
  for (let d = start; d <= today; d = addDays(d, 1)){
    if (!isDue(h, d)) continue;
    if (done.has(d)){ run++; longest = Math.max(longest, run); }
    else if (d !== today) run = 0; // today isn't over yet, so it can't break anything
  }

  // current: walk back from today
  let current = 0;
  for (let d = today; d >= start; d = addDays(d, -1)){
    if (!isDue(h, d)) continue;
    if (done.has(d)) current++;
    else if (d === today) continue;
    else break;
  }
  return {current, longest, unit: 'day'};
}

// "N times a week" habits count streaks in weeks, a week is good if it hit N
function weeklyStreaks(h, done, start, today){
  const counts = {};
  done.forEach(d => { const w = weekStart(d); counts[w] = (counts[w] || 0) + 1; });
  const thisWeek = weekStart(today), first = weekStart(start);
  const met = w => (counts[w] || 0) >= h.times;

  let longest = 0, run = 0;
  for (let w = first; w <= thisWeek; w = addDays(w, 7)){
    if (met(w)){ run++; longest = Math.max(longest, run); }
    else if (w === thisWeek || w === first) continue; // unfinished or partial week
    else run = 0;
  }
  let current = 0;
  for (let w = thisWeek; w >= first; w = addDays(w, -7)){
    if (met(w)) current++;
    else if (w === thisWeek) continue;
    else break;
  }
  return {current, longest, unit: 'week'};
}

// completion rate over the last 30 days (shorter if the habit is newer)
function rate30(h, today){
  const winStart = [addDays(today, -29), startOf(h)].sort().pop();
  const days = diffDays(winStart, today) + 1;
  const inWin = h.done.filter(d => d >= winStart && d <= today);
  let hits, target;
  if (h.type === 'weekly'){
    hits = inWin.length;
    target = h.times * days / 7;
  } else {
    target = 0;
    for (let d = winStart; d <= today; d = addDays(d, 1)) if (isDue(h, d)) target++;
    hits = inWin.filter(d => isDue(h, d)).length;
  }
  return {rate: target ? Math.min(1, hits / target) : 0, hits, target};
}

// lets the same file work in the browser and in Node (for Jest)
if (typeof module !== 'undefined') {
  module.exports = {parse, fmt, addDays, dow, diffDays, weekStart, todayIn, isDue, startOf, streaks, weeklyStreaks, rate30};
}