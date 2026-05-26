import { useState, useEffect, useRef } from "react";
const QUESTIONS = [
  { id:1, q:"Kerala formed on?", qm:"കേരളം രൂപീകരിച്ചത്?", options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"], answer:0, topic:"history" },
  { id:2, q:"Longest river in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?", options:["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer:1, topic:"geography" },
  { id:3, q:"Chemical symbol of Gold?", qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options:["Go","Gd","Au","Ag"], answer:2, topic:"science" },
  { id:4, q:"Red Planet?", qm:"ചുവന്ന ഗ്രഹം?", options:["Venus","Jupiter","Mars","Saturn"], answer:2, topic:"science" },
  { id:5, q:"Capital of India?", qm:"ഇന്ത്യയുടെ തലസ്ഥാനം?", options:["Mumbai","Kolkata","New Delhi","Chennai"], answer:2, topic:"geography" },
];
export default function App() {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUESTIONS[idx];
  const pick = (i) => {
    if (sel !== null) return;
    setSel(i);
    if (i === q.answer) setScore(s => s+1);
  };
  const next = () => {
    if (idx+1 >= QUESTIONS.length) { setDone(true); return; }
    setIdx(i => i+1); setSel(null);
  };
  const reset = () => { setIdx(0); setSel(null); setScore(0); setDone(false); };
  return (
    <div style={{minHeight:"100vh",background:"#080812",color:"#e2e8f0",fontFamily:"sans-serif",padding:20}}>
      <h1 style={{color:"#a5b4fc",textAlign:"center"}}>🎓 PSC Quiz Kerala</h1>
      {done ? (
        <div style={{textAlign:"center",marginTop:40}}>
          <div style={{fontSize:60}}>🏆</div>
          <h2 style={{color:"#6366f1"}}>Score: {score}/{QUESTIONS.length}</h2>
          <button onClick={reset} style={{background:"#6366f1",color:"#fff",border:"none",padding:"12px 30px",borderRadius:10,fontSize:16,cursor:"pointer"}}>വീണ്ടും കളിക്കൂ</button>
        </div>
      ) : (
        <div style={{maxWidth:480,margin:"20px auto"}}>
          <p style={{color:"#64748b"}}>Question {idx+1}/{QUESTIONS.length} • Score: {score}</p>
          <div style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:12,padding:16,marginBottom:16}}>
            <p style={{fontSize:17,fontWeight:700}}>{q.q}</p>
            <p style={{color:"#94a3b8",fontSize:14}}>{q.qm}</p>
          </div>
          {q.options.map((opt,i) => (
            <button key={i} onClick={() => pick(i)} style={{display:"block",width:"100%",margin:"8px 0",padding:"12px 16px",background:sel===null?"rgba(255,255,255,0.05)":i===q.answer?"rgba(16,185,129,0.2)":i===sel?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${sel===null?"rgba(255,255,255,0.1)":i===q.answer?"#10b981":i===sel?"#ef4444":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:"#e2e8f0",fontSize:14,cursor:"pointer",textAlign:"left"}}>
              {["A","B","C","D"][i]}. {opt}
            </button>
          ))}
          {sel !== null && (
            <button onClick={next} style={{width:"100%",marginTop:12,padding:14,background:"#6366f1",border:"none",borderRadius:10,color:"#fff",fontSize:15,cursor:"pointer",fontWeight:700}}>
              {idx+1 >= QUESTIONS.length ? "Result കാണുക" : "അടുത്ത ചോദ്യം →"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
