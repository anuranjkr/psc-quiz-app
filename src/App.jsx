import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail
} from "firebase/auth";
import {
  getDatabase, ref, set, get, onValue, push,
  serverTimestamp, query, orderByChild, limitToLast,
  remove, update
} from "firebase/database";

// ─── Firebase Config ───────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyArFo7B3M7lSfbOzUSycMUsnke8YSck74k",
  authDomain: "psc-quiz-kerala.firebaseapp.com",
  databaseURL: "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "psc-quiz-kerala",
  storageBucket: "psc-quiz-kerala.firebasestorage.app",
  messagingSenderId: "100637065162",
  appId: "1:100637065162:web:d492ed8ff24718ca215933",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);
const gProvider = new GoogleAuthProvider();

// ─── Constants ─────────────────────────────────────────────
const SUPER_ADMIN = "anuranjkr45@gmail.com";

const DEFAULT_CATS = [
  { id:"ldc",       label:"LDC / LGS",       icon:"📋", color:"#6366f1" },
  { id:"psc",       label:"PSC General",      icon:"🏛️", color:"#8b5cf6" },
  { id:"police",    label:"Police / SI",      icon:"👮", color:"#3b82f6" },
  { id:"science",   label:"Science",          icon:"🔬", color:"#10b981" },
  { id:"history",   label:"History",          icon:"📜", color:"#f59e0b" },
  { id:"geography", label:"Geography",        icon:"🌍", color:"#06b6d4" },
  { id:"current",   label:"Current Affairs",  icon:"📰", color:"#ef4444" },
];

const BUILTIN_Q = [
  { id:"b1",  q:"Kerala formed on?",                qm:"കേരളം രൂപീകരിച്ചത്?",                options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"],                   answer:0, cat:"ldc",       explanation:"Kerala was formed on November 1, 1956." },
  { id:"b2",  q:"Longest river in Kerala?",         qm:"കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?",  options:["Periyar","Bharathapuzha","Pamba","Chaliyar"],                                answer:1, cat:"ldc",       explanation:"Bharathapuzha (312 km) is the longest river in Kerala." },
  { id:"b3",  q:"Capital of Kerala?",               qm:"കേരളത്തിന്റെ തലസ്ഥാനം?",            options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"],                          answer:2, cat:"ldc",       explanation:"Thiruvananthapuram is the capital of Kerala." },
  { id:"b4",  q:"Highest peak in Kerala?",          qm:"കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options:["Chembra","Anamudi","Meesapulimala","Agasthyamala"],                      answer:1, cat:"ldc",       explanation:"Anamudi (2695m) is the highest peak." },
  { id:"b5",  q:"Father of Indian Constitution?",   qm:"ഭരണഘടനയുടെ പിതാവ്?",               options:["Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"],                       answer:2, cat:"psc",       explanation:"Dr. BR Ambedkar is the Father of the Indian Constitution." },
  { id:"b6",  q:"National game of India?",          qm:"ദേശീയ കായിക വിനോദം?",               options:["Cricket","Football","Hockey","Kabaddi"],                                      answer:2, cat:"psc",       explanation:"Hockey is the national game of India." },
  { id:"b7",  q:"IPC stands for?",                  qm:"IPC-യുടെ പൂർണ്ണ രൂപം?",              options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, cat:"police", explanation:"IPC - Indian Penal Code, enacted in 1860." },
  { id:"b8",  q:"Chemical symbol of Gold?",         qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?",       options:["Go","Gd","Au","Ag"],                                                         answer:2, cat:"science",   explanation:"Au comes from Latin 'Aurum'." },
  { id:"b9",  q:"Speed of light?",                  qm:"പ്രകാശ വേഗത?",                        options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"],                           answer:0, cat:"science",   explanation:"Speed of light = 3×10⁸ m/s." },
  { id:"b10", q:"Battle of Plassey year?",           qm:"പ്ലാസി യുദ്ധം?",                      options:["1747","1757","1764","1799"],                                                  answer:1, cat:"history",   explanation:"Battle of Plassey was fought in 1757." },
  { id:"b11", q:"Chandrayaan-3 landed in?",         qm:"ചന്ദ്രയാൻ-3 ഇറങ്ങിയ വർഷം?",         options:["2021","2022","2023","2024"],                                                  answer:2, cat:"current",   explanation:"Chandrayaan-3 landed on Moon on August 23, 2023." },
  { id:"b12", q:"Largest state in India by area?",  qm:"ഏറ്റവും വലിയ സംസ്ഥാനം?",             options:["MP","Maharashtra","Rajasthan","UP"],                                          answer:2, cat:"geography", explanation:"Rajasthan is the largest state." },
];

const FORUM_CATS = [
  { id:"general",    label:"General",       icon:"💬", color:"#6366f1" },
  { id:"ldc",        label:"LDC Tips",      icon:"📋", color:"#8b5cf6" },
  { id:"current",    label:"Current",       icon:"📰", color:"#ef4444" },
  { id:"doubt",      label:"Doubts",        icon:"🤔", color:"#f59e0b" },
  { id:"resources",  label:"Resources",     icon:"📚", color:"#10b981" },
  { id:"motivation", label:"Motivation",    icon:"🔥", color:"#06b6d4" },
];

const ICONS = ["📋","🏛️","👮","🔬","📜","🌍","📰","🎯","📚","✏️","🧪","⚖️","💡","🗺️","🏆","📖","🔭","🧮","🏅","📐"];
const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#10b981","#f59e0b","#06b6d4","#ef4444","#ec4899","#84cc16","#f97316"];

const computerAnswer = (q) => Math.random() < 0.65 ? q.answer : (q.answer + 1 + Math.floor(Math.random()*3)) % 4;

const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60000) return "now";
  if (d < 3600000) return Math.floor(d/60000)+"m ago";
  if (d < 86400000) return Math.floor(d/3600000)+"h ago";
  return Math.floor(d/86400000)+"d ago";
};

// ─── Puter.js AI Quiz Generator Component ────────────────────
function PuterQuizGenerator({ db, categories, user, showNotif }) {
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [qCount, setQCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [includeMalayalam, setIncludeMalayalam] = useState(false);
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genStatus, setGenStatus] = useState("idle");
  const [genMsg, setGenMsg] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editQ, setEditQ] = useState(null);
  const [isPuterSignedIn, setIsPuterSignedIn] = useState(false);

  useEffect(() => {
    if (window.puter && window.puter.auth && window.puter.auth.isSignedIn()) {
      setIsPuterSignedIn(true);
    }
  }, []);

  const handlePuterLogin = async () => {
    try {
      if (!window.puter || !window.puter.auth) {
        setGenMsg("❌ Puter.js load ആയിട്ടില്ല!");
        return;
      }
      setGenMsg("⏳ ലോഗിൻ വിൻഡോ തുറക്കുന്നു...");
      await window.puter.auth.signIn();
      setIsPuterSignedIn(true);
      setGenMsg("✅ ലോഗിൻ വിജയകരം! ഇനി Generate ചെയ്യാം.");
      showNotif("Puter Login Success!");
    } catch (error) {
      setGenMsg("❌ ലോഗിൻ പരാജയപ്പെട്ടു അല്ലെങ്കിൽ നിങ്ങൾ ക്യാൻസൽ ചെയ്തു.");
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) { setGenMsg("❌ Topic ഇടൂ!"); return; }
    
    setGenStatus("loading");
    setGenMsg("🤖 Puter AI generating questions...");
    setGeneratedQs([]);

    try {
      const malayalamInstruction = includeMalayalam
        ? `Also provide a Malayalam translation of the question in the "qm" field.`
        : `Leave "qm" as empty string "".`;

      const prompt = `You are an expert quiz creator for Kerala PSC exams.
Generate exactly ${qCount} multiple choice questions about the topic: "${topic}"
Difficulty level: ${difficulty}
Category: ${categories.find(c => c.id === targetCat)?.label || targetCat}
Requirements: 4 options, ONE correct answer, factually accurate, ${malayalamInstruction}
Respond ONLY with a valid JSON array. Example:
[{"q": "Question", "qm": "ചോദ്യം", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "Why"}]`;

      const puterPromise = window.puter.ai.chat(prompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout! AI എടുക്കാൻ വൈകുന്നു.")), 30000)
      );

      const response = await Promise.race([puterPromise, timeoutPromise]);
      
      let rawText = "";
      if (typeof response === 'string') rawText = response;
      else if (response?.text) rawText = response.text;
      else if (response?.message?.content) {
        if (typeof response.message.content === 'string') rawText = response.message.content;
        else if (Array.isArray(response.message.content)) rawText = response.message.content.map(b => b.text || "").join('\n');
      } else rawText = JSON.stringify(response);

      if (!rawText.trim()) throw new Error("AI ശൂന്യമായ മറുപടിയാണ് നൽകിയത്.");

      let cleaned = String(rawText).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error("AI തന്ന മറുപടിയിൽ JSON ഫോർമാറ്റ് കണ്ടെത്താൻ കഴിഞ്ഞില്ല.");

      const parsed = JSON.parse(arrMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("AI ചോദ്യങ്ങളൊന്നും ഉണ്ടാക്കിയില്ല.");

      const normalized = parsed.map((q, i) => {
        let ansIdx = 0;
        if (typeof q.answer === "number") ansIdx = q.answer;
        else if (typeof q.answer === "string") {
            const up = q.answer.toUpperCase();
            if (up === "A") ansIdx = 0; else if (up === "B") ansIdx = 1; else if (up === "C") ansIdx = 2; else if (up === "D") ansIdx = 3; else ansIdx = parseInt(q.answer) || 0;
        }
        return {
          q: q.q || q.question || `Question ${i + 1}`,
          qm: q.qm || "",
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options.map(o => String(o)) : ["Option A", "Option B", "Option C", "Option D"],
          answer: (ansIdx >= 0 && ansIdx <= 3) ? ansIdx : 0,
          explanation: q.explanation || "",
          cat: targetCat,
          _selected: true,
        };
      });

      const validQs = normalized.filter(q => q.q && q.q !== "Question 1");
      if(validQs.length === 0) throw new Error("AI ഫോർമാറ്റ് തെറ്റിച്ചാണ് ചോദ്യങ്ങൾ തന്നത്.");

      setGeneratedQs(validQs);
      setGenStatus("done");
      setGenMsg(`✅ ${validQs.length} questions generated successfully!`);
      
    } catch (e) {
      setGenStatus("error");
      setGenMsg(`❌ Error: ${e.message}`);
    }
  };

  const toggleSelect = (idx) => setGeneratedQs(prev => prev.map((q, i) => i === idx ? { ...q, _selected: !q._selected } : q));
  const selectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: true })));
  const deselectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: false })));

  const startEdit = (idx) => { setEditingIdx(idx); setEditQ({ ...generatedQs[idx] }); };
  const saveEdit = () => { setGeneratedQs(prev => prev.map((q, i) => i === editingIdx ? { ...editQ } : q)); setEditingIdx(null); setEditQ(null); showNotif("✏️ Question updated!"); };
  const removeQ = (idx) => { setGeneratedQs(prev => prev.filter((_, i) => i !== idx)); showNotif("Question removed.", "error"); };

  const uploadSelected = async () => {
    const toUpload = generatedQs.filter(q => q._selected);
    if (!toUpload.length) { showNotif("❌ Select at least one question!", "error"); return; }
    
    setUploadStatus(`⏳ Uploading ${toUpload.length} questions...`);
    let count = 0;
    try {
        for (const q of toUpload) {
          const { _selected, ...qData } = q;
          await push(ref(db, "questions"), {
            ...qData, 
            addedBy: user.email, 
            addedAt: serverTimestamp(), 
            source: "puter_ai", 
            topic: topic,
            cat: targetCat
          });
          count++;
        }
        showNotif(`🎉 ${count} AI questions uploaded to Firebase!`);
        setGeneratedQs(prev => prev.filter(q => !q._selected));
    } catch (err) {
        showNotif(`❌ Error: ${err.message}`, "error");
    } finally {
        setTimeout(() => setUploadStatus(""), 4000);
    }
  };

  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, fontFamily:"inherit", outline:"none" };
  const Sel = { ...Inp, background:"#0f0f1e" };
  const card = (ex={}) => ({ background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, ...ex });
  const glass = (ex={}) => ({ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, ...ex });
  const Btn = (bg, col="#fff", ex={}) => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", transition:"all 0.2s", ...ex });

  const selectedCount = generatedQs.filter(q => q._selected).length;

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,182,212,0.1))", border:"1px solid rgba(16,185,129,0.25)", borderRadius:16, padding:"16px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:52, background:"linear-gradient(135deg,#10b981,#06b6d4)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🤖</div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#6ee7b7", marginBottom:2 }}>Puter AI Quiz Generator</div>
          <div style={{ fontSize:11, color:"#475569", lineHeight:1.4 }}>Topic നൽകൂ → AI questions create ചെയ്യും → Firebase-ലേക്ക് upload ചെയ്യൂ!</div>
        </div>
      </div>

      <div style={{ ...card(), padding:14, marginBottom:12, borderLeft:"3px solid #10b981" }}>
        <div style={{ fontWeight:700, color:"#10b981", marginBottom:12, fontSize:13 }}>⚙️ Generator Settings</div>
        <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>Topic / Subject *</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Kerala History, Indian Constitution..." style={Inp} />
        
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>Category</label>
            <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={{ ...Sel, marginBottom:0 }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>No. of Questions</label>
            <select value={qCount} onChange={e => setQCount(Number(e.target.value))} style={{ ...Sel, marginBottom:0 }}>
              {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} Questions</option>)}
            </select>
          </div>
        </div>

        <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:6 }}>Difficulty</label>
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {[["easy","🟢 Easy","#10b981"],["medium","🟡 Medium","#f59e0b"],["hard","🔴 Hard","#ef4444"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setDifficulty(v)} style={{ flex:1, padding:"8px 0", background:difficulty===v?`${c}25`:"rgba(255,255,255,0.05)", border:`1.5px solid ${difficulty===v?c:"rgba(255,255,255,0.1)"}`, borderRadius:10, color:difficulty===v?c:"#64748b", cursor:"pointer", fontWeight:700, fontSize:12, transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>

        <button onClick={() => setIncludeMalayalam(!includeMalayalam)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", background:includeMalayalam?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.04)", border:`1.5px solid ${includeMalayalam?"#6366f1":"rgba(255,255,255,0.1)"}`, borderRadius:12, cursor:"pointer", marginBottom:14, transition:"all 0.2s" }}>
          <div style={{ width:38, height:22, borderRadius:11, background:includeMalayalam?"#6366f1":"rgba(255,255,255,0.1)", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left:includeMalayalam?18:3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"all 0.2s" }}/>
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:13, fontWeight:700, color:includeMalayalam?"#a5b4fc":"#64748b" }}>🔤 Include Malayalam Translation</div>
          </div>
        </button>

        {genMsg && (
          <div style={{ fontSize:13, marginBottom:10, padding:"10px 12px", borderRadius:10, background:genStatus==="done"?"rgba(16,185,129,0.1)":genStatus==="error"?"rgba(239,68,68,0.1)":"rgba(99,102,241,0.1)", color:genStatus==="done"?"#10b981":genStatus==="error"?"#ef4444":"#a5b4fc", border:`1px solid ${genStatus==="done"?"rgba(16,185,129,0.2)":genStatus==="error"?"rgba(239,68,68,0.2)":"rgba(99,102,241,0.2)"}` }}>{genMsg}</div>
        )}

        {!isPuterSignedIn ? (
          <button onClick={handlePuterLogin} style={{ ...Btn("linear-gradient(135deg,#f59e0b,#d97706)"), width:"100%", padding:14, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            🔐 ലോഗിൻ ചെയ്ത ശേഷം Generate ചെയ്യുക
          </button>
        ) : (
          <button onClick={generateQuiz} disabled={genStatus === "loading"} style={{ ...Btn("linear-gradient(135deg,#10b981,#06b6d4)"), width:"100%", padding:14, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:genStatus==="loading"?0.7:1 }}>
            {genStatus === "loading" ? <><span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>⚙️</span><span>Generating...</span></> : <>🤖 Generate {qCount} Questions</>}
          </button>
        )}
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {generatedQs.length > 0 && (
        <div>
          <div style={{ ...glass(), padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{ flex:1, fontSize:13, fontWeight:700, color:"#e2e8f0" }}>📋 {generatedQs.length} Questions</div>
            <button onClick={selectAll} style={{ ...Btn("rgba(99,102,241,0.15)", "#a5b4fc"), padding:"6px 10px", fontSize:11 }}>☑️ All</button>
            <button onClick={deselectAll} style={{ ...Btn("rgba(255,255,255,0.06)", "#64748b"), padding:"6px 10px", fontSize:11 }}>☐ None</button>
          </div>

          {generatedQs.map((q, idx) => (
            <div key={idx} style={{ ...card(), padding:12, marginBottom:8, borderLeft:`3px solid ${q._selected?"#10b981":"#334155"}`, opacity:q._selected?1:0.5, transition:"all 0.2s" }}>
              {editingIdx === idx ? (
                <div>
                  <input value={editQ.q} onChange={e => setEditQ({...editQ, q:e.target.value})} style={{ ...Inp, fontSize:12 }}/>
                  {editQ.options.map((opt, oi) => (
                    <input key={oi} value={opt} onChange={e => { const newOpts=[...editQ.options]; newOpts[oi]=e.target.value; setEditQ({...editQ,options:newOpts}); }} style={{ ...Inp, fontSize:12, borderColor:editQ.answer===oi?"#10b981":"rgba(255,255,255,0.12)" }}/>
                  ))}
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={saveEdit} style={{ ...Btn("linear-gradient(135deg,#10b981,#059669)"), flex:1, padding:"9px 0", fontSize:12 }}>✅ Save</button>
                    <button onClick={() => {setEditingIdx(null);setEditQ(null);}} style={{ ...Btn("rgba(255,255,255,0.06)", "#94a3b8"), flex:1, padding:"9px 0", fontSize:12 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => toggleSelect(idx)} style={{ width:20, height:20, borderRadius:6, background:q._selected?"#10b981":"rgba(255,255,255,0.06)", border:`1.5px solid ${q._selected?"#10b981":"rgba(255,255,255,0.2)"}`, cursor:"pointer", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>{q._selected?"✓":""}</button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:4 }}>{q.q}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:5 }}>
                      {q.options.map((opt, oi) => (
                        <span key={oi} style={{ fontSize:10, padding:"3px 9px", borderRadius:8, background:oi===q.answer?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.05)", color:oi===q.answer?"#10b981":"#64748b" }}>{opt} {oi===q.answer?"✅":""}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <button onClick={() => startEdit(idx)} style={{ ...Btn("rgba(99,102,241,0.15)", "#a5b4fc"), padding:"5px 8px", fontSize:11 }}>✏️</button>
                    <button onClick={() => removeQ(idx)} style={{ ...Btn("rgba(239,68,68,0.1)", "#ef4444"), padding:"5px 8px", fontSize:11 }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ ...card(), padding:14, marginTop:6, borderLeft:"3px solid #6366f1" }}>
            {uploadStatus && <div style={{ fontSize:13, marginBottom:10, color:uploadStatus.includes("✅")?"#10b981":"#a5b4fc" }}>{uploadStatus}</div>}
            <button onClick={uploadSelected} disabled={selectedCount === 0} style={{ ...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", padding:14 }}>🚀 Upload {selectedCount} Questions</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState(""); const [authMsg, setAuthMsg] = useState("");

  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [pendingQ, setPendingQ] = useState([]);
  const [myContribs, setMyContribs] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState({});

  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  const [battleType, setBattleType] = useState("1v1");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [roomErr, setRoomErr] = useState("");
  const [battleQ, setBattleQ] = useState([]);
  const [battleCurr, setBattleCurr] = useState(0);
  const [battlePicked, setBattlePicked] = useState(null);
  const [battleScore, setBattleScore] = useState(0);
  const [battleTimer, setBattleTimer] = useState(20);
  const [battleStarted, setBattleStarted] = useState(false);
  const battleTimerRef = useRef(null);
  const battleStartedRef = useRef(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatEndRef = useRef(null);

  const [forumPosts, setForumPosts] = useState([]);
  const [forumMsg, setForumMsg] = useState("");
  const [forumCat, setForumCat] = useState("general");
  const [forumFilter, setForumFilter] = useState("all");
  const forumEndRef = useRef(null);

  const [adminTab, setAdminTab] = useState("fix");
  const [newCat, setNewCat] = useState({ label:"", icon:"📋", color:"#6366f1" });
  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [addQStatus, setAddQStatus] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState(""); const [adminStatus, setAdminStatus] = useState("");
  const [sheetId, setSheetId] = useState(""); const [sheetStatus, setSheetStatus] = useState("idle"); const [sheetCat, setSheetCat] = useState("ldc");
  const [bulkText, setBulkText] = useState(""); const [bulkCat, setBulkCat] = useState("ldc");
  const [bulkPreview, setBulkPreview] = useState([]); const [bulkStatus, setBulkStatus] = useState("");

  const [cQ, setCQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [cStatus, setCStatus] = useState("");
  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const superA = u.email === SUPER_ADMIN;
        setIsSuperAdmin(superA);
        const adminSnap = await get(ref(db, `adminEmails/${u.email.replace(/\./g,"_")}`));
        const admin = superA || adminSnap.exists();
        setIsAdmin(admin);
        set(ref(db,`online/${u.uid}`), { name:u.displayName||u.email, time:Date.now() });
        loadData(u.uid, admin);
        setScreen("home");
      } else {
        setUser(null); setIsAdmin(false); setIsSuperAdmin(false);
        setTimeout(() => setScreen("auth"), 1500);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => { setAllQ([...BUILTIN_Q, ...fbQ]); }, [fbQ]);
  useEffect(() => { forumEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [forumPosts]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  const loadData = (uid, admin) => {
    // 🔴 FETCHING QUESTIONS FROM FIREBASE 🔴
    onValue(ref(db,"questions"), snap => {
      const qs = []; 
      if(snap.exists()) {
        snap.forEach(c => qs.push({id:c.key,...c.val()}));
      }
      setFbQ(qs);
    });

    onValue(ref(db,"categories"), snap => {
      if(snap.exists()) { const cs=[]; snap.forEach(c=>cs.push({id:c.key,...c.val()})); setCategories([...DEFAULT_CATS,...cs]); }
      else setCategories(DEFAULT_CATS);
    });

    const lbQ = query(ref(db,"leaderboard"), orderByChild("score"), limitToLast(20));
    onValue(lbQ, snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setLeaderboard(d.reverse()); } });
    onValue(ref(db,`users/${uid}/stats`), snap => { if(snap.exists()) setMyStats(snap.val()); });
    onValue(ref(db,`users/${uid}/contributions`), snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMyContribs(d); } });
    onValue(ref(db,"online"), snap => { setActiveMembers(snap.exists() ? snap.size : 0); });
    const fQ = query(ref(db,"forum"), orderByChild("time"), limitToLast(200));
    onValue(fQ, snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setForumPosts(d); } else setForumPosts([]); });

    if(admin) {
      onValue(ref(db,"pending_questions"), snap => { const d=[]; if(snap.exists()) snap.forEach(c=>d.push({id:c.key,...c.val()})); setPendingQ(d); });
      onValue(ref(db,"adminEmails"), snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({key:c.key,email:c.key.replace(/_/g,".")})); setAdminList(d); } });
    }
  };

  const loginGoogle = async () => {
    setAuthLoading(true); setAuthErr(""); setAuthMsg("");
    try { await signInWithPopup(auth, gProvider); } catch(e) { setAuthErr("Google login failed."); }
    setAuthLoading(false);
  };

  const loginEmail = async () => {
    setAuthLoading(true); setAuthErr(""); setAuthMsg("");
    try {
      if(authMode === "register") {
        if(!dn.trim() || pw.length < 6) { setAuthErr("Fill name and valid password!"); setAuthLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        await updateProfile(cred.user, { displayName: dn });
        await set(ref(db,`users/${cred.user.uid}/profile`), { name:dn, email:em, createdAt:Date.now() });
      } else await signInWithEmailAndPassword(auth, em, pw);
    } catch(e) { setAuthErr("❌ " + (e.message || "Error")); }
    setAuthLoading(false);
  };

  const logout = async () => { if(user) await remove(ref(db,`online/${user.uid}`)); await signOut(auth); setScreen("splash"); setTimeout(() => setScreen("auth"), 500); };

  useEffect(() => {
    if(screen !== "quiz" || picked !== null) return;
    setTimer(30); clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { setTimer(t => { if(t<=1) { clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; }); }, 1000);
    return () => clearInterval(timerRef.current);
  }, [curr, screen]);

  const startQuiz = (cat) => {
    const pool = cat === "mock" ? [...allQ] : allQ.filter(q => q.cat === cat);
    const qs = pool.sort(() => Math.random()-0.5).slice(0, quizCount);
    if(!qs.length) { showNotif("Questions ഇല്ല! Admin-ൽ add ചെയ്യൂ.", "error"); return; }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]); setScreen("quiz");
  };

  const handleAns = (i) => {
    if(picked !== null) return;
    clearInterval(timerRef.current); setPicked(i);
    const q = questions[curr]; const ok = i === q.answer;
    if(ok) setScore(s => s+1);
    setAnswers(a => [...a, {q, sel:i, ok}]);
  };

  const nextQ = async () => { if(curr+1 >= questions.length) { await saveResult(); setScreen("result"); return; } setCurr(c => c+1); setPicked(null); };

  const saveResult = async () => {
    if(!user) return;
    const fs = answers.filter(a => a.ok).length;
    const catLabel = categories.find(c=>c.id===selCat)?.label || selCat || "Mock";
    await push(ref(db,"leaderboard"), { uid:user.uid, name:user.displayName||user.email.split("@")[0], score:fs, total:questions.length, category:selCat||"mock", categoryLabel:catLabel, accuracy:Math.round((fs/questions.length)*100), timestamp:serverTimestamp() });
    const sRef = ref(db,`users/${user.uid}/stats/${selCat||"mock"}`);
    const snap = await get(sRef); const prev = snap.exists() ? snap.val() : {attempts:0,correct:0,best:0};
    await set(sRef, { attempts:prev.attempts+1, correct:prev.correct+fs, best:Math.max(prev.best||0,fs) });
  };

  // --- Admin Functions ---
  const addDirectQ = async () => {
    if(!newQ.q||!newQ.o1||!newQ.o2||!newQ.o3||!newQ.o4) { setAddQStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setAddQStatus("⏳ Adding...");
    try {
      await push(ref(db,"questions"), { q:newQ.q, qm:newQ.qm||"", options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4], answer:parseInt(newQ.answer), cat:newQ.cat, explanation:newQ.explanation||"", addedBy:user.email, addedAt:serverTimestamp() });
      setNewQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:""});
      setAddQStatus("✅ Added!"); showNotif("Question added! 🎉"); setTimeout(()=>setAddQStatus(""),3000);
    } catch(e) { setAddQStatus("❌ Error: "+e.message); }
  };

  const addCategory = async () => {
    if(!newCat.label.trim()) { showNotif("Name ഇടൂ!","error"); return; }
    const id = newCat.label.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_"+Date.now();
    await set(ref(db,`categories/${id}`), { label:newCat.label, icon:newCat.icon, color:newCat.color, createdAt:serverTimestamp() });
    setNewCat({label:"",icon:"📋",color:"#6366f1"}); showNotif(`"${newCat.label}" added! 🎉`);
  };

  const deleteCat = async (id) => { if(!window.confirm("Delete this category?")) return; await remove(ref(db,`categories/${id}`)); showNotif("Category deleted!","error"); };

  // UI STYLES
  const S = { minHeight:"100vh", background:"#05050f", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" };
  const card = (ex={}) => ({ background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, ...ex });
  const glass = (ex={}) => ({ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, ...ex });
  const Btn = (bg,col="#fff",ex={}) => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", transition:"all 0.2s", ...ex });
  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, fontFamily:"inherit", outline:"none" };
  const Sel = { ...Inp, background:"#0f0f1e" };

  if(screen === "splash") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <div style={{fontSize:72}}>🎓</div><h1 style={{fontSize:26,fontWeight:900,color:"#a5b4fc"}}>PSC Quiz Kerala</h1><p>Loading...</p>
    </div>
  );

  if(screen === "auth") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",padding:20,minHeight:"100vh"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:60,marginBottom:12}}>🎓</div>
          <h1 style={{fontSize:24,fontWeight:900,color:"#a5b4fc",marginBottom:6}}>PSC Quiz Kerala</h1>
        </div>
        <button onClick={loginGoogle} style={{...Btn("rgba(255,255,255,0.08)","#e2e8f0"),width:"100%",marginBottom:16}}>G Continue with Google</button>
        <div style={{...glass(),padding:22}}>
          <div style={{display:"flex",marginBottom:16,background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4}}>
            {["login","register"].map(m=><button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}} style={{flex:1,padding:"9px 0",background:authMode===m?"#6366f1":"transparent",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontWeight:700}}>{m==="login"?"Login":"Register"}</button>)}
          </div>
          {authMode==="register"&&<input value={dn} onChange={e=>setDn(e.target.value)} placeholder="Your Name" style={Inp}/>}
          <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email" type="email" style={Inp}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" style={Inp}/>
          {authErr&&<div style={{color:"#ef4444",fontSize:13,marginBottom:10}}>{authErr}</div>}
          <button onClick={loginEmail} disabled={authLoading} style={{...Btn("#6366f1"),width:"100%",marginBottom:10}}>{authLoading?"⏳ Wait...":authMode==="login"?"Sign In":"Create Account"}</button>
        </div>
      </div>
    </div>
  );

  const Header = () => (
    <div style={{background:"rgba(19,16,58,0.97)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(99,102,241,0.2)",position:"sticky",top:0,zIndex:100}}>
      <div onClick={()=>setScreen("home")} style={{cursor:"pointer",fontWeight:800,color:"#a5b4fc"}}>🎓 PSC Quiz Kerala</div>
      <div style={{display:"flex",gap:5}}>
        {isAdmin&&<button onClick={()=>setScreen("admin")} style={{...Btn("rgba(251,191,36,0.15)","#fbbf24"),padding:"6px 10px"}}>👑 Admin</button>}
        <button onClick={logout} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"6px 10px"}}>🚪</button>
      </div>
    </div>
  );

  const BottomNav = () => (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,5,15,0.97)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:100}}>
      {[["home","🏠","Home"],["contribute","✍️","Contribute"],["forum","💬","Forum"],["myprogress","📊","Progress"]].map(([s,icon,label])=>(
        <button key={s} onClick={()=>setScreen(s)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 4px",background:"none",border:"none",color:screen===s?"#a5b4fc":"#475569"}}><span style={{fontSize:20}}>{icon}</span><span style={{fontSize:9}}>{label}</span></button>
      ))}
    </div>
  );

  return (
    <div style={S}>
      {notif&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:notif.type==="error"?"#ef4444":"#10b981",color:"#fff",padding:"10px 22px",borderRadius:30,fontWeight:700}}>{notif.msg}</div>}
      <Header/>
      
      <div style={{maxWidth:500,margin:"0 auto",padding:"0 14px 90px"}}>

        {screen==="home"&&(
          <div style={{paddingTop:14}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <h1 style={{fontSize:20,fontWeight:900,color:"#e879f9",marginBottom:4}}>Kerala PSC Exam Prep</h1>
              
              <p style={{color:"#475569",fontSize:12, background:"rgba(255,255,255,0.05)", padding:"6px", borderRadius:8, display:"inline-block"}}>
                Total: {allQ.length} Qs <strong style={{color:"#10b981"}}>(DB-ൽ നിന്ന് കിട്ടിയത്: {fbQ.length})</strong>
              </p>

            </div>
            
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>startQuiz("mock")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 10px",background:"rgba(236,72,153,0.15)",border:"1px solid rgba(236,72,153,0.25)",borderRadius:14}}>
                <span style={{fontSize:28}}>🎯</span><span style={{fontWeight:700,color:"#f0abfc"}}>Mock Test</span>
              </button>
            </div>

            <div style={{fontSize:12,color:"#475569",marginBottom:10,fontWeight:700}}>📚 CATEGORIES</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {categories.map(cat=>{
                const qCount=allQ.filter(q=>q.cat===cat.id).length;
                return (
                  <button key={cat.id} onClick={()=>startQuiz(cat.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:"rgba(255,255,255,0.03)",border:`1px solid rgba(255,255,255,0.07)`,borderLeft:`3px solid ${cat.color}`,borderRadius:13,textAlign:"left",width:"100%"}}>
                    <span style={{fontSize:22}}>{cat.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>{cat.label}</div>
                      {myStats[cat.id]&&<div style={{fontSize:10,color:"#475569"}}>Best: {myStats[cat.id].best}</div>}
                    </div>
                    <div style={{background:`${cat.color}25`,color:cat.color,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700}}>{qCount}Q</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {screen==="quiz"&&questions[curr]&&(()=>{
          const q=questions[curr]; const catInfo=categories.find(c=>c.id===q.cat)||{label:q.cat,icon:"📋",color:"#6366f1"};
          return (
            <div style={{paddingTop:14}}>
              <div style={{...card(),padding:18,marginBottom:12,background:`${catInfo.color}12`,borderColor:`${catInfo.color}25`}}>
                <div style={{fontSize:10,color:catInfo.color,marginBottom:8}}>{catInfo.icon} {catInfo.label}</div>
                <p style={{fontSize:16,fontWeight:700}}>{q.q}</p>{q.qm&&<p style={{fontSize:13,color:"#64748b"}}>{q.qm}</p>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.04)",col="#e2e8f0";
                  if(picked!==null){if(i===q.answer){bg="rgba(16,185,129,0.14)";col="#10b981";}else if(i===picked){bg="rgba(239,68,68,0.14)";col="#ef4444";}}
                  return <button key={i} onClick={()=>handleAns(i)} style={{padding:"13px 15px",background:bg,borderRadius:12,color:col,textAlign:"left",fontSize:14,border:"1px solid rgba(255,255,255,0.1)"}}>{["A","B","C","D"][i]}. {opt}</button>;
                })}
              </div>
              {picked!==null&&<button onClick={nextQ} style={{...Btn("#6366f1"),width:"100%",padding:14}}>{curr+1>=questions.length?"📊 See Result →":"Next →"}</button>}
            </div>
          );
        })()}

        {screen==="result"&&(
          <div style={{paddingTop:20,textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:8}}>🏆</div><h2 style={{fontSize:22,color:"#c7d2fe",marginBottom:16}}>Quiz Complete!</h2>
            <div style={{fontSize:52,fontWeight:900,color:"#a855f7",marginBottom:20}}>{score}<span style={{fontSize:24,opacity:0.5}}>/{questions.length}</span></div>
            <button onClick={()=>setScreen("home")} style={{...Btn("#6366f1"),width:"100%",padding:14}}>🏠 Home</button>
          </div>
        )}

        {screen==="admin"&&isAdmin&&(
          <div style={{paddingTop:16}}>
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(255,255,255,0.1)"),marginBottom:14}}>← Back</button>
            <h2 style={{fontSize:18,color:"#fbbf24",marginBottom:14}}>👑 Admin Panel</h2>
            
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
              {[["fix","🛠️ Fix DB"],["ai","🤖 AI Gen"],["cats","📁 Cats"],["addq","➕ Add"]].map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"7px 12px",background:adminTab===t?"#6366f1":"rgba(255,255,255,0.06)",border:`1px solid rgba(255,255,255,0.1)`,borderRadius:20,color:"#fff"}}>{l}</button>
              ))}
            </div>

            {/* 🔴 UPDATED DIAGNOSTICS TOOL 🔴 */}
            {adminTab==="fix"&&(
              <div style={{...card(),padding:16,borderLeft:"4px solid #ef4444", background:"rgba(239,68,68,0.05)"}}>
                <h3 style={{color:"#fca5a5",marginBottom:10}}>🛠️ Database Diagnostics</h3>
                <p style={{fontSize:12,color:"#cbd5e1",marginBottom:10}}>നിങ്ങളുടെ ആപ്പ് കണക്ട് ആയിരിക്കുന്ന ഡാറ്റാബേസിന്റെ വിവരങ്ങൾ.</p>
                
                <div style={{background:"rgba(0,0,0,0.3)", padding:12, borderRadius:8, marginBottom:14}}>
                  <div style={{color:"#10b981", fontWeight:"bold", marginBottom:6}}>✓ Total DB Questions: {fbQ.length}</div>
                  <div style={{fontSize:10, color:"#94a3b8", wordBreak:"break-all", marginBottom:6}}>
                    <strong>Connected DB URL:</strong><br/>
                    {db?.app?.options?.databaseURL}
                  </div>
                  {fbQ.length > 0 && (
                    <div style={{fontSize:11, color:"#fbbf24", background:"rgba(255,255,255,0.05)", padding:6, borderRadius:6}}>
                      <strong>Sample DB Q:</strong> {fbQ[fbQ.length-1].q?.substring(0,60)}...
                    </div>
                  )}
                </div>

                <button onClick={async () => {
                  try {
                    showNotif("⏳ Writing test question...");
                    const testRef = push(ref(db, "questions"));
                    await set(testRef, {
                      q: "System Test Question from Admin Panel", options: ["A","B","C","D"], answer: 0, cat: "ldc", addedBy: "admin_test"
                    });
                    showNotif("✅ Test question written successfully!");
                  } catch(e) {
                    showNotif("❌ Write failed: " + e.message, "error");
                  }
                }} style={{...Btn("rgba(16,185,129,0.2)", "#10b981", {border:"1px solid rgba(16,185,129,0.4)"}), width:"100%", marginBottom:10}}>✍️ Send Test Question to DB</button>

                <button onClick={async () => {
                  showNotif("⏳ Syncing from Firebase...");
                  const snap = await get(ref(db, "questions"));
                  const qs = []; if(snap.exists()) snap.forEach(c => qs.push({id:c.key,...c.val()}));
                  setFbQ(qs);
                  showNotif(`✅ Force Sync Done! Fetched ${qs.length} questions.`);
                }} style={{...Btn("#6366f1"), width:"100%"}}>🔄 Force Fetch Database</button>
              </div>
            )}

            {adminTab==="ai"&&isSuperAdmin&&<PuterQuizGenerator db={db} categories={categories} user={user} showNotif={showNotif} />}

            {adminTab==="cats"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:14,borderLeft:"3px solid #8b5cf6"}}>
                  <div style={{fontWeight:700,color:"#c4b5fd",marginBottom:10}}>📁 Add Category</div>
                  <div style={{display:"flex",gap:8,marginBottom:8}}><input value={newCat.label} onChange={e=>setNewCat({...newCat,label:e.target.value})} placeholder="Category Name" style={{...Inp,flex:2,marginBottom:0}}/></div>
                  <button onClick={addCategory} style={{...Btn("#8b5cf6"),width:"100%"}}>➕ Add Category</button>
                </div>
                <div style={{...glass(),padding:12}}>
                  {categories.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span>{c.icon} {c.label} <small style={{color:"gray"}}>({c.id})</small></span><button onClick={()=>deleteCat(c.id)} style={{background:"none",border:"none",color:"#ef4444"}}>🗑️</button></div>)}
                </div>
              </div>
            )}

            {adminTab==="addq"&&isSuperAdmin&&(
              <div style={{...card(),padding:14,borderLeft:"3px solid #6366f1"}}>
                <input value={newQ.q} onChange={e=>setNewQ({...newQ,q:e.target.value})} placeholder="Question *" style={Inp}/>
                {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={newQ[k]} onChange={e=>setNewQ({...newQ,[k]:e.target.value})} placeholder={`Option ${["A","B","C","D"][i]}`} style={Inp}/>)}
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={Sel}><option value="0">A</option><option value="1">B</option></select>
                  <select value={newQ.cat} onChange={e=>setNewQ({...newQ,cat:e.target.value})} style={Sel}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
                </div>
                <button onClick={addDirectQ} style={{...Btn("#6366f1"),width:"100%"}}>➕ Add Manual</button>
              </div>
            )}
          </div>
        )}

      </div>
      {(screen==="home"||screen==="admin")&&<BottomNav/>}
    </div>
  );
}
