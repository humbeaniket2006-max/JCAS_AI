// ===== DATA =====
const RESIDENTS = [
  {id:'R001',name:'田中 健二',initials:'TK',age:78,room:'2階A号室',blood:'B+',condition:'Stable',kaigoLevel:'要介護2',kaigoExpiry:'2026-11-30',admitted:'15 Jan 2024',doctor:'山本 花子',caregiver:'高橋 美咲',phone:'919876543210',emergency:{name:'渡辺 正雄',relation:'Son',phone:'9876501234'},diagnoses:['2型糖尿病 (Type 2 Diabetes E11.9)','高血圧症 (Hypertension I10)','Mild Arthritis (M19.9)'],allergies:[{drug:'Penicillin',severity:'severe'},{drug:'Aspirin',severity:'moderate'}],color:'#00897B'},
  {id:'R002',name:'佐藤 幸子',initials:'SY',age:82,room:'1階B号室',blood:'O+',condition:'Monitor',kaigoLevel:'要介護3',kaigoExpiry:'2026-08-15',admitted:'10 Sep 2023',doctor:'中村 誠',caregiver:'田村 愛',phone:'919845123456',emergency:{name:'Meena Sato',relation:'Daughter',phone:'9876502345'},diagnoses:['慢性心不全 (Chronic Heart Failure I50.9)','心房細動 (Atrial Fibrillation I48.91)','CKD Stage 2 (N18.2)'],allergies:[{drug:'Sulfa drugs',severity:'moderate'}],color:'#E53935'},
  {id:'R003',name:'鈴木 一郎',initials:'SI',age:71,room:'3階A号室',blood:'A+',condition:'Stable',kaigoLevel:'要支援2',kaigoExpiry:'2027-01-10',admitted:'01 Mar 2024',doctor:'山本 花子',caregiver:'松本 浩',phone:'919933445566',emergency:{name:'Rekha Suzuki',relation:'Wife',phone:'9876503456'},diagnoses:['慢性閉塞性肺疾患 (COPD J44.1)','Osteoporosis (M81.0)'],allergies:[{drug:'Ibuprofen',severity:'mild'}],color:'#388E3C'},
  {id:'R004',name:'渡辺 正雄',initials:'WM',age:76,room:'2階C号室',blood:'AB+',condition:'Recovery',kaigoLevel:'要介護1',kaigoExpiry:'2026-09-20',admitted:'20 Feb 2024',doctor:'小林 健',caregiver:'高橋 美咲',phone:'919900112233',emergency:{name:'Suresh Watanabe',relation:'Son',phone:'9876504567'},diagnoses:['人工股関節置換術後 (Post THR Z96.641)','高血圧症 (Hypertension I10)'],allergies:[{drug:'Latex',severity:'moderate'}],color:'#5E35B1'},
  {id:'R005',name:'伊藤 義雄',initials:'IY',age:80,room:'1階A号室',blood:'O-',condition:'Stable',kaigoLevel:'要介護2',kaigoExpiry:'2026-12-01',admitted:'05 Nov 2023',doctor:'中村 誠',caregiver:'田村 愛',emergency:{name:'Aiko Ito',relation:'Daughter',phone:'9876505678'},diagnoses:["パーキンソン病 (Parkinson's G20)",'Depression (F32.9)'],allergies:[{drug:'Codeine',severity:'severe'}],color:'#1565C0'},
];

const DOCTORS = [
  {name:'山本 花子', specialty:'Senior Physician', start:'09:00', end:'17:00', breaks:[{start:'13:00', end:'14:00'}]},
  {name:'中村 誠', specialty:'Cardiology', start:'10:00', end:'16:00', breaks:[{start:'12:30', end:'13:30'}]},
  {name:'小林 健', specialty:'Orthopedics', start:'09:30', end:'15:30', breaks:[{start:'12:00', end:'12:30'}]},
];

let appointmentsData = [];
let selectedAppointmentSlot = '';
let bookingContext = {patientId:'R001', urgency:'Routine', reason:'Doctor review'};

let vitalsData = {
  R001:[
    {t:'2026-04-07T08:00:00',bp_s:142,bp_d:88,pulse:84,spo2:93,temp:36.9,glucose:184,weight:67.8,by:'高橋 美咲',notes:'Morning check — mild fatigue; fasting sugar high',ai:{riskLevel:'High',insight:'Blood sugar and blood pressure are elevated while oxygen is trending lower than baseline.',recommendation:'Repeat vitals after rest and schedule diabetes/BP review within 48 hours.'}},
    {t:'2026-04-06T08:00:00',bp_s:138,bp_d:86,pulse:82,spo2:94,temp:36.8,glucose:176,weight:67.9,by:'高橋 美咲',notes:'Morning — appetite normal; oxygen slightly low',ai:{riskLevel:'Medium',insight:'Glucose remains above target and SpO₂ is mildly reduced.',recommendation:'Continue close monitoring and review meal log.'}},
    {t:'2026-04-05T08:00:00',bp_s:136,bp_d:84,pulse:80,spo2:95,temp:36.7,glucose:169,weight:68.0,by:'松本 浩',notes:'Stable, short walk completed'},
    {t:'2026-04-04T08:00:00',bp_s:134,bp_d:84,pulse:78,spo2:95,temp:36.8,glucose:162,weight:68.0,by:'高橋 美咲',notes:'Morning — mild post-breakfast glucose rise'},
    {t:'2026-04-03T08:00:00',bp_s:132,bp_d:82,pulse:76,spo2:96,temp:36.6,glucose:154,weight:68.1,by:'高橋 美咲',notes:'Morning — stable and cooperative'},
    {t:'2026-04-02T08:00:00',bp_s:130,bp_d:82,pulse:75,spo2:96,temp:36.7,glucose:148,weight:68.1,by:'松本 浩',notes:'Morning — good sleep reported'},
    {t:'2026-04-01T08:00:00',bp_s:128,bp_d:82,pulse:74,spo2:97,temp:36.8,glucose:142,weight:68.2,by:'高橋 美咲',notes:'Morning check — alert, cooperative'},
    {t:'2026-03-31T08:00:00',bp_s:130,bp_d:84,pulse:76,spo2:97,temp:36.7,glucose:145,weight:68.2,by:'高橋 美咲',notes:'Morning'},
    {t:'2026-03-30T08:00:00',bp_s:126,bp_d:80,pulse:72,spo2:98,temp:36.6,glucose:134,weight:68.3,by:'松本 浩',notes:'Afternoon — stable'},
    {t:'2026-03-29T08:00:00',bp_s:124,bp_d:78,pulse:70,spo2:98,temp:36.5,glucose:132,weight:68.4,by:'高橋 美咲',notes:'Good activity tolerance'},
  ],
  R002:[
    {t:'2026-04-07T08:00:00',bp_s:152,bp_d:94,pulse:90,spo2:93,temp:36.9,glucose:null,weight:54.4,by:'田村 愛',notes:'BP elevated; mild ankle swelling'},
    {t:'2026-04-06T08:00:00',bp_s:150,bp_d:92,pulse:88,spo2:94,temp:36.9,glucose:null,weight:54.2,by:'田村 愛',notes:'BP elevated — monitoring'},
    {t:'2026-04-05T08:00:00',bp_s:148,bp_d:92,pulse:88,spo2:94,temp:36.9,glucose:null,weight:54,by:'田村 愛',notes:'BP elevated — monitoring'},
    {t:'2026-04-04T08:00:00',bp_s:144,bp_d:90,pulse:86,spo2:94,temp:37.1,glucose:null,weight:null,by:'田村 愛',notes:'Afternoon check'},
    {t:'2026-04-03T08:00:00',bp_s:140,bp_d:88,pulse:84,spo2:95,temp:36.8,glucose:null,weight:53.9,by:'田村 愛',notes:'No breathlessness reported'},
  ],
  R003:[
    {t:'2026-04-07T08:00:00',bp_s:120,bp_d:78,pulse:72,spo2:91,temp:36.6,glucose:140,weight:71.8,by:'松本 浩',notes:'COPD; SpO₂ lower than usual after short walk'},
    {t:'2026-04-06T08:00:00',bp_s:118,bp_d:76,pulse:70,spo2:92,temp:36.5,glucose:138,weight:72,by:'松本 浩',notes:'SpO₂ on lower side — COPD'},
    {t:'2026-04-05T08:00:00',bp_s:116,bp_d:74,pulse:68,spo2:93,temp:36.5,glucose:136,weight:72.1,by:'松本 浩',notes:'Breathing comfortable at rest'},
    {t:'2026-04-04T08:00:00',bp_s:118,bp_d:76,pulse:68,spo2:94,temp:36.4,glucose:132,weight:72.1,by:'松本 浩',notes:'Stable'},
  ],
  R004:[
    {t:'2026-04-07T08:00:00',bp_s:118,bp_d:74,pulse:68,spo2:98,temp:36.6,glucose:112,weight:62.1,by:'高橋 美咲',notes:'Post-op mobility improving'},
    {t:'2026-04-06T08:00:00',bp_s:116,bp_d:74,pulse:66,spo2:98,temp:36.6,glucose:108,weight:62,by:'高橋 美咲',notes:'Post-op vitals good'},
    {t:'2026-04-05T08:00:00',bp_s:116,bp_d:72,pulse:66,spo2:99,temp:36.5,glucose:106,weight:62,by:'高橋 美咲',notes:'Physio completed'},
  ],
  R005:[
    {t:'2026-04-07T08:00:00',bp_s:124,bp_d:80,pulse:74,spo2:97,temp:36.7,glucose:118,weight:65,by:'田村 愛',notes:'Stable; tremor unchanged'},
    {t:'2026-04-06T08:00:00',bp_s:122,bp_d:80,pulse:72,spo2:97,temp:36.7,glucose:115,weight:65,by:'田村 愛',notes:'Stable'},
    {t:'2026-04-05T08:00:00',bp_s:120,bp_d:78,pulse:72,spo2:98,temp:36.6,glucose:112,weight:65.1,by:'田村 愛',notes:'Good medication adherence'},
  ],
};

let medsData = {
  R001:[
    {id:'M1',name:'Metformin 500mg',route:'Oral',freq:'Twice daily',indication:'Type 2 Diabetes',by:'山本 花子',times:[{id:'E1',t:'08:00',status:'given',adm:'高橋 美咲'},{id:'E2',t:'20:00',status:'pending'}]},
    {id:'M2',name:'Amlodipine 5mg',route:'Oral',freq:'Once daily',indication:'Hypertension',by:'山本 花子',times:[{id:'E3',t:'08:00',status:'given',adm:'高橋 美咲'}]},
    {id:'M3',name:'Pantoprazole 40mg',route:'Oral',freq:'Once daily',indication:'Gastric protection',by:'山本 花子',times:[{id:'E4',t:'08:00',status:'given',adm:'高橋 美咲'}]},
    {id:'M4',name:'Glimepiride 1mg',route:'Oral',freq:'Once daily',indication:'Type 2 Diabetes',by:'山本 花子',times:[{id:'E5',t:'08:00',status:'given',adm:'高橋 美咲'}]},
    {id:'M5',name:'Calcium + Vit D3',route:'Oral',freq:'Once daily',indication:'Bone health',by:'山本 花子',times:[{id:'E6',t:'20:00',status:'overdue'}]},
  ],
  R002:[
    {id:'M1',name:'Furosemide 40mg',route:'Oral',freq:'Once daily',indication:'CHF',by:'中村 誠',times:[{id:'E7',t:'08:00',status:'given',adm:'田村 愛'}]},
    {id:'M2',name:'Warfarin 2mg',route:'Oral',freq:'Once daily',indication:'Atrial Fibrillation',by:'中村 誠',times:[{id:'E8',t:'18:00',status:'pending'}]},
    {id:'M3',name:'Digoxin 0.125mg',route:'Oral',freq:'Once daily',indication:'CHF',by:'中村 誠',times:[{id:'E9',t:'08:00',status:'given',adm:'田村 愛'}]},
  ],
};

let labsData = {
  R001:[
    {id:'L1',test:'HbA1c',result:'7.8',unit:'%',ref:'< 7.0',status:'high',date:'2026-03-20',by:'山本 花子'},
    {id:'L2',test:'Fasting Glucose',result:'138',unit:'mg/dL',ref:'70–100',status:'high',date:'2026-03-20',by:'山本 花子'},
    {id:'L3',test:'Creatinine',result:'1.1',unit:'mg/dL',ref:'0.7–1.2',status:'normal',date:'2026-03-20',by:'山本 花子'},
    {id:'L4',test:'Haemoglobin',result:'12.8',unit:'g/dL',ref:'13.5–17.5',status:'low',date:'2026-03-20',by:'山本 花子'},
    {id:'L5',test:'Total Cholesterol',result:'212',unit:'mg/dL',ref:'< 200',status:'high',date:'2026-03-20',by:'山本 花子'},
  ],
  R002:[
    {id:'L1',test:'BNP',result:'680',unit:'pg/mL',ref:'< 100',status:'high',date:'2026-03-25',by:'中村 誠'},
    {id:'L2',test:'Creatinine',result:'1.6',unit:'mg/dL',ref:'0.5–1.1',status:'high',date:'2026-03-25',by:'中村 誠'},
    {id:'L3',test:'INR',result:'2.4',unit:'',ref:'2.0–3.0',status:'normal',date:'2026-03-25',by:'中村 誠'},
  ],
};

let notesData = {
  R001:[
    {shift:'Evening',date:'2026-04-01',author:'高橋 美咲',role:'Caregiver',note:'Good day overall. Physiotherapy completed. Glucose 168 post-lunch — Dr. Nair informed. Evening Calcium pending. Mood: Cheerful.',tasks:['Evening Calcium + Vit D3 at 20:00','Morning vitals 08:00'],t:'2026-04-01T21:00:00'},
    {shift:'Afternoon',date:'2026-04-01',author:'山本 花子',role:'Doctor',note:'Reviewed vitals. Glucose 168 mg/dL post-lunch concerning. Dietary modification advised — reduce refined carbs. No medication change at this time.',tasks:[],t:'2026-04-01T13:30:00'},
    {shift:'Morning',date:'2026-04-01',author:'田村 愛',role:'Nurse',note:'Morning vitals stable. All medications administered. Breakfast well — 80% eaten. Requested physio session at 10:00.',tasks:[],t:'2026-04-01T09:30:00'},
  ]
};

let ALERTS = [
  {id:'A1',res:'佐藤 幸子',room:'1階B号室',type:'vital',sev:'critical',msg:'BP 148/92 — elevated, monitoring required',acked:false,t:'2026-04-01T08:05:00'},
  {id:'A2',res:'鈴木 一郎',room:'3階A号室',type:'vital',sev:'warning',msg:'SpO₂ 92% — COPD patient, check oxygen therapy',acked:false,t:'2026-04-01T08:10:00'},
  {id:'A3',res:'田中 健二',room:'2階A号室',type:'med',sev:'warning',msg:'Calcium + Vit D3 — overdue at 20:00',acked:false,t:'2026-04-01T20:00:00'},
  {id:'A4',res:'伊藤 義雄',room:'1階A号室',type:'lab',sev:'info',msg:'Lab panel due — last drawn 30 days ago',acked:true,t:'2026-04-01T06:00:00'},
];

let auditLog = [];
let selVitals = 'R001', selEmar = 'R001', selLabs = 'R001', selTl = 'R001', selCare = 'R001', resFilter = 'All';
let sidebarCollapsed = false;
let currentRole = localStorage.getItem('ehmr-role') || '';
const AI_STORAGE_KEY = 'ehmr-ai-groq-config';
const DEFAULT_AI_MODEL = 'llama-3.3-70b-versatile';
const AI_PROXY_URL = 'https://ehmr-ai-server-production.up.railway.app/api/ai-insight';

function dataTodayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
// ===== FEATURE STATE =====
const CAREGIVERS = [
  {name:'高橋 美咲', phone:'919811223344'},
  {name:'田村 愛', phone:'919822334455'},
  {name:'松本 浩', phone:'919833445566'}
];
function loadStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}
function saveStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
let medicationOrders = loadStore('ehmr_med_orders', [
  {id:'MO-1001',resId:'R001',med:'Metformin 500mg',qty:'60 tablets',date:dataTodayISO(2),notes:'Monthly refill',status:'Confirmed'},
  {id:'MO-1002',resId:'R002',med:'Warfarin 2mg',qty:'30 tablets',date:dataTodayISO(1),notes:'INR follow-up pack',status:'Pending'}
]);
let healthLedger = loadStore('ehmr_ledger', [
  {id:'HL-1',resId:'R001',date:dataTodayISO(-2),type:'Visit',item:'Diabetes/BP review',cost:2200},
  {id:'HL-2',resId:'R001',date:dataTodayISO(-1),type:'Medication',item:'Metformin batch MTF-0426',cost:760},
  {id:'HL-3',resId:'R002',date:dataTodayISO(-3),type:'Lab',item:'BNP + renal panel',cost:3800},
  {id:'HL-4',resId:'R003',date:dataTodayISO(-5),type:'Procedure',item:'Nebulization support',cost:1200},
  {id:'HL-5',resId:'R004',date:dataTodayISO(-4),type:'Visit',item:'Orthopedic review',cost:2700}
]);
let resourceState = loadStore('ehmr_resources', {
  beds:[
    {id:'B1',label:'2階A号室',status:'Occupied',resId:'R001'}, {id:'B2',label:'1階B号室',status:'Occupied',resId:'R002'},
    {id:'B3',label:'3階A号室',status:'Occupied',resId:'R003'}, {id:'B4',label:'2階C号室',status:'Occupied',resId:'R004'},
    {id:'B5',label:'1階A号室',status:'Occupied',resId:'R005'}, {id:'B6',label:'205-B',status:'Sanitizing',resId:''}
  ],
  equipment:[
    {name:'Wheelchair',status:'In Use'}, {name:'Oxygen Concentrator',status:'Available'}, {name:'BP Monitor',status:'Available'}
  ]
});
let caregiverRoster = loadStore('ehmr_schedule', {
  slots:{
    [`${dataTodayISO(0)}|Morning`]:{caregiver:'高橋 美咲',resId:'R001'},
    [`${dataTodayISO(0)}|Evening`]:{caregiver:'田村 愛',resId:'R002'},
    [`${dataTodayISO(1)}|Night`]:{caregiver:'高橋 美咲',resId:'R004'}
  }
});
let serviceBookings = loadStore('ehmr_service_bookings', [
  {id:'SRV-1001',type:'Home Lab Collection',resId:'R001',date:dataTodayISO(),time:'11:30',urgency:'Routine',notes:'HbA1c and lipid panel',status:'Pending'},
  {id:'SRV-1002',type:'Physiotherapy Session',resId:'R004',date:dataTodayISO(),time:'16:00',urgency:'Routine',notes:'Post-op gait training',status:'Confirmed'}
]);
let prescriptionsData = loadStore('ehmr_prescriptions', []);
let reminderInterval = null, remindedDoses = new Set();
