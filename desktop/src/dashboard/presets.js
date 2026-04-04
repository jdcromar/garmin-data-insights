export const PRESETS = [
  {
    id: "default",
    name: "Default",
    layout: [
      // Row 1: 4 KPI tiles
      { i: "kpi_steps",        x: 0,  y: 0,  w: 3, h: 3, minW: 2, minH: 2 },
      { i: "kpi_calories",     x: 3,  y: 0,  w: 3, h: 3, minW: 2, minH: 2 },
      { i: "kpi_rhr",          x: 6,  y: 0,  w: 3, h: 3, minW: 2, minH: 2 },
      { i: "kpi_sleep",        x: 9,  y: 0,  w: 3, h: 3, minW: 2, minH: 2 },
      // Row 2: Hero steps chart
      { i: "steps_chart",      x: 0,  y: 3,  w: 12, h: 5, minW: 5, minH: 3 },
      // Row 3: Readiness ring + weekly summary + milestones
      { i: "readiness_card",   x: 0,  y: 8,  w: 4, h: 4, minW: 4, minH: 3 },
      { i: "weekly_summary",   x: 4,  y: 8,  w: 4, h: 4, minW: 3, minH: 3 },
      { i: "personal_records", x: 8,  y: 8,  w: 4, h: 4, minW: 4, minH: 3 },
      // Row 4: HR + calories side by side
      { i: "hr_chart",         x: 0,  y: 12, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "calories_chart",   x: 6,  y: 12, w: 6, h: 4, minW: 4, minH: 3 },
      // Row 5: Step milestones + YoY
      { i: "step_milestones",  x: 0,  y: 16, w: 4, h: 3, minW: 3, minH: 2 },
      { i: "yoy_steps",        x: 4,  y: 16, w: 8, h: 4, minW: 5, minH: 3 },
    ],
  },
  {
    id: "casual",
    name: "Casual Walker",
    layout: [
      { i: "kpi_steps",       x: 0,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2 },
      { i: "kpi_calories",    x: 3,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2 },
      { i: "kpi_sleep",       x: 6,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2 },
      { i: "step_milestones", x: 9,  y: 0,  w: 3,  h: 3, minW: 3, minH: 2 },
      { i: "steps_chart",     x: 0,  y: 3,  w: 12, h: 5, minW: 5, minH: 3 },
      { i: "weekly_summary",  x: 0,  y: 8,  w: 6,  h: 3, minW: 3, minH: 3 },
      { i: "monthly_summary", x: 6,  y: 8,  w: 6,  h: 3, minW: 3, minH: 3 },
      { i: "yoy_steps",       x: 0,  y: 11, w: 12, h: 4, minW: 5, minH: 3 },
    ],
  },
  {
    id: "athlete",
    name: "Endurance Athlete",
    layout: [
      { i: "readiness_card",       x: 0, y: 0,  w: 6,  h: 4, minW: 4, minH: 3 },
      { i: "activity_breakdown",   x: 6, y: 0,  w: 6,  h: 4, minW: 4, minH: 3 },
      { i: "long_run_progression", x: 0, y: 4,  w: 8,  h: 4, minW: 5, minH: 3 },
      { i: "kpi_avg_hr",           x: 8, y: 4,  w: 4,  h: 2, minW: 2, minH: 2 },
      { i: "kpi_rhr",              x: 8, y: 6,  w: 4,  h: 2, minW: 2, minH: 2 },
      { i: "cumulative_mileage",   x: 0, y: 8,  w: 12, h: 4, minW: 6, minH: 3 },
      { i: "best_performances",    x: 0, y: 12, w: 6,  h: 5, minW: 4, minH: 4 },
      { i: "hr_chart",             x: 6, y: 12, w: 6,  h: 4, minW: 4, minH: 3 },
    ],
  },
  {
    id: "sleep_focused",
    name: "Sleep-Focused",
    layout: [
      { i: "readiness_card",     x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "kpi_sleep",          x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: "kpi_hrv",            x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: "body_battery_chart", x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "hr_chart",           x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "weekly_summary",     x: 6, y: 6, w: 6, h: 3, minW: 3, minH: 3 },
      { i: "kpi_steps",          x: 0, y: 8, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "kpi_calories",       x: 4, y: 8, w: 4, h: 3, minW: 2, minH: 2 },
    ],
  },
];
