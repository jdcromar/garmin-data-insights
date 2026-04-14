export const PRESETS = [
  {
    id: "default",
    name: "Default",
    layout: [
      // Row 1: 4 compact KPI tiles (h=2 = 160px — snug)
      { i: "kpi_steps",        x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_calories",     x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_rhr",          x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_sleep",        x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      // Row 2: Hero steps chart — full width (h=4 = 320px)
      { i: "steps_chart",      x: 0,  y: 2,  w: 12, h: 4, minW: 4, minH: 2 },
      // Row 3: Three info cards side by side
      { i: "readiness_card",   x: 0,  y: 6,  w: 4,  h: 3, minW: 3, minH: 2 },
      { i: "weekly_summary",   x: 4,  y: 6,  w: 4,  h: 3, minW: 2, minH: 2 },
      { i: "personal_records", x: 8,  y: 6,  w: 4,  h: 3, minW: 3, minH: 2 },
      // Row 4: Two charts side by side
      { i: "hr_chart",         x: 0,  y: 9,  w: 6,  h: 4, minW: 3, minH: 2 },
      { i: "calories_chart",   x: 6,  y: 9,  w: 6,  h: 4, minW: 3, minH: 2 },
      // Row 5: Milestones + YoY chart
      { i: "step_milestones",  x: 0,  y: 13, w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "yoy_steps",        x: 3,  y: 13, w: 9,  h: 3, minW: 4, minH: 2 },
    ],
  },
  {
    id: "casual",
    name: "Casual Walker",
    layout: [
      { i: "kpi_steps",       x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_calories",    x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_sleep",       x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "step_milestones", x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 1 },
      { i: "steps_chart",     x: 0,  y: 2,  w: 12, h: 4, minW: 4, minH: 2 },
      { i: "weekly_summary",  x: 0,  y: 6,  w: 6,  h: 3, minW: 2, minH: 2 },
      { i: "monthly_summary", x: 6,  y: 6,  w: 6,  h: 3, minW: 2, minH: 2 },
      { i: "yoy_steps",       x: 0,  y: 9,  w: 12, h: 4, minW: 4, minH: 2 },
    ],
  },
  {
    id: "athlete",
    name: "Endurance Athlete",
    layout: [
      { i: "readiness_card",       x: 0, y: 0,  w: 6,  h: 3, minW: 3, minH: 2 },
      { i: "activity_breakdown",   x: 6, y: 0,  w: 6,  h: 3, minW: 3, minH: 2 },
      { i: "long_run_progression", x: 0, y: 3,  w: 8,  h: 4, minW: 4, minH: 2 },
      { i: "kpi_avg_hr",           x: 8, y: 3,  w: 4,  h: 2, minW: 2, minH: 1 },
      { i: "kpi_rhr",              x: 8, y: 5,  w: 4,  h: 2, minW: 2, minH: 1 },
      { i: "cumulative_mileage",   x: 0, y: 7,  w: 12, h: 4, minW: 4, minH: 2 },
      { i: "best_performances",    x: 0, y: 11, w: 6,  h: 4, minW: 3, minH: 3 },
      { i: "hr_chart",             x: 6, y: 11, w: 6,  h: 4, minW: 3, minH: 2 },
    ],
  },
  {
    id: "sleep_focused",
    name: "Sleep-Focused",
    layout: [
      { i: "readiness_card",     x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
      { i: "kpi_sleep",          x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 1 },
      { i: "kpi_hrv",            x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 1 },
      { i: "body_battery_chart", x: 6, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
      { i: "hr_chart",           x: 0, y: 3, w: 6, h: 4, minW: 3, minH: 2 },
      { i: "weekly_summary",     x: 0, y: 7, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "kpi_steps",          x: 6, y: 6, w: 3, h: 2, minW: 2, minH: 1 },
      { i: "kpi_calories",       x: 9, y: 6, w: 3, h: 2, minW: 2, minH: 1 },
    ],
  },
  {
    id: "runner",
    name: "Runner",
    layout: [
      // Row 1: This Week + VO2 Max + Year to Date
      { i: "run_weekly",          x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      { i: "run_vo2max",          x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "run_yearly",          x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      // Row 2: Weekly mileage chart + PRs
      { i: "run_mileage",         x: 0, y: 3, w: 8, h: 4, minW: 4, minH: 2 },
      { i: "run_records",         x: 8, y: 2, w: 4, h: 5, minW: 3, minH: 3 },
      // Row 3: Pace trend + Training effects + Dynamics
      { i: "run_pace_trend",      x: 0, y: 7, w: 5, h: 4, minW: 4, minH: 2 },
      { i: "run_training_effect", x: 5, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
      { i: "run_dynamics",        x: 9, y: 7, w: 3, h: 3, minW: 3, minH: 2 },
      // Row 4: Races + Recent runs
      { i: "run_races",           x: 0, y: 11, w: 5, h: 4, minW: 3, minH: 3 },
      { i: "run_recent",          x: 5, y: 11, w: 7, h: 4, minW: 6, minH: 3 },
    ],
  },
];
