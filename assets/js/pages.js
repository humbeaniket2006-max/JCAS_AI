// ===== DASHBOARD =====
function loadDash() {
  document.getElementById('dash-greeting').textContent = currentRole === 'resident' ? 'My JCAS AI Health Dashboard' : 'Doctor/Admin Dashboard';
  if (_currentPage === 'dashboard') document.getElementById('tb-title').textContent = currentRole === 'resident' ? 'Dashboard' : 'Doctor/Admin Dashboard';
  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('ja-JP', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const isPatient = currentRole === 'resident';
  const heroTitle = document.getElementById('dash-ai-title');
  const heroSub = document.getElementById('dash-ai-sub');
  const trendTitle = document.getElementById('dash-trends-title');
  const trendBadge = document.getElementById('dash-trends-badge');
  if (heroTitle) heroTitle.textContent = isPatient ? '✨ My AI Health Summary · 田中 健二' : '✨ Clinical AI Insight Engine · 田中 健二';
  if (heroSub) heroSub.textContent = isPatient
    ? 'Simple explanation from my latest vitals, medicines, and care history'
    : 'Groq-powered risk interpretation from manual vitals and JCAS history';
  if (trendTitle) trendTitle.textContent = isPatient ? 'My 7-Day Vitals Trend' : '7-Day Vitals Trend';
  if (trendBadge) trendBadge.textContent = isPatient ? 'My records' : 'Manual records';
  loadAIConfig();
  renderTrends('R001');
  renderAI(localAIInsight('R001'));
  const ua = unacked();
  document.getElementById('sb-alert-badge').textContent = ua.length;
  document.getElementById('tb-dot').style.display = ua.length ? '' : 'none';
  let given = 0, total = 0;
  const medsScope = isPatient ? (medsData.R001 || []) : Object.values(medsData).flat();
  medsScope.forEach(m => {
    total += m.times.length;
    given += m.times.filter(t => t.status === 'given').length;
  });
  const primaryAssessment = healthAssessment('R001');
  const avgHealthScore = Math.round(RESIDENTS.reduce((sum, r) => sum + healthAssessment(r.id).score, 0) / RESIDENTS.length);
  const nextAppt = appointmentsData
    .filter(a => a.patientId === 'R001' && appointmentStatus(a) === 'Scheduled')
    .sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  const readiness = coverageReadiness('R001');
  document.getElementById('dash-stats').innerHTML = isPatient ? `
    <div class="stat-card" onclick="nav('appointments')">
      <span class="stat-ico">📅</span>
      <div class="stat-val" style="color:var(--teal-d)">${nextAppt ? displayDate(nextAppt.date).split(' ').slice(0,2).join(' ') : 'None'}</div>
      <div class="stat-lbl">Next Doctor Visit</div><div class="stat-sub">${nextAppt ? `${displayTime(nextAppt.time)} · ${nextAppt.doctorName}` : 'No appointment scheduled'}</div>
    </div>
    <div class="stat-card" onclick="nav('careplan')">
      <span class="stat-ico">🧭</span>
      <div class="stat-val" style="color:${primaryAssessment.score < 70 ? 'var(--coral)' : primaryAssessment.score < 85 ? 'var(--amber)' : 'var(--green)'}">${primaryAssessment.score}</div>
      <div class="stat-lbl">My Health Score</div><div class="stat-sub">${primaryAssessment.visitWindow}</div>
    </div>
    <div class="stat-card" onclick="nav('residents')">
      <span class="stat-ico">💊</span>
      <div class="stat-val" style="color:var(--amber)">${given}/${total}</div>
      <div class="stat-lbl">My Medicines</div><div class="stat-sub">Doses completed today</div>
    </div>
    <div class="stat-card" onclick="nav('insurance')">
      <span class="stat-ico">🛡️</span>
      <div class="stat-val" style="color:${readiness.score >= 80 ? 'var(--green)' : readiness.score >= 60 ? 'var(--amber)' : 'var(--coral)'}">${readiness.score}%</div>
      <div class="stat-lbl">マイナンバー + Insurance</div><div class="stat-sub">Visit readiness file</div>
    </div>` : `
    <div class="stat-card" onclick="nav('residents')">
      <span class="stat-ico">👥</span>
      <div class="stat-val" style="color:var(--teal-d)">${RESIDENTS.length}</div>
      <div class="stat-lbl">Active Residents</div><div class="stat-sub">All facilities</div>
    </div>
    <div class="stat-card" onclick="nav('alerts')">
      <span class="stat-ico">🔔</span>
      <div class="stat-val" style="color:var(--coral)">${ua.length}</div>
      <div class="stat-lbl">Pending Alerts</div><div class="stat-sub">${ua.filter(a=>a.sev==='critical').length} critical</div>
    </div>
    <div class="stat-card" onclick="nav('emar')">
      <span class="stat-ico">💊</span>
      <div class="stat-val" style="color:var(--amber)">${given}/${total}</div>
      <div class="stat-lbl">Meds Given</div><div class="stat-sub">Today · all patients</div>
    </div>
    <div class="stat-card" onclick="nav('critical')">
      <span class="stat-ico">🧭</span>
      <div class="stat-val" style="color:${avgHealthScore < 70 ? 'var(--coral)' : avgHealthScore < 85 ? 'var(--amber)' : 'var(--green)'}">${avgHealthScore}</div>
      <div class="stat-lbl">Avg Health Score</div><div class="stat-sub">Across monitored residents</div>
    </div>`;
  document.getElementById('dash-alerts').innerHTML = ua.slice(0, 3).map(a => `
    <div class="alert-row alert-${a.sev==='critical'?'critical':a.sev==='warning'?'warning':'info'}">
      <div class="alert-ico">${a.sev==='critical'?'🚨':a.sev==='warning'?'⚠️':'ℹ️'}</div>
      <div class="alert-body">
        <div class="alert-title">${a.res} · ${a.room}</div>
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${fmt(a.t)}</div>
      </div>
      <button class="ack-btn" onclick="ackAlert('${a.id}');loadDash()">ACK</button>
    </div>`).join('') || `<div class="empty-state"><span class="empty-ico">✅</span><div class="empty-txt">No active alerts</div></div>`;
  const dashResidents = currentRole === 'resident' ? RESIDENTS.filter(r => r.id === 'R001') : RESIDENTS;
  const titleEl = document.getElementById('dash-residents-title');
  const btnEl = document.getElementById('dash-residents-btn');
  if (titleEl) titleEl.textContent = currentRole === 'resident' ? 'My Health Profile' : 'Residents';
  if (btnEl) btnEl.textContent = currentRole === 'resident' ? 'Open Profile' : 'View All';
  document.getElementById('dash-residents').innerHTML = dashResidents.map(r => `
    <div class="r-row" onclick="nav('residents');setTimeout(()=>viewRes('${r.id}'),80)">
      <div class="r-av" style="background:${r.color}">${r.initials}</div>
      <div style="flex:1"><div class="r-name">${r.name}</div><div class="r-meta">Room ${r.room} · Age ${r.age}</div></div>
      ${condBadge(r.condition)}<span class="r-chevron">›</span>
    </div>`).join('');
  const names = ['Tanaka','Sato','Suzuki','Watanabe','Ito'];
  const pcts = [80,67,100,67,67];
  const vals = ['4/5','2/3','1/1','2/3','2/3'];
  document.getElementById('dash-meds').innerHTML = names.map((n, i) => `
    <div class="chart-row">
      <div class="chart-lbl">${n}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pcts[i]}%;background:${pcts[i]===100?'var(--green)':'var(--amber)'}"></div></div>
      <div class="chart-val" style="color:${pcts[i]===100?'var(--green)':'var(--amber)'}">${vals[i]}</div>
    </div>`).join('');
  applyRoleAccess();
  addAudit('VIEW', 'dashboard', 'Dashboard loaded');
}

// ===== RESIDENTS =====
function loadResidents() {
  document.getElementById('res-detail').style.display = 'none';
  document.getElementById('res-list-view').style.display = '';
  if (currentRole === 'resident') {
    viewRes('R001');
    return;
  }
  renderResList();
}
function filterRes(f, el) {
  resFilter = f;
  document.querySelectorAll('#cond-filters button').forEach(b => b.className = 'btn btn-outline btn-sm');
  el.className = 'btn btn-primary btn-sm';
  renderResList();
}
function renderResList() {
  const filtered = resFilter === 'All' ? RESIDENTS : RESIDENTS.filter(r => r.condition === resFilter);
  document.getElementById('res-list').innerHTML = filtered.map(r => {
    const fall = fallRiskScore(r.id);
    return `
    <div class="card" style="cursor:pointer" onclick="viewRes('${r.id}')">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="r-av" style="background:${r.color};width:50px;height:50px;border-radius:14px;font-size:15px">${r.initials}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:16px;font-weight:900;color:var(--g800)">${r.name}</span>
            ${condBadge(r.condition)}
            <span class="badge badge-sky">${r.kaigoLevel}</span>
            <span class="badge ${fall.cls}">🦶 ${fall.label}</span>
            <span class="badge ${healthAssessment(r.id).score < 70 ? 'badge-critical' : healthAssessment(r.id).score < 85 ? 'badge-monitor' : 'badge-stable'}">Score ${healthAssessment(r.id).score}</span>
            ${unacked().find(a=>a.res===r.name)?'<span class="badge badge-critical">Alert</span>':''}
          </div>
          <div style="font-size:12px;color:var(--g500)">Room ${r.room} · Age ${r.age} · ${r.blood}</div>
          <div style="font-size:11px;color:var(--g400);margin-top:3px">${r.diagnoses[0]}${r.diagnoses.length>1?` +${r.diagnoses.length-1} more`:''}</div>
        </div>
        <span style="font-size:22px;color:var(--g300)">›</span>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><span class="empty-ico">SR</span><div class="empty-txt">No residents match filter</div></div>`;
}
function viewRes(id) {
  const r = RESIDENTS.find(x => x.id === id);
  const v = (vitalsData[id] || [])[0] || {};
  document.getElementById('res-list-view').style.display = 'none';
  const dv = document.getElementById('res-detail'); dv.style.display = '';
  const pa = unacked().filter(a => a.res === r.name).length;
  const fall = fallRiskScore(r.id);
  dv.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeResDetail()" style="margin-bottom:14px;min-height:38px;gap:4px">← Back to list</button>
    <div class="res-detail-hdr">
      <div class="res-detail-av">${r.initials}</div>
      <div>
        <div class="res-detail-name">${r.name}</div>
        <div class="res-detail-meta">Room ${r.room} · Age ${r.age} · ${r.blood} · Admitted ${r.admitted}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${condBadge(r.condition)}<span class="badge badge-sky">${r.kaigoLevel}</span><span class="badge ${fall.cls}">🦶 ${fall.label}</span>${pa?`<span class="badge badge-critical">${pa} Alert${pa>1?'s':''}</span>`:''}</div>
      </div>
    </div>
    <div class="res-actions">
      <button class="btn btn-primary btn-sm" onclick="runResidentAI('${id}')">AI Insight</button>
      <button class="btn btn-outline btn-sm" onclick="selVitals='${id}';nav('vitals')">Vitals</button>
      <button class="btn btn-outline btn-sm" onclick="selEmar='${id}';nav('emar')">eMAR</button>
      <button class="btn btn-outline btn-sm" onclick="selLabs='${id}';nav('labs')">Labs</button>
      <button class="btn btn-outline btn-sm" onclick="selTl='${id}';nav('timeline')">Timeline</button>
      <button class="btn btn-primary btn-sm" onclick="openAppointmentModal('${id}','${localAIInsight(id).urgency}','${localAIInsight(id).visitWindow.replace(/'/g, "\\'")}')">Book Appointment</button>
    </div>
    <div id="resident-ai-${id}">${residentAIHTML(id, localAIInsight(id), 'Local baseline insight')}</div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Clinical Info</div>
      <div class="info-row"><div class="info-lbl">Attending Doctor</div><div class="info-val">${r.doctor}</div></div>
      <div class="info-row"><div class="info-lbl">Primary Caregiver</div><div class="info-val">🤝 ${r.caregiver}</div></div>
      <div class="info-row"><div class="info-lbl">Diagnoses</div><div><div class="pill-wrap">${r.diagnoses.map(d=>`<span class="pill">${d}</span>`).join('')}</div></div></div>
      <div class="info-row"><div class="info-lbl">Allergies</div><div><div class="pill-wrap">${r.allergies.map(a=>`<span class="pill pill-allergy">${a.drug} (${a.severity})</span>`).join('')}</div></div></div>
    </div>
    ${v.bp_s ? `<div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Latest Vitals · ${fmt(v.t)}</div>
      <div class="vitals-grid">
        <div class="vital-box"><div class="vital-lbl">Blood Pressure</div><div class="vital-val ${v.bp_s>=140?'vital-warn':'vital-ok'}">${v.bp_s}/${v.bp_d}</div><div class="vital-unit">mmHg</div></div>
        <div class="vital-box"><div class="vital-lbl">Pulse</div><div class="vital-val ${v.pulse>100?'vital-warn':'vital-ok'}">${v.pulse}</div><div class="vital-unit">bpm</div></div>
        <div class="vital-box"><div class="vital-lbl">SpO₂</div><div class="vital-val ${v.spo2<94?'vital-crit':v.spo2<96?'vital-warn':'vital-ok'}">${v.spo2}%</div><div class="vital-unit">Oxygen</div></div>
        ${v.glucose?`<div class="vital-box"><div class="vital-lbl">Glucose</div><div class="vital-val ${v.glucose>150?'vital-warn':'vital-ok'}">${v.glucose}</div><div class="vital-unit">mg/dL</div></div>`:''}
        ${v.temp?`<div class="vital-box"><div class="vital-lbl">Temp</div><div class="vital-val ${v.temp>37.5?'vital-warn':'vital-ok'}">${v.temp}°C</div><div class="vital-unit">Celsius</div></div>`:''}
        ${v.weight?`<div class="vital-box"><div class="vital-lbl">Weight</div><div class="vital-val vital-ok">${v.weight} kg</div><div class="vital-unit">Body weight</div></div>`:''}
      </div>
    </div>` : ''}
    ${dementiaScreenHTML(id)}
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Emergency Contact</div>
      <div class="info-row"><div class="info-lbl">Name</div><div class="info-val">${r.emergency.name} (${r.emergency.relation})</div></div>
      <div class="info-row"><div class="info-lbl">Phone</div><div class="info-val">${r.emergency.phone}</div></div>
    </div>`;
  addAudit('VIEW', 'residents', r.name);
}

// ===== ALERTS =====
function loadAlerts() {
  const ua = unacked();
  document.getElementById('alerts-sub').textContent = `${ua.length} active · ${ALERTS.filter(a=>a.acked).length} acknowledged`;
  document.getElementById('sb-alert-badge').textContent = ua.length;
  document.getElementById('tb-dot').style.display = ua.length ? '' : 'none';
  document.getElementById('alerts-list').innerHTML = ALERTS.map(a => `
    <div class="alert-row alert-${a.sev==='critical'?'critical':a.sev==='warning'?'warning':'info'}" style="opacity:${a.acked?.55:1}">
      <div class="alert-ico">${a.sev==='critical'?'🚨':a.sev==='warning'?'⚠️':'ℹ️'}</div>
      <div class="alert-body">
        <div class="alert-title">${a.res} · Room ${a.room}</div>
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${fmt(a.t)} · ${a.type.toUpperCase()}</div>
      </div>
      ${!a.acked
        ? `<button class="ack-btn" onclick="ackAlert('${a.id}');loadAlerts()">ACK</button>`
        : `<span style="font-size:11px;color:var(--green);font-weight:800">✓ Acked</span>`}
    </div>`).join('');
}
function ackAlert(id) {
  const a = ALERTS.find(x => x.id === id);
  if (a) { a.acked = true; addAudit('UPDATE', 'alerts', `Acked: ${a.msg.slice(0, 50)}`); }
  document.getElementById('sb-alert-badge').textContent = unacked().length;
  toast('Alert acknowledged');
}
function ackAll() { ALERTS.forEach(a => a.acked = true); loadAlerts(); toast('All alerts acknowledged'); }

// ===== CRITICAL REVIEW =====
function loadCriticalReview() {
  const rows = RESIDENTS.map(r => {
    const insight = localAIInsight(r.id);
    const v = latestVitals(r.id);
    const activeAlerts = unacked().filter(a => a.res === r.name);
    return {r, insight, v, activeAlerts};
  }).filter(x => x.insight.riskLevel !== 'Low' || x.activeAlerts.length);

  document.getElementById('critical-content').innerHTML = `
    <div class="grid-3" style="margin-bottom:14px">
      <div class="stat-card"><span class="stat-ico">🚨</span><div class="stat-val" style="color:var(--coral)">${rows.filter(x=>x.insight.riskLevel==='High').length}</div><div class="stat-lbl">High Risk</div><div class="stat-sub">Doctor-only escalation list</div></div>
      <div class="stat-card"><span class="stat-ico">⚠️</span><div class="stat-val" style="color:var(--amber)">${rows.filter(x=>x.insight.riskLevel==='Medium').length}</div><div class="stat-lbl">Needs Review</div><div class="stat-sub">Vitals or alerts need attention</div></div>
      <div class="stat-card"><span class="stat-ico">🧠</span><div class="stat-val" style="color:var(--teal-d)">AI</div><div class="stat-lbl">Clinical Context</div><div class="stat-sub">Sensitive doctor view</div></div>
    </div>
    ${rows.map(({r, insight, v, activeAlerts}) => `
      <div class="card">
        <div class="card-hdr">
          <div class="card-ttl">${r.name} · Room ${r.room}</div>
          <span class="badge ${insight.riskLevel==='High'?'badge-critical':'badge-monitor'}">${insight.riskLevel.toUpperCase()} RISK</span>
        </div>
        <div class="vitals-grid" style="margin-bottom:12px">
          <div class="vital-box"><div class="vital-lbl">BP</div><div class="vital-val ${v.bp_s>=140?'vital-warn':'vital-ok'}">${v.bp_s || '—'}/${v.bp_d || '—'}</div><div class="vital-unit">mmHg</div></div>
          <div class="vital-box"><div class="vital-lbl">Pulse</div><div class="vital-val ${v.pulse>100?'vital-warn':'vital-ok'}">${v.pulse || '—'}</div><div class="vital-unit">bpm</div></div>
          <div class="vital-box"><div class="vital-lbl">SpO2</div><div class="vital-val ${v.spo2<94?'vital-crit':'vital-ok'}">${v.spo2 || '—'}%</div><div class="vital-unit">oxygen</div></div>
          <div class="vital-box"><div class="vital-lbl">Glucose</div><div class="vital-val ${v.glucose>180?'vital-crit':v.glucose>150?'vital-warn':'vital-ok'}">${v.glucose || '—'}</div><div class="vital-unit">mg/dL</div></div>
        </div>
        <div class="alert-row ${insight.riskLevel==='High'?'alert-critical':'alert-warning'}" style="margin-bottom:10px">
          <div class="alert-ico">✨</div>
          <div class="alert-body"><div class="alert-title">Doctor-only AI clinical note from patient history</div><div class="alert-msg">${doctorHistoryInsight(r.id)} Recommendation: ${insight.recommendation}</div></div>
        </div>
        ${activeAlerts.map(a => `<div class="alert-row alert-${a.sev==='critical'?'critical':'warning'}"><div class="alert-ico">${a.sev==='critical'?'🚨':'⚠️'}</div><div class="alert-body"><div class="alert-title">${a.type.toUpperCase()} alert</div><div class="alert-msg">${a.msg}</div><div class="alert-time">${fmt(a.t)}</div></div></div>`).join('')}
        <button class="btn btn-primary btn-sm" onclick="nav('residents');setTimeout(()=>viewRes('${r.id}'),80)">Open Resident Profile</button>
      </div>`).join('') || `<div class="empty-state"><span class="empty-ico">✅</span><div class="empty-txt">No critical residents right now</div></div>`}`;
  addAudit('VIEW', 'critical_review', 'Doctor critical review');
}

// ===== VITALS =====
function loadVitals(id) {
  selVitals = currentRole === 'resident' ? 'R001' : (id || 'R001');
  document.getElementById('vitals-chips').innerHTML = resChipsHTML(selVitals, 'loadVitals');
  const r = RESIDENTS.find(x => x.id === selVitals);
  const data = vitalsData[selVitals] || [];
  const v = data[0] || {};
  const assessment = healthAssessment(selVitals);
  const insight = localAIInsight(selVitals);
  const glData = data.filter(x => x.glucose).slice(0, 6).reverse();
  document.getElementById('vitals-content').innerHTML = `
    <div class="card">
      <div class="card-hdr"><div class="card-ttl">Current Vitals · ${r.name}</div><span class="badge ${assessment.score < 70 ? 'badge-critical' : assessment.score < 85 ? 'badge-monitor' : 'badge-stable'}">Health Score ${assessment.score}/100</span></div>
      <div style="font-size:12px;color:var(--g400);margin-top:-8px;margin-bottom:10px">${v.by ? 'By ' + v.by : ''}</div>
      ${v.bp_s ? `<div class="vitals-grid">
        <div class="vital-box"><div class="vital-lbl">Blood Pressure</div><div class="vital-val ${v.bp_s>=140?'vital-warn':'vital-ok'}">${v.bp_s}/${v.bp_d}</div><div class="vital-unit">mmHg</div></div>
        <div class="vital-box"><div class="vital-lbl">Pulse</div><div class="vital-val ${v.pulse>100?'vital-warn':'vital-ok'}">${v.pulse}</div><div class="vital-unit">bpm</div></div>
        <div class="vital-box"><div class="vital-lbl">SpO₂</div><div class="vital-val ${v.spo2<94?'vital-crit':v.spo2<96?'vital-warn':'vital-ok'}">${v.spo2}%</div><div class="vital-unit">Oxygen Sat</div></div>
        <div class="vital-box"><div class="vital-lbl">Temperature</div><div class="vital-val ${v.temp>37.5?'vital-warn':'vital-ok'}">${v.temp}°C</div><div class="vital-unit">Celsius</div></div>
        ${v.glucose?`<div class="vital-box"><div class="vital-lbl">Glucose</div><div class="vital-val ${v.glucose>150?'vital-warn':'vital-ok'}">${v.glucose}</div><div class="vital-unit">mg/dL</div></div>`:''}
        ${v.weight?`<div class="vital-box"><div class="vital-lbl">Weight</div><div class="vital-val vital-ok">${v.weight} kg</div><div class="vital-unit">Body weight</div></div>`:''}
      </div><div style="font-size:11px;color:var(--g400);margin-top:8px">${v.notes||''}</div>
      <div class="alert-row alert-info" style="margin-top:12px;margin-bottom:0">
        <div class="alert-ico">✨</div>
        <div class="alert-body">
          <div class="alert-title">AI insight · ${insight.riskLevel} risk · ${assessment.urgency} action</div>
          <div class="alert-msg">${insight.insight} <strong>Recommendation:</strong> ${insight.recommendation}</div>
          <div class="resident-ai-actions">
            ${actionListHTML([
              {icon:assessment.visitNeeded ? '📅' : '✅', title:assessment.visitNeeded ? 'Doctor visit guidance' : 'Doctor visit status', text:assessment.visitWindow},
              ...(assessment.actions || []).slice(0, 3)
            ])}
          </div>
        </div>
      </div>`
      : `<div class="empty-state"><span class="empty-ico">💓</span><div class="empty-txt">No vitals recorded today</div></div>`}
    </div>
    ${glData.length ? `<div class="card"><div class="card-hdr"><div class="card-ttl">Glucose Trend</div></div>
      ${glData.map(x=>`<div class="chart-row">
        <div class="chart-lbl">${fmt(x.t).split(' ').slice(0,2).join(' ')}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min((x.glucose/200)*100,100)}%;background:${x.glucose>150?'var(--amber)':'var(--teal)'}"></div></div>
        <div class="chart-val" style="color:${x.glucose>150?'var(--amber)':'var(--teal)'}">${x.glucose}</div>
      </div>`).join('')}</div>` : ''}
    <div class="card"><div class="card-hdr"><div class="card-ttl">Vitals History</div></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Date/Time</th><th>BP</th><th>Pulse</th><th>SpO₂</th><th>Temp</th><th>Glucose</th><th>By</th></tr></thead>
        <tbody>${data.map(x=>`<tr>
          <td style="font-family:var(--mono);font-size:11px">${fmt(x.t)}</td>
          <td style="font-weight:800;color:${x.bp_s>=140?'var(--amber)':'var(--g700)'}">${x.bp_s}/${x.bp_d}</td>
          <td>${x.pulse}</td>
          <td style="color:${x.spo2<94?'var(--coral)':'var(--green)'}"><strong>${x.spo2}%</strong></td>
          <td>${x.temp}°C</td>
          <td style="color:${x.glucose&&x.glucose>150?'var(--amber)':'var(--g700)'}">${x.glucose||'—'}</td>
          <td style="font-size:11px;color:var(--g400)">${x.by}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  addAudit('VIEW', 'vitals', r.name);
}
function saveVitals() {
  const bp = document.getElementById('v-bp').value;
  const pulse = parseInt(document.getElementById('v-pulse').value);
  if (!bp || !pulse) { toast('BP and pulse are required', 'error'); return; }
  const [s, d] = bp.split('/').map(Number);
  const glucose = parseInt(document.getElementById('v-glucose').value) || null;
  const nv = {
    t: new Date().toISOString(), bp_s:s, bp_d:d, pulse,
    spo2: parseFloat(document.getElementById('v-spo2').value) || null,
    temp: parseFloat(document.getElementById('v-temp').value) || null,
    glucose, weight: parseFloat(document.getElementById('v-weight').value) || null,
    by: currentRole === 'resident' ? 'Patient / Family' : '山本 花子', notes: document.getElementById('v-notes').value
  };
  if (!vitalsData[selVitals]) vitalsData[selVitals] = [];
  vitalsData[selVitals].unshift(nv);
  const aiPreview = localAIInsight(selVitals);
  nv.ai = {
    riskLevel:aiPreview.riskLevel,
    insight:aiPreview.insight,
    recommendation:aiPreview.recommendation,
    score:aiPreview.score,
    visitWindow:aiPreview.visitWindow,
    actions:aiPreview.actions
  };
  let triggered = 0;
  const r = RESIDENTS.find(x => x.id === selVitals);
  if (s >= 160) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'critical',msg:`BP ${bp} — CRITICAL hypertension`,acked:false,t:new Date().toISOString()}); triggered++; }
  else if (s >= 140) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'warning',msg:`BP ${bp} — elevated`,acked:false,t:new Date().toISOString()}); triggered++; }
  if (glucose >= 200) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'critical',msg:`Glucose ${glucose} mg/dL — critical`,acked:false,t:new Date().toISOString()}); triggered++; }
  else if (glucose > 180) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'warning',msg:`Glucose ${glucose} mg/dL — diabetes control review`,acked:false,t:new Date().toISOString()}); triggered++; }
  if (nv.spo2 && nv.spo2 < 92) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'critical',msg:`SpO₂ ${nv.spo2}% — respiratory risk`,acked:false,t:new Date().toISOString()}); triggered++; }
  if (pulse < 55 || pulse > 105) { ALERTS.unshift({id:'A'+Date.now(),res:r.name,room:r.room,type:'vital',sev:'warning',msg:`Pulse ${pulse} bpm — abnormal heart rate`,acked:false,t:new Date().toISOString()}); triggered++; }
  document.getElementById('vform').classList.remove('open');
  ['v-bp','v-pulse','v-spo2','v-temp','v-glucose','v-weight','v-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  loadVitals(selVitals);
  toast(triggered ? `Vitals saved · ${triggered} alert(s) triggered` : 'Vitals saved successfully', triggered ? 'warning' : 'success');
  addAudit('CREATE', 'vitals', `Recorded for ${r.name}`);
}

// ===== eMAR =====
function loadEmar(id) {
  selEmar = id || 'R001';
  document.getElementById('emar-chips').innerHTML = resChipsHTML(selEmar, 'loadEmar');
  const r = RESIDENTS.find(x => x.id === selEmar);
  const meds = medsData[selEmar] || [];
  let given = 0, total = 0;
  meds.forEach(m => { total += m.times.length; given += m.times.filter(t => t.status === 'given').length; });
  const alg = r.allergies.map(a => a.drug.toLowerCase());
  document.getElementById('emar-content').innerHTML = `
    ${r.allergies.length ? `<div class="alert-row alert-critical" style="margin-bottom:14px">
      <div class="alert-ico">🚨</div>
      <div class="alert-body"><div class="alert-title">Allergy Alert — ${r.name}</div>
      <div class="alert-msg">${r.allergies.map(a=>`${a.drug} (${a.severity})`).join(' · ')}</div></div>
    </div>` : ''}
    <div class="card">
      <div class="card-hdr">
        <div class="card-ttl">💊 ${r.name} · Medication Schedule</div>
        <div style="font-size:13px;font-weight:800;color:${given===total?'var(--green)':'var(--amber)'}">${given}/${total} given</div>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${total?Math.round(given/total*100):0}%;background:${given===total?'var(--green)':'var(--amber)'}"></div></div>
      <div style="margin-top:14px">
        ${meds.map(m => {
          const conflict = alg.some(a => m.name.toLowerCase().includes(a));
          return `<div class="med-row">
            <div class="med-name">${m.name}${conflict?` <span style="color:var(--coral);font-size:10px;font-weight:900">⚠ ALLERGY RISK</span>`:''}</div>
            <div class="med-detail">${m.route} · ${m.freq} · ${m.indication}</div>
            <div class="med-detail">Rx: ${m.by}</div>
            <div class="med-chips">${m.times.map(dose=>`
              <span class="dose-chip ${dose.status}" onclick="adminDose('${selEmar}','${m.id}','${dose.id}',this,'${dose.status}')">
                ${dose.status==='given'?'✓ '+dose.t+' given':dose.status==='overdue'?'⚠ '+dose.t+' overdue':'⏰ '+dose.t+' pending'}
              </span>`).join('')}
            </div>
          </div>`;
        }).join('')}
        ${!meds.length ? `<div class="empty-state"><span class="empty-ico">💊</span><div class="empty-txt">No medications on file</div></div>` : ''}
      </div>
    </div>`;
  addAudit('VIEW', 'emar', r.name);
}
function adminDose(resId, medId, doseId, el, status) {
  if (status === 'given') return;
  const med = medsData[resId].find(m => m.id === medId);
  const dose = med.times.find(t => t.id === doseId);
  if (dose) { dose.status = 'given'; dose.adm = '山本 花子'; }
  el.className = 'dose-chip given';
  el.textContent = '✓ ' + dose.t + ' given';
  addAudit('UPDATE', 'emar', `${med.name} administered for ${RESIDENTS.find(r=>r.id===resId).name}`);
  toast('Dose recorded — eMAR updated');
}

// ===== NOTES =====
function loadNotes() {
  const data = notesData['R001'] || [];
  document.getElementById('notes-list').innerHTML = data.map(n => `
    <div class="note-card ${n.role==='Doctor'?'doctor':''}">
      <div class="note-meta">
        <div>
          <div class="note-author">${n.author} <span class="note-role">(${n.role})</span></div>
          <div style="font-size:10px;color:var(--teal-d);font-weight:700;margin-top:2px">${n.shift} Shift</div>
        </div>
        <div class="note-time">${fmt(n.t)}</div>
      </div>
      <div class="note-body">${n.note}</div>
      ${n.tasks && n.tasks.length ? `<div class="note-tasks">⏰ ${n.tasks.map(t=>`<span class="task-chip">${t}</span>`).join('')}</div>` : ''}
    </div>`).join('') || `<div class="empty-state"><span class="empty-ico">📝</span><div class="empty-txt">No notes yet</div></div>`;
}
function saveNote() {
  const note = document.getElementById('n-note').value.trim();
  if (!note) { toast('Please enter a note', 'error'); return; }
  const tasks = document.getElementById('n-tasks').value.split(',').map(t => t.trim()).filter(Boolean);
  const nn = {shift: document.getElementById('n-shift').value, date:'2026-04-13', author:'山本 花子', role:'Doctor', note, tasks, t: new Date().toISOString()};
  if (!notesData['R001']) notesData['R001'] = [];
  notesData['R001'].unshift(nn);
  addAudit('CREATE', 'shift_notes', `${nn.shift} note by ${nn.author}`);
  document.getElementById('n-note').value = '';
  document.getElementById('n-tasks').value = '';
  document.getElementById('nform').classList.remove('open');
  loadNotes();
  toast('Shift note saved');
}

// ===== LABS =====
function loadLabs(id) {
  selLabs = id || 'R001';
  document.getElementById('labs-chips').innerHTML = resChipsHTML(selLabs, 'loadLabs');
  const r = RESIDENTS.find(x => x.id === selLabs);
  const data = labsData[selLabs] || [];
  const abnormal = data.filter(l => l.status !== 'normal');
  document.getElementById('labs-content').innerHTML = `
    ${abnormal.length ? `<div class="alert-row alert-warning" style="margin-bottom:14px">
      <div class="alert-ico">⚠️</div>
      <div class="alert-body">
        <div class="alert-title">${abnormal.length} Abnormal Result${abnormal.length>1?'s':''}</div>
        <div class="alert-msg">${abnormal.map(l=>`${l.test}: ${l.result} ${l.unit}`).join(' · ')}</div>
      </div>
    </div>` : ''}
    <div class="card">
      <div class="card-hdr">
        <div class="card-ttl">🔬 ${r.name} · Lab Results</div>
        <button class="btn btn-outline btn-sm" onclick="toggleForm('lform')">+ Add</button>
      </div>
      <div class="form-section" id="lform">
        <div class="form-grid">
          <div class="form-group"><label>Test Name</label><input id="lab-test" placeholder="HbA1c"/></div>
          <div class="form-group"><label>Result</label><input id="lab-result" placeholder="7.8"/></div>
          <div class="form-group"><label>Unit</label><input id="lab-unit" placeholder="%"/></div>
          <div class="form-group"><label>Reference Range</label><input id="lab-ref" placeholder="< 7.0"/></div>
          <div class="form-group"><label>Status</label><select id="lab-status"><option>normal</option><option>high</option><option>low</option></select></div>
          <div class="form-group"><label>Date</label><input id="lab-date" type="date" value="2026-04-13"/></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="saveLabResult()">💾 Save</button>
          <button class="btn btn-outline" onclick="toggleForm('lform')">Cancel</button>
        </div>
      </div>
      ${data.map(l => `<div class="lab-row">
        <div class="lab-test">${l.test}</div>
        <div class="lab-val" style="color:${l.status==='high'?'var(--coral)':l.status==='low'?'var(--sky)':'var(--green)'}">${l.result} ${l.unit}</div>
        <div class="lab-ref">Ref: ${l.ref}</div>
        ${labBadge(l.status)}
        <div style="font-size:10px;color:var(--g400);margin-left:auto;font-family:var(--mono)">${l.date}</div>
      </div>`).join('')}
      ${!data.length ? `<div class="empty-state"><span class="empty-ico">🔬</span><div class="empty-txt">No lab results on file</div></div>` : ''}
    </div>`;
  addAudit('VIEW', 'labs', r.name);
}
function saveLabResult() {
  const test = document.getElementById('lab-test').value;
  const result = document.getElementById('lab-result').value;
  const status = document.getElementById('lab-status').value;
  if (!test || !result) { toast('Test name and result are required', 'error'); return; }
  const nl = {id:'L'+Date.now(), test, result, unit:document.getElementById('lab-unit').value, ref:document.getElementById('lab-ref').value, status, date:document.getElementById('lab-date').value, by:'山本 花子'};
  if (!labsData[selLabs]) labsData[selLabs] = [];
  labsData[selLabs].unshift(nl);
  if (status !== 'normal') {
    const r = RESIDENTS.find(x => x.id === selLabs);
    ALERTS.unshift({id:'A'+Date.now(), res:r.name, room:r.room, type:'lab', sev:'warning', msg:`Lab: ${test} ${result} — ${status}`, acked:false, t:new Date().toISOString()});
  }
  addAudit('CREATE', 'labs', `${test} for ${RESIDENTS.find(r=>r.id===selLabs).name}`);
  loadLabs(selLabs);
  toast('Lab result saved' + (status !== 'normal' ? ' — alert triggered' : ''));
}

// ===== TIMELINE =====
function loadTimeline(id) {
  selTl = id || 'R001';
  document.getElementById('tl-chips').innerHTML = resChipsHTML(selTl, 'loadTimeline');
  const r = RESIDENTS.find(x => x.id === selTl);
  const events = [];
  (vitalsData[selTl] || []).forEach(v => events.push({icon:'💓', t:v.t, title:'Vitals Recorded', body:`BP ${v.bp_s}/${v.bp_d} · Pulse ${v.pulse} · SpO₂ ${v.spo2}%${v.glucose?' · Glucose '+v.glucose+' mg/dL':''}${v.ai?`<div class="tl-card timeline-ai" style="margin:10px 0 0"><div class="tl-title">✨ AI Insight · ${v.ai.riskLevel} Risk${v.ai.score ? ' · Score ' + v.ai.score : ''}</div><div class="tl-body">${v.ai.insight}<br><strong>Recommendation:</strong> ${v.ai.recommendation}${v.ai.visitWindow ? '<br><strong>Doctor visit:</strong> ' + v.ai.visitWindow : ''}</div></div>`:''}`, color:'#00897B', by:v.by}));
  (notesData[selTl] || []).forEach(n => events.push({icon:n.role==='Doctor'?'👨‍⚕️':'📝', t:n.t, title:`${n.role} Note — ${n.shift} Shift`, body:n.note, color:n.role==='Doctor'?'#2E7D32':'#00897B', by:n.author}));
  (labsData[selTl] || []).forEach(l => events.push({icon:'🔬', t:l.date+'T12:00:00', title:`Lab: ${l.test}`, body:`${l.result} ${l.unit} (Ref: ${l.ref}) — ${l.status}`, color:l.status==='normal'?'#2E7D32':'#E53935', by:l.by}));
  events.sort((a, b) => new Date(b.t) - new Date(a.t));
  document.getElementById('tl-content').innerHTML = `<div class="card">
    <div class="card-hdr"><div class="card-ttl">Clinical Timeline · ${r.name}</div><span style="font-size:12px;color:var(--g400)">${events.length} events</span></div>
    ${events.slice(0, 20).map((e, i) => `
      <div class="tl-item">
        <div class="tl-left">
          <div class="tl-dot" style="background:${e.color}"></div>
          ${i < events.length - 1 ? '<div class="tl-line"></div>' : ''}
        </div>
        <div class="tl-card">
          <div class="tl-hdr">
            <div class="tl-icon">${e.icon}</div>
            <div><div class="tl-title">${e.title}</div><div class="tl-time">${fmt(e.t)} · ${e.by}</div></div>
          </div>
          <div class="tl-body">${e.body}</div>
        </div>
      </div>`).join('')}
    ${!events.length ? `<div class="empty-state"><span class="empty-ico">📈</span><div class="empty-txt">No events recorded</div></div>` : ''}
  </div>`;
  addAudit('VIEW', 'timeline', r.name);
}

// ===== CARE PLAN =====
function loadCarePlan() {
  selCare = currentRole === 'resident' ? 'R001' : (selCare || 'R001');
  const r = RESIDENTS.find(x => x.id === selCare);
  const activeMeds = medsData[selCare] || [];
  const prescriptions = prescriptionsData.filter(p => p.resId === selCare);
  document.getElementById('careplan-content').innerHTML = `
    <div class="res-chips" data-roles="doctor">${resChipsHTML(selCare, 'loadCarePlanFor')}</div>
    <div class="card" data-roles="doctor">
      <div class="card-hdr"><div><div class="card-ttl">Write Doctor Prescription · ${r.name}</div><div class="page-sub">Medicines, dietary plan, activity plan, and follow-up are sent to the selected patient dashboard.</div></div><button class="btn btn-primary btn-sm" onclick="toggleForm('care-rx-form')">+ New Prescription</button></div>
      <div class="form-section" id="care-rx-form">
        <div class="form-grid">
          <div class="form-group"><label>Medicines</label><textarea id="care-rx-meds" placeholder="Metformin 500mg | 1 tablet | Twice daily | 30 days"></textarea></div>
          <div class="form-group"><label>Dietary Plan</label><textarea id="care-rx-diet" placeholder="Low sugar, low salt, high fibre meals. Avoid refined carbohydrates."></textarea></div>
          <div class="form-group"><label>Activity / Therapy</label><textarea id="care-rx-activity" placeholder="15 minute walk after lunch. Physiotherapy Mon/Wed/Fri."></textarea></div>
          <div class="form-group"><label>Follow-up / Instructions</label><textarea id="care-rx-followup" placeholder="Review glucose log in 2 weeks. Return earlier if dizziness or breathlessness."></textarea></div>
        </div>
        <div class="card" style="padding:14px;margin-top:12px">
          <div class="card-hdr" style="margin-bottom:8px"><div><div class="card-ttl">Voice Prescription</div><div class="page-sub">Speak medicines, diet, activity, and follow-up. The transcript can fill the prescription form.</div></div><span class="badge badge-teal" id="care-voice-status">Ready</span></div>
          <div class="form-group"><label>Voice Transcript</label><textarea id="care-rx-voice" placeholder="Example: Medicine Metformin 500mg one tablet twice daily for 30 days. Diet low sugar low salt. Activity walk 15 minutes daily. Follow up after 2 weeks."></textarea></div>
          <div class="form-actions"><button class="btn btn-primary btn-sm" onclick="startCareVoice()">Record Voice</button><button class="btn btn-outline btn-sm" onclick="stopCareVoice()">Stop</button><button class="btn btn-outline btn-sm" onclick="applyCareVoiceTranscript()">Use Transcript</button></div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" onclick="saveCarePrescription()">Send to Patient</button><button class="btn btn-outline" onclick="toggleForm('care-rx-form')">Cancel</button></div>
      </div>
    </div>
    <div class="card">
      <div class="card-hdr"><div><div class="card-ttl">Doctor Prescription · ${r.name}</div><div class="page-sub">Attending doctor: ${r.doctor}</div></div><span class="badge badge-teal">Patient visible</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${activeMeds.map(m=>`<tr><td>${m.name}</td><td>${m.route || 'Oral'}</td><td>${m.freq}</td><td>${m.indication || 'As advised'}</td></tr>`).join('') || '<tr><td colspan="4">No active medicines</td></tr>'}</tbody></table></div>
    </div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Treatment Goals</div>
      ${['Reduce HbA1c below 7.0%','Maintain BP below 130/80 mmHg','Continue physiotherapy for arthritis 3× per week','Monitor glucose twice daily','Improve dietary compliance — low-carb, low-salt'].map(g=>`
        <div class="goal-item"><div class="goal-check">✓</div><span style="font-size:13px;color:var(--g700)">${g}</span></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-ttl" style="margin-bottom:10px">Dietary Plan</div>
        <div style="font-size:13px;line-height:1.8;color:var(--g700)">Low-carbohydrate diabetic diet. Avoid refined sugar and white rice. 1.5L fluid intake daily. High-fibre breakfast. Low-salt meals for BP management.</div>
      </div>
      <div class="card">
        <div class="card-ttl" style="margin-bottom:10px">Activity / Therapy Plan</div>
        <div style="font-size:13px;line-height:1.8;color:var(--g700)">Physiotherapy 3× per week — Mon, Wed, Fri. Daily 15-min walk post-lunch. Range-of-motion exercises for knees. No high-impact activity.</div>
      </div>
    </div>
    <div class="card">
      <div class="card-hdr"><div class="card-ttl">Recent Prescriptions Sent by Doctor</div><span class="badge badge-gray">${prescriptions.length} record${prescriptions.length===1?'':'s'}</span></div>
      ${prescriptions.map(p=>`<div class="list-item"><strong>${p.date} · ${p.doctor}</strong><span>${(p.meds || []).map(m=>`${m.name || m.drug} ${m.dose || ''} ${m.frequency || ''}`).join('; ') || 'Care plan update'}${p.rx?.diet ? '<br><b>Diet:</b> ' + p.rx.diet : ''}${p.rx?.activity ? '<br><b>Activity:</b> ' + p.rx.activity : ''}${p.rx?.followUp ? '<br><b>Follow-up:</b> ' + p.rx.followUp : ''}</span></div>`).join('') || '<div class="empty-state"><span class="empty-ico">RX</span><div class="empty-txt">No doctor prescriptions sent yet</div></div>'}
    </div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">🏥 Diagnoses & Allergies</div>
      <div style="font-size:11px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">Diagnoses</div>
      <div class="pill-wrap" style="margin-bottom:12px">${r.diagnoses.map(d=>`<span class="pill">${d}</span>`).join('')}</div>
      <div style="font-size:11px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">Allergies</div>
      <div class="pill-wrap">${r.allergies.map(a=>`<span class="pill pill-allergy">⚠ ${a.drug} (${a.severity})</span>`).join('')}</div>
    </div>
    <div class="card" style="background:linear-gradient(135deg,#FFFFFF,#EAF8F5);border-color:var(--border-accent)">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">NEXT REVIEW</div>
      <div style="font-size:22px;font-weight:900">Next doctor review</div>
      <div style="font-size:13px;color:var(--text-sub);margin-top:4px">Attending: ${r.doctor} · Room ${r.room}</div>
    </div>`;
  applyRoleAccess();
}
function loadCarePlanFor(id) {
  selCare = currentRole === 'resident' ? 'R001' : id;
  loadCarePlan();
}
function parseCareMedLine(line) {
  const parts = line.split('|').map(x => x.trim());
  return {name:parts[0] || line.trim(), dose:parts[1] || '', frequency:parts[2] || '', duration:parts[3] || ''};
}
let careVoiceRecognition = null;
function setCareVoiceStatus(text) {
  const el = document.getElementById('care-voice-status');
  if (el) el.textContent = text;
}
function startCareVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const transcript = document.getElementById('care-rx-voice');
  if (!transcript) return;
  if (!SpeechRecognition) {
    transcript.focus();
    setCareVoiceStatus('Type fallback');
    toast('Voice recognition is not available in this browser. Type transcript here.', 'warning');
    return;
  }
  careVoiceRecognition = new SpeechRecognition();
  careVoiceRecognition.continuous = true;
  careVoiceRecognition.interimResults = true;
  careVoiceRecognition.lang = 'ja-JP';
  let finalText = transcript.value ? transcript.value + ' ' : '';
  careVoiceRecognition.onresult = event => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const phrase = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += phrase + ' ';
      else interim += phrase;
    }
    transcript.value = (finalText + interim).trim();
  };
  careVoiceRecognition.onerror = () => {
    setCareVoiceStatus('Type fallback');
    toast('Voice capture stopped. You can edit the transcript manually.', 'warning');
  };
  careVoiceRecognition.onend = () => setCareVoiceStatus('Stopped');
  careVoiceRecognition.start();
  setCareVoiceStatus('Recording');
  toast('Recording doctor prescription');
}
function stopCareVoice() {
  if (careVoiceRecognition) careVoiceRecognition.stop();
  setCareVoiceStatus('Stopped');
}
function extractSection(text, labels, stopLabels) {
  const allStops = stopLabels.join('|');
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\b(?:${allStops})\\b\\s*[:\\-]?|$)`, 'i');
    const match = text.match(re);
    if (match && match[1].trim()) return match[1].trim().replace(/[.;]\s*$/, '');
  }
  return '';
}
function applyCareVoiceTranscript() {
  const text = (document.getElementById('care-rx-voice')?.value || '').trim();
  if (!text) { toast('Record or type a transcript first', 'error'); return; }
  const stops = ['medicine','medicines','medication','diet','dietary','activity','therapy','exercise','follow up','follow-up','instructions'];
  const meds = extractSection(text, ['medicine','medicines','medication'], stops) || text.split(/diet|dietary|activity|therapy|exercise|follow up|follow-up|instructions/i)[0].trim();
  const diet = extractSection(text, ['diet','dietary'], stops);
  const activity = extractSection(text, ['activity','therapy','exercise'], stops);
  const follow = extractSection(text, ['follow up','follow-up','instructions'], stops);
  if (meds) document.getElementById('care-rx-meds').value = meds.split(/\band\b|,|;/i).map(x => x.trim()).filter(Boolean).join('\n');
  if (diet) document.getElementById('care-rx-diet').value = diet;
  if (activity) document.getElementById('care-rx-activity').value = activity;
  if (follow) document.getElementById('care-rx-followup').value = follow;
  setCareVoiceStatus('Applied');
  toast('Voice transcript added to prescription');
}
function saveCarePrescription() {
  const resId = selCare || 'R001';
  const meds = (document.getElementById('care-rx-meds').value || '').split('\n').map(x => x.trim()).filter(Boolean).map(parseCareMedLine);
  const diet = document.getElementById('care-rx-diet').value.trim();
  const activity = document.getElementById('care-rx-activity').value.trim();
  const followUp = document.getElementById('care-rx-followup').value.trim();
  if (!meds.length && !diet && !activity && !followUp) { toast('Add medicines or plan instructions first', 'error'); return; }
  const rx = {chiefComplaint:'Doctor care plan prescription',diagnosis:'Care plan update',medications:meds,diet,activity,followUp};
  prescriptionsData.unshift({id:'RX-'+Date.now(),resId,date:todayISO(),doctor:'山本 花子',meds,rx});
  if (!medsData[resId]) medsData[resId] = [];
  meds.forEach(m => {
    if (!m.name) return;
    medsData[resId].unshift({id:'M'+Date.now()+Math.floor(Math.random()*1000),name:m.name,route:'Oral',freq:m.frequency || m.dose || 'As advised',indication:m.duration || 'Doctor prescription',by:'山本 花子',times:[{id:'E'+Date.now()+Math.floor(Math.random()*1000),t:'08:00',status:'pending'}]});
  });
  if (!notesData[resId]) notesData[resId] = [];
  notesData[resId].unshift({shift:'Doctor',date:todayISO(),author:'山本 花子',role:'Doctor',note:'Prescription sent to patient: ' + rxText(resId, rx),tasks:[diet, activity, followUp].filter(Boolean),t:new Date().toISOString(),type:'Prescription'});
  saveStore('ehmr_prescriptions', prescriptionsData);
  addAudit('CREATE','care_prescription',`${patientName(resId)} prescription sent`);
  loadCarePlan();
  toast('Prescription sent to patient dashboard');
}

// ===== APPOINTMENTS =====
function appointmentStatus(appt) {
  if (appt.status && appt.status !== 'Scheduled') return appt.status;
  return new Date(`${appt.date}T${appt.time || '00:00'}:00`) < new Date() ? 'Completed' : 'Scheduled';
}
function apptRiskBadge(appt) {
  const risk = appt.risk || localAIInsight(appt.patientId || 'R001').riskLevel;
  const cls = risk === 'High' ? 'badge-critical' : risk === 'Medium' ? 'badge-monitor' : 'badge-stable';
  return `<span class="badge ${cls}">${risk} Risk</span>`;
}
function appointmentCard(appt) {
  const date = new Date(appt.date + 'T00:00:00');
  const month = date.toLocaleDateString('ja-JP', {month:'short'});
  const day = date.toLocaleDateString('ja-JP', {day:'2-digit'});
  const status = appointmentStatus(appt);
  return `<div class="appt-card">
    <div class="appt-datebox"><strong>${day}</strong><span>${month}</span></div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-size:14px;font-weight:900;color:var(--g800)">${patientName(appt.patientId)}</div>
        ${statusBadge(status)}
        ${apptRiskBadge(appt)}
      </div>
      <div class="appt-meta">${appt.doctorName} · ${displayDate(appt.date)} at ${displayTime(appt.time)}</div>
      <div style="font-size:12px;color:var(--g600);margin-top:5px">${appt.reason || 'Doctor review'}</div>
    </div>
  </div>`;
}
function calendarHTML(appts) {
  const days = Array.from({length:14}, (_, i) => todayISO(i));
  return `<div class="appt-calendar">${days.map(day => {
    const dayAppts = appts.filter(a => a.date === day && appointmentStatus(a) === 'Scheduled');
    return `<div class="cal-day ${dayAppts.length ? 'has-appt' : ''}">
      <div class="cal-date">${new Date(day + 'T00:00:00').toLocaleDateString('ja-JP', {day:'2-digit',month:'short'})}</div>
      ${dayAppts.slice(0, 2).map(a => `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span class="cal-dot"></span>${displayTime(a.time)} ${patientName(a.patientId).split(' ')[0]}</div>`).join('')}
      ${dayAppts.length > 2 ? `<div>+${dayAppts.length - 2} more</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
async function loadAppts() {
  const insight = localAIInsight('R001');
  document.getElementById('appt-content').innerHTML = `<div class="card"><div class="resident-ai-loading">Loading schedule...</div></div>`;
  await fetchAppointments();
  const scoped = currentRole === 'resident' ? appointmentsData.filter(a => a.patientId === 'R001') : appointmentsData;
  const upcoming = scoped.filter(a => appointmentStatus(a) === 'Scheduled').sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const past = scoped.filter(a => appointmentStatus(a) !== 'Scheduled').sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  const highRisk = upcoming.filter(a => (a.risk || localAIInsight(a.patientId).riskLevel) === 'High').length;
  document.getElementById('appt-content').innerHTML = `
  <div class="alert-row ${insight.riskLevel==='High'?'alert-critical':insight.riskLevel==='Medium'?'alert-warning':'alert-info'}" style="margin-bottom:14px">
    <div class="alert-ico">✨</div>
    <div class="alert-body">
      <div class="alert-title" id="visit-ai-title">AI Suggested Visit · ${insight.riskLevel} risk</div>
      <div class="alert-msg" id="visit-ai-msg">${insight.recommendation}</div>
    </div>
    <div class="appt-toolbar">
      <button class="ack-btn" onclick="runVisitSuggestion()">REFRESH AI</button>
      <button class="ack-btn" onclick="openAppointmentModal('R001','${insight.urgency}','${insight.visitWindow.replace(/'/g, "\\'")}')">BOOK</button>
    </div>
  </div>
  <div class="grid-4" style="margin-bottom:14px">
    <div class="stat-card"><span class="stat-ico">📅</span><div class="stat-val" style="color:var(--teal-d)">${upcoming.length}</div><div class="stat-lbl">Upcoming</div><div class="stat-sub">Scheduled visits</div></div>
    <div class="stat-card"><span class="stat-ico">✓</span><div class="stat-val" style="color:var(--green)">${past.filter(a=>appointmentStatus(a)==='Completed').length}</div><div class="stat-lbl">Completed</div><div class="stat-sub">Past doctor visits</div></div>
    <div class="stat-card"><span class="stat-ico">!</span><div class="stat-val" style="color:var(--coral)">${past.filter(a=>appointmentStatus(a)==='Missed').length}</div><div class="stat-lbl">Missed</div><div class="stat-sub">Needs follow-up</div></div>
    <div class="stat-card"><span class="stat-ico">⚕</span><div class="stat-val" style="color:${highRisk ? 'var(--coral)' : 'var(--green)'}">${highRisk}</div><div class="stat-lbl">High-Risk Slots</div><div class="stat-sub">Highlighted by AI</div></div>
  </div>
  <div class="appt-layout">
    <div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">Upcoming Appointments</div><button class="btn btn-primary btn-sm" onclick="openAppointmentModal()">+ Book</button></div>
        <div class="appt-list">${upcoming.map(appointmentCard).join('') || `<div class="empty-state"><span class="empty-ico">📅</span><div class="empty-txt">No upcoming appointments</div></div>`}</div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">Past Appointments</div><span class="badge badge-gray">${past.length} records</span></div>
        <div class="appt-list">${past.map(appointmentCard).join('') || `<div class="empty-state"><span class="empty-ico">✓</span><div class="empty-txt">No past appointments</div></div>`}</div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">14-Day Calendar</div><span class="badge badge-teal">List + grid</span></div>
        ${calendarHTML(scoped)}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">Doctor Availability</div></div>
        ${DOCTORS.map(d => `<div class="info-row"><div class="info-lbl">${d.name.replace('Dr. ','')}</div><div class="info-val">${d.specialty}<br><span style="font-size:12px;color:var(--g500)">${displayTime(d.start)} to ${displayTime(d.end)} · Break ${d.breaks.map(b=>displayTime(b.start)+'-'+displayTime(b.end)).join(', ')}</span></div></div>`).join('')}
      </div>
    </div>
  </div>`;
  addAudit('VIEW', 'appointments', 'Schedule dashboard loaded');
}
async function runVisitSuggestion() {
  const title = document.getElementById('visit-ai-title');
  const msg = document.getElementById('visit-ai-msg');
  if (!title || !msg) return;
  const base = localAIInsight('R001');
  title.textContent = 'AI Suggested Visit · analyzing';
  msg.textContent = 'Checking latest vitals trend and resident history with Groq...';
  try {
    const ai = await requestGroqInsight('R001');
    const result = ai ? {...base, ...ai, riskLevel:normalizeRisk(ai.riskLevel || ai.risk)} : base;
    title.textContent = `AI Suggested Visit · ${result.riskLevel} risk`;
    msg.textContent = result.riskLevel === 'High'
      ? 'Priority visit recommended within 24 to 48 hours. ' + result.recommendation
      : result.recommendation;
    bookingContext = {patientId:'R001', urgency:result.urgency || 'Priority', reason:result.visitWindow || result.recommendation};
    toast('Doctor visit suggestion refreshed');
  } catch (e) {
    console.warn(e);
    title.textContent = `AI Suggested Visit · ${base.riskLevel} risk`;
    msg.textContent = base.recommendation;
    toast('Using local visit suggestion. Start server.js for Groq.', 'warning');
  }
}
// ===== INSURANCE + マイナンバー =====
function loadInsurance() {
  const readiness = coverageReadiness('R001');
  const resident = RESIDENTS.find(r => r.id === 'R001');
  document.getElementById('insurance-content').innerHTML = `
    <div class="ins-policy-grid">
      <div class="card">
        <div class="card-ttl" style="margin-bottom:12px">🛡️ 介護保険 (Kaigo Hoken)</div>
        <div class="info-row"><div class="info-lbl">Level</div><div class="info-val">介護保険 Level 2 (${resident.kaigoLevel})</div></div>
        <div class="info-row"><div class="info-lbl">Benefit Limit</div><div class="info-val">¥8,000,000 annual care benefit ceiling</div></div>
        <div class="info-row"><div class="info-lbl">Renewal Date</div><div class="info-val">${displayDate(resident.kaigoExpiry)}</div></div>
      </div>
      <div class="card">
        <div class="card-ttl" style="margin-bottom:12px">🪪 マイナンバー健康保険証</div>
        <div class="info-row"><div class="info-lbl">My Number Card</div><div class="info-val">123456789012</div></div>
        <div class="info-row"><div class="info-lbl">NHI Number</div><div class="info-val">NHI-JP-2026-4421</div></div>
        <div class="info-row"><div class="info-lbl">Records</div><div class="info-val">27 prescriptions · 8 lab reports · 5 summaries</div></div>
      </div>
      <div class="card">
        <div class="card-ttl" style="margin-bottom:12px">🏥 後期高齢者医療制度</div>
        <div class="info-row"><div class="info-lbl">System</div><div class="info-val">Medical system for 75+ citizens</div></div>
        <div class="info-row"><div class="info-lbl">介護給付 (Kaigo Kyufu)</div><div class="info-val">Long-Term Care Benefit</div></div>
        <div class="info-row"><div class="info-lbl">Status</div><div class="info-val">Linked with care facility records</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-hdr"><div class="card-ttl">✨ AI Coverage Readiness</div><span class="badge ${readiness.score >= 80 ? 'badge-stable' : readiness.score >= 60 ? 'badge-monitor' : 'badge-critical'}">${readiness.score}% READY</span></div>
      <div class="alert-row alert-info" style="margin-bottom:0">
        <div class="alert-ico">ℹ️</div>
        <div class="alert-body">
          <div class="alert-title" id="coverage-title">${readiness.title}</div>
          <div class="alert-msg" id="coverage-msg">${readiness.message}</div>
        </div>
      </div>
      <div class="prog-bar"><div class="prog-fill" id="coverage-progress" style="width:${readiness.score}%;background:${readiness.score >= 80 ? 'var(--green)' : readiness.score >= 60 ? 'var(--amber)' : 'var(--coral)'}"></div></div>
      <div id="coverage-checklist" class="item-list" style="margin-top:12px">
        ${readiness.items.map(i => `<div class="list-item"><strong>${i.ok ? '✓' : '•'} ${i.label}</strong><span>${i.detail}</span></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="runCoverageReadiness()">Refresh Readiness</button>
    </div>`;
  addAudit('VIEW', 'insurance', '介護保険 + マイナンバー');
}
function loadBookSchedule() {
  const days = Array.from({length:7},(_,i)=>todayISO(i));
  document.getElementById('book-content').innerHTML = `${miniCalendarStrip()}<div class="card"><div class="card-hdr"><div class="card-ttl">Weekly Schedule Board</div><span class="badge badge-teal">7 days × 3 shifts</span></div><div class="schedule-grid"><div class="schedule-cell schedule-head">Shift</div>${days.map(d=>`<div class="schedule-cell schedule-head">${new Date(d+'T00:00:00').toLocaleDateString('ja-JP',{weekday:'short',day:'2-digit'})}</div>`).join('')}${['Morning','Evening','Night'].map(shift => `<div class="schedule-cell schedule-head">${shift}</div>${days.map(day => { const slot = caregiverRoster.slots[`${day}|${shift}`]; return `<div class="schedule-cell" onclick="quickAssignSchedule('${day}','${shift}')"><strong>${slot?.caregiver || 'Unassigned'}</strong><br>${slot?.resId ? patientName(slot.resId) : 'Click to assign'}</div>`; }).join('')}`).join('')}</div></div>`;
  addAudit('VIEW','schedule','Weekly schedule board');
}

function loadLedgerResources() {
  const totals = RESIDENTS.map(r => ({r,total:healthLedger.filter(x=>x.resId===r.id && x.date.slice(0,7)===todayISO().slice(0,7)).reduce((a,b)=>a+Number(b.cost||0),0)}));
  const facility = totals.reduce((a,b)=>a+b.total,0);
  const serviceRows = serviceBookings.map(s => ({...s, accessed:['Confirmed','Completed'].includes(s.status)}));
  const medicineRows = [
    ...Object.entries(medsData).flatMap(([resId, meds]) => meds.map(m => ({date:todayISO(),resId,type:'Active Rx',medicine:m.name,qty:m.freq || 'As advised',status:'On chart'}))),
    ...medicationOrders.map(o => ({date:o.date,resId:o.resId,type:'Medicine Order',medicine:o.med,qty:o.qty,status:o.status})),
    ...prescriptionsData.flatMap(p => (p.meds || []).map(m => ({date:p.date,resId:p.resId,type:'Doctor Prescription',medicine:m.name || m.drug,qty:[m.dose,m.frequency,m.duration].filter(Boolean).join(' '),status:'Sent to patient'})))
  ].slice(0, 30);
  document.getElementById('ledger-content').innerHTML = `<div class="grid-3" style="margin-bottom:14px"><div class="stat-card"><span class="stat-ico">¥</span><div class="stat-val" style="color:var(--teal-d)">${facility}</div><div class="stat-lbl">Monthly Facility Total</div></div><div class="stat-card"><span class="stat-ico">🛏️</span><div class="stat-val" style="color:var(--green)">${resourceState.beds.filter(b=>b.status==='Occupied').length}/6</div><div class="stat-lbl">Bed Occupancy</div></div><div class="stat-card"><span class="stat-ico">🧰</span><div class="stat-val" style="color:var(--sky)">${resourceState.equipment.filter(e=>e.status==='Available').length}</div><div class="stat-lbl">Equipment Available</div></div></div>
  <div class="grid-2"><div class="card"><div class="card-hdr"><div class="card-ttl">Health Ledger</div></div><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Resident</th><th>Type</th><th>Item</th><th>Cost</th></tr></thead><tbody>${healthLedger.map(x=>`<tr><td>${x.date}</td><td>${patientName(x.resId)}</td><td>${x.type}</td><td>${x.item}</td><td>¥${x.cost}</td></tr>`).join('')}</tbody></table></div></div>
  <div><div class="card"><div class="card-hdr"><div class="card-ttl">Monthly Totals</div></div>${totals.map(x=>`<div class="chart-row"><div class="chart-lbl">${x.r.name.split(' ')[0]}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(x.total/5400*100,100)}%;background:var(--teal)"></div></div><div class="chart-val">¥${x.total}</div></div>`).join('')}</div>
  <div class="card"><div class="card-hdr"><div class="card-ttl">Resources</div></div>${resourceState.beds.map(b=>`<div class="info-row"><div class="info-lbl">${b.label}</div><div class="info-val">${b.status}${b.resId?' · '+patientName(b.resId):''}</div></div>`).join('')}${resourceState.equipment.map(e=>`<div class="info-row"><div class="info-lbl">${e.name}</div><div class="info-val">${e.status}</div></div>`).join('')}</div></div></div>
  <div class="grid-2" style="margin-top:14px">
    <div class="card"><div class="card-hdr"><div><div class="card-ttl">Patient Service Access</div><div class="page-sub">Shows services patients have requested or accessed</div></div></div><div class="tbl-wrap"><table><thead><tr><th>Ref</th><th>Resident</th><th>Service</th><th>Date</th><th>Access Mark</th><th>Status</th></tr></thead><tbody>${serviceRows.map(s=>`<tr><td>${s.id}</td><td>${patientName(s.resId)}</td><td>${s.type}</td><td>${s.date} ${s.time}</td><td><span class="badge ${s.accessed?'badge-stable':'badge-monitor'}">${s.accessed?'Accessed':'Requested'}</span></td><td>${statusBadge(s.status)}</td></tr>`).join('') || '<tr><td colspan="6">No service access records</td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="card-hdr"><div><div class="card-ttl">Medicine Ledger</div><div class="page-sub">Active medicines, doctor prescriptions, and delivery orders</div></div></div><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Resident</th><th>Type</th><th>Medicine</th><th>Qty / Dose</th><th>Status</th></tr></thead><tbody>${medicineRows.map(m=>`<tr><td>${m.date}</td><td>${patientName(m.resId)}</td><td>${m.type}</td><td>${m.medicine}</td><td>${m.qty || 'As advised'}</td><td><span class="badge badge-teal">${m.status}</span></td></tr>`).join('') || '<tr><td colspan="6">No medicine records</td></tr>'}</tbody></table></div></div>
  </div>`;
  addAudit('VIEW','ledger_resources','Ledger and resource panel');
}

function loadServices() {
  const scoped = currentRole === 'resident' ? serviceBookings.filter(s=>s.resId==='R001') : serviceBookings;
  document.getElementById('services-content').innerHTML = `<div class="service-grid">${serviceCatalog().map(([name,icon,eta,avail])=>`<div class="service-tile"><div class="service-icon">${icon}</div><div style="font-size:16px;font-weight:900;color:var(--g800)">${name}</div><div style="font-size:12px;color:var(--g500);margin:5px 0">${eta}</div><span class="badge ${avail==='Available'?'badge-stable':avail==='Busy'?'badge-monitor':'badge-teal'}">${avail}</span><div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="${name==='Doctor Appointment'?'openAppointmentModal()':`openServiceModal('${name.replace(/'/g,"\\'")}')`}">Book Now</button></div></div>`).join('')}</div>
  <div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-ttl">${currentRole === 'resident' ? 'My Service Requests' : 'Service Requests'}</div></div><div class="tbl-wrap"><table><thead><tr><th>Ref</th><th>Service</th><th>Resident</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${scoped.map(s=>`<tr><td>${s.id}</td><td>${s.type}</td><td>${patientName(s.resId)}</td><td>${s.date} ${s.time}</td><td>${statusBadge(s.status)}</td><td>${s.status==='Pending'?`<button class="btn btn-outline btn-sm" onclick="cancelService('${s.id}')">Cancel</button>`:''}</td></tr>`).join('') || '<tr><td colspan="6">No service requests</td></tr>'}</tbody></table></div></div>`;
  addAudit('VIEW','services','Service booking hub');
}

// ===== AUDIT LOG =====
function loadAudit() {
  const seed = [
    {t:'21:30', name:'山本 花子', role:'Doctor', action:'VIEW', resource:'dashboard', detail:'Dashboard loaded'},
    {t:'21:00', name:'高橋 美咲', role:'Caregiver', action:'CREATE', resource:'vitals', detail:'Recorded for 田中 健二'},
    {t:'20:15', name:'高橋 美咲', role:'Caregiver', action:'UPDATE', resource:'emar', detail:'Metformin 500mg marked given'},
    {t:'13:30', name:'山本 花子', role:'Doctor', action:'VIEW', resource:'labs', detail:'Lab results reviewed'},
    {t:'08:10', name:'田村 愛', role:'Nurse', action:'CREATE', resource:'vitals', detail:'Recorded for 佐藤 幸子'},
    {t:'08:05', name:'System', role:'Admin', action:'ALERT', resource:'alerts', detail:'BP alert generated for 佐藤 幸子'},
  ];
  const all = [...auditLog, ...seed];
  document.getElementById('audit-tbody').innerHTML = all.map(l => `<tr>
    <td style="font-family:var(--mono);font-size:11px">${l.t}</td>
    <td style="font-weight:700">${l.name}</td>
    <td><span class="badge ${l.role==='Doctor'?'badge-teal':'badge-gray'}">${l.role}</span></td>
    <td><span class="badge ${l.action==='CREATE'?'badge-stable':l.action==='UPDATE'?'badge-monitor':l.action==='ALERT'?'badge-critical':'badge-gray'}">${l.action}</span></td>
    <td style="color:var(--g600)">${l.resource}</td>
    <td style="font-size:11px;color:var(--g500)">${l.detail}</td>
  </tr>`).join('');
}
