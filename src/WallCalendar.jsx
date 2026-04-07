import { useState, useEffect, useRef, useCallback } from "react";

// ─── Utility helpers ────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const isSameDay = (a, b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const isBetween = (d, s, e) => { if(!s||!e) return false; const t=d.getTime(); return t>s.getTime()&&t<e.getTime(); };
const fmtDate   = d => d ? `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}` : "";

// Gradient palettes per month
const MONTH_PALETTES = [
  ["#0ea5e9","#6366f1"],["#f97316","#ec4899"],["#22c55e","#0ea5e9"],
  ["#f59e0b","#10b981"],["#8b5cf6","#06b6d4"],["#ef4444","#f59e0b"],
  ["#14b8a6","#6366f1"],["#f97316","#ef4444"],["#a78bfa","#f472b6"],
  ["#0ea5e9","#22c55e"],["#64748b","#0ea5e9"],["#6366f1","#ec4899"],
];

// Unsplash monthly nature images (deterministic, no API key needed)
const MONTH_IMAGES = [
  "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?w=800&q=80", // Jan – snow
  "https://images.unsplash.com/photo-1548600916-dc8492f8e845?w=800&q=80", // Feb – frost
  "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80", // Mar – blossom
  "https://images.unsplash.com/photo-1490750967868-88df5691cc34?w=800&q=80", // Apr – flowers
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", // May – green
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", // Jun – mountains
  "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80", // Jul – summer
  "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80", // Aug
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", // Sep – autumn
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80", // Oct – fall
  "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=80", // Nov – fog
  "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=800&q=80", // Dec – snow
];

// Build calendar grid (Mon-start, 6 rows)
function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  let dow = first.getDay(); // 0=Sun
  dow = dow === 0 ? 6 : dow - 1; // shift to Mon=0
  const cells = [];
  for(let i=0;i<dow;i++) { const d=new Date(year,month,1-dow+i); cells.push({date:d,outside:true}); }
  for(let i=1;i<=last.getDate();i++) cells.push({date:new Date(year,month,i),outside:false});
  while(cells.length<42){ const d=new Date(year,month+1,cells.length-last.getDate()-dow+1); cells.push({date:d,outside:true}); }
  return cells;
}

// Holiday markers (a sample set)
const HOLIDAYS = {
  "1-1":"New Year's Day","1-26":"Republic Day","3-25":"Holi",
  "8-15":"Independence Day","10-2":"Gandhi Jayanti","10-24":"Diwali",
  "12-25":"Christmas","12-31":"New Year's Eve",
};
const getHoliday = d => HOLIDAYS[`${d.getMonth()+1}-${d.getDate()}`] || null;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WallCalendar() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd,   setRangeEnd]   = useState(null);
  const [hovered,    setHovered]    = useState(null);
  const [notes,      setNotes]      = useState({});
  const [noteInput,  setNoteInput]  = useState("");
  const [activeNote, setActiveNote] = useState(null); // date key for inline note
  const [animDir,    setAnimDir]    = useState(null);  // "left"|"right"
  const [flipping,   setFlipping]   = useState(false);
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [theme,      setTheme]      = useState("light");
  const [showNotePanel, setShowNotePanel] = useState(false);
  const notesRef = useRef(null);

  const grid = buildGrid(viewYear, viewMonth);
  const [c1, c2] = MONTH_PALETTES[viewMonth];
  const imgSrc   = MONTH_IMAGES[viewMonth];

  // Saved notes for current range
  const rangeKey = rangeStart && rangeEnd
    ? `${fmtDate(rangeStart)}→${fmtDate(rangeEnd)}`
    : rangeStart ? fmtDate(rangeStart) : null;

  // Navigate months with flip animation
  const navigate = useCallback((dir) => {
    if(flipping) return;
    setAnimDir(dir);
    setFlipping(true);
    setImgLoaded(false);
    setTimeout(() => {
      if(dir === "right") {
        if(viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); }
        else setViewMonth(m=>m+1);
      } else {
        if(viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); }
        else setViewMonth(m=>m-1);
      }
      setRangeStart(null); setRangeEnd(null); setHovered(null);
      setFlipping(false); setAnimDir(null);
    }, 350);
  }, [flipping, viewMonth]);

  // Date click handler
  const handleDayClick = (date, outside) => {
    if(outside) return;
    if(!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date); setRangeEnd(null);
    } else {
      if(date < rangeStart) { setRangeEnd(rangeStart); setRangeStart(date); }
      else setRangeEnd(date);
    }
  };

  // Save note
  const saveNote = () => {
    if(!rangeKey || !noteInput.trim()) return;
    setNotes(n => ({...n, [rangeKey]: noteInput.trim()}));
    setNoteInput("");
    setShowNotePanel(false);
  };

  // Sync note input with saved note
  useEffect(() => {
    if(rangeKey) setNoteInput(notes[rangeKey] || "");
    else setNoteInput("");
  }, [rangeKey]);

  const isDark = theme === "dark";

  // Effective end for hover preview
  const effectiveEnd = rangeEnd || (rangeStart && hovered && hovered > rangeStart ? hovered : null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cal-root {
          --c1: ${c1};
          --c2: ${c2};
          --grad: linear-gradient(135deg, var(--c1), var(--c2));
          --bg:   ${isDark ? "#111218" : "#f1f0ed"};
          --card: ${isDark ? "#1c1d26" : "#ffffff"};
          --text: ${isDark ? "#e8e6e1" : "#1a1a2e"};
          --sub:  ${isDark ? "#7a7a9a" : "#8a8a9a"};
          --border: ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
          --note-bg: ${isDark ? "#14151e" : "#fafaf8"};
          --shadow: ${isDark ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(0,0,0,0.12)"};
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          transition: background 0.5s;
        }

        .cal-wrapper {
          width: 100%;
          max-width: 960px;
        }

        /* Binding */
        .binding-bar {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .binding-ring {
          width: 18px; height: 22px;
          border: 3px solid ${isDark ? "#444" : "#bbb"};
          border-radius: 50% 50% 0 0;
          border-bottom: none;
        }

        /* Card */
        .cal-card {
          background: var(--card);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s;
        }
        .cal-card.flip-left  { animation: flipLeft  0.35s ease forwards; }
        .cal-card.flip-right { animation: flipRight 0.35s ease forwards; }
        @keyframes flipLeft  { 0%{transform:rotateY(0) translateX(0);opacity:1} 50%{transform:rotateY(-12deg) translateX(-20px);opacity:0} 100%{transform:rotateY(0) translateX(0);opacity:1} }
        @keyframes flipRight { 0%{transform:rotateY(0) translateX(0);opacity:1} 50%{transform:rotateY(12deg) translateX(20px);opacity:0} 100%{transform:rotateY(0) translateX(0);opacity:1} }

        /* ── Hero image + month header ── */
        .cal-hero {
          position: relative;
          height: 260px;
          overflow: hidden;
        }
        .cal-hero img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: opacity 0.6s;
        }
        .cal-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%);
        }
        /* Wavy divider */
        .cal-wave {
          position: absolute; bottom: -2px; left: 0; right: 0;
          height: 60px;
          overflow: hidden;
        }
        .cal-wave svg { width: 100%; height: 100%; }

        .cal-month-badge {
          position: absolute;
          top: 20px; right: 24px;
          text-align: right;
          color: #fff;
          text-shadow: 0 2px 12px rgba(0,0,0,0.4);
        }
        .cal-month-badge .year  { font-family:'DM Sans'; font-size:15px; font-weight:300; letter-spacing:3px; opacity:0.85; }
        .cal-month-badge .month { font-family:'Playfair Display'; font-size:40px; font-weight:900; line-height:1; }

        /* Nav controls */
        .cal-nav {
          position: absolute;
          bottom: 70px; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 20px;
        }
        .cal-nav-btn {
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff; border-radius: 50%;
          width: 38px; height: 38px; font-size:18px;
          cursor: pointer; display:flex; align-items:center; justify-content:center;
          transition: background 0.2s, transform 0.15s;
        }
        .cal-nav-btn:hover { background: rgba(255,255,255,0.32); transform: scale(1.08); }

        /* Theme toggle */
        .theme-btn {
          position: absolute; top: 16px; left: 18px;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff; border-radius: 20px;
          padding: 5px 12px; font-size: 12px; cursor: pointer;
          font-family: 'DM Sans'; font-weight: 500;
          transition: background 0.2s;
        }
        .theme-btn:hover { background: rgba(255,255,255,0.3); }

        /* ── Body layout ── */
        .cal-body {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
        }

        /* Notes sidebar */
        .cal-notes-sidebar {
          border-right: 1px solid var(--border);
          padding: 24px 18px;
          display: flex; flex-direction: column; gap: 12px;
          background: var(--note-bg);
        }
        .notes-title {
          font-family: 'Playfair Display';
          font-size: 14px; font-weight:700;
          color: var(--sub); letter-spacing: 0.5px;
          text-transform: uppercase; margin-bottom: 4px;
        }
        .note-line {
          border: none; border-bottom: 1px solid var(--border);
          background: transparent; width: 100%; padding: 5px 2px;
          font-family: 'DM Sans'; font-size: 13px; color: var(--text);
          outline: none; transition: border-color 0.2s;
        }
        .note-line:focus { border-color: var(--c1); }
        .note-range-tag {
          font-size: 11px; color: var(--c1); font-weight: 600;
          letter-spacing: 0.3px;
          background: ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"};
          border-radius: 6px; padding: 4px 8px;
        }
        .note-save-btn {
          background: var(--grad);
          color: #fff; border: none; border-radius: 8px;
          padding: 8px 14px; font-size: 12px; font-family:'DM Sans'; font-weight:600;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
        }
        .note-save-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .saved-notes-list { margin-top: 8px; display:flex; flex-direction:column; gap:8px; }
        .saved-note-item {
          border-left: 3px solid var(--c1);
          padding: 5px 8px; border-radius: 0 6px 6px 0;
          background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"};
        }
        .saved-note-key  { font-size:10px; color:var(--sub); margin-bottom:2px; }
        .saved-note-text { font-size:12px; color:var(--text); line-height:1.4; }

        /* ── Calendar grid ── */
        .cal-grid-wrap { padding: 20px 20px 24px; }

        .range-display {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 14px; min-height: 28px;
        }
        .range-pill {
          background: var(--grad);
          color: #fff; border-radius: 20px;
          padding: 4px 12px; font-size: 12px; font-weight: 600;
        }
        .range-clear {
          background: none; border: 1px solid var(--border);
          color: var(--sub); border-radius: 12px;
          padding: 3px 10px; font-size: 11px; cursor: pointer;
          transition: border-color 0.2s;
        }
        .range-clear:hover { border-color: var(--c1); color: var(--c1); }

        .day-headers {
          display: grid; grid-template-columns: repeat(7,1fr);
          margin-bottom: 6px;
        }
        .day-hdr {
          text-align: center;
          font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 4px 0;
        }
        .day-hdr.weekend { color: var(--c1); }
        .day-hdr:not(.weekend) { color: var(--sub); }

        .day-grid {
          display: grid; grid-template-columns: repeat(7,1fr);
          gap: 2px;
        }

        .day-cell {
          aspect-ratio: 1;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; cursor: pointer; position: relative;
          font-size: 13px; font-weight: 500; color: var(--text);
          transition: background 0.15s, color 0.15s, transform 0.1s;
          user-select: none;
        }
        .day-cell:hover:not(.outside):not(.is-start):not(.is-end) {
          background: ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"};
          transform: scale(1.05);
        }
        .day-cell.outside { color: var(--border); cursor: default; }
        .day-cell.today:not(.is-start):not(.is-end) {
          border: 2px solid var(--c1);
          color: var(--c1);
          font-weight: 700;
        }
        .day-cell.is-start, .day-cell.is-end {
          background: var(--grad);
          color: #fff !important;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          transform: scale(1.08);
          z-index: 2;
        }
        .day-cell.in-range {
          background: ${isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)"};
          border-radius: 0;
          color: var(--text);
        }
        .day-cell.in-range-start { border-radius: 50% 0 0 50%; }
        .day-cell.in-range-end   { border-radius: 0 50% 50% 0; }
        .day-cell.weekend-color:not(.is-start):not(.is-end):not(.outside) { color: var(--c1); }

        /* Holiday dot */
        .holiday-dot {
          position: absolute; bottom: 3px;
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--c2);
        }
        .holiday-tooltip {
          position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
          background: var(--text); color: var(--bg);
          font-size: 10px; white-space: nowrap;
          padding: 3px 7px; border-radius: 6px;
          pointer-events: none; opacity: 0;
          transition: opacity 0.15s;
          z-index: 10;
        }
        .day-cell:hover .holiday-tooltip { opacity: 1; }

        /* ── Mobile note panel ── */
        .mobile-note-fab {
          display: none;
          position: fixed; bottom: 24px; right: 24px;
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--grad); color: #fff; font-size: 22px;
          border: none; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          align-items:center; justify-content:center;
          transition: transform 0.2s;
          z-index: 100;
        }
        .mobile-note-fab:hover { transform: scale(1.1); }

        .mobile-note-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          align-items: flex-end;
        }
        .mobile-note-overlay.open { display: flex; }
        .mobile-note-sheet {
          background: var(--card);
          border-radius: 20px 20px 0 0;
          padding: 24px 20px 32px;
          width: 100%; animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .mob-note-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
        .mob-note-title { font-family:'Playfair Display'; font-size:18px; font-weight:700; color:var(--text); }
        .mob-close { background:none; border:none; font-size:22px; color:var(--sub); cursor:pointer; }
        .mob-textarea {
          width:100%; height:100px; background:var(--note-bg);
          border:1px solid var(--border); border-radius:10px;
          padding:10px 12px; font-family:'DM Sans'; font-size:14px; color:var(--text);
          outline:none; resize:none; margin-bottom:12px;
        }
        .mob-textarea:focus { border-color: var(--c1); }

        /* ── Responsive ── */
        @media (max-width: 680px) {
          .cal-body { grid-template-columns: 1fr; }
          .cal-notes-sidebar { display: none; }
          .mobile-note-fab { display: flex; }
          .cal-hero { height: 200px; }
          .cal-month-badge .month { font-size: 30px; }
          .day-cell { font-size: 11px; }
        }
        @media (max-width: 400px) {
          .cal-hero { height: 160px; }
          .cal-grid-wrap { padding: 12px 10px 16px; }
          .day-cell { font-size: 10px; }
        }
      `}</style>

      <div className="cal-root">
        <div className="cal-wrapper">

          {/* Binding rings */}
          <div className="binding-bar">
            {Array.from({length:14}).map((_,i) => <div key={i} className="binding-ring"/>)}
          </div>

          {/* Calendar card */}
          <div className={`cal-card ${flipping && animDir==="left"?"flip-left":""} ${flipping && animDir==="right"?"flip-right":""}`}>

            {/* Hero */}
            <div className="cal-hero">
              <img
                src={imgSrc} alt={MONTHS[viewMonth]}
                style={{opacity: imgLoaded ? 1 : 0}}
                onLoad={()=>setImgLoaded(true)}
              />
              {/* Fallback gradient if image slow */}
              {!imgLoaded && <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${c1},${c2})`}}/>}
              <div className="cal-hero-overlay"/>

              <button className="theme-btn" onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>
                {isDark ? "☀ Light" : "☾ Dark"}
              </button>

              <div className="cal-month-badge">
                <div className="year">{viewYear}</div>
                <div className="month">{MONTHS[viewMonth].toUpperCase()}</div>
              </div>

              <div className="cal-nav">
                <button className="cal-nav-btn" onClick={()=>navigate("left")}>‹</button>
                <button className="cal-nav-btn" onClick={()=>navigate("right")}>›</button>
              </div>

              {/* Wavy cut */}
              <div className="cal-wave">
                <svg viewBox="0 0 960 60" preserveAspectRatio="none">
                  <path d="M0,30 C240,60 720,0 960,30 L960,60 L0,60 Z" fill={isDark?"#1c1d26":"#ffffff"}/>
                </svg>
              </div>
            </div>

            {/* Body */}
            <div className="cal-body">

              {/* Notes Sidebar */}
              <div className="cal-notes-sidebar">
                <div className="notes-title">Notes</div>

                {rangeKey && (
                  <div className="note-range-tag">
                    {rangeEnd ? `${fmtDate(rangeStart)} → ${fmtDate(rangeEnd)}` : fmtDate(rangeStart)}
                  </div>
                )}

                <input
                  className="note-line"
                  placeholder={rangeKey ? "Add a note…" : "Select a date first"}
                  disabled={!rangeKey}
                  value={noteInput}
                  onChange={e=>setNoteInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&saveNote()}
                />
                {[1,2,3,4].map(i=>(
                  <div key={i} style={{borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"}`,paddingBottom:"8px"}}/>
                ))}

                {rangeKey && noteInput.trim() && (
                  <button className="note-save-btn" onClick={saveNote}>Save Note ↵</button>
                )}

                {/* Saved notes list */}
                {Object.keys(notes).length > 0 && (
                  <div className="saved-notes-list">
                    {Object.entries(notes).map(([k,v])=>(
                      <div key={k} className="saved-note-item">
                        <div className="saved-note-key">{k}</div>
                        <div className="saved-note-text">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="cal-grid-wrap">

                {/* Range display bar */}
                <div className="range-display">
                  {rangeStart && (
                    <>
                      <span className="range-pill">
                        {rangeEnd
                          ? `${fmtDate(rangeStart)} — ${fmtDate(rangeEnd)}`
                          : `From ${fmtDate(rangeStart)}`}
                      </span>
                      <button className="range-clear" onClick={()=>{setRangeStart(null);setRangeEnd(null);}}>✕ Clear</button>
                    </>
                  )}
                  {!rangeStart && (
                    <span style={{fontSize:12,color:"var(--sub)"}}>Click a date to start selecting a range</span>
                  )}
                </div>

                {/* Day headers */}
                <div className="day-headers">
                  {DAYS.map((d,i)=>(
                    <div key={d} className={`day-hdr${i>=5?" weekend":""}`}>{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="day-grid">
                  {grid.map(({date,outside},idx)=>{
                    const isToday  = isSameDay(date, today);
                    const isStart  = isSameDay(date, rangeStart);
                    const isEnd    = isSameDay(date, rangeEnd);
                    const inRange  = isBetween(date, rangeStart, effectiveEnd);
                    const dayOfWeek= (idx%7); // 0=Mon…6=Sun
                    const isWeekend= dayOfWeek>=5;
                    const holiday  = !outside && getHoliday(date);

                    // Range edge classes for bar shape
                    const isFirstInRow = idx%7===0;
                    const isLastInRow  = idx%7===6;
                    const inRangeStart = inRange && (isFirstInRow || isSameDay(date, rangeStart ? new Date(rangeStart.getTime()+86400000) : null));
                    const inRangeEnd   = inRange && (isLastInRow || (effectiveEnd && isSameDay(date, new Date(effectiveEnd.getTime()-86400000))));

                    let cls = "day-cell";
                    if(outside)     cls += " outside";
                    if(isToday)     cls += " today";
                    if(isStart)     cls += " is-start";
                    if(isEnd)       cls += " is-end";
                    if(inRange)     cls += " in-range";
                    if(isWeekend && !outside) cls += " weekend-color";

                    return (
                      <div
                        key={idx}
                        className={cls}
                        onClick={()=>handleDayClick(date,outside)}
                        onMouseEnter={()=>!outside&&setHovered(date)}
                        onMouseLeave={()=>setHovered(null)}
                      >
                        {date.getDate()}
                        {holiday && (
                          <>
                            <span className="holiday-dot"/>
                            <span className="holiday-tooltip">{holiday}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap"}}>
                  {[
                    {label:"Today",style:{border:`2px solid ${c1}`,borderRadius:"50%",width:14,height:14}},
                    {label:"Selected",style:{background:`linear-gradient(135deg,${c1},${c2})`,borderRadius:"50%",width:14,height:14}},
                    {label:"In Range",style:{background:isDark?"rgba(99,102,241,0.25)":"rgba(99,102,241,0.15)",borderRadius:3,width:20,height:14}},
                    {label:"Holiday",style:{display:"flex",alignItems:"center",gap:4}},
                  ].map((l,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--sub)"}}>
                      {l.label==="Holiday"
                        ? <><span style={{width:8,height:8,borderRadius:"50%",background:c2,display:"inline-block"}}/>{l.label}</>
                        : <><span style={l.style}/>{l.label}</>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile FAB */}
        <button className="mobile-note-fab" onClick={()=>setShowNotePanel(true)}>✎</button>

        {/* Mobile note sheet */}
        <div className={`mobile-note-overlay${showNotePanel?" open":""}`} onClick={e=>e.target===e.currentTarget&&setShowNotePanel(false)}>
          <div className="mobile-note-sheet">
            <div className="mob-note-header">
              <span className="mob-note-title">Notes</span>
              <button className="mob-close" onClick={()=>setShowNotePanel(false)}>✕</button>
            </div>
            {rangeKey && <div className="note-range-tag" style={{marginBottom:12}}>{rangeKey}</div>}
            <textarea
              className="mob-textarea"
              placeholder={rangeKey ? "Add a note for this range…" : "Select a date first to attach a note"}
              disabled={!rangeKey}
              value={noteInput}
              onChange={e=>setNoteInput(e.target.value)}
            />
            <button className="note-save-btn" style={{width:"100%"}} onClick={()=>{saveNote();setShowNotePanel(false);}}>
              Save Note
            </button>
            {Object.keys(notes).length > 0 && (
              <div className="saved-notes-list" style={{marginTop:16}}>
                {Object.entries(notes).map(([k,v])=>(
                  <div key={k} className="saved-note-item">
                    <div className="saved-note-key">{k}</div>
                    <div className="saved-note-text">{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
