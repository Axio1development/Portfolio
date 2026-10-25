import type { Task } from "./types";
export type DemoTask = Readonly<Task & { label: string; cover?: string }>;
export const demoTasks: readonly DemoTask[] = Object.freeze([
  {
    id: "demo-1",
    title: "Map the onboarding experience",
    description:
      "Outline the journey from a first visit to a productive workspace. Document each step and identify opportunities to make the experience simpler.",
    status: "Backlog",
    priority: "Medium",
    due: "2026-10-29",
    assignee: "Alex Lee",
    checklist:
      "Review the current journey\nOutline the key screens\nDocument accessibility requirements",
    checks: ["Review the current journey"],
    label: "Planning",
  },
  {
    id: "demo-2",
    title: "Explore dashboard concepts",
    description:
      "Create a focused dashboard direction with clear hierarchy, useful progress indicators, and consistent spacing.",
    status: "Backlog",
    priority: "Low",
    due: "2026-10-30",
    assignee: "Morgan Reed",
    checklist: "Collect references\nSketch three directions",
    checks: [],
    label: "Design",
  },
  {
    id: "demo-3",
    title: "Build the project workspace",
    description:
      "Bring the project board to life with clear task states, priority labels, and a responsive layout. Keep the experience focused on the work.",
    status: "In progress",
    priority: "High",
    due: "2026-10-28",
    assignee: "Jamie Kim",
    checklist:
      "Implement the board layout\nAdd task detail views\nVerify mobile layouts",
    checks: ["Implement the board layout"],
    label: "Development",
    cover: "blue",
  },
  {
    id: "demo-4",
    title: "Refine the design system",
    description:
      "Define reusable components for navigation, forms, task cards, and notifications. Use consistent type, spacing, and interaction states.",
    status: "In progress",
    priority: "Medium",
    due: "2026-10-29",
    assignee: "Morgan Reed",
    checklist:
      "Define color tokens\nReview component states\nCheck contrast ratios",
    checks: ["Define color tokens", "Review component states"],
    label: "Design",
  },
  {
    id: "demo-5",
    title: "Review account security",
    description:
      "Review session handling, account isolation, and authorization. Confirm private task data stays private across accounts.",
    status: "In review",
    priority: "High",
    due: "2026-10-27",
    assignee: "Alex Lee",
    checklist:
      "Review authorization checks\nTest account isolation\nDocument findings",
    checks: ["Review authorization checks", "Test account isolation"],
    label: "Security",
  },
  {
    id: "demo-6",
    title: "Test the mobile experience",
    description:
      "Verify the core project flow at smaller screen sizes. Review navigation, task details, and horizontal board scrolling.",
    status: "In review",
    priority: "Medium",
    due: "2026-10-28",
    assignee: "Jamie Kim",
    checklist: "Test navigation\nReview task details\nCheck form inputs",
    checks: ["Test navigation", "Review task details"],
    label: "Quality",
  },
  {
    id: "demo-7",
    title: "Define the project scope",
    description:
      "Establish the launch goals, user needs, and a practical delivery plan for the project.",
    status: "Done",
    priority: "High",
    due: "2026-10-23",
    assignee: "Alex Lee",
    checklist:
      "Define the core problem\nAgree on launch scope\nDocument the milestones",
    checks: [
      "Define the core problem",
      "Agree on launch scope",
      "Document the milestones",
    ],
    label: "Planning",
  },
  {
    id: "demo-8",
    title: "Set up the project foundation",
    description:
      "Organize the source, establish a repeatable build, and create the initial application structure.",
    status: "Done",
    priority: "Medium",
    due: "2026-10-24",
    assignee: "Jamie Kim",
    checklist:
      "Organize source files\nConfigure build tooling\nAdd verification checks",
    checks: [
      "Organize source files",
      "Configure build tooling",
      "Add verification checks",
    ],
    label: "Development",
  },
]);
