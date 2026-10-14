// The site's revision: how many commits it has had and when the last one landed.
// Read from git at build time, so it is never typed by hand.
//
// A shallow clone only knows its newest commit, so the count would read "Rev 1".
// In that case, or with no git at all, this returns null and the footer leaves the
// line out. No revision is better than a wrong one.
import { execSync } from "node:child_process";

export interface Revision {
  number: number;
  date: Date;
}

const git = (args: string) =>
  execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();

let cached: Revision | null | undefined;

export function revision(): Revision | null {
  if (cached !== undefined) return cached;
  try {
    if (git("rev-parse --is-shallow-repository") === "true") return (cached = null);
    const number = Number(git("rev-list --count HEAD"));
    const date = new Date(git("log -1 --format=%cI"));
    cached = number > 0 && !Number.isNaN(date.getTime()) ? { number, date } : null;
  } catch {
    cached = null;
  }
  return cached;
}
