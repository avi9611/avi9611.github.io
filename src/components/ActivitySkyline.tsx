import * as React from "react"
import ContributionSkyline, { type ContributionDay } from "./ContributionSkyline"

// Written every night by the Skyline workflow in the avi9611/avi9611 profile repo.
const DATA_URL = "https://raw.githubusercontent.com/avi9611/avi9611/output/days.json"
const PROFILE_URL = "https://github.com/avi9611"

// The component reads shadcn colour names. Point them at this site's tokens so it follows the theme switch.
const THEME_VARS = {
  "--color-background": "var(--raised)",
  "--color-foreground": "var(--ink)",
  "--color-border": "var(--rule)",
  "--color-muted-foreground": "var(--ink-soft)",
} as React.CSSProperties

type State =
  | { status: "loading" }
  | { status: "ready"; days: ContributionDay[] }
  | { status: "failed" }

async function loadDays(): Promise<ContributionDay[]> {
  const response = await fetch(DATA_URL)
  if (!response.ok) throw new Error(`Contribution data request failed with ${response.status}`)
  const days: unknown = await response.json()
  if (!Array.isArray(days) || days.length === 0) throw new Error("Contribution data is empty or not a list")
  return days as ContributionDay[]
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-[var(--rule)] bg-[var(--raised)] p-6 text-center text-[var(--ink-soft)]">
      <p>{children}</p>
    </div>
  )
}

export default function ActivitySkyline() {
  const [state, setState] = React.useState<State>({ status: "loading" })

  React.useEffect(() => {
    let cancelled = false
    loadDays().then(
      (days) => {
        if (!cancelled) setState({ status: "ready", days })
      },
      (error) => {
        console.error(error)
        if (!cancelled) setState({ status: "failed" })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Never fall through to the component without data: it would draw a made-up demo year.
  if (state.status === "loading") return <Placeholder>Loading a year of contributions…</Placeholder>
  if (state.status === "failed") {
    return (
      <Placeholder>
        Couldn't load the contribution data. The same calendar is on{" "}
        <a href={PROFILE_URL} className="underline text-[var(--ink)]">my GitHub profile</a>.
      </Placeholder>
    )
  }
  return (
    <div style={THEME_VARS}>
      <ContributionSkyline data={state.days} />
    </div>
  )
}
