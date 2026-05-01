// ===== FEATURE EXPANSION =====
function slotAvailability(date, doctorName) {
  const doctor = DOCTORS.find(d => d.name === doctorName) || DOCTORS[0];
  const booked = appointmentsData.filter(a => a.doctorName === doctor.name && a.date === date && a.status === 'Scheduled').map(a => a.time);
  const slots = [];
  for (let m = timeMinutes(doctor.start); m < timeMinutes(doctor.end); m += 30) {
    const inBreak = (doctor.breaks || []).some(b => m >= timeMinutes(b.start) && m < timeMinutes(b.end));
    const time = minuteTime(m);
    slots.push({time, available: !booked.includes(time) && !inBreak, booked: booked.includes(time), break: inBreak});
  }
  return {date, doctors:DOCTORS, availability:[{...doctor, slots}]};
}

function fallRiskScore(resId) {
  const r = RESIDENTS.find(x => x.id === resId);
  const v = latestVitals(resId);
  let score = 0;
  if (r.age > 80) score += 2;
  else if (r.age > 75) score += 1;
  if ((medsData[resId] || []).length >= 3) score += 1;
  if (r.diagnoses.some(d => /parkinson|arthritis|hip|osteo/i.test(d))) score += 2;
  if (v.spo2 && v.spo2 < 94) score += 1;
  if (v.bp_s > 150 || v.bp_s < 100) score += 1;
  const label = score >= 5 ? '転倒高リスク' : score >= 3 ? '転倒中リスク' : '転倒低リスク';
  const cls = score >= 5 ? 'badge-critical' : score >= 3 ? 'badge-monitor' : 'badge-stable';
  return { score, label, cls };
}
function dementiaScreenHTML(resId) {
  const r = RESIDENTS.find(x => x.id === resId);
  const hasParkinsons = r.diagnoses.some(d => /parkinson/i.test(d));
  const age = r.age;
  let risk = age > 82 ? 'High' : age > 75 ? 'Medium' : 'Low';
  if (hasParkinsons) risk = 'High';
  const label = { High:'認知症高リスク', Medium:'認知症中リスク', Low:'認知症低リスク' }[risk];
  const cls = { High:'badge-critical', Medium:'badge-monitor', Low:'badge-stable' }[risk];
  return `<div class="card">
    <div class="card-hdr">
      <div class="card-ttl">🧠 認知症リスクスクリーニング (Dementia Risk)</div>
      <span class="badge ${cls}">${label}</span>
    </div>
    <div class="info-row"><div class="info-lbl">Age Factor</div><div class="info-val">${age} years old</div></div>
    <div class="info-row"><div class="info-lbl">Neurological Dx</div><div class="info-val">${hasParkinsons ? "Parkinson's present — elevated risk" : 'None flagged'}</div></div>
    <div class="info-row"><div class="info-lbl">Screening Tool</div><div class="info-val">MMSE quick screen — recommend full assessment if Medium/High</div></div>
    <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="toast('MMSE screening scheduled for next doctor visit')">Schedule MMSE Screen</button>
  </div>`;
}

function coverageReadiness(resId = 'R001') {
  const insight = localAIInsight(resId);
  const abnormalLabs = (labsData[resId] || []).filter(l => l.status !== 'normal');
  const recentVitals = (vitalsData[resId] || []).length >= 7;
  const meds = (medsData[resId] || []).length >= 3;
  const hasMyNumber = true;
  const hasPolicy = true;
  let score = 40;
  if (hasPolicy) score += 15;
  if (hasMyNumber) score += 15;
  if (recentVitals) score += 15;
  if (meds) score += 10;
  if (abnormalLabs.length <= 2) score += 5;
  if (insight.riskLevel === 'High') score -= 12;
  if (insight.riskLevel === 'Medium') score -= 5;
  score = Math.max(35, Math.min(98, score));
  return {
    score,
    title: score >= 80 ? 'Coverage file is visit-ready' : 'Coverage file needs a quick update',
    message: score >= 80
      ? 'マイナンバー, 介護保険 details, prescriptions, and recent vitals are ready for the next doctor visit or claim support.'
      : 'Sync the latest clinical summary, abnormal lab notes, and current vitals before using records for visit or claim support.',
    items: [
      {ok: hasPolicy, label: '介護保険 active', detail: 'Kaigo Hoken level and benefit limit are available.'},
      {ok: hasMyNumber, label: 'マイナンバー linked', detail: 'My Number health insurance card is available.'},
      {ok: recentVitals, label: 'Recent vitals trend', detail: recentVitals ? 'Seven or more readings are available for review.' : 'Add more recent vitals for stronger readiness.'},
      {ok: meds, label: 'Medication record', detail: 'Medication schedule is available for claim and doctor context.'},
      {ok: abnormalLabs.length <= 2, label: 'Lab summary', detail: abnormalLabs.length ? `${abnormalLabs.length} abnormal lab value(s) should be reviewed.` : 'No major lab gaps detected.'},
      {ok: insight.riskLevel !== 'High', label: 'Current clinical risk', detail: `${insight.riskLevel} risk based on latest JCAS AI analysis.`}
    ]
  };
}
function runCoverageReadiness() {
  const readiness = coverageReadiness('R001');
  document.getElementById('coverage-title').textContent = readiness.title;
  document.getElementById('coverage-msg').textContent = readiness.message;
  document.getElementById('coverage-progress').style.width = readiness.score + '%';
  document.getElementById('coverage-checklist').innerHTML = readiness.items.map(i => `<div class="list-item"><strong>${i.ok ? '✓' : '•'} ${i.label}</strong><span>${i.detail}</span></div>`).join('');
  toast(`Coverage readiness updated: ${readiness.score}%`);
}

function openAppointmentModal(patientId = 'R001', urgency = 'Routine', reason = 'Doctor review') {
  bookingContext = {patientId, urgency, reason};
  selectedAppointmentSlot = '';
  document.getElementById('appointment-modal').classList.add('open');
  document.getElementById('appt-patient').innerHTML = RESIDENTS.map(r => `<option value="${r.id}">${r.name} · Room ${r.room}</option>`).join('');
  document.getElementById('appt-doctor').innerHTML = DOCTORS.map(d => `<option value="${d.name}">${d.name} · ${d.specialty}</option>`).join('');
  document.getElementById('appt-patient').value = currentRole === 'resident' ? 'R001' : patientId;
  document.getElementById('appt-doctor').value = RESIDENTS.find(r => r.id === document.getElementById('appt-patient').value)?.doctor || DOCTORS[0].name;
  document.getElementById('appt-date').min = todayISO();
  document.getElementById('appt-date').value = urgency === 'Urgent' || String(reason).includes('24') || String(reason).includes('48') ? todayISO(1) : todayISO(2);
  document.getElementById('appt-reason').value = reason || 'Doctor review';
  document.getElementById('appt-urgency-badge').textContent = urgency || 'Routine';
  refreshSlots();
}
function closeAppointmentModal() {
  document.getElementById('appointment-modal').classList.remove('open');
}
function onAppointmentPatientChange() {
  const patientId = document.getElementById('appt-patient').value;
  const doctor = RESIDENTS.find(r => r.id === patientId)?.doctor || DOCTORS[0].name;
  document.getElementById('appt-doctor').value = doctor;
  const insight = localAIInsight(patientId);
  document.getElementById('appt-urgency-badge').textContent = insight.urgency;
  document.getElementById('appt-reason').value = insight.visitWindow;
  refreshSlots();
}
async function refreshSlots() {
  const date = document.getElementById('appt-date').value;
  const doctorName = document.getElementById('appt-doctor').value;
  if (!date || !doctorName) return;
  await fetchAppointments();
  const data = await fetchAvailability(date, doctorName);
  let doctor = (data.availability || [])[0];
  if (!doctor?.slots?.length) doctor = slotAvailability(date, doctorName).availability[0];
  const slotEl = document.getElementById('appt-slots');
  const available = (doctor?.slots || []).filter(s => s.available).length;
  const firstOpen = (doctor?.slots || []).find(s => s.available);
  document.getElementById('slot-summary').textContent = `${available} available`;
  selectedAppointmentSlot = firstOpen?.time || '';
  slotEl.innerHTML = (doctor?.slots || []).map(s => `
    <button class="slot-btn ${s.time === selectedAppointmentSlot ? 'selected' : ''}" ${s.available ? '' : 'disabled'} onclick="selectAppointmentSlot('${s.time}', this)" title="${s.break ? 'Doctor break' : s.booked ? 'Already booked' : 'Available'}">
      ${displayTime(s.time)}
    </button>`).join('') || `<div class="empty-state" style="grid-column:1/-1"><span class="empty-ico">📅</span><div class="empty-txt">No slots for this doctor</div></div>`;
}
function selectAppointmentSlot(time, el) {
  selectedAppointmentSlot = time;
  document.querySelectorAll('#appt-slots .slot-btn').forEach(btn => btn.classList.remove('selected'));
  el.classList.add('selected');
}
async function suggestNearestSlot() {
  const dateInput = document.getElementById('appt-date');
  const doctorName = document.getElementById('appt-doctor').value;
  for (let i = 0; i < 7; i++) {
    const day = todayISO(i);
    const data = await fetchAvailability(day, doctorName);
    const slot = (data.availability?.[0]?.slots || []).find(s => s.available);
    if (slot) {
      dateInput.value = day;
      await refreshSlots();
      const btn = Array.from(document.querySelectorAll('#appt-slots .slot-btn')).find(b => b.textContent.trim() === displayTime(slot.time));
      if (btn) selectAppointmentSlot(slot.time, btn);
      toast(`Nearest slot: ${displayDate(day)} at ${displayTime(slot.time)}`);
      return;
    }
  }
  toast('No open slots in the next 7 days', 'warning');
}
async function saveAppointment() {
  const payload = {
    patientId: document.getElementById('appt-patient').value,
    doctorName: document.getElementById('appt-doctor').value,
    date: document.getElementById('appt-date').value,
    time: selectedAppointmentSlot,
    reason: document.getElementById('appt-reason').value || 'Doctor review',
    risk: localAIInsight(document.getElementById('appt-patient').value).riskLevel
  };
  if (!payload.patientId || !payload.doctorName || !payload.date || !payload.time) {
    toast('Please choose patient, doctor, date, and slot', 'error');
    return;
  }
  try {
    const res = await fetch('https://ehmr-ai-server-production.up.railway.app/appointments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!res.ok) throw new Error((await res.json()).error || 'Slot unavailable');
    const created = await res.json();
    appointmentsData.push(created);
    localStorage.setItem('ehmr-appointments', JSON.stringify(appointmentsData));
  } catch (e) {
    if (appointmentsData.some(a => a.doctorName === payload.doctorName && a.date === payload.date && a.time === payload.time && a.status === 'Scheduled')) {
      toast('That slot was just booked. Choose another time.', 'error');
      refreshSlots();
      return;
    }
    const created = {...payload, id:'APT-' + Date.now(), status:'Scheduled'};
    appointmentsData.push(created);
    localStorage.setItem('ehmr-appointments', JSON.stringify(appointmentsData));
  }
  addAudit('CREATE', 'appointments', `${patientName(payload.patientId)} with ${payload.doctorName}`);
  closeAppointmentModal();
  if (_currentPage === 'book') loadBookSchedule();
  else if (_currentPage === 'appointments') loadAppts();
  else loadDash();
  showAppointmentConfirmation(appointmentsData[appointmentsData.length - 1] || payload);
  toast('Appointment booked successfully');
}

function sendWhatsApp(phone, text) {
  if (!phone) { toast('No phone number on file', 'error'); return; }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}
function waNote() { return `<div class="wa-note">Opens WhatsApp Web or your WhatsApp app.</div>`; }
function showAppointmentConfirmation(appt) {
  const r = RESIDENTS.find(x => x.id === appt.patientId) || RESIDENTS[0];
  const reminder = `Reminder: ${r.name} has an appointment with ${appt.doctorName} on ${displayDate(appt.date)} at ${displayTime(appt.time)}. Please confirm attendance.`;
  const summary = `JCAS AI Appointment ${appt.id || 'APT'}\nPatient: ${r.name}\nDoctor: ${appt.doctorName}\nDate: ${displayDate(appt.date)}\nTime: ${displayTime(appt.time)}\nReason: ${appt.reason || 'Doctor review'}`;
  openDrawer('Appointment Confirmed', appt.id || 'APT', `<div class="rx-card"><div style="font-size:18px;font-weight:900">${appt.id || 'APT-' + Date.now()}</div><div class="info-row"><div class="info-lbl">Patient</div><div class="info-val">${r.name}</div></div><div class="info-row"><div class="info-lbl">Doctor</div><div class="info-val">${appt.doctorName}</div></div><div class="info-row"><div class="info-lbl">When</div><div class="info-val">${displayDate(appt.date)} at ${displayTime(appt.time)}</div></div><div class="form-actions"><button class="btn btn-primary" onclick="sendWhatsApp('${r.phone}','${reminder.replace(/'/g,"\\'")}')">Set Reminder</button><button class="btn btn-outline" onclick="sendWhatsApp('${r.phone}','${summary.replace(/'/g,"\\'")}')">Send to WhatsApp</button></div>${waNote()}</div>`);
}
async function featureAI(featureContext, context, fallback) {
  try {
    const res = await fetch(AI_PROXY_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({featureContext, context})});
    if (!res.ok) throw new Error('AI unavailable');
    return await res.json();
  } catch (e) {
    console.warn(e);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

function baselineFor(resId) {
  const rows = (vitalsData[resId] || []).slice(0, 14);
  const keys = [
    ['BP Sys','bp_s','mmHg'], ['BP Dia','bp_d','mmHg'], ['SpO2','spo2','%'],
    ['Pulse','pulse','bpm'], ['Glucose','glucose','mg/dL'], ['Weight','weight','kg']
  ];
  const latest = rows[0] || {};
  return keys.map(([label,key,unit]) => {
    const vals = rows.map(v => v[key]).filter(v => Number.isFinite(v));
    if (!vals.length) return null;
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a,b)=>a + Math.pow(b - avg, 2),0) / vals.length) || avg * .04;
    const low = Math.round((avg - sd * 1.25) * 10) / 10;
    const high = Math.round((avg + sd * 1.25) * 10) / 10;
    const today = latest[key];
    return {label,key,unit,low,high,today,inside:today >= low && today <= high,drift:today > high ? '↑ outside' : today < low ? '↓ outside' : 'within'};
  }).filter(Boolean);
}
function anomalyTimeline(resId) {
  const data = (vitalsData[resId] || []).slice(0, 14);
  const out = [];
  const add = (vital, pattern, severity, t) => out.push({id:'AN-' + out.length, t:t || data[0]?.t || new Date().toISOString(), vital, pattern, severity});
  [['SpO2','spo2','down'],['Pulse','pulse','up'],['Glucose','glucose','up'],['BP Sys','bp_s','up'],['Weight','weight','up']].forEach(([label,key,dir]) => {
    const vals = data.slice(0,3).map(v => v[key]).filter(v => Number.isFinite(v));
    if (vals.length === 3 && ((dir === 'up' && vals[0] > vals[1] && vals[1] > vals[2]) || (dir === 'down' && vals[0] < vals[1] && vals[1] < vals[2]))) add(label, `${label} ${dir === 'up' ? 'rising' : 'declining'} 3 days in a row`, key === 'spo2' ? 'Moderate' : 'Mild');
  });
  const night = data.filter(v => new Date(v.t).getHours() >= 18).map(v=>v.bp_s).filter(Boolean);
  const day = data.filter(v => new Date(v.t).getHours() < 18).map(v=>v.bp_s).filter(Boolean);
  if (night.length >= 2 && day.length >= 2 && night.reduce((a,b)=>a+b,0)/night.length > day.reduce((a,b)=>a+b,0)/day.length + 8) add('BP', 'Night BP consistently higher than daytime', 'Moderate');
  const postMeal = data.filter(v => /post|lunch|breakfast|meal/i.test(v.notes || '')).map(v=>v.glucose).filter(Boolean);
  const fasting = data.filter(v => /fasting|morning/i.test(v.notes || '')).map(v=>v.glucose).filter(Boolean);
  if (postMeal.length && fasting.length && Math.max(...postMeal) > Math.max(...fasting) + 35) add('Glucose', 'Post-meal glucose spike compared with fasting readings', 'Moderate');
  if (data[0] && data[1] && data[0].spo2 < data[1].spo2 && data[0].pulse > data[1].pulse) add('SpO2 + Pulse', 'SpO2 dropping alongside rising pulse', 'Severe');
  return out;
}
function baselineHTML(resId) {
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Personal Baseline</div><span class="badge badge-teal">Last 14 vitals</span></div>
    ${baselineFor(resId).map(b => `<div class="baseline-row"><div><strong>${b.label}</strong><div style="font-size:11px;color:var(--g500)">Normal ${b.low}-${b.high} ${b.unit}</div></div><div style="font-family:var(--mono);font-weight:900">${b.today ?? '—'} ${b.unit}</div><span class="badge ${b.inside ? 'badge-stable' : 'badge-critical'}">${b.drift}</span></div>`).join('') || '<div class="empty-state"><span class="empty-ico">🔍</span><div class="empty-txt">Add vitals to compute baseline</div></div>'}
  </div>`;
}
function anomalyHTML(resId) {
  const rows = anomalyTimeline(resId);
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Anomaly Timeline</div><button class="btn btn-outline btn-sm" onclick="explainAnomalies('${resId}')">Get AI Explanation</button></div>
    <div class="timeline-compact">${rows.map(a => `<div class="alert-row ${a.severity==='Severe'?'alert-critical':a.severity==='Moderate'?'alert-warning':'alert-info'}"><div class="alert-ico">🔍</div><div class="alert-body"><div class="alert-title">${a.vital} · ${a.pattern}</div><div class="alert-time">${fmt(a.t)}</div></div><span class="badge ${a.severity==='Severe'?'badge-critical':a.severity==='Moderate'?'badge-monitor':'badge-teal'}">${a.severity}</span></div>`).join('') || '<div class="empty-state"><span class="empty-ico">✓</span><div class="empty-txt">No pattern anomalies detected</div></div>'}</div>
  </div>`;
}
async function explainAnomalies(resId) {
  const fallback = () => ({insight:'Pattern review: compare these findings with symptoms, medication timing, meals, and activity before changing care.'});
  const result = await featureAI('anomaly_explanation', {resident:aiPatientPayload(resId), anomalies:anomalyTimeline(resId), baseline:baselineFor(resId)}, fallback);
  openDrawer('AI Anomaly Explanation', patientName(resId), `<div class="alert-row alert-info"><div class="alert-ico">✨</div><div class="alert-body"><div class="alert-title">Clinician-facing interpretation</div><div class="alert-msg">${result.insight || result.recommendation || JSON.stringify(result)}</div></div></div>`);
}
function labSummaryHTML(resId) {
  const rows = (labsData[resId] || []).filter(l => (l.workflow || 'Published') === 'Published').slice(0, 3);
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Lab Summary</div><button class="btn btn-outline btn-sm" onclick="selLabs='${resId}';nav('labs')">View Full Ledger</button></div>${rows.map(l=>`<div class="lab-row"><div class="lab-test">${l.test}</div><div class="lab-val">${l.result} ${l.unit}</div>${labBadge(l.status)}</div>`).join('') || '<div class="empty-state"><span class="empty-ico">🔬</span><div class="empty-txt">No published labs</div></div>'}</div>`;
}
function medHistoryHTML(resId) {
  const rows = prescriptionsData.filter(p => p.resId === resId);
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Medication History Match</div></div><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Drug/Class</th><th>Dose</th><th>Status</th></tr></thead><tbody>${rows.map(p => (p.meds || []).map(m => `<tr><td>${p.date}</td><td>${m.name || m.drug}</td><td>${m.dose || ''} ${m.frequency || ''}</td><td><span class="badge badge-stable">Completed</span></td></tr>`).join('')).join('') || '<tr><td colspan="4">No saved prescriptions yet</td></tr>'}</tbody></table></div></div>`;
}
function openDrawer(title, sub, html) {
  document.getElementById('drawer-title').textContent = title;
  document.getElementById('drawer-sub').textContent = sub || '';
  document.getElementById('drawer-body').innerHTML = html;
  document.getElementById('feature-drawer').classList.add('open');
}
function closeDrawer() { document.getElementById('feature-drawer').classList.remove('open'); }

const _viewResBase = viewRes;
viewRes = function(id) {
  _viewResBase(id);
  const dv = document.getElementById('res-detail');
  const r = RESIDENTS.find(x => x.id === id);
  if (!dv || !r) return;
  const active = unacked().find(a => a.res === r.name);
  const extras = `
    <div class="res-actions">
      <button class="btn btn-outline btn-sm" onclick="openConsultation('${id}')">🎙️ Record Consultation</button>
      <button class="btn btn-outline btn-sm" onclick="openMedOrderModal('${id}')">📦 Book Medication Delivery</button>
      ${active ? `<button class="btn btn-primary btn-sm" onclick="openCaregiverAssign('${id}','${active.type}')">Assign Caregiver</button>` : ''}
    </div>
    ${baselineHTML(id)}
    <div class="feature-tabs"><button class="tab-btn active">🔍 Anomalies</button><button class="tab-btn">Medication History</button></div>
    ${anomalyHTML(id)}
    ${medHistoryHTML(id)}
    ${labSummaryHTML(id)}`;
  dv.insertAdjacentHTML('beforeend', extras);
};

function miniCalendarStrip() {
  const days = Array.from({length:5}, (_, i) => todayISO(i));
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Upcoming Appointments</div><button class="btn btn-outline btn-sm" onclick="nav('book')">Book</button></div><div class="appt-calendar">${days.map(d => {
    const count = appointmentsData.filter(a => a.date === d && appointmentStatus(a) === 'Scheduled').length;
    return `<div class="cal-day ${count?'has-appt':''}"><div class="cal-date">${new Date(d+'T00:00:00').toLocaleDateString('ja-JP',{day:'2-digit',month:'short'})}</div>${count ? count + ' appointment' + (count>1?'s':'') : 'Free'}</div>`;
  }).join('')}</div></div>`;
}
function doctorPriorityTasks() {
  const today = todayISO();
  const todayAppointments = appointmentsData
    .filter(a => a.date === today && appointmentStatus(a) === 'Scheduled')
    .map(a => ({
      time:a.time,
      priority:(a.risk || localAIInsight(a.patientId).riskLevel) === 'High' ? 1 : 2,
      title:`Visit ${patientName(a.patientId)}`,
      detail:`${a.reason || 'Doctor review'} · ${a.doctorName}`,
      badge:a.risk || localAIInsight(a.patientId).riskLevel,
      action:`openAppointmentModal('${a.patientId}','${a.risk || 'Routine'}','${(a.reason || 'Doctor review').replace(/'/g, "\\'")}')`
    }));
  const alertTasks = unacked().map(a => ({
    time:'',
    priority:a.sev === 'critical' ? 1 : a.sev === 'warning' ? 2 : 3,
    title:`Review alert: ${a.res}`,
    detail:`${a.room} · ${a.msg}`,
    badge:a.sev === 'critical' ? 'Critical' : a.sev === 'warning' ? 'Warning' : 'Info',
    action:`nav('alerts')`
  }));
  const riskTasks = RESIDENTS.map(r => ({r, assessment:healthAssessment(r.id)}))
    .filter(x => x.assessment.riskLevel === 'High' || x.assessment.visitNeeded || x.assessment.score < 75)
    .map(x => ({
      time:'',
      priority:x.assessment.riskLevel === 'High' ? 1 : 2,
      title:`Clinical review: ${x.r.name}`,
      detail:`Room ${x.r.room} · ${x.assessment.visitWindow}`,
      badge:`${x.assessment.riskLevel} · ${x.assessment.score}`,
      action:`nav('residents');setTimeout(()=>viewRes('${x.r.id}'),80)`
    }));
  const medicationTasks = Object.entries(medsData).flatMap(([resId, meds]) => meds.flatMap(m => m.times
    .filter(d => d.status === 'overdue' || d.status === 'pending')
    .map(d => ({
      time:d.t,
      priority:d.status === 'overdue' ? 1 : 3,
      title:`Medication follow-up: ${patientName(resId)}`,
      detail:`${m.name} · ${d.status}`,
      badge:d.status === 'overdue' ? 'Overdue' : 'Pending',
      action:`nav('emar')`
    }))));
  const labTasks = Object.entries(labsData).flatMap(([resId, labs]) => labs
    .filter(l => l.status !== 'normal')
    .slice(0, 1)
    .map(l => ({
      time:'',
      priority:l.status === 'high' || l.status === 'low' ? 2 : 3,
      title:`Lab review: ${patientName(resId)}`,
      detail:`${l.test} ${l.result}${l.unit || ''} · ${l.status}`,
      badge:'Lab',
      action:`nav('labs')`
    })));
  const rows = [...todayAppointments, ...alertTasks, ...riskTasks, ...medicationTasks, ...labTasks]
    .sort((a, b) => (a.priority - b.priority) || timeMinutes(a.time || '23:59') - timeMinutes(b.time || '23:59'))
    .slice(0, 8)
    .map((item, index) => ({...item, time:item.time || minuteTime(9 * 60 + index * 30)}));
  return {rows, todayAppointments};
}
function doctorDayScheduleHTML() {
  const {rows, todayAppointments} = doctorPriorityTasks();
  const criticalCount = rows.filter(r => r.priority === 1).length;
  const top = rows[0];
  const appointmentsCount = todayAppointments.length;
  const patientsCount = new Set(rows.map(item => item.title.split(': ').pop().replace('Visit ', '').replace('Review alert: ', '').replace('Medication follow-up: ', '').replace('Lab review: ', ''))).size;
  const brief = top
    ? `You have <strong>${criticalCount || rows.length} priority action${(criticalCount || rows.length) === 1 ? '' : 's'}</strong> across ${patientsCount} patient${patientsCount === 1 ? '' : 's'} today${appointmentsCount ? `, including ${appointmentsCount} appointment${appointmentsCount === 1 ? '' : 's'}` : ''}. I recommend starting with <strong>${top.title.replace(/^[^:]+: /, '').replace('Visit ', '')}</strong>, because ${top.detail.toLowerCase()}.`
    : `You have <strong>no urgent clinical actions</strong> flagged today. I recommend doing a quick resident round, then checking labs and medication adherence before new appointments are added.`;
  return `<div class="card dash-extra doctor-day-schedule copilot-brief">
    <div class="copilot-title"><span class="copilot-icon">✣</span><span>Daily Copilot Brief</span></div>
    <div class="copilot-copy">"${brief}"</div>
    <button class="copilot-link" onclick="generateDoctorActionPlan()">Generate action plan →</button>
    <div class="copilot-plan" id="doctor-action-plan"></div>
  </div>`;
}
function generateDoctorActionPlan() {
  const slot = document.getElementById('doctor-action-plan');
  if (!slot) return;
  const {rows} = doctorPriorityTasks();
  const steps = rows.slice(0, 4);
  slot.innerHTML = steps.length ? steps.map((item, index) => `
    <div class="copilot-step">
      <div class="copilot-step-num">${index + 1}</div>
      <div><strong>${displayTime(item.time)} · ${item.title}</strong>${item.detail}<br><button class="copilot-link" style="margin-top:6px;font-size:13px" onclick="${item.action}">Open task →</button></div>
    </div>`).join('') : `
    <div class="copilot-step">
      <div class="copilot-step-num">1</div>
      <div><strong>Start routine clinical round</strong>No urgent AI actions are currently flagged. Review stable residents, medication adherence, and lab queue.</div>
    </div>`;
  slot.classList.add('open');
}
function reminderQueueHTML() {
  const now = new Date(), start = now.getHours()*60 + now.getMinutes(), end = start + 120;
  const rows = [];
  Object.entries(medsData).forEach(([resId, meds]) => meds.forEach(m => m.times.forEach(d => {
    const mins = timeMinutes(d.t);
    if (mins >= start && mins <= end) rows.push({resId, med:m, dose:d, mins});
  })));
  rows.sort((a,b)=>a.mins-b.mins);
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Reminder Queue</div><span class="badge badge-teal">Next 2 hours</span></div>${rows.map(x => `<div class="queue-row"><div style="font-family:var(--mono);font-weight:900">${x.dose.t}</div><div><strong>${patientName(x.resId)}</strong><div style="font-size:11px;color:var(--g500)">${x.med.name}</div></div><button class="btn btn-outline btn-sm" onclick="markDoseGiven('${x.resId}','${x.med.id}','${x.dose.id}')">Mark Given</button></div>`).join('') || '<div class="empty-state"><span class="empty-ico">💊</span><div class="empty-txt">No doses due soon</div></div>'}</div>`;
}
function servicesTodayHTML() {
  const rows = serviceBookings.filter(s => s.date === todayISO());
  return `<div class="card"><div class="card-hdr"><div class="card-ttl">Services Today</div><button class="btn btn-outline btn-sm" onclick="nav('ledger')">Ledger</button></div>${rows.map(s => `<div class="queue-row"><div>${s.time}</div><div><strong>${s.type}</strong><div style="font-size:11px;color:var(--g500)">${patientName(s.resId)} · ${s.status}</div></div><button class="btn btn-outline btn-sm" onclick="completeService('${s.id}')">Mark Accessed</button></div>`).join('') || '<div class="empty-state"><span class="empty-ico">🛎️</span><div class="empty-txt">No services booked today</div></div>'}</div>`;
}
function patientNextStepsHTML() {
  const assessment = healthAssessment('R001');
  const upcoming = appointmentsData
    .filter(a => a.patientId === 'R001' && appointmentStatus(a) === 'Scheduled')
    .sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  const due = [];
  (medsData.R001 || []).forEach(m => m.times
    .filter(d => d.status !== 'given')
    .forEach(d => due.push({time:d.t, name:m.name, status:d.status})));
  due.sort((a,b) => timeMinutes(a.time) - timeMinutes(b.time));
  return `<div class="card dash-extra">
    <div class="card-hdr"><div class="card-ttl">My Next Steps</div><button class="btn btn-outline btn-sm" onclick="nav('careplan')">Care Plan</button></div>
    <div class="alert-row ${assessment.visitNeeded ? 'alert-warning' : 'alert-success'}" style="margin-bottom:10px">
      <div class="alert-ico">${assessment.visitNeeded ? '📅' : '✅'}</div>
      <div class="alert-body">
        <div class="alert-title">${assessment.visitNeeded ? 'Doctor review suggested' : 'Plan looks steady'}</div>
        <div class="alert-msg">${assessment.visitWindow}</div>
      </div>
    </div>
    <div class="info-row"><div class="info-lbl">Next Visit</div><div class="info-val">${upcoming ? `${displayDate(upcoming.date)} at ${displayTime(upcoming.time)} with ${upcoming.doctorName}` : 'No visit scheduled yet'}</div></div>
    <div class="info-row"><div class="info-lbl">Next Dose</div><div class="info-val">${due[0] ? `${due[0].name} at ${due[0].time}` : 'All doses completed for today'}</div></div>
    <div class="form-actions" style="margin-top:12px">
      <button class="btn btn-primary btn-sm" onclick="openAppointmentModal('R001','${assessment.urgency}','${assessment.visitWindow.replace(/'/g, "\\'")}')">Book Doctor Visit</button>
      <button class="btn btn-outline btn-sm" onclick="nav('vitals');setTimeout(()=>toggleForm('vform'),80)">Add Vitals</button>
      <button class="btn btn-outline btn-sm" onclick="nav('labs');setTimeout(()=>toggleForm('lab-ledger-form'),80)">Add Lab Report</button>
      <button class="btn btn-outline btn-sm" onclick="nav('insurance')">Open マイナンバー</button>
    </div>
  </div>`;
}
function patientServicesHTML() {
  const rows = serviceBookings.filter(s => s.resId === 'R001').slice(0, 3);
  return `<div class="card dash-extra"><div class="card-hdr"><div class="card-ttl">My Service Requests</div><button class="btn btn-outline btn-sm" onclick="nav('services')">Open</button></div>${rows.map(s => `<div class="queue-row"><div>${s.time}</div><div><strong>${s.type}</strong><div style="font-size:11px;color:var(--g500)">${s.date} · ${s.status}</div></div><span class="badge ${s.status==='Completed'?'badge-stable':s.status==='Pending'?'badge-monitor':'badge-teal'}">${s.status}</span></div>`).join('') || '<div class="empty-state"><span class="empty-ico">🛎️</span><div class="empty-txt">No service requests yet</div></div>'}</div>`;
}
const _loadDashBase = loadDash;
loadDash = function() {
  _loadDashBase();
  document.querySelectorAll('#page-dashboard .dash-extra').forEach(el => el.remove());
  const aiGrid = document.querySelector('#page-dashboard .ai-grid');
  if (aiGrid) {
    aiGrid.style.display = currentRole === 'doctor' ? 'none' : '';
    if (currentRole === 'doctor') aiGrid.insertAdjacentHTML('beforebegin', doctorDayScheduleHTML());
  }
  const rightCol = document.querySelector('#page-dashboard .grid-2 > div:last-child');
  if (rightCol) {
    if (currentRole === 'resident') rightCol.insertAdjacentHTML('afterbegin', patientNextStepsHTML());
    else rightCol.insertAdjacentHTML('afterbegin', servicesTodayHTML().replace('<div class="card">', '<div class="card dash-extra">'));
  }
  const leftCol = document.querySelector('#page-dashboard .grid-2 > div:first-child');
  if (leftCol) {
    if (currentRole === 'resident') leftCol.insertAdjacentHTML('beforeend', patientServicesHTML());
    else leftCol.insertAdjacentHTML('beforeend', reminderQueueHTML().replace('<div class="card">', '<div class="card dash-extra">'));
  }
  startReminderEngine();
};

function quickAssignSchedule(day, shift) {
  const caregiver = prompt('Caregiver name', '高橋 美咲');
  if (!caregiver) return;
  const resId = prompt('Resident ID', 'R001') || 'R001';
  caregiverRoster.slots[`${day}|${shift}`] = {caregiver,resId};
  saveStore('ehmr_schedule', caregiverRoster);
  addAudit('UPDATE','schedule',`${caregiver} assigned to ${patientName(resId)} on ${day} ${shift}`);
  loadBookSchedule();
  toast('Schedule updated');
}
function serviceCatalog() {
  return [
    ['Home Visit','🏠','Today 18:00','Available'], ['Home Lab Collection','🧪','Tomorrow 07:30','Available'],
    ['Non-Emergency Transport','🚑','Next slot 14:00','Busy'], ['Pharmacy Delivery','💊','2 hours','Available'],
    ['Physiotherapy Session','🧘','Today 16:00','Available'], ['Dietitian Consultation','🍱','Tomorrow','Next Slot'],
    ['Housekeeping / Room Sanitization','🧹','45 min','Available'], ['Doctor Appointment','📅','By availability','Available']
  ];
}
function openServiceModal(type) {
  document.getElementById('service-modal').classList.add('open');
  document.getElementById('svc-type').value = type;
  document.getElementById('svc-resident').innerHTML = RESIDENTS.slice(0,4).map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  document.getElementById('svc-resident').value = currentRole === 'resident' ? 'R001' : 'R001';
  document.getElementById('svc-date').value = todayISO(1);
  document.getElementById('svc-time').value = '10:00';
  document.getElementById('svc-confirm').innerHTML = '';
}
function closeServiceModal() { document.getElementById('service-modal').classList.remove('open'); }
function saveServiceBooking() {
  const item = {id:'SRV-'+Date.now(),type:document.getElementById('svc-type').value,resId:document.getElementById('svc-resident').value,date:document.getElementById('svc-date').value,time:document.getElementById('svc-time').value,urgency:document.getElementById('svc-urgency').value,notes:document.getElementById('svc-notes').value,status:'Pending'};
  setTimeout(() => {
    serviceBookings.unshift(item); saveStore('ehmr_service_bookings', serviceBookings);
    addAudit('CREATE','service_booking',`${item.type} for ${patientName(item.resId)}`);
    document.getElementById('svc-confirm').innerHTML = `<div class="alert-row alert-info" style="margin-top:12px"><div class="alert-ico">✓</div><div class="alert-body"><div class="alert-title">Booking ${item.id} confirmed</div><div class="alert-msg">${item.type} for ${patientName(item.resId)} on ${item.date} at ${item.time}</div><button class="btn btn-outline btn-sm" onclick="sendWhatsApp('${RESIDENTS.find(r=>r.id===item.resId).phone}','JCAS AI service booking ${item.id}: ${item.type} on ${item.date} at ${item.time}.')">Notify on WhatsApp</button>${waNote()}</div></div>`;
    toast('Service booking created');
  }, 400);
}
function cancelService(id) { const s = serviceBookings.find(x=>x.id===id); if (s) s.status='Cancelled'; saveStore('ehmr_service_bookings', serviceBookings); addAudit('UPDATE','service_booking',`${id} cancelled`); loadServices(); toast('Service cancelled'); }
function completeService(id) { const s = serviceBookings.find(x=>x.id===id); if (s) s.status='Completed'; saveStore('ehmr_service_bookings', serviceBookings); addAudit('UPDATE','service_booking',`${id} completed`); loadDash(); toast('Service marked complete'); }

function markDoseGiven(resId, medId, doseId) {
  const med = (medsData[resId] || []).find(m=>m.id===medId); const dose = med?.times.find(t=>t.id===doseId);
  if (!dose || dose.status === 'given') return;
  dose.status = 'given'; dose.adm = currentRole === 'doctor' ? '山本 花子' : RESIDENTS.find(r=>r.id===resId)?.caregiver;
  addAudit('UPDATE','emar',`${med.name} marked given for ${patientName(resId)}`);
  toast('Dose marked given');
  if (_currentPage === 'dashboard') loadDash();
  if (_currentPage === 'emar') loadEmar(selEmar);
}
function startReminderEngine() {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkMedReminders, 60000);
  checkMedReminders();
}
function checkMedReminders() {
  const now = new Date(), mins = now.getHours()*60 + now.getMinutes();
  Object.entries(medsData).forEach(([resId, meds]) => meds.forEach(m => m.times.forEach(d => {
    if (d.status === 'given') return;
    const due = timeMinutes(d.t), key = `${resId}-${m.id}-${d.id}-${new Date().toDateString()}`;
    if (due - mins <= 15 && due - mins >= 0 && !remindedDoses.has(key)) {
      remindedDoses.add(key); showReminderToast(resId, m, d);
    }
    if (mins - due > 30 && !remindedDoses.has(key + '-wa')) {
      remindedDoses.add(key + '-wa');
      const cg = CAREGIVERS.find(c => c.name === RESIDENTS.find(r=>r.id===resId)?.caregiver);
      if (cg) sendWhatsApp(cg.phone, `Medication overdue: ${patientName(resId)} has ${m.name} due at ${d.t}. Please update eMAR.`);
    }
  })));
}
function showReminderToast(resId, med, dose) {
  const stack = document.getElementById('reminder-toasts');
  if (!stack) return;
  const id = 'rt-' + Date.now();
  stack.insertAdjacentHTML('beforeend', `<div class="persistent-toast" id="${id}"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="color:var(--coral)">Medication due</strong><button class="modal-close" style="width:26px;height:26px" onclick="document.getElementById('${id}').remove()">×</button></div><div style="font-size:12px;color:var(--g600);margin:5px 0">${patientName(resId)} · ${med.name} · ${dose.t}</div><button class="btn btn-primary btn-sm" onclick="markDoseGiven('${resId}','${med.id}','${dose.id}');document.getElementById('${id}').remove()">Mark Given</button></div>`);
}
function openMedOrderModal(resId = selEmar) {
  document.getElementById('med-order-modal').classList.add('open');
  document.getElementById('mo-resident').value = resId;
  document.getElementById('mo-med').innerHTML = (medsData[resId] || []).map(m=>`<option>${m.name}</option>`).join('');
  document.getElementById('mo-date').value = todayISO(2);
}
function closeMedOrderModal() { document.getElementById('med-order-modal').classList.remove('open'); }
function saveMedicationOrder() {
  const resId = document.getElementById('mo-resident').value;
  const order = {id:'MO-'+Date.now(),resId,med:document.getElementById('mo-med').value,qty:document.getElementById('mo-qty').value || '30 tablets',date:document.getElementById('mo-date').value,notes:document.getElementById('mo-notes').value,status:'Pending'};
  medicationOrders.unshift(order); saveStore('ehmr_med_orders', medicationOrders);
  addAudit('CREATE','medication_order',`${order.med} for ${patientName(resId)}`);
  closeMedOrderModal(); toast('Medication delivery order created');
  if (_currentPage === 'emar') loadEmar(selEmar);
}
const _loadEmarBase = loadEmar;
loadEmar = function(id) {
  _loadEmarBase(id);
  const target = document.getElementById('emar-content');
  if (!target) return;
  const orders = medicationOrders.filter(o => o.resId === selEmar);
  target.insertAdjacentHTML('beforeend', `<div class="card"><div class="card-hdr"><div class="card-ttl">📦 Med Orders</div><button class="btn btn-primary btn-sm" onclick="openMedOrderModal('${selEmar}')">Book Medication Delivery</button></div><div class="tbl-wrap"><table><thead><tr><th>Order</th><th>Medication</th><th>Qty</th><th>Expected</th><th>Status</th><th>Actions</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.id}</td><td>${o.med}</td><td>${o.qty}</td><td>${o.date}</td><td><select class="order-status-select ${medOrderStatusClass(o.status)}" onchange="updateMedOrder('${o.id}',this.value);setMedOrderSelectClass(this)">${['Pending','Confirmed','Dispatched','Delivered'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn btn-outline btn-sm" onclick="sendMedOrderUpdate('${o.id}')">Send Update to Family</button></td></tr>`).join('') || '<tr><td colspan="6">No medication delivery orders</td></tr>'}</tbody></table></div>${waNote()}</div>`);
};
function medOrderStatusClass(status) {
  return 'status-' + String(status || 'Pending').toLowerCase().replace(/\s+/g, '-');
}
function setMedOrderSelectClass(select) {
  select.className = `order-status-select ${medOrderStatusClass(select.value)}`;
}
function updateMedOrder(id,status) { const o = medicationOrders.find(x=>x.id===id); if (o) o.status=status; saveStore('ehmr_med_orders', medicationOrders); addAudit('UPDATE','medication_order',`${id} ${status}`); toast('Medication order updated'); }
function sendMedOrderUpdate(id) { const o = medicationOrders.find(x=>x.id===id); const r = RESIDENTS.find(x=>x.id===o.resId); sendWhatsApp(r.phone, `Medication update for ${r.name}: ${o.med} order is ${o.status}. Expected by ${o.date}.`); }

function openCaregiverAssign(resId, reason) {
  const activeNames = Object.values(caregiverRoster.slots).map(s=>s.caregiver);
  const available = CAREGIVERS.filter(c => !activeNames.includes(c.name) || c.name === RESIDENTS.find(r=>r.id===resId)?.caregiver);
  openDrawer('Assign Caregiver', patientName(resId), available.map(c=>`<div class="list-item"><strong>${c.name}</strong><span>${c.phone}</span><div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="assignCaregiver('${resId}','${c.name}','${reason}')">Assign 2 Hours</button></div></div>`).join(''));
}
function assignCaregiver(resId, caregiver, reason) {
  const key = `${todayISO()}|${new Date().getHours() >= 18 ? 'Night' : new Date().getHours() >= 12 ? 'Evening' : 'Morning'}`;
  caregiverRoster.slots[key] = {caregiver,resId,coverage:'2 hours',reason};
  saveStore('ehmr_schedule', caregiverRoster);
  const c = CAREGIVERS.find(x=>x.name===caregiver);
  if (c) sendWhatsApp(c.phone, `JCAS AI Assignment: You have been assigned to ${patientName(resId)} from ${new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} for 2 hours. Reason: ${reason}. Please confirm.`);
  addAudit('CREATE','caregiver_assignment',`${caregiver} to ${patientName(resId)} for ${reason}`);
  closeDrawer(); toast('Caregiver assigned');
}
const _loadAlertsBase = loadAlerts;
loadAlerts = function() {
  _loadAlertsBase();
  document.querySelectorAll('#alerts-list .alert-row').forEach((row, i) => {
    const a = ALERTS[i]; if (a && !a.acked) row.insertAdjacentHTML('beforeend', `<button class="ack-btn" onclick="openCaregiverAssign('${(RESIDENTS.find(r=>r.name===a.res)||{}).id || 'R001'}','${a.type}')">ASSIGN</button>`);
  });
};

function sparkline(vals) {
  vals = vals.map(Number).filter(Number.isFinite).slice(-5);
  if (vals.length < 2) return '';
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v,i)=>`${i*18},${22 - ((v-min)/span)*18 + 1}`).join(' ');
  return `<svg class="spark" viewBox="0 0 76 24"><polyline points="${pts}" fill="none" stroke="#00897B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function parseRef(ref, low, high) {
  if (Number.isFinite(low) && Number.isFinite(high)) return {low, high};
  const nums = String(ref || '').match(/[\d.]+/g)?.map(Number) || [];
  if (String(ref).includes('<')) return {low:-Infinity, high:nums[0]};
  if (String(ref).includes('>')) return {low:nums[0], high:Infinity};
  return {low:nums[0] ?? -Infinity, high:nums[1] ?? Infinity};
}
function classifyLab(value, low, high) {
  const v = Number(value), refMid = Number.isFinite(high) && Number.isFinite(low) ? (low + high) / 2 : (Number.isFinite(high) ? high : low);
  let status = 'normal', dev = 0;
  if (Number.isFinite(v) && v < low) { status='low'; dev = Math.abs((low - v) / (refMid || low || 1)) * 100; }
  if (Number.isFinite(v) && v > high) { status='high'; dev = Math.abs((v - high) / (refMid || high || 1)) * 100; }
  const severity = dev > 40 ? 'Severe' : dev > 20 ? 'Moderate' : dev > 10 ? 'Mild' : 'Normal';
  return {status,severity,dev:Math.round(dev)};
}
function workflowClass(status) {
  return 'workflow-' + String(status || 'Published').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function setWorkflowSelectClass(select) {
  select.className = `workflow-select ${workflowClass(select.value)}`;
}
loadLabs = function(id) {
  selLabs = currentRole === 'resident' ? 'R001' : (id || 'R001');
  document.getElementById('labs-chips').innerHTML = resChipsHTML(selLabs, 'loadLabs');
  const visible = labsData[selLabs] || [];
  document.getElementById('labs-content').innerHTML = `<div class="card"><div class="card-hdr"><div><div class="card-ttl">Lab Ledger · ${patientName(selLabs)}</div><div class="page-sub">${currentRole === 'resident' ? 'Upload reports for doctor review' : 'Draft → Reviewed → Published workflow with anomaly flagging'}</div></div><button class="btn btn-primary btn-sm" onclick="toggleForm('lab-ledger-form')" data-roles="doctor,resident">Submit New Lab Report</button></div>
    <div class="form-section" id="lab-ledger-form"><div class="form-grid"><div class="form-group"><label>Resident</label><select id="ll-res">${roleScopedResidents().map(r=>`<option value="${r.id}" ${r.id===selLabs?'selected':''}>${r.name}</option>`).join('')}</select></div><div class="form-group"><label>Test Name</label><input id="ll-test" placeholder="Creatinine"/></div><div class="form-group"><label>Test Date</label><input id="ll-date" type="date" value="${todayISO()}"/></div><div class="form-group"><label>Lab Name</label><input id="ll-lab" placeholder="Apollo Diagnostics"/></div><div class="form-group"><label>Result Value</label><input id="ll-result" type="number" step="0.01"/></div><div class="form-group"><label>Unit</label><input id="ll-unit" placeholder="mg/dL"/></div><div class="form-group"><label>Reference Low</label><input id="ll-low" type="number" step="0.01"/></div><div class="form-group"><label>Reference High</label><input id="ll-high" type="number" step="0.01"/></div><div class="form-group"><label>Photo of Lab Report</label><input id="ll-photo" type="file" accept="image/*" capture="environment" onchange="previewLabPhoto(this)"/></div></div><div id="ll-photo-preview" style="display:none;margin-top:10px"></div><div class="form-group" style="margin-top:10px"><label>Upload Note</label><input id="ll-note" placeholder="Report reference"/></div><div class="form-actions"><button class="btn btn-primary" onclick="saveLabLedger()">Submit</button><button class="btn btn-outline" onclick="toggleForm('lab-ledger-form')">Cancel</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Resident</th><th>Test</th><th>Result</th><th>Ref Range</th><th>Status</th><th>Trend</th><th>Workflow</th><th>Actions</th></tr></thead><tbody>${visible.map(l => { const last = (labsData[selLabs] || []).filter(x=>x.test===l.test).map(x=>Number(x.result)); const wf = l.workflow || 'Published'; return `<tr><td>${l.date}</td><td>${patientName(selLabs)}</td><td>${l.test}</td><td><strong>${l.result} ${l.unit}</strong>${l.photo?'<div style="margin-top:5px"><img src="'+l.photo+'" alt="Lab report photo" style="width:54px;height:54px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/></div>':''}</td><td>${l.ref}</td><td>${labBadge(l.status)} ${l.severity?`<span class="badge badge-gray">${l.severity}</span>`:''}</td><td>${last[0] > last[1] ? '↑' : last[0] < last[1] ? '↓' : '→'} ${sparkline(last.reverse())}</td><td>${currentRole==='doctor'?`<select class="workflow-select ${workflowClass(wf)}" onchange="setWorkflowSelectClass(this);changeLabWorkflow('${l.id}',this.value)">${['Patient Submitted','Draft','Reviewed','Published'].map(s=>`<option ${((l.workflow || 'Published')===s)?'selected':''}>${s}</option>`).join('')}</select>`:`<span class="workflow-select ${workflowClass(wf)}" style="display:inline-flex">${wf}</span>`}</td><td>${l.photo?`<button class="btn btn-outline btn-sm" onclick="openLabPhoto('${l.id}')">View Photo</button>`:''}${l.status !== 'normal'?`<button class="btn btn-outline btn-sm" onclick="explainLab('${l.id}')">🤖 Explain</button>`:''}</td></tr>`; }).join('') || '<tr><td colspan="9">No lab reports</td></tr>'}</tbody></table></div></div>`;
  applyRoleAccess(); addAudit('VIEW','labs',patientName(selLabs));
};
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function previewLabPhoto(input) {
  const file = input.files && input.files[0];
  const box = document.getElementById('ll-photo-preview');
  if (!box) return;
  if (!file) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const src = await readFileAsDataURL(file);
  box.style.display = '';
  box.innerHTML = `<div class="alert-row alert-info" style="margin-bottom:0"><div class="alert-ico">IMG</div><div class="alert-body"><div class="alert-title">${file.name}</div><div class="alert-msg">Photo attached to this lab report.</div></div><img src="${src}" alt="Lab report preview" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/></div>`;
}
async function saveLabLedger() {
  const resId = currentRole === 'resident' ? 'R001' : document.getElementById('ll-res').value, low = parseFloat(document.getElementById('ll-low').value), high = parseFloat(document.getElementById('ll-high').value), result = document.getElementById('ll-result').value;
  if (!document.getElementById('ll-test').value || !result) { toast('Test and result are required','error'); return; }
  const cls = classifyLab(result, low, high);
  const photoInput = document.getElementById('ll-photo');
  const photoFile = photoInput?.files?.[0];
  const photo = await readFileAsDataURL(photoFile);
  const entry = {id:'L'+Date.now(),test:document.getElementById('ll-test').value,result,unit:document.getElementById('ll-unit').value,ref:`${low}-${high}`,status:cls.status,severity:cls.severity,deviation:cls.dev,date:document.getElementById('ll-date').value,lab:document.getElementById('ll-lab').value,note:document.getElementById('ll-note').value,photo,photoName:photoFile?.name || '',workflow:currentRole === 'resident' ? 'Patient Submitted' : 'Draft',by:currentRole === 'resident' ? 'Patient / Family' : '山本 花子'};
  setTimeout(()=>{ if (!labsData[resId]) labsData[resId]=[]; labsData[resId].unshift(entry); addAudit('CREATE','lab_ledger',`${entry.test} for ${patientName(resId)} (${entry.status})`); selLabs=resId; loadLabs(resId); toast(currentRole === 'resident' ? 'Lab report uploaded for doctor review' : 'Lab report submitted as Draft'); },400);
}
function changeLabWorkflow(id,status) { const l = (labsData[selLabs] || []).find(x=>x.id===id); if (l) l.workflow=status; addAudit('UPDATE','lab_workflow',`${id} moved to ${status}`); toast('Lab workflow updated'); }
function openLabPhoto(id) {
  const lab = (labsData[selLabs] || []).find(x=>x.id===id);
  if (!lab?.photo) { toast('No photo attached', 'warning'); return; }
  openDrawer('Lab Report Photo', `${lab.test} · ${lab.date}`, `<img src="${lab.photo}" alt="Lab report photo" style="width:100%;border-radius:12px;border:1px solid var(--border)"/><div class="page-sub" style="margin-top:10px">${lab.photoName || 'Uploaded lab report image'}</div>`);
}
async function explainLab(id) {
  const lab = (labsData[selLabs] || []).find(x=>x.id===id);
  const result = await featureAI('lab_anomaly_explanation', {lab,resident:aiPatientPayload(selLabs),medications:medsData[selLabs]}, () => ({insight:`${lab.test} is ${lab.status} by ${lab.deviation || 0}% from reference. Review symptoms, hydration, medication timing, and repeat/confirm as clinically appropriate.`}));
  openDrawer('AI Lab Explanation', lab.test, `<div class="alert-row alert-warning"><div class="alert-ico">🤖</div><div class="alert-body"><div class="alert-title">${lab.result} ${lab.unit} · Ref ${lab.ref}</div><div class="alert-msg">${result.insight || result.recommendation || JSON.stringify(result)}</div></div></div>`);
}

async function medSafetyCheck(resId, medText) {
  const fallback = () => ({overallSafety:/warfarin|digoxin|insulin/i.test(medText)?'Review Required':'Caution',interactions:[{name:'AI fallback screen',severity:'Medium',description:'Review allergy list, current medication classes, renal labs, and duplicate therapy before saving.'}],alternatives:['Pharmacist review'],doseCheck:'Dose requires senior-specific review',renalCheck:'Check creatinine/eGFR if kidney risk exists',duplicateCheck:'No exact duplicate found'});
  const data = await featureAI('medication_intelligence', {proposed:medText,resident:aiPatientPayload(resId),currentMeds:medsData[resId],abnormalLabs:(labsData[resId]||[]).filter(l=>l.status!=='normal')}, fallback);
  const safety = data.overallSafety || 'Caution';
  openDrawer('Medication Safety Panel', safety, `<div class="alert-row ${safety==='Review Required'?'alert-critical':safety==='Caution'?'alert-warning':'alert-info'}"><div class="alert-ico">💊</div><div class="alert-body"><div class="alert-title">Overall Safety: ${safety}</div><div class="alert-msg">${data.doseCheck || ''}<br>${data.renalCheck || ''}<br>${data.duplicateCheck || ''}</div></div></div>${(data.interactions || []).map(i=>`<div class="list-item"><strong>${i.name || 'Interaction'} · ${i.severity || ''}</strong><span>${i.description || i}</span></div>`).join('')}${(data.alternatives || []).map(a=>`<button class="btn btn-outline btn-sm" onclick="document.getElementById('rx-med-name').value='${String(a).replace(/'/g,"\\'")}'">Use ${a}</button>`).join(' ')}${safety==='Review Required'?'<label style="display:block;margin-top:12px;font-size:12px"><input type="checkbox" id="rx-ack"/> I have reviewed the AI safety alert and am proceeding on clinical judgment.</label>':''}<div class="form-actions"><button class="btn btn-outline btn-sm" onclick="closeDrawer()">Proceed Anyway</button><button class="btn btn-outline btn-sm" onclick="toast('Pharmacist consult noted')">Consult Pharmacist</button></div>`);
}
function openConsultation(resId='R001') {
  openDrawer('Record Consultation', patientName(resId), `<div class="form-group"><label>Consultation Notes Fallback</label><textarea id="consult-notes" placeholder="Type notes if microphone is unavailable"></textarea></div><div id="record-state" class="wave" style="display:none"><span></span><span></span><span></span><span></span></div><div class="form-actions"><button class="btn btn-primary" onclick="startRecording('${resId}')">🎙️ Record Consultation</button><button class="btn btn-outline" onclick="transcribeConsultation('${resId}')">Stop & Transcribe</button></div><div id="rx-output"></div><hr style="border:none;border-top:1px solid var(--g100);margin:14px 0"><div class="card" style="padding:14px"><div class="card-ttl" style="margin-bottom:10px">✏️ Write Prescription</div><div class="form-grid"><div class="form-group"><label>Medication</label><input id="rx-med-name" oninput="debouncedSafety('${resId}',this.value)" placeholder="Drug name"/></div><div class="form-group"><label>Dose/Frequency</label><input id="rx-dose" placeholder="500mg twice daily"/></div></div><div class="form-actions"><button class="btn btn-primary" onclick="saveTypedPrescription('${resId}')">Save Prescription</button><button class="btn btn-outline" onclick="medSafetyCheck('${resId}',document.getElementById('rx-med-name').value+' '+document.getElementById('rx-dose').value)">Check Safety</button></div></div>`);
}
let mediaRecorder, audioChunks = [], safetyTimer;
function debouncedSafety(resId, text) { clearTimeout(safetyTimer); if ((text || '').length < 4) return; safetyTimer = setTimeout(()=>medSafetyCheck(resId, text), 800); }
async function startRecording(resId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    audioChunks = []; mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start(); document.getElementById('record-state').style.display = 'flex'; toast('Recording consultation');
  } catch (e) {
    document.getElementById('consult-notes').focus(); toast('Microphone unavailable. Use notes fallback.', 'warning');
  }
}
async function transcribeConsultation(resId) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  document.getElementById('record-state').style.display = 'none';
  const notes = document.getElementById('consult-notes').value || 'Patient reviewed. Continue current care. Prescribed Paracetamol 500mg twice daily for 3 days if pain.';
  const fallback = () => ({chiefComplaint:'Typed/recorded consultation',examinationFindings:notes,diagnosis:'Clinical review',medications:[{name:'Paracetamol',dose:'500mg',frequency:'Twice daily',duration:'3 days'}],followUp:'Review if symptoms persist.'});
  const rx = await featureAI('voice_prescription_extraction', {resident:aiPatientPayload(resId),notes,audioBase64:audioChunks.length?'demo-audio-base64':''}, fallback);
  renderPrescription(resId, rx);
}
function renderPrescription(resId, rx) {
  const meds = rx.medications || rx.prescribedMedications || [];
  document.getElementById('rx-output').innerHTML = `<div class="rx-card"><div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font-size:18px;font-weight:900">℞ Prescription</div><div class="page-sub">${patientName(resId)} · 山本 花子 · ${displayDate(todayISO())}</div></div><span class="badge badge-teal">AI extracted</span></div><div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Drug</th><th>Dose</th><th>Frequency</th><th>Days</th></tr></thead><tbody>${meds.map(m=>`<tr><td>${m.name || m.drug}</td><td>${m.dose || ''}</td><td>${m.frequency || ''}</td><td>${m.duration || m.days || ''}</td></tr>`).join('')}</tbody></table></div><div style="font-size:12px;color:var(--g600);margin-top:10px"><strong>Instructions:</strong> ${rx.followUp || rx.followUpInstructions || rx.instructions || 'Follow care plan.'}</div><div style="margin-top:12px;font-size:12px;color:var(--g500)">Signature: 山本 花子</div><div class="form-actions"><button class="btn btn-primary" onclick='savePrescription("${resId}", ${JSON.stringify(rx).replace(/'/g,"&#39;")})'>💾 Save to Timeline</button><button class="btn btn-outline" onclick='sendPrescriptionWA("${resId}", ${JSON.stringify(rx).replace(/'/g,"&#39;")})'>📱 Send via WhatsApp</button></div>${waNote()}</div>`;
  medSafetyCheck(resId, meds.map(m=>`${m.name || m.drug} ${m.dose || ''} ${m.frequency || ''}`).join('; '));
}
function saveTypedPrescription(resId) {
  const rx = {chiefComplaint:'Written prescription',diagnosis:'Doctor prescription',medications:[{name:document.getElementById('rx-med-name').value,dose:document.getElementById('rx-dose').value,frequency:'As written',duration:'As advised'}],followUp:'Follow up as advised.'};
  savePrescription(resId, rx);
}
function rxText(resId, rx) {
  const meds = rx.medications || [];
  return `Prescription for ${patientName(resId)}\nDoctor: 山本 花子\nDate: ${displayDate(todayISO())}\nMedications:\n${meds.map(m=>`- ${m.name || m.drug}: ${m.dose || ''} ${m.frequency || ''} ${m.duration || ''}`).join('\n') || '- As advised'}${rx.diet ? '\nDietary plan: ' + rx.diet : ''}${rx.activity ? '\nActivity plan: ' + rx.activity : ''}\nFollow-up: ${rx.followUp || rx.instructions || 'As advised.'}`;
}
function savePrescription(resId, rx) {
  prescriptionsData.unshift({id:'RX-'+Date.now(),resId,date:todayISO(),doctor:'山本 花子',meds:rx.medications || [],rx});
  saveStore('ehmr_prescriptions', prescriptionsData);
  if (!notesData[resId]) notesData[resId] = [];
  notesData[resId].unshift({shift:'Doctor',date:todayISO(),author:'山本 花子',role:'Doctor',note:'Prescription saved: ' + rxText(resId, rx),tasks:[],t:new Date().toISOString(),type:'Prescription'});
  addAudit('CREATE','prescription',`${patientName(resId)} prescription saved`);
  toast('Prescription saved to timeline');
}
function sendPrescriptionWA(resId, rx) { sendWhatsApp(RESIDENTS.find(r=>r.id===resId)?.phone, rxText(resId, rx)); }
const _loadCriticalBase = loadCriticalReview;
loadCriticalReview = function() {
  _loadCriticalBase();
  document.getElementById('critical-content').insertAdjacentHTML('afterbegin', `<div class="card"><div class="card-hdr"><div class="card-ttl">Consultation Tools</div></div><div class="res-chips">${RESIDENTS.slice(0,4).map(r=>`<div class="res-chip" onclick="openConsultation('${r.id}')"><div class="res-chip-av" style="background:${r.color}">${r.initials}</div>${r.name.split(' ')[0]}</div>`).join('')}</div></div>`);
};

// ===== BOOT =====
if (currentRole) {
  document.getElementById('role-gate').classList.add('hidden');
  applyRoleAccess();
}
fetchAppointments().finally(loadDash);
