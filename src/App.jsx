import { useState, useEffect } from "react";

// ============================================================
// GOOGLE SHEETS CONFIG
// ============================================================
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
const ADMOB_BANNER_ID = "ca-app-pub-XXXXXXXX/XXXXXXXX"; // Replace with your AdMob ID

// ============================================================
// BUILT-IN QUESTIONS
// ============================================================
const BUILTIN_QUESTIONS = [
  // LDC
  { id:1, q:"Kerala formed on?", qm:"കേരളം രൂപീകരിച്ചത്?", options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"], answer:0, topic:"ldc", difficulty:"easy" },
  { id:2, q:"Longest river in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?", options:["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer:1, topic:"ldc", difficulty:"easy" },
  { id:3, q:"Capital of Kerala?", qm:"കേരളത്തിന്റെ തലസ്ഥാനം?", options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"], answer:2, topic:"ldc", difficulty:"easy" },
  { id:4, q:"First Chief Minister of Kerala?", qm:"കേരളത്തിന്റെ ആദ്യ മുഖ്യമന്ത്രി?", options:["C Achutha Menon","K Karunakaran","EMS Namboodiripad","Pattom Thanu Pillai"], answer:2, topic:"ldc", difficulty:"medium" },
  { id:5, q:"Kerala High Court is located in?", qm:"കേരള ഹൈക്കോടതി സ്ഥിതി ചെയ്യുന്നത്?", options:["Thiruvananthapuram","Thrissur","Kochi","Kozhikode"], answer:2, topic:"ldc", difficulty:"easy" },
  // PSC General
  { id:6, q:"Who wrote 'Ayalytte Makan'?", qm:"'അയല്ത്തെ മകൻ' രചിച്ചത്?", options:["Thakazhi","Vaikom Muhammad Basheer","MT Vasudevan Nair","O V Vijayan"], answer:1, topic:"psc", difficulty:"medium" },
  { id:7, q:"Silent Valley is in which district?", qm:"സൈലന്റ് വാലി ഏത് ജില്ലയിൽ?", options:["Wayanad","Idukki","Palakkad","Malappuram"], answer:2, topic:"psc", difficulty:"medium" },
  { id:8, q:"Highest peak in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options:["Chembra","Anamudi","Meesapulimala","Agasthyamala"], answer:1, topic:"psc", difficulty:"easy" },
  { id:9, q:"National game of India?", qm:"ഇന്ത്യയുടെ ദേശീയ കായിക വിനോദം?", options:["Cricket","Football","Hockey","Kabaddi"], answer:2, topic:"psc", difficulty:"easy" },
  { id:10, q:"Father of Indian Constitution?", qm:"ഇന്ത്യൻ ഭരണഘടനയുടെ പിതാവ്?", options:["Jawaharlal Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"], answer:2, topic:"psc", difficulty:"easy" },
  // Police
  { id:11, q:"IPC stands for?", qm:"IPC-യുടെ പൂർണ്ണ രൂപം?", options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, topic:"police", difficulty:"easy" },
  { id:12, q:"First woman IPS officer of India?", qm:"ഇന്ത്യയിലെ ആദ്യ വനിതാ IPS?", options:["Kiran Bedi","Anjana Srivastava","Kanchan Chaudhary Bhattacharya","Revathi"], answer:0, topic:"police", difficulty:"medium" },
  { id:13, q:"FIR full form?", qm:"FIR-ന്റെ പൂർണ്ണ രൂപം?", options:["First Information Report","First Inquiry Report","First Investigation Report","Final Information Report"], answer:0, topic:"police", difficulty:"easy" },
  // Science
  { id:14, q:"Chemical symbol of Gold?", qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options:["Go","Gd","Au","Ag"], answer:2, topic:"science", difficulty:"easy" },
  { id:15, q:"Speed of light?", qm:"പ്രകാശ വേഗത?", options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"], answer:0, topic:"science", difficulty:"medium" },
  { id:16, q:"Which vitamin is produced by sunlight?", qm:"സൂര്യപ്രകാശത്തിൽ നിന്ന് ലഭിക്കുന്ന വിറ്റാമിൻ?", options:["A","B","C","D"], answer:3, topic:"science", difficulty:"easy" },
  { id:17, q:"DNA full form?", qm:"DNA-യുടെ പൂർണ്ണ രൂപം?", options:["Deoxyribonucleic Acid","Diribonucleic Acid","Deoxyribose Nucleic","None"], answer:0, topic:"science", difficulty:"medium" },
  // Current Affairs
  { id:18, q:"Chandrayaan-3 landed on Moon in?", qm:"ചന്ദ്രയാൻ-3 ചന്ദ്രനിൽ ഇറങ്ങിയ വർഷം?", options:["2022","2023","2024","2021"], answer:1, topic:"current", difficulty:"easy" },
  { id:19, q:"President of India 2024?", qm:"ഇന്ത്യൻ രാഷ്ട്രപതി 2024?", options:["Ram Nath Kovind","Droupadi Murmu","Pranab Mukherjee","APJ Abdul Kalam"], answer:1, topic:"current", difficulty:"easy" },
  { id:20, q:"G20 Summit 2023 hosted by?", qm:"G20 ഉച്ചകോടി 2023 ആതിഥേയ രാജ്യം?", options:["USA","China","India","Russia"], answer:2, topic:"current", difficulty:"easy" },
  // History
  { id:21, q:"Battle of Plassey year?", qm:"പ്ലാസി യുദ്ധം നടന്ന വർഷം?", options:["1757","1764","1799","1857"], answer:0, topic:"history", difficulty:"medium" },
  { id:22, q:"Quit India Movement year?", qm:"ക്വിറ്റ് ഇന്ത്യ പ്രസ്ഥാനം?", options:["1940","1942","1945","1947"], answer:1, topic:"history", difficulty:"medium" },
  { id:23, q:"Who founded INC?", qm:"ഇന്ത്യൻ നാഷണൽ കോൺഗ്രസ് സ്ഥാപിച്ചത്?", options:["Mahatma Gandhi","AO Hume","Tilak","Gokhale"], answer:1, topic:"history", difficulty:"medium" },
  // Geography  
  { id:24, q:"Largest state in India by area?", qm:"വിസ്തൃതി കൊണ്ട് ഇന്ത്യയിലെ ഏറ്റവും വലിയ സംസ്ഥാനം?", options:["MP","Rajasthan","Maharashtra","UP"], answer:1, topic:"geography", difficulty:"easy" },
  { id:25, q:"Ganga originates from?", qm:"ഗംഗ നദി ഉദ്ഭവിക്കുന്നത്?", options:["Yamunotri","Gangotri","Kedarnath","Badrinath"], answer:1, topic:"geography", difficulty:"medium" },
];

const CATEGORIES = {
  ldc:       { label:"LDC / LGS",        icon:"📋", color:"#6366f1", desc:"Lower Division Clerk" },
  psc:       { label:"PSC General",      icon:"🏛️", color:"#8b5cf6", desc:"General Knowledge" },
  police:    { label:"Police / SI",      icon:"👮", color:"#3b82f6", desc:"Police Exams" },
  science:   { label:"Science",          icon:"🔬", color:"#10b981", desc:"Physics, Chemistry, Bio" },
  history:   { label:"History",          icon:"📜", color:"#f59e0b", desc:"Indian & World History" },
  geography: { label:"Geography",        icon:"🌍", color:"#06b6d4", desc:"India & Kerala Geography" },
  current:   { label:"Current Affairs",  icon:"📰", color:"#ef4444", desc:"Latest News & Events" },
  mock:      { label:"Mock Test",        icon:"🎯", color:"#ec4899", desc:"Full Length Test - 25 Qs" },
};

const ADMIN_PASSWORD = "Akr@54321"; // Change this!

function parseSheetData(raw) {
  try {
    const json = JSON.parse(raw.replace(/.*?({.*})/s, "$1"));
    return json.table.rows.map((row, i) => {
      const c = row.c;
      const g = (idx) => c[idx]?.v != null ? String(c[idx].v).trim() : "";
      return { id: 1000+i, q:g(0), qm:g(1), options:[g(2),g(3),g(4),g(5)], answer:parseInt(g(6))||0, topic:g(7)||"psc", difficulty:g(8)||"medium" };
    }).filter(q => q.q && q.options[0]);
  } catch { return []; }
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home|quiz|result|leaderboard|bookmarks|admin|stats
  const [allQ, setAllQ] = useState(BUILTIN_QUESTIONS);
  const [sheetId, setSheetId] = useState(() => localStorage.getItem("sheet_id")||"");
  const [sheetStatus, setSheetStatus] = useState("idle");
  const [category, setCategory] = useState(null);
  const [difficulty, setDifficulty] = useState("all");
  const [questions, setQuestions] = useState([]);
  const [curr, setCurr] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem("bookmarks")||"[]"));
  const [leaderboard, setLeaderboard] = useState(() => JSON.parse(localStorage.getItem("leaderboard")||"[]"));
  const [nameInput, setNameInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [adminOk, setAdminOk] = useState(false);
  const [newQ, setNewQ] = useState({ q:"", qm:"", o1:"", o2:"", o3:"", o4:"", answer:"0", topic:"psc", difficulty:"medium" });
  const [customQ, setCustomQ] = useState(() => JSON.parse(localStorage.getItem("custom_questions")||"[]"));
  const [stats, setStats] = useState(() => JSON.parse(localStorage.getItem("stats")||"{}"));
  const timerRef = typeof window !== "undefined" ? { current: null } : { current: null };

  useEffect(() => {
    setAllQ([...BUILTIN_QUESTIONS, ...customQ]);
  }, [customQ]);

  useEffect(() => {
    if (sheetId) loadSheet(sheetId);
  }, []);

  const loadSheet = (id) => {
    setSheetStatus("loading");
    fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=Questions`)
      .then(r => r.text()).then(raw => {
        const parsed = parseSheetData(raw);
        if (parsed.length > 0) { setAllQ(q => [...BUILTIN_QUESTIONS, ...customQ, ...parsed]); setSheetStatus("success"); }
        else setSheetStatus("error");
      }).catch(() => setSheetStatus("error"));
  };

  useEffect(() => {
    if (screen !== "quiz" || sel !== null) return;
    setTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [curr, screen]);

  const startQuiz = (cat) => {
    let qs = cat === "mock" ? allQ.sort(() => Math.random()-0.5).slice(0,25)
      : allQ.filter(q => q.topic === cat && (difficulty === "all" || q.difficulty === difficulty));
    qs = qs.sort(() => Math.random()-0.5).slice(0,10);
    if (qs.length === 0) { alert("ഈ category-ൽ questions ഇല്ല!"); return; }
    setCategory(cat); setQuestions(qs); setCurr(0); setSel(null);
    setScore(0); setAnswers([]); setSaved(false); setScreen("quiz");
  };

  const handleAns = (i) => {
    if (sel !== null) return;
    clearInterval(timerRef.current);
    setSel(i);
    const q = questions[curr];
    const ok = i === q.answer;
    if (ok) setScore(s => s+1);
    setAnswers(a => [...a, { q, sel:i, ok }]);
    const newStats = { ...stats, [q.topic]: { attempts:(stats[q.topic]?.attempts||0)+1, correct:(stats[q.topic]?.correct||0)+(ok?1:0) } };
    setStats(newStats);
    localStorage.setItem("stats", JSON.stringify(newStats));
  };

  const nextQ = () => {
    if (curr+1 >= questions.length) { setScreen("result"); return; }
    setCurr(c => c+1); setSel(null);
  };

  const saveScore = () => {
    if (!nameInput.trim()) return;
    const entry = { name:nameInput.trim(), score, total:questions.length, cat:category, date:new Date().toLocaleDateString("ml-IN") };
    const upd = [...leaderboard, entry].sort((a,b) => b.score-a.score).slice(0,30);
    setLeaderboard(upd); localStorage.setItem("leaderboard", JSON.stringify(upd)); setSaved(true);
  };

  const toggleBm = (q) => {
    const ex = bookmarks.find(b => b.id===q.id);
    const upd = ex ? bookmarks.filter(b => b.id!==q.id) : [...bookmarks, q];
    setBookmarks(upd); localStorage.setItem("bookmarks", JSON.stringify(upd));
  };

  const addCustomQ = () => {
    if (!newQ.q || !newQ.o1 || !newQ.o2 || !newQ.o3 || !newQ.o4) { alert("എല്ലാ fields-ഉം fill ചെയ്യൂ!"); return; }
    const q = { id: Date.now(), q:newQ.q, qm:newQ.qm, options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4], answer:parseInt(newQ.answer), topic:newQ.topic, difficulty:newQ.difficulty };
    const upd = [...customQ, q];
    setCustomQ(upd); localStorage.setItem("custom_questions", JSON.stringify(upd));
    setNewQ({ q:"", qm:"", o1:"", o2:"", o3:"", o4:"", answer:"0", topic:"psc", difficulty:"medium" });
    alert("✅ Question add ചെയ്തു!");
  };

  const isBm = (id) => bookmarks.some(b => b.id===id);
  const q = questions[curr];
  const totalQ = allQ.length;

  const s = { minHeight:"100vh", background:"#080812", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" };
  const card = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14 };
  const btn = (bg, col="#fff") => ({ background:bg, color:col, border:"none", borderRadius:10, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit" });

  return (
    <div style={s}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:4px} input,select,textarea{font-family:inherit} @keyframes pop{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}} .pop{animation:pop 0.25s ease} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} .blink{animation:blink 0.8s infinite}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#13103a,#1e1b4b)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(99,102,241,0.25)", position:"sticky", top:0, zIndex:100 }}>
        <div onClick={() => setScreen("home")} style={{ cursor:"pointer" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#a5b4fc" }}>🎓 PSC Quiz Kerala</div>
          <div style={{ fontSize:10, color:"#4f46e5", letterSpacing:2 }}>KERALA PSC EXAM PREP</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => setScreen("stats")} style={{ ...btn("rgba(16,185,129,0.15)","#10b981"), padding:"6px 10px", fontSize:12 }}>📊</button>
          <button onClick={() => setScreen("bookmarks")} style={{ ...btn("rgba(245,158,11,0.15)","#fbbf24"), padding:"6px 10px", fontSize:12 }}>🔖{bookmarks.length}</button>
          <button onClick={() => setScreen("leaderboard")} style={{ ...btn("rgba(99,102,241,0.15)","#a5b4fc"), padding:"6px 10px", fontSize:12 }}>🏆</button>
          <button onClick={() => setScreen("admin")} style={{ ...btn("rgba(239,68,68,0.15)","#f87171"), padding:"6px 10px", fontSize:12 }}>⚙️</button>
        </div>
      </div>

      <div style={{ maxWidth:500, margin:"0 auto", padding:"0 14px 80px" }}>

        {/* HOME */}
        {screen === "home" && (
          <div className="pop">
            <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
              <div style={{ fontSize:50 }}>🎯</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"#c7d2fe", marginTop:8 }}>Kerala PSC Exam Prep</h1>
              <p style={{ color:"#475569", fontSize:13, marginTop:4 }}>7 Categories • {totalQ} Questions • Daily Updates</p>
              {sheetStatus === "success" && <div style={{ marginTop:8, display:"inline-block", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20, padding:"3px 12px", color:"#10b981", fontSize:12 }}>✅ Google Sheets Connected</div>}
            </div>

            {/* Stats Bar */}
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {[{l:"Questions",v:totalQ,i:"📝"},{l:"Categories",v:7,i:"📚"},{l:"Bookmarks",v:bookmarks.length,i:"🔖"}].map((x,i) => (
                <div key={i} style={{ ...card, flex:1, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:18 }}>{x.i}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:"#818cf8" }}>{x.v}</div>
                  <div style={{ fontSize:10, color:"#475569" }}>{x.l}</div>
                </div>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {["all","easy","medium","hard"].map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{ flex:1, padding:"8px 4px", background:difficulty===d?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)", border:`1px solid ${difficulty===d?"#6366f1":"rgba(255,255,255,0.08)"}`, borderRadius:8, color:difficulty===d?"#a5b4fc":"#64748b", fontSize:12, cursor:"pointer", fontWeight:difficulty===d?700:400 }}>
                  {d === "all" ? "All" : d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard"}
                </button>
              ))}
            </div>

            {/* Categories */}
            <h2 style={{ fontSize:13, color:"#475569", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Category തിരഞ്ഞെടുക്കൂ</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(CATEGORIES).map(([key, meta]) => {
                const count = key === "mock" ? Math.min(allQ.length, 25) : allQ.filter(q => q.topic===key).length;
                return (
                  <button key={key} onClick={() => startQuiz(key)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:`1px solid rgba(255,255,255,0.07)`, borderLeft:`3px solid ${meta.color}`, borderRadius:12, cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontSize:24 }}>{meta.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:"#e2e8f0", fontSize:14 }}>{meta.label}</div>
                      <div style={{ color:"#475569", fontSize:12, marginTop:2 }}>{meta.desc}</div>
                    </div>
                    <div style={{ background:meta.color+"22", color:meta.color, borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700 }}>{count} Qs</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUIZ */}
        {screen === "quiz" && q && (
          <div className="pop" style={{ paddingTop:16 }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ color:"#475569", fontSize:13 }}>{curr+1}/{questions.length} • {CATEGORIES[category]?.icon} {CATEGORIES[category]?.label}</span>
                <span className={timer<=5?"blink":""} style={{ color:timer<=5?"#ef4444":"#10b981", fontWeight:800, background:timer<=5?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.08)", padding:"3px 12px", borderRadius:20, fontSize:15 }}>⏱{timer}s</span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                <div style={{ height:"100%", width:`${(curr/questions.length)*100}%`, background:"linear-gradient(90deg,#6366f1,#a855f7)", borderRadius:4, transition:"width 0.4s" }} />
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:10, padding:"4px 12px", color:"#10b981", fontSize:13 }}>✅ {score}</div>
              <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:10, padding:"4px 12px", color:"#fbbf24", fontSize:12 }}>
                {q.difficulty === "easy" ? "🟢 Easy" : q.difficulty === "medium" ? "🟡 Medium" : "🔴 Hard"}
              </div>
              <button onClick={() => toggleBm(q)} style={{ background:isBm(q.id)?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${isBm(q.id)?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:10, padding:"4px 12px", color:isBm(q.id)?"#fbbf24":"#475569", fontSize:13, cursor:"pointer" }}>
                🔖
              </button>
            </div>

            <div style={{ ...card, padding:16, marginBottom:12, background:"linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.04))", borderColor:"rgba(99,102,241,0.15)" }}>
              <p style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", lineHeight:1.6 }}>{q.q}</p>
              {q.qm && <p style={{ fontSize:13, color:"#64748b", marginTop:6, lineHeight:1.6 }}>{q.qm}</p>}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {q.options.map((opt, i) => {
                if (!opt) return null;
                let bg = "rgba(255,255,255,0.03)", bdr = "rgba(255,255,255,0.08)", col = "#e2e8f0";
                if (sel !== null) {
                  if (i === q.answer) { bg="rgba(16,185,129,0.12)"; bdr="#10b981"; col="#10b981"; }
                  else if (i === sel) { bg="rgba(239,68,68,0.12)"; bdr="#ef4444"; col="#ef4444"; }
                }
                return (
                  <button key={i} onClick={() => handleAns(i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:bg, border:`1.5px solid ${bdr}`, borderRadius:11, color:col, textAlign:"left", fontSize:14, cursor:"pointer", lineHeight:1.5 }}>
                    <span style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0, border:`1px solid ${bdr}` }}>
                      {["A","B","C","D"][i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {sel !== null && (
              <div className="pop">
                <div style={{ ...card, padding:12, marginBottom:10, borderLeft:`3px solid ${sel===q.answer?"#10b981":"#ef4444"}`, background:sel===q.answer?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.06)" }}>
                  <div style={{ fontWeight:700, color:sel===q.answer?"#10b981":"#ef4444" }}>{sel===q.answer?"✅ ശരിയാണ്!":"❌ തെറ്റ്!"}</div>
                  {sel!==q.answer && <div style={{ color:"#94a3b8", fontSize:13, marginTop:4 }}>✔ ഉത്തരം: <strong style={{ color:"#a5b4fc" }}>{q.options[q.answer]}</strong></div>}
                </div>
                <button onClick={nextQ} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", padding:13, fontSize:15 }}>
                  {curr+1>=questions.length?"📊 Result":"അടുത്ത ചോദ്യം →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {screen === "result" && (
          <div className="pop" style={{ paddingTop:24 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:56 }}>{score>=questions.length*0.8?"🏆":score>=questions.length*0.5?"😊":"💪"}</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#c7d2fe", marginTop:8 }}>Quiz Complete!</h2>
              <div style={{ fontSize:48, fontWeight:900, color:"#6366f1", margin:"10px 0" }}>{score}<span style={{ fontSize:22, color:"#475569" }}>/{questions.length}</span></div>
              <div style={{ color:"#64748b" }}>{score>=questions.length*0.8?"🔥 Excellent!":score>=questions.length*0.5?"👍 Good effort!":"📖 Keep learning!"}</div>
              <div style={{ marginTop:8, fontSize:13, color:"#475569" }}>Accuracy: {Math.round((score/questions.length)*100)}%</div>
            </div>

            {!saved && (
              <div style={{ ...card, padding:14, marginBottom:14 }}>
                <p style={{ color:"#94a3b8", fontSize:13, marginBottom:8 }}>🏆 Leaderboard-ൽ save ചെയ്യൂ</p>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="നിങ്ങളുടെ പേര്..." style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 12px", color:"#e2e8f0", fontSize:13 }} />
                  <button onClick={saveScore} style={{ ...btn("#6366f1"), padding:"10px 14px" }}>Save</button>
                </div>
              </div>
            )}

            <h3 style={{ fontSize:13, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>📋 Review</h3>
            {answers.map((a,i) => (
              <div key={i} style={{ ...card, padding:10, marginBottom:7, borderLeft:`3px solid ${a.ok?"#10b981":"#ef4444"}` }}>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:3 }}>Q{i+1}: {a.q.q}</div>
                <div style={{ fontSize:13, color:a.ok?"#10b981":"#ef4444" }}>
                  {a.ok?"✅":"❌"} {a.sel===-1?"⏱ Time out":a.q.options[a.sel]}
                  {!a.ok&&<span style={{ color:"#10b981" }}> → {a.q.options[a.q.answer]}</span>}
                </div>
              </div>
            ))}

            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={() => startQuiz(category)} style={{ ...btn("rgba(99,102,241,0.15)","#a5b4fc"), flex:1 }}>🔄 വീണ്ടും</button>
              <button onClick={() => setScreen("home")} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), flex:1 }}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* STATS */}
        {screen === "stats" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>📊 My Statistics</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>നിങ്ങളുടെ പ്രകടനം</p>
            {Object.keys(stats).length === 0
              ? <div style={{ ...card, padding:36, textAlign:"center", color:"#475569" }}><div style={{ fontSize:36 }}>📊</div><p style={{ marginTop:10 }}>ഇതുവരെ Quiz കളിച്ചിട്ടില്ല!</p></div>
              : Object.entries(stats).map(([topic, data]) => {
                  const pct = Math.round((data.correct/data.attempts)*100);
                  return (
                    <div key={topic} style={{ ...card, padding:14, marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontWeight:700 }}>{CATEGORIES[topic]?.icon} {CATEGORIES[topic]?.label || topic}</span>
                        <span style={{ color:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444", fontWeight:700 }}>{pct}%</span>
                      </div>
                      <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444", borderRadius:4, transition:"width 0.5s" }} />
                      </div>
                      <div style={{ fontSize:12, color:"#475569", marginTop:6 }}>{data.correct}/{data.attempts} correct</div>
                    </div>
                  );
                })
            }
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%", marginTop:14 }}>← Back</button>
          </div>
        )}

        {/* LEADERBOARD */}
        {screen === "leaderboard" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>🏆 Leaderboard</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>മികച്ച Players</p>
            {leaderboard.length === 0
              ? <div style={{ ...card, padding:36, textAlign:"center", color:"#475569" }}><div style={{ fontSize:36 }}>🏆</div><p style={{ marginTop:10 }}>ഇതുവരെ score save ചെയ്തിട്ടില്ല!</p></div>
              : leaderboard.map((e,i) => (
                <div key={i} style={{ ...card, display:"flex", alignItems:"center", gap:10, padding:12, marginBottom:7, borderLeft:`3px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":"#334155"}` }}>
                  <span style={{ fontSize:20, width:28, textAlign:"center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700 }}>{e.name}</div>
                    <div style={{ fontSize:11, color:"#475569" }}>{CATEGORIES[e.cat]?.label} • {e.date}</div>
                  </div>
                  <div style={{ fontWeight:800, color:"#6366f1", fontSize:18 }}>{e.score}/{e.total}</div>
                </div>
              ))
            }
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%", marginTop:14 }}>← Back</button>
          </div>
        )}

        {/* BOOKMARKS */}
        {screen === "bookmarks" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>🔖 Bookmarks</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>Save ചെയ്ത ചോദ്യങ്ങൾ</p>
            {bookmarks.length === 0
              ? <div style={{ ...card, padding:36, textAlign:"center", color:"#475569" }}><div style={{ fontSize:36 }}>🔖</div><p style={{ marginTop:10 }}>ഒന്നും save ചെയ്തിട്ടില്ല!</p></div>
              : bookmarks.map((bq,i) => (
                <div key={i} style={{ ...card, padding:12, marginBottom:8 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, color:"#e2e8f0", marginBottom:4, lineHeight:1.5 }}>{bq.q}</p>
                      {bq.qm && <p style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>{bq.qm}</p>}
                      <div style={{ fontSize:12, background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:7, padding:"3px 9px", display:"inline-block", color:"#10b981" }}>✅ {bq.options[bq.answer]}</div>
                    </div>
                    <button onClick={() => toggleBm(bq)} style={{ ...btn("rgba(239,68,68,0.08)","#ef4444"), padding:"5px 9px", fontSize:12 }}>✕</button>
                  </div>
                </div>
              ))
            }
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%", marginTop:14 }}>← Back</button>
          </div>
        )}

        {/* ADMIN PANEL */}
        {screen === "admin" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>⚙️ Admin Panel</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:16 }}>Questions manage ചെയ്യൂ</p>

            {!adminOk ? (
              <div style={{ ...card, padding:20 }}>
                <p style={{ color:"#94a3b8", marginBottom:12 }}>🔐 Admin Password</p>
                <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password..." style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 12px", color:"#e2e8f0", fontSize:14, marginBottom:10 }} />
                <button onClick={() => { if(adminPass===ADMIN_PASSWORD) setAdminOk(true); else alert("Wrong password!"); }} style={{ ...btn("#6366f1"), width:"100%" }}>Login</button>
                <p style={{ color:"#475569", fontSize:12, marginTop:10, textAlign:"center" }}>Default: pscadmin123</p>
              </div>
            ) : (
              <div>
                {/* Google Sheets */}
                <div style={{ ...card, padding:16, marginBottom:12, borderLeft:"3px solid #10b981" }}>
                  <div style={{ fontWeight:700, color:"#10b981", marginBottom:8 }}>📊 Google Sheets Connect</div>
                  <input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="Sheet ID paste ചെയ്യൂ..." style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 12px", color:"#e2e8f0", fontSize:13, marginBottom:8 }} />
                  <button onClick={() => { localStorage.setItem("sheet_id",sheetId); loadSheet(sheetId); }} style={{ ...btn("#10b981"), width:"100%" }}>
                    {sheetStatus==="loading"?"⏳ Loading...":sheetStatus==="success"?"✅ Connected":"Connect Sheet"}
                  </button>
                </div>

                {/* Add Question */}
                <div style={{ ...card, padding:16, marginBottom:12, borderLeft:"3px solid #6366f1" }}>
                  <div style={{ fontWeight:700, color:"#a5b4fc", marginBottom:12 }}>➕ Question Add ചെയ്യൂ</div>
                  {[["q","Question (English)"],["qm","Question (Malayalam)"],["o1","Option A"],["o2","Option B"],["o3","Option C"],["o4","Option D"]].map(([key,ph]) => (
                    <input key={key} value={newQ[key]} onChange={e=>setNewQ({...newQ,[key]:e.target.value})} placeholder={ph} style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, marginBottom:8 }} />
                  ))}
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={{ flex:1, background:"#1e1b4b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13 }}>
                      <option value="0">Answer: A</option><option value="1">Answer: B</option><option value="2">Answer: C</option><option value="3">Answer: D</option>
                    </select>
                    <select value={newQ.topic} onChange={e=>setNewQ({...newQ,topic:e.target.value})} style={{ flex:1, background:"#1e1b4b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13 }}>
                      {Object.entries(CATEGORIES).filter(([k])=>k!=="mock").map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={newQ.difficulty} onChange={e=>setNewQ({...newQ,difficulty:e.target.value})} style={{ flex:1, background:"#1e1b4b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13 }}>
                      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                  </div>
                  <button onClick={addCustomQ} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%" }}>➕ Add Question</button>
                </div>

                {/* Custom Q count */}
                <div style={{ ...card, padding:12, marginBottom:12, textAlign:"center" }}>
                  <div style={{ color:"#a5b4fc", fontSize:14 }}>📝 നിങ്ങൾ add ചെയ്ത questions: <strong>{customQ.length}</strong></div>
                  {customQ.length > 0 && <button onClick={() => { setCustomQ([]); localStorage.removeItem("custom_questions"); }} style={{ ...btn("rgba(239,68,68,0.1)","#ef4444"), marginTop:8, fontSize:12 }}>🗑️ Clear All Custom</button>}
                </div>

                <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%" }}>← Back</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
