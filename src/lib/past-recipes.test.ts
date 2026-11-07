import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { attachPastDinners, findPastDinner, pastRecipeAccess } from "./past-recipes";
import type { Meal, MealHistoryWeek, Recipe } from "./types";

const HOUSE = "house-river";
const OTHER = "house-other";
const WEEK = "week-nov-1";
const NEWER = "week-nov-8";

const DINNERS: Array<{
  nightDate: string;
  title: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
}> = [
  {
    nightDate: "2026-11-01",
    title: "Sirloin and green beans",
    ingredients: [
      { name: "Sirloin", quantity: 1, unit: "lb" },
      { name: "Green beans", quantity: 12, unit: "oz" },
    ],
  },
  {
    nightDate: "2026-11-02",
    title: "Barramundi and medley",
    ingredients: [
      { name: "Barramundi", quantity: 1, unit: "lb" },
      { name: "Vegetable medley", quantity: 12, unit: "oz" },
    ],
  },
  {
    nightDate: "2026-11-03",
    title: "Beef tips, egg noodles, and vegetables",
    ingredients: [
      { name: "Beef tips", quantity: 1, unit: "lb" },
      { name: "Egg noodles", quantity: 8, unit: "oz" },
      { name: "Vegetables", quantity: 12, unit: "oz" },
    ],
  },
  {
    nightDate: "2026-11-04",
    title: "Thighs and green beans",
    ingredients: [
      { name: "Chicken thighs", quantity: 1.5, unit: "lb" },
      { name: "Green beans", quantity: 12, unit: "oz" },
    ],
  },
  {
    nightDate: "2026-11-05",
    title: "Patties, fries, and medley",
    ingredients: [
      { name: "Patties", quantity: 4, unit: "count" },
      { name: "Fries", quantity: 1, unit: "lb" },
      { name: "Vegetable medley", quantity: 12, unit: "oz" },
    ],
  },
  {
    nightDate: "2026-11-06",
    title: "Tilapia and green beans",
    ingredients: [
      { name: "Tilapia", quantity: 1, unit: "lb" },
      { name: "Green beans", quantity: 12, unit: "oz" },
    ],
  },
];

function meal(id: string, householdId: string, weekId: string, nightDate: string, title: string, dayIndex: number): Meal {
  return {
    id,
    householdId,
    weekId,
    dayIndex,
    nightDate,
    title,
    pitch: "",
    audience: "family",
    servings: 2,
    prepMinutes: 25,
    isLeftovers: false,
    leftoverOfMealId: null,
    estimatedCostCents: null,
    estimatedCostSource: null,
    estimatedCostAsOf: null,
  };
}

function recipeFor(mealId: string, ingredients: Array<{ name: string; quantity: number; unit: string }>): Recipe {
  return {
    id: `recipe-${mealId}`,
    mealId,
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    steps: [`Cook ${mealId}`],
    ingredients: ingredients.map((item, index) => ({
      id: `${mealId}-${index}`,
      storeId: "store-1",
      ...item,
    })),
  };
}

function nov1History(): MealHistoryWeek[] {
  return [
    {
      startsOn: "2026-11-01",
      nights: DINNERS.map((dinner) => ({
        nightDate: dinner.nightDate,
        title: dinner.title,
        plates: 2,
      })),
    },
  ];
}

function nov1Meals(): Meal[] {
  return DINNERS.map((dinner, index) =>
    meal(`meal-${index}`, HOUSE, WEEK, dinner.nightDate, dinner.title, index),
  );
}

function nov1Recipes(): Recipe[] {
  return DINNERS.map((dinner, index) => recipeFor(`meal-${index}`, dinner.ingredients));
}

const migrationsDir = path.resolve(import.meta.dirname, "../../supabase/migrations");

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

function latestFunctionBody(sql: string, signature: string): string {
  const needle = `create or replace function ${signature}`;
  const at = sql.lastIndexOf(needle);
  expect(at, signature).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf("\n$$;", at);
  expect(end, signature).toBeGreaterThan(at);
  return sql.slice(at, end);
}

describe("past dinners survive a newer week", () => {
  it("keeps the prior locked week's dinners, steps, and ingredients", () => {
    const newerMeal = meal("meal-new", HOUSE, NEWER, "2026-11-08", "New week chili", 0);
    const newerRecipe = recipeFor("meal-new", [{ name: "Chili", quantity: 2, unit: "lb" }]);
    const linked = attachPastDinners({
      weeks: nov1History(),
      meals: [...nov1Meals(), newerMeal],
      recipes: [...nov1Recipes(), newerRecipe],
      householdId: HOUSE,
      weekStartsOn: 0,
    });

    expect(linked).toHaveLength(1);
    expect(linked[0]?.startsOn).toBe("2026-11-01");
    expect(linked[0]?.nights).toHaveLength(6);
    expect(linked[0]?.nights.map((night) => night.title)).toEqual(DINNERS.map((dinner) => dinner.title));
    for (const [index, dinner] of DINNERS.entries()) {
      const night = linked[0]?.nights[index];
      expect(night?.mealId).toBe(`meal-${index}`);
      expect(night?.recipe?.ingredients.map((item) => [item.name, item.quantity, item.unit])).toEqual(
        dinner.ingredients.map((item) => [item.name, item.quantity, item.unit]),
      );
      expect(night?.recipe?.steps).toEqual([`Cook meal-${index}`]);
    }
    expect(JSON.stringify(linked)).not.toContain("New week chili");
    expect(JSON.stringify(linked)).not.toContain("Chili");

    const opened = findPastDinner(linked, "meal-2");
    expect(opened?.week.startsOn).toBe("2026-11-01");
    expect(opened?.night.recipe?.ingredients.map((item) => item.name)).toEqual([
      "Beef tips",
      "Egg noodles",
      "Vegetables",
    ]);
  });

  it("keeps the title when the meal row is gone and does not invent a recipe", () => {
    const linked = attachPastDinners({
      weeks: nov1History(),
      meals: nov1Meals().filter((item) => item.id !== "meal-0"),
      recipes: nov1Recipes().filter((item) => item.mealId !== "meal-0"),
      householdId: HOUSE,
      weekStartsOn: 0,
    });
    expect(linked[0]?.nights[0]).toEqual({
      nightDate: "2026-11-01",
      title: "Sirloin and green beans",
      plates: 2,
      mealId: null,
      recipe: null,
    });
    expect(findPastDinner(linked, "meal-0")).toBeNull();
  });

  it("does not link another household's meal on the same night", () => {
    const stolen = meal("meal-stolen", OTHER, "week-other", "2026-11-01", "Sirloin and green beans", 0);
    const stolenRecipe = recipeFor("meal-stolen", [{ name: "Secret rub", quantity: 1, unit: "tbsp" }]);
    const linked = attachPastDinners({
      weeks: nov1History(),
      meals: [stolen],
      recipes: [stolenRecipe],
      householdId: HOUSE,
      weekStartsOn: 0,
    });
    expect(linked[0]?.nights[0]?.mealId).toBeNull();
    expect(linked[0]?.nights[0]?.recipe).toBeNull();
    expect(JSON.stringify(linked)).not.toContain("Secret rub");
  });

  it("refuses a night that matches two retained meals", () => {
    const first = meal("meal-a", HOUSE, WEEK, "2026-11-01", "Sirloin and green beans", 0);
    const second = meal("meal-b", HOUSE, "week-dup", "2026-11-01", "Other sirloin", 0);
    const linked = attachPastDinners({
      weeks: [
        {
          startsOn: "2026-11-01",
          nights: [{ nightDate: "2026-11-01", title: "Neither title", plates: 2 }],
        },
      ],
      meals: [first, second],
      recipes: [],
      householdId: HOUSE,
      weekStartsOn: 0,
    });
    expect(linked[0]?.nights[0]?.mealId).toBeNull();
  });
});

describe("past recipe authorization", () => {
  it("denies a signed-out reader and a reader from another household", () => {
    expect(
      pastRecipeAccess({ userId: null, readerHouseholdId: null, dinnerHouseholdId: HOUSE }),
    ).toEqual({ ok: false, reason: "unauthenticated" });
    expect(
      pastRecipeAccess({ userId: null, readerHouseholdId: HOUSE, dinnerHouseholdId: HOUSE }),
    ).toEqual({ ok: false, reason: "unauthenticated" });
    expect(
      pastRecipeAccess({ userId: "user-1", readerHouseholdId: OTHER, dinnerHouseholdId: HOUSE }),
    ).toEqual({ ok: false, reason: "wrong-household" });
    expect(
      pastRecipeAccess({ userId: "user-1", readerHouseholdId: null, dinnerHouseholdId: HOUSE }),
    ).toEqual({ ok: false, reason: "wrong-household" });
    expect(
      pastRecipeAccess({ userId: "user-1", readerHouseholdId: HOUSE, dinnerHouseholdId: HOUSE }),
    ).toEqual({ ok: true });
  });

  it("keeps database reads member-only and does not delete recipes when a newer week is planned", () => {
    const sql = allMigrationSql();
    const history = latestFunctionBody(sql, "public.meal_history()");
    const plan = latestFunctionBody(sql, "public.plan_next_week()");
    const ensure = latestFunctionBody(sql, "private.ensure_planning_week(");

    expect(history).toContain("if uid is null then");
    expect(history).toContain("raise exception 'Not authenticated'");
    expect(history).not.toMatch(/delete\s+from\s+public\.(recipes|recipe_ingredients|meals|weeks)/i);
    expect(plan).toContain("raise exception 'Not authenticated'");
    expect(plan).not.toMatch(/delete\s+from\s+public\./i);
    expect(ensure).not.toMatch(/delete\s+from\s+public\./i);
    expect(ensure).toContain("insert into public.weeks");

    expect(sql).toContain("grant execute on function public.meal_history() to authenticated");
    expect(sql).not.toContain("grant execute on function public.meal_history() to anon");
    expect(sql).toContain("create policy recipes_locked_read");
    expect(sql).toContain("create policy ingredients_locked_read");
    const recipePolicy = sql.slice(sql.lastIndexOf("create policy recipes_locked_read"));
    expect(recipePolicy.slice(0, 500)).toContain("public.is_household_member(household_id)");
    expect(recipePolicy.slice(0, 700)).toContain("w.status = 'locked'");
  });
});
