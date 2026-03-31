import { useState } from "react";
import { api } from "../api";

function today()     { return new Date().toISOString().slice(0,10); }
function daysAgo(n)  { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

export default function Sync() {
  const [start, setStart] = useState(daysAgo(30));
  const [end,   setEnd]   = useState(today());
  const [status, setStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [msg, setMsg]     = useState("");

  async function handleSync() {
    if (start > end) { setStatus("error"); setMsg("Start date must be before end date."); return; }
    setStatus("loading");
    setMsg("");
    try {
      await api.sync(start, end);
      setStatus("ok");
      setMsg("Sync complete! Navigate to a page to view your data.");
    } catch(e) {
      setStatus("error");
      setMsg(e.message);
    }
  }

  return (
    <div>
      <h1>Sync</h1>
      <p style={{color:"#888",marginBottom:32,maxWidth:480}}>
        Pull your data from Garmin Connect. Days already in the database are skipped automatically.
      </p>

      <div className="sync-form">
        <label>From</label>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} max={end}/>
        <label>To</label>
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} min={start} max={today()}/>
        <button className="btn" onClick={handleSync} disabled={status==="loading"}>
          {status==="loading" ? "Syncing…" : "Sync from Garmin Connect"}
        </button>
        {status==="ok"    && <p className="msg-ok">{msg}</p>}
        {status==="error" && <p className="msg-err">{msg}</p>}
      </div>
    </div>
  );
}
