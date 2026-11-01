import type { ImpactLevel, State, TierId } from "./index";

/**
 * Rows of the worked examples table in docs/SCORING.md, column for column. They are archetypes, not
 * real repositories. `closed` is the percentage of 100 issues that are closed, which gives H.
 */
export interface Example {
  name: string;
  stars: number;
  forks: number;
  contributors: number;
  commits: number;
  daysSinceCommit: number;
  ageDays: number;
  closed: number;
  level: ImpactLevel;
  /** Popularity, Community, Stability, Impact. */
  pillars: [number, number, number, number];
  total: number;
  state: State;
  tier: TierId;
}

export const EXAMPLES: Example[] = [
  {
    name: "Ecosystem giant",
    stars: 240000,
    forks: 50000,
    contributors: 1800,
    commits: 1500,
    daysSinceCommit: 1,
    ageDays: 4500,
    closed: 90,
    level: 5,
    pillars: [24.62, 23.03, 24.47, 25],
    total: 97.11,
    state: "solid",
    tier: "2x2x2",
  },
  {
    name: "Healthy library",
    stars: 5000,
    forks: 500,
    contributors: 40,
    commits: 200,
    daysSinceCommit: 10,
    ageDays: 1460,
    closed: 80,
    level: 3,
    pillars: [16.27, 13.49, 23.66, 15],
    total: 68.42,
    state: "solid",
    tier: "2x2x1",
  },
  {
    name: "Niche library",
    stars: 500,
    forks: 50,
    contributors: 5,
    commits: 30,
    daysSinceCommit: 30,
    ageDays: 547,
    closed: 70,
    level: 2,
    pillars: [11.44, 7.6, 20.63, 10],
    total: 49.67,
    state: "solid",
    tier: "2x1x1",
  },
  {
    name: "Rising tool",
    stars: 3000,
    forks: 200,
    contributors: 12,
    commits: 400,
    daysSinceCommit: 2,
    ageDays: 120,
    closed: 60,
    level: 3,
    pillars: [14.9, 12.21, 16.66, 15],
    total: 58.78,
    state: "translucent",
    tier: "2x1x1",
  },
  {
    name: "Dormant legacy",
    stars: 20000,
    forks: 3000,
    contributors: 150,
    commits: 5,
    daysSinceCommit: 500,
    ageDays: 3000,
    closed: 50,
    level: 3,
    pillars: [19.48, 11.56, 13.18, 15],
    total: 59.22,
    state: "weathered",
    tier: "2x1x1",
  },
  {
    name: "Over the caps",
    stars: 600000,
    forks: 60000,
    contributors: 5000,
    commits: 9000,
    daysSinceCommit: 0,
    ageDays: 4000,
    closed: 100,
    level: 5,
    pillars: [25, 25, 25, 25],
    total: 100,
    state: "solid",
    tier: "2x2x2",
  },
  {
    name: "Brand new, empty",
    stars: 0,
    forks: 0,
    contributors: 0,
    commits: 0,
    daysSinceCommit: 0,
    ageDays: 0,
    closed: 50,
    level: 1,
    pillars: [0, 0, 15, 5],
    total: 20,
    state: "translucent",
    tier: "1x1x1",
  },
];
