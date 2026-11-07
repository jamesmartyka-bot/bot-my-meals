import { weekStartOn } from "./open-weeks";
import type { Meal, MealHistoryNight, MealHistoryWeek, PastDinner, PastWeek, Recipe } from "./types";

export type PastRead =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "wrong-household" };

export function pastRecipeAccess(input: {
  userId: string | null;
  readerHouseholdId: string | null;
  dinnerHouseholdId: string;
}): PastRead {
  if (!input.userId) return { ok: false, reason: "unauthenticated" };
  if (!input.readerHouseholdId || input.readerHouseholdId !== input.dinnerHouseholdId) {
    return { ok: false, reason: "wrong-household" };
  }
  return { ok: true };
}

export function findPastDinner(
  weeks: readonly PastWeek[],
  mealId: string,
): { week: PastWeek; night: PastDinner } | null {
  for (const week of weeks) {
    const night = week.nights.find((item) => item.mealId === mealId);
    if (night) return { week, night };
  }
  return null;
}

export function attachPastDinners(input: {
  weeks: readonly MealHistoryWeek[];
  meals: readonly Meal[];
  recipes: readonly Recipe[];
  householdId: string;
  weekStartsOn: number;
}): PastWeek[] {
  return input.weeks.map((week) => ({
    startsOn: week.startsOn,
    nights: week.nights.map((night) => linkNight(night, week.startsOn, input)),
  }));
}

function linkNight(
  night: MealHistoryNight,
  startsOn: string,
  input: {
    meals: readonly Meal[];
    recipes: readonly Recipe[];
    householdId: string;
    weekStartsOn: number;
  },
): PastDinner {
  const matches = input.meals.filter((meal) => {
    if (meal.householdId !== input.householdId) return false;
    if (meal.nightDate.slice(0, 10) !== night.nightDate) return false;
    return weekStartOn(meal.nightDate.slice(0, 10), input.weekStartsOn) === startsOn;
  });
  const chosen = pickRetainedMeal(matches, night.title);
  if (!chosen) {
    return { nightDate: night.nightDate, title: night.title, plates: night.plates, mealId: null, recipe: null };
  }
  const recipe = input.recipes.find((item) => item.mealId === chosen.id) ?? null;
  return {
    nightDate: night.nightDate,
    title: night.title,
    plates: night.plates,
    mealId: chosen.id,
    recipe,
  };
}

function pickRetainedMeal(matches: readonly Meal[], title: string): Meal | undefined {
  const titled = matches.filter((meal) => meal.title.trim() === title.trim());
  if (titled.length === 1) return titled[0];
  if (matches.length === 1) return matches[0];
  return undefined;
}
