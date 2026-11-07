"use client";

import Link from "next/link";
import { RecipeBlock } from "@/components/recipe-view";
import {
  HISTORY_UI_LIMIT,
  PAST_WEEKS_EMPTY,
  historyNightLine,
  historyWeekRowLabel,
} from "@/lib/meal-history";
import type { PastDinner, PastWeek } from "@/lib/types";
import { navigatorHref } from "@/lib/week-navigator";
import { nightCardAnchorId } from "@/lib/week-strip";

export function PastWeeksList({ weeks }: { weeks: PastWeek[] }) {
  const visible = weeks.slice(0, HISTORY_UI_LIMIT);
  if (visible.length === 0) {
    return (
      <p data-slot="past-weeks-empty" className="type-body text-muted-foreground">
        {PAST_WEEKS_EMPTY}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((week) => (
        <li key={week.startsOn}>
          <Link
            href={navigatorHref({ kind: "past", startsOn: week.startsOn })}
            data-slot="past-week-row"
            className="type-body flex min-h-12 items-center rounded-[14px] bg-card px-5 shadow-card"
          >
            {historyWeekRowLabel(week.startsOn, week.nights.length)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PastWeekDetail({
  week,
  canOpenRecipes,
}: {
  week: PastWeek;
  canOpenRecipes: boolean;
}) {
  return (
    <div data-slot="past-week-detail" data-readonly="true">
      <p data-slot="past-week-readonly" className="type-meta text-muted-foreground">
        Past weeks stay read-only.
      </p>
      <ul className="mt-4 space-y-3">
        {week.nights.map((night) => {
          const open = canOpenRecipes && Boolean(night.mealId);
          return (
            <li
              key={night.nightDate}
              id={nightCardAnchorId(night.nightDate)}
              tabIndex={-1}
              data-slot="past-week-night"
              className="scroll-mt-[calc(var(--shell-head-h)+0.25rem)] rounded-[14px] bg-card shadow-card outline-none focus:ring-2 focus:ring-primary/40"
            >
              {open ? (
                <Link
                  href={`/week/${night.mealId}`}
                  data-slot="past-dinner-link"
                  className="type-body block min-h-12 px-5 py-4"
                >
                  {historyNightLine(night)}
                </Link>
              ) : (
                <p className="type-body px-5 py-4">{historyNightLine(night)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PastRecipeDetail({ night }: { night: PastDinner }) {
  const servings = night.recipe?.servings ?? night.plates ?? 0;
  return (
    <div data-slot="past-recipe" data-readonly="true">
      <p data-slot="past-week-readonly" className="type-meta text-muted-foreground">
        Past weeks stay read-only.
      </p>
      <div className="mt-4">
        <RecipeBlock recipe={night.recipe ?? undefined} servings={servings} title={night.title} />
      </div>
    </div>
  );
}
