const {streaks, rate30, todayIn, addDays} = require('./streaks');

const eq = (got, want) => expect(got).toBe(want);
const mk = o => Object.assign({type: 'daily', days: [], times: 1, created: '2026-10-01', done: []}, o);

const TODAY = '2026-10-27'; // a Tuesday

test('daily: three days in a row', () => eq(streaks(mk({created:'2026-10-25', done:['2026-10-25','2026-10-26','2026-10-27']}), TODAY).current, 3));
test('daily: today not done yet keeps the streak alive', () => eq(streaks(mk({created:'2026-10-25', done:['2026-10-25','2026-10-26']}), TODAY).current, 2));
test('daily: a missed day breaks it', () => {
  const s = streaks(mk({created:'2026-10-25', done:['2026-10-25','2026-10-27']}), TODAY);
  eq(s.current, 1); eq(s.longest, 1);
});
test('daily: longest survives a later break', () => {
  const s = streaks(mk({created:'2026-10-20', done:['2026-10-20','2026-10-21','2026-10-22','2026-10-25']}), TODAY);
  eq(s.longest, 3); eq(s.current, 0);
});
test('Mon/Wed/Fri: Tuesday does not break the streak', () => {
  const h = mk({type:'weekdays', days:[1,3,5], created:'2026-10-19', done:['2026-10-19','2026-10-21','2026-10-23','2026-10-26']});
  eq(streaks(h, TODAY).current, 4);
});
test('Mon/Wed/Fri: missing a Wednesday does break it', () => {
  const h = mk({type:'weekdays', days:[1,3,5], created:'2026-10-19', done:['2026-10-19','2026-10-23','2026-10-26']});
  const s = streaks(h, TODAY); eq(s.current, 2); eq(s.longest, 2);
});
test('weekdays: pending due day today is not a break', () => {
  const h = mk({type:'weekdays', days:[2], created:'2026-10-13', done:['2026-10-13','2026-10-20']});
  eq(streaks(h, TODAY).current, 2);
});
test('3x per week: finished weeks plus current one in progress', () => {
  const h = mk({type:'weekly', times:3, created:'2026-10-12', done:['2026-10-12','2026-10-14','2026-10-16','2026-10-19','2026-10-21','2026-10-23','2026-10-26']});
  const s = streaks(h, TODAY); eq(s.current, 2); eq(s.longest, 2); eq(s.unit, 'week');
});
test('3x per week: a short week in the middle breaks it', () => {
  const h = mk({type:'weekly', times:3, created:'2026-10-05', done:['2026-10-05','2026-10-07','2026-10-09','2026-10-19','2026-10-21','2026-10-23']});
  const s = streaks(h, TODAY); eq(s.current, 1); eq(s.longest, 1);
});
test('3x per week: current week already hit counts', () => {
  const h = mk({type:'weekly', times:2, created:'2026-10-26', done:['2026-10-26','2026-10-27']});
  eq(streaks(h, TODAY).current, 1);
});
test('time zone: same instant, different calendar day', () => {
  const now = new Date('2026-10-27T20:00:00Z');
  eq(todayIn('Asia/Kolkata', now), '2026-10-28');
  eq(todayIn('America/Los_Angeles', now), '2026-10-27');
});
test('date math is safe across a DST change', () => {
  eq(addDays('2026-10-31', 2), '2026-11-02');
  eq(addDays('2026-03-07', 2), '2026-03-09');
});
test('30 day rate for a 3 day old habit', () => {
  const r = rate30(mk({created:'2026-10-25', done:['2026-10-25','2026-10-26']}), TODAY);
  eq(Math.round(r.rate * 100), 67);
});
test('30 day rate only counts due weekdays', () => {
  const h = mk({type:'weekdays', days:[1,3,5], created:'2026-10-19', done:['2026-10-19','2026-10-20','2026-10-21']});
  eq(rate30(h, TODAY).hits, 2);
});