export const workspaceNav = [
  {
    label: "Workspace",
    ariaLabel: "Workspace navigation",
    links: [
      { id: "overview", icon: "◈", label: "Overview" },
      { id: "departments", icon: "◌", label: "Departments" },
      { id: "locations", icon: "⌖", label: "Locations" },
      { id: "priorities", icon: "!", label: "Priorities", showPriorityCount: true },
    ],
  },
  {
    label: "People",
    ariaLabel: "People navigation",
    links: [
      { id: "workforce", icon: "◎", label: "Workforce" },
      { id: "access", icon: "⌁", label: "Patient access" },
    ],
  },
];

export const metrics = [
  { tone: "teal", area: "Network", tag: "Scale", value: "12", label: "outpatient clinics", detail: "9 US · 3 UK" },
  { tone: "coral", area: "Patient access", tag: "Attention", value: "22%", label: "network no-show rate", detail: "Approx. $1.8m in lost slots annually" },
  { tone: "amber", area: "Revenue cycle", tag: "Attention", value: "14%", label: "claims denial rate", detail: "Industry benchmark: 5–8%" },
  { tone: "ink", area: "Workforce", tag: "People", value: "47d", label: "average time to hire", detail: "Clinical roles across the network" },
];

export const priorities = [
  { tone: "coral", href: "#access", title: "Reduce missed appointments", detail: "Patient Experience · 22% no-show rate needs proactive outreach." },
  { tone: "amber", href: "#revenue", title: "Review denial patterns", detail: "Revenue Cycle · US denials are more than double the industry range." },
  { tone: "teal", href: "#workforce", title: "Bring CME tracking together", detail: "People & Workforce · Current tracking remains spreadsheet-based." },
];

export const departments = [
  { id: undefined, iconClass: "icon-clinical", icon: "＋", title: "Clinical Operations", text: "120 clinical staff across 12 locations, working across two EHR systems.", href: "#locations", linkLabel: "View locations" },
  { id: undefined, iconClass: "icon-access", icon: "⌁", title: "Patient Experience", text: "Bookings, reminders, follow-up, and a smoother journey from contact to discharge.", href: "#access", linkLabel: "View access signal" },
  { id: "revenue", iconClass: "icon-revenue", icon: "$", title: "Revenue Cycle", text: "US insurance, UK private pay, and an NHS contract without a unified view.", href: "#priorities", linkLabel: "View priority" },
  { id: "workforce", iconClass: "icon-people", icon: "◎", title: "People & Workforce", text: "200 employees, clinical onboarding, and CME compliance across two countries.", href: "#priorities", linkLabel: "View priority" },
];

export const mapPoints = [
  { className: "point-a", label: "Austin" },
  { className: "point-b", label: "Miami" },
  { className: "point-c", label: "Atlanta" },
  { className: "point-d", label: "London" },
  { className: "point-e", label: "Manchester" },
];
