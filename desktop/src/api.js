const BASE = "http://127.0.0.1:8765";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  dailyStats:     () => get("/daily-stats"),
  activities:     () => get("/activities"),
  sleep:          () => get("/sleep"),
  hrv:            () => get("/hrv"),
  wrapped:        (year) => get(`/wrapped/${year}`),
  wrappedMulti:   (years) => get(`/wrapped/multi/${years.join(",")}`),
  sync:           (start, end) => post("/sync", { start, end }),
  insights:       () => get("/insights"),
  records:        () => get("/records"),
  readiness:      () => get("/readiness"),
  goals:          (year) => get(`/goals?year=${year}`),
  goalsProgress:  (year) => get(`/goals/progress/${year}`),
  upsertGoal:     (metric, target, year) => post("/goals", { metric, target, year }),
  deleteGoal:     (id) => del(`/goals/${id}`),
  exportCsv:      (table) => `${BASE}/export/csv/${table}`,
  activityRoute:  (id) => get(`/activities/${id}/route`),
  bodyBattery:    () => get("/body-battery"),
  locations:      () => get("/activities/locations"),
};
