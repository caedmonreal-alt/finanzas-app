import type { Project } from "@/lib/types";

/** Validated categorical palette (light/dark share hue families). Assigned in fixed order by project sort. */
export const PROJECT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

/** Stable color per project: explicit color if set, else by position; Personal is always yellow, extra ones gray. */
export function projectColor(projects: Project[]) {
  const map = new Map<string, string>();
  let i = 0;
  projects.forEach((p) => {
    if (p.color) map.set(p.id, p.color);
    else if (p.kind === "personal") map.set(p.id, "#eda100");
    else map.set(p.id, PROJECT_COLORS[i++ % PROJECT_COLORS.length]);
  });
  return (id: string) => map.get(id) ?? "#8E8E93";
}
