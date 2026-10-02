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

export const priorities = [
  { tone: "coral", href: "#access", title: "Reduce missed appointments", detail: "Patient Experience · Review calculated no-show rates and identify outreach opportunities." },
  { tone: "amber", href: "#revenue", title: "Review denial patterns", detail: "Revenue Cycle · Compare calculated payer and clinic denials with the industry threshold." },
  { tone: "teal", href: "#workforce", title: "Bring CME tracking together", detail: "People & Workforce · Current tracking remains spreadsheet-based." },
];

export const departments = [
  { id: undefined, iconClass: "icon-clinical", icon: "＋", title: "Clinical Operations", text: "Clinical staff work across multiple locations and two EHR systems.", href: "#locations", linkLabel: "View locations" },
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
