import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Meal, Recipe, ShoppingItem, Store, Vote } from "./types";
import {
  STORE_LABEL_SMITHS,
  STORE_LABEL_TRADER_JOES,
  STORE_LABEL_UNMATCHED,
  buildShoppingItems,
  groupStickyStoreLists,
  listItemDisplay,
  listSectionLabel,
  listStoreLabel,
  mergeQuantities,
  normalizeItemName,
} from "./shopping";

const meal = (id: string): Meal => ({
  id,
  householdId: "h",
  weekId: "w",
  dayIndex: 0,
  nightDate: "2026-08-30",
  title: "Test",
  pitch: "",
  audience: "family",
  servings: 4,
  prepMinutes: 20,
  isLeftovers: false,
  leftoverOfMealId: null,
  estimatedCostCents: null,
  estimatedCostSource: null,
  estimatedCostAsOf: null,
});

describe("shopping merge", () => {
  it("combines duplicate names at the same store and unit", () => {
    const items: ShoppingItem[] = [
      {
        id: "1",
        householdId: "h",
        shoppingListId: "l",
        storeId: "tj",
        name: "Olive oil",
        quantity: 3,
        unit: "tbsp",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
      {
        id: "2",
        householdId: "h",
        shoppingListId: "l",
        storeId: "tj",
        name: "olive  oil",
        quantity: 2,
        unit: "tbsp",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
    ];
    const merged = mergeQuantities(items);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
    expect(normalizeItemName("olive  oil")).toBe("olive oil");
  });

  it("omits removed nights and keeps leftover extras", () => {
    const votes: Vote[] = [
      {
        id: "v",
        householdId: "h",
        mealId: "skip-me",
        membershipId: "alex",
        choice: "remove",
        note: "travel",
        updatedAt: "2026-09-02T00:00:00.000Z",
      },
    ];
    const recipes: Recipe[] = [
      {
        id: "r1",
        mealId: "skip-me",
        servings: 4,
        prepMinutes: 10,
        cookMinutes: 10,
        steps: [],
        ingredients: [
          { id: "i1", name: "Steak", quantity: 1, unit: "lb", storeId: "smiths" },
        ],
      },
      {
        id: "r2",
        mealId: "keep-me",
        servings: 4,
        prepMinutes: 10,
        cookMinutes: 10,
        steps: [],
        ingredients: [
          { id: "i2", name: "Salsa", quantity: 1, unit: "jar", storeId: "tj" },
        ],
      },
    ];

    const items = buildShoppingItems({
      householdId: "h",
      shoppingListId: "list",
      meals: [meal("skip-me"), meal("keep-me")],
      recipes,
      votes,
    });

    expect(items.map((item) => item.name)).toEqual(["Salsa"]);
    expect(items[0].priceCents).toBeNull();
    expect(items[0].priceSource).toBeNull();
  });

  it("list rows expose name and quantity only — never a price", () => {
    const priced: ShoppingItem = {
      id: "1",
      householdId: "h",
      shoppingListId: "l",
      storeId: "tj",
      name: "Olive oil",
      quantity: 3,
      unit: "tbsp",
      priceCents: 399,
      priceSource: "invented",
      pricedAt: "2026-09-01",
      checked: false,
    };
    expect(listItemDisplay(priced)).toEqual({ name: "Olive oil", quantity: "3 tbsp" });
    expect(JSON.stringify(listItemDisplay(priced))).not.toContain("399");
    expect(JSON.stringify(listItemDisplay(priced))).not.toContain("$");
  });
});

describe("sticky store labels", () => {
  it("keeps every store's items, with canonical names only for the original slugs", () => {
    expect(listStoreLabel({ slug: "trader-joes" })).toBe(STORE_LABEL_TRADER_JOES);
    expect(listStoreLabel({ slug: "smiths" })).toBe(STORE_LABEL_SMITHS);
    expect(listStoreLabel({ slug: "kroger" })).toBeNull();
    expect(listStoreLabel({ slug: "costco" })).toBeNull();
    expect(listSectionLabel({ slug: "kroger", name: "Kroger" })).toBe("Kroger");
    expect(STORE_LABEL_TRADER_JOES).toBe("Trader Joe's");
    expect(STORE_LABEL_SMITHS).toBe("Smith's");

    const stores: Store[] = [
      { id: "tj", householdId: "h", name: "TJ", slug: "trader-joes", sortOrder: 0 },
      { id: "sm", householdId: "h", name: "Kroger", slug: "kroger", sortOrder: 1 },
      { id: "smiths", householdId: "h", name: "Smiths Market", slug: "smiths", sortOrder: 2 },
    ];
    const items: ShoppingItem[] = [
      {
        id: "1",
        householdId: "h",
        shoppingListId: "l",
        storeId: "tj",
        name: "Salsa",
        quantity: 1,
        unit: "jar",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
      {
        id: "2",
        householdId: "h",
        shoppingListId: "l",
        storeId: "sm",
        name: "Milk",
        quantity: 1,
        unit: "gal",
        priceCents: 399,
        priceSource: "invented",
        pricedAt: "2026-09-01",
        checked: false,
      },
      {
        id: "3",
        householdId: "h",
        shoppingListId: "l",
        storeId: "smiths",
        name: "Chicken",
        quantity: 1,
        unit: "ct",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
    ];

    const groups = groupStickyStoreLists(items, stores);
    expect(groups.map((group) => group.label)).toEqual(["Trader Joe's", "Kroger", "Smith's"]);
    expect(groups.flatMap((group) => group.items.map((item) => item.name))).toEqual([
      "Salsa",
      "Milk",
      "Chicken",
    ]);
    const shown = groups.flatMap((group) => group.items.map((item) => listItemDisplay(item)));
    expect(JSON.stringify(shown)).not.toContain("399");
    expect(JSON.stringify(shown)).not.toContain("$");
    expect(JSON.stringify(shown)).not.toContain("cart");
  });

  it("shows a Smith's-only list when the store was added by name (slug smith-s)", () => {
    const slug = "Smith's".toLowerCase().replace(/[^a-z0-9]+/g, "-");
    expect(slug).toBe("smith-s");
    const stores: Store[] = [
      { id: "smiths-store", householdId: "h", name: "Smith's", slug, sortOrder: 0 },
    ];
    const items: ShoppingItem[] = [
      {
        id: "1",
        householdId: "h",
        shoppingListId: "l",
        storeId: "smiths-store",
        name: "Chicken thighs",
        quantity: 1.5,
        unit: "lb",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
      {
        id: "2",
        householdId: "h",
        shoppingListId: "l",
        storeId: "smiths-store",
        name: "Yellow onion",
        quantity: 1,
        unit: "ct",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
    ];

    const groups = groupStickyStoreLists(items, stores);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("Smith's");
    expect(groups[0]?.items.map((item) => item.name)).toEqual(["Chicken thighs", "Yellow onion"]);
  });

  it("still lists items when their store row is missing from the snapshot", () => {
    const items: ShoppingItem[] = [
      {
        id: "1",
        householdId: "h",
        shoppingListId: "l",
        storeId: "missing-store",
        name: "Rice",
        quantity: 2,
        unit: "cups",
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      },
    ];
    const groups = groupStickyStoreLists(items, []);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe(STORE_LABEL_UNMATCHED);
    expect(groups[0]?.items.map((item) => item.name)).toEqual(["Rice"]);
  });
});

describe("Clear Sky list craft", () => {
  it("keeps sticky store headers on card + primary, with no prices or cart", () => {
    const list = readFileSync(path.resolve(import.meta.dirname, "../app/list/page.tsx"), "utf8");
    const row = readFileSync(
      path.resolve(import.meta.dirname, "../components/list-row.tsx"),
      "utf8",
    );
    expect(list).toContain("groupStickyStoreLists");
    expect(list).toContain('data-slot="list-store"');
    expect(list).toContain("bg-card/95");
    expect(list).toContain("text-primary");
    expect(list).toContain("sticky");
    expect(list).toContain("{group.label}");
    expect(list).not.toContain("group.store.name");
    expect(list).not.toContain("$");
    expect(list).not.toContain("cart");
    expect(list).not.toContain("Kroger");
    expect(list).not.toContain("#b35025");
    expect(list).not.toContain("Fraunces");
    expect(row).toContain('data-slot="list-row"');
    expect(row).toContain("font-mono");
    expect(row).toContain("min-h-12");
    expect(list).toContain("LIST_PRE_LOCK_DESCRIPTION");
    expect(list).toContain("removedMealIds");
    expect(list).not.toContain("skippedMealIds");
    expect(list).not.toMatch(/approves or skips/i);
    expect(list).not.toContain("Approve");
    expect(list).not.toContain("Skip");
    expect(list).not.toContain("You approved");
    expect(list).not.toContain("Your vote needed");
  });
});

