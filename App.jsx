import { useState, useEffect, useRef } from "react";

// ============================================================
// 🔧 SETUP: Google Sheets-ൽ നിന്ന് ചോദ്യങ്ങൾ fetch ചെയ്യാൻ
// താഴെ SHEET_ID-ൽ നിങ്ങളുടെ Google Sheet ID paste ചെയ്യുക
// ============================================================
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Questions`;

// Fallback questions (Sheet load ആകുന്നത് വരെ)
const FALLBACK_QUESTIONS = [
  { id: 1, q: "Kerala was formed on which date?", qm: "കേരളം ഏത് തീയതിയിൽ രൂപീകരിച്ചു?", options: ["November 1, 1956","August 15, 1947","January 26, 1950","November 1, 1960"], answer: 0, topic: "history" },
  { id: 2, q: "Who is known as the Father of Kerala Renaissance?", qm: "കേരള നവോത്ഥാനത്തിന്റെ പിതാവ് ആര്?", options: ["Sree Narayana Guru","Ayyankali","Chattampi Swamikal","Kumaranashan"], answer: 0, topic: "history" },
  { id: 3, q: "Which is the longest river in Kerala?", qm: "കേരളത്തിലെ ഏറ്റവും നീളം കൂടിയ നദി?", options: ["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer: 1, topic: "geography" },
  { id: 4, q: "Chemical symbol of Gold?", qm: "സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options: ["Go","Gd","Au","Ag"], answer: 2, topic: "science" },
  { id: 5, q: "Chandrayaan-3 landed on Moon in?", qm: "ചന്ദ്രയാൻ-3 ചന്ദ്രനിൽ ഇറങ്ങിയ വർഷം?", options: ["2022","2023","2024","2021"], answer: 1, topic: "current" },
  { id: 6, q: "Who founded Indian National Congress?", qm: "ഇന്ത്യൻ നാഷണൽ കോൺഗ്രസ് സ്ഥാപിച്ചത്?", options: ["Mahatma Gandhi","AO Hume","Bal Gangadhar Tilak","Gokhale"], answer: 1, topic: "history" },
  { id: 7, q: "Capital of India?", qm: "ഇന്ത്യയുടെ തലസ്ഥാനം?", options: ["Mumbai","Kolkata","New Delhi","Chennai"], answer: 2, topic: "geography" },
  { id: 8, q: "Speed of light?", qm: "പ്രകാശ വേഗത?", options: ["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"], answer: 0, topic: "science" },
  { id: 9, q: "President of India 2024?", qm: "ഇന്ത്യൻ രാഷ്ട്രപതി 2024?", options: ["Ram Nath Kovind","Droupadi Murmu","Pranab Mukherjee","APJ Abdul Kalam"], answer: 1, topic: "current" },
  { id: 10, q: "Battle of Plassey was fought in?", qm: "പ്ലാസി യുദ്ധം നടന്ന വർഷം?", options: ["1757","1764","1799","1857"], answer: 0, topic: "history" },
];

const TOPIC_META = {
  all:       { label: "All Topics",      labelM: "എല്ലാ വിഷയങ്ങളും", icon: "🎯", color: "#6366f1" },
  daily:     { label: "Daily Quiz",      labelM: "ദൈനംദിന ക്വിസ്",   icon: "☀️", color: "#f59e0b" },
  history:   { label: "History",         labelM: "ചരിത്രം",            icon: "🏛️", color: "#8b5cf6" },
  science:   { label: "Science",         labelM: "ശാസ്ത്രം",           icon: "🔬", color: "#10b981" },
  geography: { label: "Geography",       labelM: "ഭൂമിശാസ്ത്രം",      icon: "🌍", color: "#3b82f6" },
  current:   { label: "Current Affairs", labelM: "കറന്റ് അഫയേഴ്സ്",  icon: "📰", color: "#ef4444" },
};

// Parse Google Sheets gviz JSON response
function parseSheetData(raw) {
  try {
    const json = JSON.parse(raw.replace(/.*?({.*})/s, "$1"));
    const rows = json.table.rows;
    return rows.map((row, i) => {
      const c = row.c;
      const get = (idx) => (c[idx] && c[idx].v !== null ? String(c[idx].v).trim() : "");
      return {
        id: i + 100,
        q: get(0),
        qm: get(1),
        options: [get(2), get(3), get(4), get(5)],
        answer: parseInt(get(6)) || 0,
        topic: get(7).toLowerCase() || "daily",
      };
    }).filter(q => q.q && q.options[0]);
  } catch (e) {
    return null;
  }
}

export default function PSCQuizApp() {
  const [screen, setScreen] = useState("home");
  const [allQuestions, setAllQuestions] = useState(FALLBACK_QUESTIONS);
  const [sheetStatus, setSheetStatus] = useState("idle"); // idle | loading | success | error
  const [topic, setTopic] = useState("all");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("psc_bookmarks") || "[]"); } catch { return []; }
  });
  const [leaderboard, setLeaderboard] = useState(() => {
    try { return JSON.parse(localStorage.getItem("psc_leaderboard") || "[]"); } catch { return []; }
  });
  const [nameInput, setNameInput] = useState("");
  const [playerSaved, setPlayerSaved] = useState(false);
  const [timer, setTimer] = useState(20);
  const [sheetIdInput, setSheetIdInput] = useState(SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE" ? "" : SHEET_ID);
  const [savedSheetId, setSavedSheetId] = useState(() => localStorage.getItem("psc_sheet_id") || "");
  const timerRef = useRef(null);

  // Load from Google Sheets on mount or when savedSheetId changes
  useEffect(() => {
    const id = savedSheetId;
    if (!id || id === "YOUR_GOOGLE_SHEET_ID_HERE") return;
    setSheetStatus("loading");
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=Sheet1`;
    fetch(url)
      .then(r => r.text())
      .then(raw => {
        const parsed = parseSheetData(raw);
        if (parsed && parsed.length > 0) {
          setAllQuestions([...FALLBACK_QUESTIONS, ...parsed]);
          setSheetStatus("success");
        } else {
          setSheetStatus("error");
        }
      })
      .catch(() => setSheetStatus("error"));
  }, [savedSheetId]);

  // Timer
  useEffect(() => {
    if (screen === "quiz" && selected === null) {
      setTimer(20);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); handleAnswer(-1); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [current, screen]);

  const startQuiz = (t) => {
    const filtered = t === "all" ? allQuestions : allQuestions.filter(q => q.topic === t);
    const qs = [...filtered].sort(() => Math.random() - 0.5).slice(0, 10);
    setTopic(t);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setPlayerSaved(false);
    setScreen("quiz");
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    setSelected(idx);
    const q = questions[current];
    const correct = idx === q.answer;
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { q, selected: idx, correct }]);
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) { setScreen("result"); return; }
    setCurrent(c => c + 1);
    setSelected(null);
  };

  const saveScore = () => {
    if (!nameInput.trim()) return;
    const entry = { name: nameInput.trim(), score, total: questions.length, topic, date: new Date().toLocaleDateString("ml-IN") };
    const updated = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 20);
    setLeaderboard(updated);
    try { localStorage.setItem("psc_leaderboard", JSON.stringify(updated)); } catch {}
    setPlayerSaved(true);
  };

  const toggleBookmark = (q) => {
    const exists = bookmarks.find(b => b.id === q.id);
    const updated = exists ? bookmarks.filter(b => b.id !== q.id) : [...bookmarks, q];
    setBookmarks(updated);
    try { localStorage.setItem("psc_bookmarks", JSON.stringify(updated)); } catch {}
  };

  const isBookmarked = (id) => bookmarks.some(b => b.id === id);

  const saveSheetId = () => {
    if (!sheetIdInput.trim()) return;
    setSavedSheetId(sheetIdInput.trim());
    try { localStorage.setItem("psc_sheet_id", sheetIdInput.trim()); } catch {}
  };

  const topicCounts = Object.keys(TOPIC_META).reduce((acc, k) => {
    acc[k] = k === "all" ? allQuestions.length : allQuestions.filter(q => q.topic === k).length;
    return acc;
  }, {});

  const q = questions[current];

  return (
    <div style={{ minHeight: "100vh", background: "#080812", fontFamily: "'Noto Sans Malayalam', 'Segoe UI', sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
        .btn { cursor: pointer; border: none; transition: all 0.18s; font-family: inherit; }
        .btn:hover { opacity: 0.88; } .btn:active { transform: scale(0.96); }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
        @keyframes pop { from{transform:scale(0.93);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pop { animation: pop 0.28s cubic-bezier(.34,1.56,.64,1); }
        .blink { animation: blink 0.9s ease infinite; }
        input { font-family: inherit; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#13103a,#1e1b4b)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(99,102,241,0.25)", position: "sticky", top: 0, zIndex: 100 }}>
        <div onClick={() => setScreen("home")} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#a5b4fc", letterSpacing: -0.5 }}>🎓 PSC Quiz</div>
          <div style={{ fontSize: 10, color: "#4f46e5", letterSpacing: 2, marginTop: 1 }}>KERALA PSC • DAILY UPDATE</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setScreen("setup")} title="Google Sheets Setup" style={{ background: sheetStatus === "success" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${sheetStatus === "success" ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "6px 11px", color: sheetStatus === "success" ? "#10b981" : "#94a3b8", fontSize: 13 }}>
            {sheetStatus === "loading" ? "⏳" : sheetStatus === "success" ? "✅" : "⚙️"}
          </button>
          <button className="btn" onClick={() => setScreen("bookmarks")} style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "6px 11px", color: "#fbbf24", fontSize: 13 }}>🔖 {bookmarks.length}</button>
          <button className="btn" onClick={() => setScreen("leaderboard")} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "6px 11px", color: "#a5b4fc", fontSize: 13 }}>🏆</button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 15px 90px" }}>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div className="pop">
            <div style={{ textAlign: "center", padding: "28px 0 20px" }}>
              <div style={{ fontSize: 52 }}>🎯</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#c7d2fe", marginTop: 8 }}>Kerala PSC Quiz</h1>
              <p style={{ color: "#475569", fontSize: 13, marginTop: 5 }}>Daily Questions • Google Sheets Update</p>
              {sheetStatus === "success" && <div style={{ marginTop: 8, display: "inline-block", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "4px 14px", color: "#10b981", fontSize: 12 }}>✅ Google Sheets Connected</div>}
              {sheetStatus === "error" && <div style={{ marginTop: 8, display: "inline-block", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, padding: "4px 14px", color: "#ef4444", fontSize: 12 }}>⚠️ Sheet load failed — using offline questions</div>}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              {[{ l: "ചോദ്യങ്ങൾ", v: allQuestions.length, i: "📝" }, { l: "വിഷയങ്ങൾ", v: 5, i: "📚" }, { l: "Bookmarks", v: bookmarks.length, i: "🔖" }].map((s, i) => (
                <div key={i} className="card" style={{ flex: 1, padding: "12px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 20 }}>{s.i}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#818cf8" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Topics */}
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>വിഷയം തിരഞ്ഞെടുക്കൂ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {Object.entries(TOPIC_META).map(([key, meta]) => (
                <button key={key} className="btn card" onClick={() => startQuiz(key)}
                  style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", textAlign: "left", width: "100%", borderLeft: `3px solid ${meta.color}` }}>
                  <span style={{ fontSize: 26 }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>{meta.label}</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{meta.labelM}</div>
                  </div>
                  <div style={{ background: meta.color + "20", color: meta.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                    {topicCounts[key] || 0} Qs
                  </div>
                </button>
              ))}
            </div>

            {/* Setup prompt if not connected */}
            {sheetStatus !== "success" && (
              <button className="btn" onClick={() => setScreen("setup")} style={{ width: "100%", marginTop: 16, padding: 14, background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))", border: "1px dashed rgba(99,102,241,0.4)", borderRadius: 14, color: "#a5b4fc", fontWeight: 600, fontSize: 14 }}>
                ⚙️ Google Sheets Connect ചെയ്യൂ → Daily Updates കിട്ടും
              </button>
            )}
          </div>
        )}

        {/* ── SETUP ── */}
        {screen === "setup" && (
          <div className="pop" style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#c7d2fe", marginBottom: 4 }}>⚙️ Google Sheets Setup</h2>
            <p style={{ color: "#475569", fontSize: 13, marginBottom: 20 }}>ഒരിക്കൽ setup ചെയ്താൽ daily questions auto-update ആകും</p>

            {/* Step 1 */}
            <div className="card" style={{ padding: 16, marginBottom: 12, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>Step 1: Google Sheet ഉണ്ടാക്കുക</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                1. <strong style={{ color: "#e2e8f0" }}>sheets.google.com</strong> തുറക്കുക<br/>
                2. New Sheet ഉണ്ടാക്കുക<br/>
                3. Sheet name: <strong style={{ color: "#a5b4fc" }}>Questions</strong> എന്ന് rename ചെയ്യുക
              </div>
            </div>

            {/* Step 2 */}
            <div className="card" style={{ padding: 16, marginBottom: 12, borderLeft: "3px solid #10b981" }}>
              <div style={{ fontWeight: 700, color: "#10b981", marginBottom: 8 }}>Step 2: Column Headers ഇടുക (Row 1)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[["A","question_en"],["B","question_ml"],["C","option1"],["D","option2"],["E","option3"],["F","option4"],["G","answer (0-3)"],["H","topic"]].map(([col, label]) => (
                  <div key={col} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                    <span style={{ color: "#6366f1", fontWeight: 700 }}>{col}: </span>
                    <span style={{ color: "#94a3b8" }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
                topic values: <span style={{ color: "#a5b4fc" }}>daily | history | science | geography | current</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="card" style={{ padding: 16, marginBottom: 12, borderLeft: "3px solid #3b82f6" }}>
              <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: 8 }}>Step 3: Sheet Public ആക്കുക</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                1. Share button click ചെയ്യുക<br/>
                2. "Anyone with the link" → <strong style={{ color: "#e2e8f0" }}>Viewer</strong> set ചെയ്യുക<br/>
                3. Done!
              </div>
            </div>

            {/* Step 4 */}
            <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: "3px solid #8b5cf6" }}>
              <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>Step 4: Sheet ID ഇവിടെ Paste ചെയ്യുക</div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>
                URL-ൽ നിന്ന്: docs.google.com/spreadsheets/d/<strong style={{ color: "#fbbf24" }}>THIS_PART</strong>/edit
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={sheetIdInput}
                  onChange={e => setSheetIdInput(e.target.value)}
                  placeholder="Sheet ID paste ചെയ്യുക..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 13px", color: "#e2e8f0", fontSize: 13 }}
                />
                <button className="btn" onClick={saveSheetId} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, padding: "10px 16px", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                  Connect
                </button>
              </div>
              {sheetStatus === "loading" && <div style={{ marginTop: 10, color: "#f59e0b", fontSize: 13 }}>⏳ Connecting...</div>}
              {sheetStatus === "success" && <div style={{ marginTop: 10, color: "#10b981", fontSize: 13 }}>✅ Successfully connected! Questions loaded.</div>}
              {sheetStatus === "error" && <div style={{ marginTop: 10, color: "#ef4444", fontSize: 13 }}>❌ Connection failed. Sheet ID ശരിയാണോ? Public ആക്കിയോ?</div>}
            </div>

            <button className="btn" onClick={() => setScreen("home")} style={{ width: "100%", padding: 14, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, color: "#a5b4fc", fontWeight: 600 }}>← Home-ലേക്ക് പോകുക</button>
          </div>
        )}

        {/* ── QUIZ ── */}
        {screen === "quiz" && q && (
          <div className="pop" style={{ paddingTop: 18 }}>
            {/* Progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ color: "#475569", fontSize: 13 }}>{current + 1} / {questions.length}</span>
                <span className={timer <= 5 ? "blink" : ""} style={{ color: timer <= 5 ? "#ef4444" : "#10b981", fontWeight: 800, fontSize: 16, background: timer <= 5 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)", padding: "3px 12px", borderRadius: 20 }}>
                  ⏱ {timer}s
                </span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(current / questions.length) * 100}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>

            {/* Score + Bookmark */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "5px 13px", color: "#10b981", fontSize: 13 }}>✅ {score} correct</div>
              <button className="btn" onClick={() => toggleBookmark(q)} style={{ background: isBookmarked(q.id) ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${isBookmarked(q.id) ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "5px 13px", color: isBookmarked(q.id) ? "#fbbf24" : "#475569", fontSize: 13 }}>
                {isBookmarked(q.id) ? "🔖 Saved" : "🔖 Save"}
              </button>
            </div>

            {/* Question Card */}
            <div className="card" style={{ padding: 18, marginBottom: 14, background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.04))", borderColor: "rgba(99,102,241,0.18)" }}>
              <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 7, textTransform: "uppercase", letterSpacing: 1.5 }}>
                {TOPIC_META[q.topic]?.icon} {TOPIC_META[q.topic]?.label}
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.65 }}>{q.q}</p>
              {q.qm && <p style={{ fontSize: 13, color: "#64748b", marginTop: 7, lineHeight: 1.6 }}>{q.qm}</p>}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
              {q.options.map((opt, i) => {
                if (!opt) return null;
                let bg = "rgba(255,255,255,0.03)";
                let border = "rgba(255,255,255,0.08)";
                let col = "#e2e8f0";
                if (selected !== null) {
                  if (i === q.answer) { bg = "rgba(16,185,129,0.12)"; border = "#10b981"; col = "#10b981"; }
                  else if (i === selected) { bg = "rgba(239,68,68,0.12)"; border = "#ef4444"; col = "#ef4444"; }
                }
                return (
                  <button key={i} className="btn" onClick={() => handleAnswer(i)}
                    style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 15px", background: bg, border: `1.5px solid ${border}`, borderRadius: 12, color: col, textAlign: "left", fontSize: 14, lineHeight: 1.5 }}>
                    <span style={{ width: 27, height: 27, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0, border: `1px solid ${border}` }}>
                      {["A","B","C","D"][i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div className="pop">
                <div className="card" style={{ padding: 13, marginBottom: 11, borderLeft: `3px solid ${selected === q.answer ? "#10b981" : "#ef4444"}`, background: selected === q.answer ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)" }}>
                  <div style={{ fontWeight: 700, color: selected === q.answer ? "#10b981" : "#ef4444" }}>
                    {selected === q.answer ? "✅ ശരിയാണ്!" : "❌ തെറ്റ്!"}
                  </div>
                  {selected !== q.answer && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>✔ ശരിയുത്തരം: <strong style={{ color: "#a5b4fc" }}>{q.options[q.answer]}</strong></div>}
                </div>
                <button className="btn" onClick={nextQuestion} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  {current + 1 >= questions.length ? "📊 Result കാണുക" : "അടുത്ത ചോദ്യം →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === "result" && (
          <div className="pop" style={{ paddingTop: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 60 }}>{score >= questions.length * 0.8 ? "🏆" : score >= questions.length * 0.5 ? "😊" : "💪"}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#c7d2fe", marginTop: 8 }}>Quiz Complete!</h2>
              <div style={{ fontSize: 52, fontWeight: 900, color: "#6366f1", margin: "10px 0" }}>{score}<span style={{ fontSize: 24, color: "#475569" }}>/{questions.length}</span></div>
              <div style={{ color: "#64748b" }}>
                {score >= questions.length * 0.8 ? "🔥 മികച്ച പ്രകടനം! Excellent!" : score >= questions.length * 0.5 ? "👍 നല്ല ശ്രമം! Good effort!" : "📖 കൂടുതൽ പഠിക്കൂ! Keep going!"}
              </div>
            </div>

            {/* Save score */}
            {!playerSaved ? (
              <div className="card" style={{ padding: 15, marginBottom: 14 }}>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 9 }}>🏆 Score save ചെയ്യൂ</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="നിങ്ങളുടെ പേര്..." style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 13px", color: "#e2e8f0", fontSize: 13 }} />
                  <button className="btn" onClick={saveScore} style={{ background: "#6366f1", borderRadius: 10, padding: "10px 16px", color: "#fff", fontWeight: 700 }}>Save</button>
                </div>
              </div>
            ) : <div style={{ textAlign: "center", color: "#10b981", marginBottom: 14, fontSize: 14 }}>✅ Score saved!</div>}

            {/* Answer review */}
            <h3 style={{ fontSize: 13, color: "#475569", marginBottom: 9, textTransform: "uppercase", letterSpacing: 1 }}>📋 Review</h3>
            {answers.map((a, i) => (
              <div key={i} className="card" style={{ padding: 11, marginBottom: 7, borderLeft: `3px solid ${a.correct ? "#10b981" : "#ef4444"}` }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>Q{i+1}: {a.q.q}</div>
                <div style={{ fontSize: 13, color: a.correct ? "#10b981" : "#ef4444" }}>
                  {a.correct ? "✅" : "❌"} {a.selected === -1 ? "⏱ Time out" : a.q.options[a.selected]}
                  {!a.correct && a.selected !== -1 && <span style={{ color: "#10b981" }}> → {a.q.options[a.q.answer]}</span>}
                  {!a.correct && a.selected === -1 && <span style={{ color: "#10b981" }}> → {a.q.options[a.q.answer]}</span>}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
              <button className="btn" onClick={() => startQuiz(topic)} style={{ flex: 1, padding: 13, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, color: "#a5b4fc", fontWeight: 700 }}>🔄 വീണ്ടും</button>
              <button className="btn" onClick={() => setScreen("home")} style={{ flex: 1, padding: 13, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, color: "#fff", fontWeight: 700 }}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {screen === "leaderboard" && (
          <div className="pop" style={{ paddingTop: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#c7d2fe", marginBottom: 4 }}>🏆 Leaderboard</h2>
            <p style={{ color: "#475569", fontSize: 13, marginBottom: 18 }}>മികച്ച Players</p>
            {leaderboard.length === 0
              ? <div className="card" style={{ padding: 36, textAlign: "center", color: "#475569" }}><div style={{ fontSize: 36 }}>🏆</div><p style={{ marginTop: 10 }}>Score ഇതുവരെ save ചെയ്തിട്ടില്ല!</p></div>
              : leaderboard.map((e, i) => (
                <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: 13, marginBottom: 7, borderLeft: `3px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":"#334155"}` }}>
                  <span style={{ fontSize: 22, width: 30, textAlign: "center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{TOPIC_META[e.topic]?.label} • {e.date}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#6366f1", fontSize: 18 }}>{e.score}/{e.total}</div>
                </div>
              ))
            }
            <button className="btn" onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 14, padding: 13, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12, color: "#a5b4fc", fontWeight: 600 }}>← Back</button>
          </div>
        )}

        {/* ── BOOKMARKS ── */}
        {screen === "bookmarks" && (
          <div className="pop" style={{ paddingTop: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#c7d2fe", marginBottom: 4 }}>🔖 Bookmarks</h2>
            <p style={{ color: "#475569", fontSize: 13, marginBottom: 18 }}>Save ചെയ്ത ചോദ്യങ്ങൾ</p>
            {bookmarks.length === 0
              ? <div className="card" style={{ padding: 36, textAlign: "center", color: "#475569" }}><div style={{ fontSize: 36 }}>🔖</div><p style={{ marginTop: 10 }}>ഒന്നും save ചെയ്തിട്ടില്ല!</p></div>
              : bookmarks.map((bq, i) => (
                <div key={i} className="card" style={{ padding: 13, marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 5, lineHeight: 1.55 }}>{bq.q}</p>
                      {bq.qm && <p style={{ fontSize: 12, color: "#64748b", marginBottom: 7 }}>{bq.qm}</p>}
                      <div style={{ fontSize: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, padding: "3px 9px", display: "inline-block", color: "#10b981" }}>✅ {bq.options[bq.answer]}</div>
                    </div>
                    <button className="btn" onClick={() => toggleBookmark(bq)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 9px", color: "#ef4444", fontSize: 12, flexShrink: 0 }}>✕</button>
                  </div>
                </div>
              ))
            }
            <button className="btn" onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 14, padding: 13, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12, color: "#a5b4fc", fontWeight: 600 }}>← Back</button>
          </div>
        )}

      </div>
    </div>
  );
}
