// ===== HELPERS =====
function fmt(t) {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleDateString('ja-JP', {day:'2-digit',month:'short'}) + ' ' +
         d.toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit',hour12:false});
}
function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function displayDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {day:'2-digit',month:'short',year:'numeric'});
}
function displayTime(time) {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 0, 1, h, m).toLocaleTimeString('ja-JP', {hour:'numeric',minute:'2-digit',hour12:true});
}
function timeMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + m;
}
function minuteTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
function patientName(id) {
  return RESIDENTS.find(r => r.id === id)?.name || id;
}
function roleScopedResidents() {
  return currentRole === 'resident' ? RESIDENTS.filter(r => r.id === 'R001') : RESIDENTS;
}
function statusBadge(status) {
  const normalized = String(status || 'Scheduled');
  const cls = normalized === 'Completed' ? 'badge-stable' : normalized === 'Missed' ? 'badge-critical' : 'badge-teal';
  return `<span class="badge ${cls}">${normalized}</span>`;
}
function localAppointmentSeed() {
  return [
    {id:'APT-1001', patientId:'R001', doctorName:'山本 花子', date:todayISO(2), time:'10:00', status:'Scheduled', reason:'AI diabetes/BP review', risk:'High'},
    {id:'APT-1002', patientId:'R002', doctorName:'中村 誠', date:todayISO(3), time:'11:30', status:'Scheduled', reason:'CHF follow-up', risk:'Medium'},
    {id:'APT-1003', patientId:'R004', doctorName:'小林 健', date:todayISO(-3), time:'09:30', status:'Completed', reason:'Post-op mobility review', risk:'Low'},
    {id:'APT-1004', patientId:'R003', doctorName:'山本 花子', date:todayISO(-4), time:'15:00', status:'Missed', reason:'COPD oxygen trend', risk:'Medium'}
  ];
}
async function fetchAppointments() {
  const local = JSON.parse(localStorage.getItem('ehmr-appointments') || 'null') || localAppointmentSeed();
  appointmentsData = local;
  try {
    const res = await fetch('https://ehmr-ai-server-production.up.railway.app/appointments');
    if (!res.ok) throw new Error('appointments unavailable');
    const remote = await res.json();
    appointmentsData = Array.isArray(remote) && remote.length
      ? [...local, ...remote.filter(a => !local.some(x => x.id === a.id))]
      : local;
  } catch (e) {
    appointmentsData = local;
  }
  localStorage.setItem('ehmr-appointments', JSON.stringify(appointmentsData));
  return appointmentsData;
}
async function fetchAvailability(date, doctorName) {
  const fallback = slotAvailability(date, doctorName);
  try {
    const res = await fetch(`https://ehmr-ai-server-production.up.railway.app/availability?date=${encodeURIComponent(date)}&doctorName=${encodeURIComponent(doctorName || '')}`);
    if (!res.ok) throw new Error('availability unavailable');
    const data = await res.json();
    const doctor = (data.availability || [])[0];
    const hasUsableSlots = Array.isArray(doctor?.slots) && doctor.slots.length;
    return hasUsableSlots ? data : fallback;
  } catch (e) {
    return fallback;
  }
}
function condBadge(c) {
  const m = {Stable:'badge-stable',Monitor:'badge-monitor',Critical:'badge-critical',Recovery:'badge-recovery'};
  return `<span class="badge ${m[c]||'badge-gray'}">${c}</span>`;
}
function labBadge(s) {
  const m = {high:'badge-critical',low:'badge-monitor',normal:'badge-stable'};
  return `<span class="badge ${m[s]||'badge-gray'}">${s.toUpperCase()}</span>`;
}
function unacked() { return ALERTS.filter(a => !a.acked); }
let toastTmr;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const toastType = type || 'success';
  const icon = toastType === 'error' ? '!' : toastType === 'warning' ? '!' : '✓';
  const title = toastType === 'error' ? 'Action Required' : toastType === 'warning' ? 'Please Review' : 'Success';
  el.innerHTML = `<div class="toast-item" role="alert" aria-live="assertive">
    <div class="toast-icon">${icon}</div>
    <div class="toast-copy">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
  </div>`;
  el.className = 'show ' + toastType;
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => {
    el.className = toastType;
    el.innerHTML = '';
  }, 2800);
}
function addAudit(action, res, detail) {
  auditLog.unshift({t: new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}), name:'山本 花子', role:'Doctor', action, resource:res, detail});
}
function toggleForm(id) { document.getElementById(id).classList.toggle('open'); }
function resChipsHTML(selId, callback) {
  return roleScopedResidents().map(r =>
    `<div class="res-chip ${r.id === selId ? 'selected' : ''}" onclick="${callback}('${r.id}')">
      <div class="res-chip-av" style="background:${r.color}">${r.initials}</div>${r.name.split(' ')[0]}
    </div>`
  ).join('');
}
function latestVitals(id = 'R001') { return (vitalsData[id] || [])[0] || {}; }
function aiConfig() {
  return {proxyUrl:AI_PROXY_URL, apiKey:'', model:DEFAULT_AI_MODEL};
}
function loadAIConfig() {
  const source = document.getElementById('ai-source');
  if (source) source.textContent = 'Railway AI proxy configured';
}
function saveAIConfig() {
  loadAIConfig();
}
function clearAIConfig() {
  localStorage.removeItem(AI_STORAGE_KEY);
  loadAIConfig();
}
function toggleAIConfig() { document.getElementById('ai-config')?.classList.toggle('open'); }
function healthScore(v) {
  if (!v.bp_s) return 78;
  let s = 100;
  if (v.spo2 && v.spo2 < 95) s -= (95 - v.spo2) * 5;
  if (v.spo2 && v.spo2 < 92) s -= 12;
  if (v.glucose && v.glucose > 140) s -= Math.min(24, Math.round((v.glucose - 140) / 5));
  if (v.bp_s > 130) s -= Math.min(22, Math.round((v.bp_s - 130) / 3));
  if (v.bp_d > 85) s -= Math.min(10, Math.round((v.bp_d - 85) / 2));
  if (v.pulse > 100 || v.pulse < 55) s -= 12;
  return Math.max(34, Math.min(98, s));
}
function healthAssessment(resId = 'R001') {
  const r = RESIDENTS.find(x => x.id === resId);
  const v = latestVitals(resId);
  const score = healthScore(v);
  const actions = [];
  const reasons = [];
  let visitWindow = 'Routine doctor review as scheduled';
  let visitNeeded = false;
  let urgency = 'Routine';

  if (!v.bp_s) {
    return {
      score,
      urgency,
      visitNeeded,
      visitWindow: 'Record current vitals before deciding on a visit',
      reasons: ['No current vitals available'],
      actions: [
        {icon:'💓', title:'Record vitals today', text:'Add BP, pulse, SpO2, temperature, glucose if relevant, and any symptoms.'},
        {icon:'📋', title:'Continue care plan', text:'Follow existing medication and monitoring orders until new readings are entered.'}
      ]
    };
  }

  if (v.spo2 && v.spo2 < 90) {
    reasons.push(`SpO2 ${v.spo2}% is critically low`);
    actions.push({icon:'🚨', title:'Urgent respiratory review', text:'Recheck SpO2 immediately and contact the doctor or emergency service if breathlessness, chest pain, confusion, or bluish lips are present.'});
    urgency = 'Urgent';
    visitWindow = 'Same-day urgent doctor review';
    visitNeeded = true;
  } else if (v.spo2 && v.spo2 < 92) {
    reasons.push(`SpO2 ${v.spo2}% is below the safe monitoring threshold`);
    actions.push({icon:'🫁', title:'Repeat oxygen check', text:'Repeat SpO2 after rest, check breathing effort, and keep oxygen/support history ready for the clinician.'});
    urgency = 'Priority';
    visitWindow = 'Doctor visit within 24 to 48 hours';
    visitNeeded = true;
  } else if (v.spo2 && v.spo2 < 95) {
    reasons.push(`SpO2 ${v.spo2}% is mildly reduced`);
    actions.push({icon:'🫁', title:'Watch oxygen trend', text:'Repeat SpO2 later today and report persistent readings below 95%, especially with COPD or breathlessness.'});
    urgency = 'Monitor';
    visitWindow = 'Doctor review within 3 days if it persists';
    visitNeeded = true;
  }

  if (v.bp_s >= 180 || v.bp_d >= 110) {
    reasons.push(`BP ${v.bp_s}/${v.bp_d} is in a crisis range`);
    actions.push({icon:'🚨', title:'Escalate blood pressure', text:'Repeat BP after 5 minutes of rest and seek urgent medical advice for severe headache, chest pain, weakness, or confusion.'});
    urgency = 'Urgent';
    visitWindow = 'Same-day urgent doctor review';
    visitNeeded = true;
  } else if (v.bp_s >= 160 || v.bp_d >= 100) {
    reasons.push(`BP ${v.bp_s}/${v.bp_d} is very elevated`);
    actions.push({icon:'❤️', title:'Priority BP review', text:'Repeat BP after rest, review salt intake and medication timing, and share the last 3 readings with the doctor.'});
    if (urgency !== 'Urgent') urgency = 'Priority';
    if (visitWindow !== 'Same-day urgent doctor review') visitWindow = 'Doctor visit within 24 to 48 hours';
    visitNeeded = true;
  } else if (v.bp_s >= 140 || v.bp_d >= 90) {
    reasons.push(`BP ${v.bp_s}/${v.bp_d} is elevated`);
    actions.push({icon:'❤️', title:'Monitor BP closely', text:'Repeat BP after rest and record morning/evening values for medication review.'});
    if (!visitNeeded) visitWindow = 'Doctor review within 7 days if repeated';
    urgency = urgency === 'Routine' ? 'Monitor' : urgency;
    visitNeeded = true;
  }

  if (v.glucose >= 250) {
    reasons.push(`Glucose ${v.glucose} mg/dL is very high`);
    actions.push({icon:'🩸', title:'Priority diabetes review', text:'Check hydration, confirm medication timing, and contact the doctor urgently if vomiting, drowsiness, abdominal pain, or very frequent urination occurs.'});
    if (urgency !== 'Urgent') urgency = 'Priority';
    if (visitWindow !== 'Same-day urgent doctor review') visitWindow = 'Doctor visit within 24 to 48 hours';
    visitNeeded = true;
  } else if (v.glucose >= 180) {
    reasons.push(`Glucose ${v.glucose} mg/dL is above target`);
    actions.push({icon:'🩸', title:'Review glucose control', text:'Log meals and medication timing, reduce refined carbs today, and arrange a diabetes review if repeated.'});
    if (!visitNeeded) visitWindow = 'Doctor review within 7 days if repeated';
    urgency = urgency === 'Routine' ? 'Monitor' : urgency;
    visitNeeded = true;
  } else if (r.diagnoses.some(d => d.toLowerCase().includes('diabetes')) && v.glucose > 140) {
    reasons.push(`Glucose ${v.glucose} mg/dL is mildly high for diabetes history`);
    actions.push({icon:'🥗', title:'Tighten diet log', text:'Track meals and repeat glucose as ordered before the next medication review.'});
  }

  if (v.pulse > 110 || v.pulse < 50) {
    reasons.push(`Pulse ${v.pulse} bpm is outside the preferred range`);
    actions.push({icon:'💗', title:'Recheck pulse', text:'Repeat pulse after rest and report dizziness, palpitations, chest discomfort, or fainting immediately.'});
    if (urgency === 'Routine') urgency = 'Monitor';
    if (!visitNeeded) visitWindow = 'Doctor review within 3 days if repeated';
    visitNeeded = true;
  }

  if (v.temp >= 38) {
    reasons.push(`Temperature ${v.temp}C suggests fever`);
    actions.push({icon:'🌡️', title:'Fever watch', text:'Encourage fluids if allowed, repeat temperature, and report fever with cough, urinary symptoms, confusion, or weakness.'});
    if (urgency === 'Routine') urgency = 'Monitor';
    if (!visitNeeded) visitWindow = 'Doctor review within 24 to 48 hours if fever persists';
    visitNeeded = true;
  }

  if (!actions.length) {
    actions.push({icon:'✅', title:'Continue routine monitoring', text:'Vitals are within the current care-plan range. Keep daily vitals and medications on schedule.'});
    actions.push({icon:'📅', title:'Next review', text:'Keep the planned doctor review unless new symptoms or abnormal readings appear.'});
  }

  if (score < 55 && urgency !== 'Urgent') {
    urgency = 'Priority';
    visitNeeded = true;
    visitWindow = 'Doctor visit within 24 to 48 hours';
  } else if (score < 70 && urgency === 'Routine') {
    urgency = 'Monitor';
    visitNeeded = true;
    visitWindow = 'Doctor review within 7 days if score stays below 70';
  }

  return {score, urgency, visitNeeded, visitWindow, reasons, actions: actions.slice(0, 4)};
}
function localAIInsight(resId = 'R001') {
  const r = RESIDENTS.find(x => x.id === resId);
  const v = latestVitals(resId);
  const assessment = healthAssessment(resId);
  const flags = [];
  if (v.spo2 && v.spo2 < 92) flags.push('Possible lung weakening');
  else if (v.spo2 && v.spo2 < 95) flags.push('Oxygen needs monitoring');
  if (v.glucose && v.glucose > 180) flags.push('Diabetes not controlled');
  else if (v.glucose && v.glucose > 150) flags.push('Glucose trending high');
  if (v.bp_s >= 140 || v.bp_d >= 90) flags.push('Cardiac risk');
  if (v.pulse > 105 || v.pulse < 55) flags.push('Heart rate abnormality');

  let risk = 'Low';
  if (flags.length || v.bp_s >= 130 || (v.glucose && v.glucose > 150) || (v.spo2 && v.spo2 < 95)) risk = 'Medium';
  if (flags.length >= 2 || v.bp_s >= 160 || (v.glucose && v.glucose > 220) || (v.spo2 && v.spo2 < 90)) risk = 'High';

  let insight = 'Vitals stable. Current readings are consistent with the active care plan.';
  let recommendation = `${assessment.visitWindow}. Continue daily manual vitals and medication adherence.`;
  if (flags.includes('Possible lung weakening')) {
    insight = 'Possible lung weakening. Oxygen saturation is below the preferred range for this senior patient.';
    recommendation = assessment.visitWindow + '. Repeat SpO2 check and assess breathlessness.';
  } else if (flags.includes('Diabetes not controlled')) {
    insight = 'Blood sugar is elevated against diabetes history, suggesting control needs review.';
    recommendation = assessment.visitWindow + '. Review meals and medication timing.';
  } else if (flags.includes('Cardiac risk')) {
    insight = 'Blood pressure is elevated for a patient with cardiovascular risk factors.';
    recommendation = assessment.visitWindow + '. Share readings with the doctor and repeat BP after rest.';
  } else if (r.condition === 'Recovery') {
    insight = 'Recovery improving. Vitals are stable and no major anomaly is detected.';
    recommendation = assessment.visitWindow + '. Continue physiotherapy, pain review, and routine vitals.';
  } else if (flags.length) {
    insight = `${flags.join(' · ')} detected from current vitals.`;
    recommendation = assessment.visitWindow + '. Increase observation frequency and notify the care team if the pattern persists.';
  }
  if (risk === 'High') {
    insight = `${flags.join(' · ')} detected. JCAS AI sees a combined high-risk pattern that needs faster clinical review.`;
    recommendation = assessment.visitWindow + '. Keep today’s vitals, glucose log, and medication list ready.';
  }
  return {...assessment, riskLevel:risk, insight, recommendation};
}
function doctorHistoryInsight(resId = 'R001') {
  const r = RESIDENTS.find(x => x.id === resId);
  const v = latestVitals(resId);
  const labs = (labsData[resId] || []).filter(l => l.status !== 'normal').slice(0, 3);
  const meds = (medsData[resId] || []).map(m => m.name).slice(0, 4);
  const active = localAIInsight(resId);
  const history = r.diagnoses.map(d => d.replace(/\s*\([^)]*\)/g, '')).join(', ');
  const labText = labs.length ? ` Abnormal labs: ${labs.map(l => `${l.test} ${l.result}${l.unit}`).join(', ')}.` : '';
  const medText = meds.length ? ` Current medicines include ${meds.join(', ')}.` : '';
  const trendText = v.bp_s ? ` Latest vitals show BP ${v.bp_s}/${v.bp_d}, pulse ${v.pulse}, SpO2 ${v.spo2}%, and glucose ${v.glucose || 'not recorded'}.` : '';
  return `${r.name} is a ${r.age}-year-old resident with history of ${history}.${medText}${labText}${trendText} Clinical interpretation: ${active.insight}`;
}
function normalizeRisk(x) {
  const v = String(x || '').toLowerCase();
  if (v.includes('high')) return 'High';
  if (v.includes('low')) return 'Low';
  return 'Medium';
}
function actionListHTML(actions = []) {
  return actions.map(a => `
    <div class="health-action">
      <span>${a.icon || '•'}</span>
      <div><strong>${a.title}</strong><div>${a.text}</div></div>
    </div>`).join('');
}
function renderAI(result, source = 'Rule engine insight') {
  const risk = normalizeRisk(result.riskLevel);
  const assessment = {...healthAssessment('R001'), ...result};
  const badge = document.getElementById('dash-ai-risk');
  if (!badge) return;
  badge.className = 'ai-risk ' + risk.toLowerCase();
  badge.textContent = risk.toUpperCase() + ' RISK';
  document.getElementById('dash-ai-insight').textContent = result.insight;
  document.getElementById('dash-ai-rec').textContent = result.recommendation;
  document.getElementById('dash-ai-score').textContent = assessment.score;
  document.getElementById('dash-ai-score-ring').style.setProperty('--score', assessment.score);
  const actionsEl = document.getElementById('dash-health-actions');
  if (actionsEl) {
    actionsEl.innerHTML = actionListHTML([
      {icon:assessment.visitNeeded ? '📅' : '✅', title:assessment.visitNeeded ? 'Doctor visit guidance' : 'Doctor visit status', text:assessment.visitWindow},
      ...(assessment.actions || []).slice(0, 2)
    ]) + (assessment.visitNeeded ? `<button class="btn btn-primary btn-sm" onclick="openAppointmentModal('R001','${assessment.urgency}','${assessment.visitWindow.replace(/'/g, "\\'")}')">Book Appointment</button>` : '');
  }
  document.getElementById('ai-source').textContent = source;
}
function trendPayload(resId = 'R001') {
  return (vitalsData[resId] || []).slice(0, 7).reverse();
}
function renderTrends(resId = 'R001') {
  const data = trendPayload(resId);
  const target = document.getElementById('dash-ai-trends');
  if (!target) return;
  const latest = data[data.length - 1] || {};
  const width = 520, height = 260;
  const pad = {left: 52, right: 16, top: 34, bottom: 38};
  const minY = 80, maxY = 220;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = i => pad.left + (data.length <= 1 ? plotW : (plotW / (data.length - 1)) * i);
  const y = value => pad.top + plotH - ((Math.max(minY, Math.min(maxY, value)) - minY) / (maxY - minY)) * plotH;
  const series = [
    {key:'spo2', label:'SpO₂ %', color:'#00897B'},
    {key:'pulse', label:'Pulse bpm', color:'#0288D1'},
    {key:'glucose', label:'Glucose mg/dL', color:'#FFB300'}
  ];
  const pathFor = key => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key] || minY).toFixed(1)}`).join(' ');
  const gridValues = [80, 110, 140, 170, 200, 220];
  target.innerHTML = `
    <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="7-day vitals line chart">
      ${gridValues.map(v => `
        <line class="trend-grid" x1="${pad.left}" y1="${y(v).toFixed(1)}" x2="${width - pad.right}" y2="${y(v).toFixed(1)}"></line>
        <text class="trend-y-label" x="${pad.left - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>
      `).join('')}
      <line class="trend-axis-line" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"></line>
      <line class="trend-axis-line" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
      <text class="trend-y-label" x="8" y="18">Value scale</text>
      ${data.map((d, i) => `<text class="trend-label" x="${x(i).toFixed(1)}" y="${height - 12}" text-anchor="middle">${fmt(d.t).split(' ')[0]}</text>`).join('')}
      ${series.map(s => `<path class="trend-line" d="${pathFor(s.key)}" stroke="${s.color}"></path>`).join('')}
      ${series.map(s => data.map((d, i) => `
        <circle class="trend-dot" cx="${x(i).toFixed(1)}" cy="${y(d[s.key] || minY).toFixed(1)}" r="4" fill="${s.color}">
          <title>${s.label}: ${d[s.key] || '-'}</title>
        </circle>
      `).join('')).join('')}
      ${series.map((s, i) => `
        <circle cx="${96 + i * 138}" cy="17" r="4" fill="${s.color}"></circle>
        <text class="trend-label" x="${105 + i * 138}" y="21">${s.label}</text>
      `).join('')}
    </svg>
    <div class="trend-summary">
      <div class="list-item"><strong style="color:var(--teal)">${latest.spo2 || '-'}%</strong><span>Latest SpO₂</span></div>
      <div class="list-item"><strong style="color:var(--sky)">${latest.pulse || '-'}</strong><span>Latest pulse bpm</span></div>
      <div class="list-item"><strong style="color:var(--amber)">${latest.glucose || '-'}</strong><span>Latest glucose mg/dL</span></div>
    </div>`;
}
function aiPatientPayload(resId = 'R001') {
  const r = RESIDENTS.find(x => x.id === resId);
  return {name:r.name, age:r.age, room:r.room, conditions:r.diagnoses, allergies:r.allergies, medications:(medsData[resId] || []).map(m => m.name)};
}
async function requestGroqInsight(resId = 'R001') {
  const c = aiConfig();
  const baseline = localAIInsight(resId);
  if (!c.proxyUrl && !c.apiKey) return null;
  const payload = {patient:aiPatientPayload(resId), vitals:trendPayload(resId), baseline};
  if (c.proxyUrl) {
    const res = await fetch(c.proxyUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!res.ok) throw new Error('Proxy failed: ' + res.status);
    return res.json();
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer ' + c.apiKey},
    body:JSON.stringify({
      model:c.model || DEFAULT_AI_MODEL,
      messages:[
        {role:'system', content:"You are JCAS AI, a clinical decision-support assistant for Japanese elderly care facilities operating under Japan's Society 5.0 framework. Respond in English. Reference Kaigo Hoken (Long-Term Care Insurance) levels, fall prevention protocols, dementia risk, and Japanese elderly care standards. Return only JSON with riskLevel, insight, recommendation, score, visitWindow, actions. Score must be 0-100. Actions must be array of up to 4 objects with icon, title, text. Do not diagnose; provide cautious monitoring guidance for elderly care."},
        {role:'user', content:'Analyze these manual vitals and conditions for a senior dashboard demo:\n' + JSON.stringify(payload)}
      ],
      temperature:.2,
      max_completion_tokens:350
    })
  });
  if (!res.ok) throw new Error('Groq failed: ' + res.status);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}
async function runDashboardAI() {
  const base = localAIInsight('R001');
  renderAI(base, 'Analyzing...');
  try {
    const ai = await requestGroqInsight('R001');
    if (ai) renderAI({...base, ...ai, riskLevel:normalizeRisk(ai.riskLevel || ai.risk)}, 'Live Groq insight');
    else renderAI(base, 'Rule engine insight');
  } catch (e) {
    console.warn(e);
    renderAI({...base, insight:base.insight + ' Live AI is not connected, so JCAS used the local safety rules.'}, 'Rule engine fallback');
  }
}
function residentAIHTML(resId, result, source = 'Local insight') {
  const risk = normalizeRisk(result.riskLevel);
  const assessment = {...healthAssessment(resId), ...result};
  const riskClass = risk === 'High' ? 'badge-critical' : risk === 'Medium' ? 'badge-monitor' : 'badge-stable';
  return `<div class="card resident-ai-card">
    <div class="resident-ai-top">
      <div>
        <div class="resident-ai-title">AI Insight</div>
        <div style="font-size:11px;color:var(--g500);margin-top:2px">${source}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="badge ${riskClass}">${risk.toUpperCase()} RISK</span>
        <span class="resident-ai-score">Health Score ${assessment.score}/100</span>
      </div>
    </div>
    <div class="resident-ai-text">${result.insight}</div>
    <div class="resident-ai-rec"><strong>Recommendation:</strong> ${result.recommendation}</div>
    <div class="resident-ai-actions">
      ${actionListHTML([
        {icon:assessment.visitNeeded ? '📅' : '✅', title:assessment.visitNeeded ? 'Doctor visit guidance' : 'Doctor visit status', text:assessment.visitWindow},
        ...(assessment.actions || []).slice(0, 3)
      ])}
      ${assessment.visitNeeded ? `<button class="btn btn-primary btn-sm" onclick="openAppointmentModal('${resId}','${assessment.urgency}','${assessment.visitWindow.replace(/'/g, "\\'")}')">Book Appointment</button>` : ''}
    </div>
  </div>`;
}
async function runResidentAI(resId) {
  const slot = document.getElementById('resident-ai-' + resId);
  if (!slot) return;
  const base = localAIInsight(resId);
  slot.innerHTML = `<div class="card resident-ai-card"><div class="resident-ai-loading">Analyzing ${aiPatientPayload(resId).name}'s vitals with Groq...</div></div>`;
  try {
    const ai = await requestGroqInsight(resId);
    const result = ai ? {...base, ...ai, riskLevel:normalizeRisk(ai.riskLevel || ai.risk)} : base;
    slot.innerHTML = residentAIHTML(resId, result, ai ? 'Live Groq insight' : 'Local baseline insight');
    addAudit('AI', 'resident_insight', aiPatientPayload(resId).name);
  } catch (e) {
    console.warn(e);
    slot.innerHTML = residentAIHTML(resId, {...base, insight:base.insight + ' Live Groq is not connected, so JCAS used local safety rules.'}, 'Rule engine fallback');
    toast('AI insight used local fallback. Start server.js for Groq.', 'warning');
  }
}
function selectRole(role) {
  currentRole = role;
  localStorage.setItem('ehmr-role', role);
  document.getElementById('role-gate').classList.add('hidden');
  applyRoleAccess();
  nav('dashboard');
}
function resetRole() {
  localStorage.removeItem('ehmr-role');
  currentRole = '';
  document.body.classList.remove('role-doctor', 'role-resident');
  document.getElementById('role-gate').classList.remove('hidden');
}
function roleAllows(el) {
  const roles = (el.dataset.roles || 'doctor,resident').split(',');
  return roles.includes(currentRole);
}
function applyRoleAccess() {
  if (!currentRole) return;
  const isDoctor = currentRole === 'doctor';
  document.body.classList.toggle('role-doctor', isDoctor);
  document.body.classList.toggle('role-resident', !isDoctor);
  document.querySelector('.sb-uname').textContent = isDoctor ? '山本 花子' : '田中 健二';
  document.querySelector('.sb-urole').textContent = isDoctor ? 'Senior Physician' : 'Resident / Patient';
  document.querySelector('.sb-av').textContent = isDoctor ? 'YH' : 'TK';
  document.getElementById('tb-avatar').textContent = isDoctor ? 'YH' : 'TK';
  document.querySelector('.tb-search input').placeholder = isDoctor ? 'Search residents, meds...' : 'Search my records...';
  document.getElementById('top-alert-btn').classList.toggle('role-hidden', !isDoctor);

  document.querySelectorAll('[data-roles]').forEach(el => {
    el.classList.toggle('role-hidden', !roleAllows(el));
  });
  document.querySelectorAll('.sb-item[data-page]').forEach(item => {
    const label = item.querySelector('.sb-item-txt');
    if (label && currentRole === 'resident' && item.dataset.residentLabel) label.textContent = item.dataset.residentLabel;
    if (label && currentRole === 'doctor' && item.dataset.doctorLabel) label.textContent = item.dataset.doctorLabel;
  });
}

// ===== NAVIGATION =====
const PAGE_TITLES = {
  dashboard:'Dashboard', residents:'Residents', alerts:'Alerts',
  critical:'Doctor Critical Review', vitals:'Vitals Monitor', emar:'eMAR', notes:'Shift Notes',
  labs:'Lab Reports', timeline:'Clinical Timeline', careplan:'Care Plan',
  appointments:'Appointments', book:'Book & Schedule', ledger:'Ledger & Resources', services:'Services',
  insurance:'Insurance + マイナンバー', audit:'Audit Log'
};

let navHistory = [];
let _currentPage = 'dashboard';

function nav(page) {
  const navItem = document.querySelector(`.sb-item[data-page="${page}"]`);
  if (navItem && !roleAllows(navItem)) {
    toast('This section is not available in the selected role', 'warning');
    page = 'dashboard';
  }
  if (_currentPage && _currentPage !== page) navHistory.push(_currentPage);
  _currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.getElementById('tb-title').textContent = PAGE_TITLES[page] || page;
  document.querySelectorAll('.sb-item[data-page]').forEach(i =>
    i.classList.toggle('active', i.dataset.page === page)
  );
  const loaders = {
    dashboard: loadDash, residents: loadResidents, alerts: loadAlerts, critical: loadCriticalReview,
    vitals: () => loadVitals(selVitals), emar: () => loadEmar(selEmar),
    notes: loadNotes, labs: () => loadLabs(selLabs),
    timeline: () => loadTimeline(selTl), careplan: loadCarePlan,
    appointments: loadAppts, book: loadBookSchedule, ledger: loadLedgerResources, services: loadServices,
    insurance: loadInsurance, audit: loadAudit
  };
  if (loaders[page]) loaders[page]();
}

function navBack() {
  // Special case: if resident detail is visible, close it instead
  const resDetail = document.getElementById('res-detail');
  if (resDetail && resDetail.style.display !== 'none' && _currentPage === 'residents') {
    closeResDetail();
    return;
  }
  const prev = navHistory.length ? navHistory.pop() : 'dashboard';
  // Don't push to history when going back
  _currentPage = prev;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + prev);
  if (el) el.classList.add('active');
  document.getElementById('tb-title').textContent = PAGE_TITLES[prev] || prev;
  document.querySelectorAll('.sb-item[data-page]').forEach(i =>
    i.classList.toggle('active', i.dataset.page === prev)
  );
  const loaders = {
    dashboard: loadDash, residents: loadResidents, alerts: loadAlerts, critical: loadCriticalReview,
    vitals: () => loadVitals(selVitals), emar: () => loadEmar(selEmar),
    notes: loadNotes, labs: () => loadLabs(selLabs),
    timeline: () => loadTimeline(selTl), careplan: loadCarePlan,
    appointments: loadAppts, book: loadBookSchedule, ledger: loadLedgerResources, services: loadServices,
    insurance: loadInsurance, audit: loadAudit
  };
  if (loaders[prev]) loaders[prev]();
}

function closeResDetail() {
  document.getElementById('res-detail').style.display = 'none';
  document.getElementById('res-list-view').style.display = '';
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}
