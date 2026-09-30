import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const signupSql = readFileSync(
  path.join(repoRoot, "supabase/migrations/20260930100807_signup_email_allowlist.sql"),
  "utf8",
);
const lockdownSql = readFileSync(
  path.join(repoRoot, "supabase/migrations/20260930100854_riverrat_only_lockdown.sql"),
  "utf8",
);

const RIVER_RAT_ID = "956ef285-6ba2-4f7b-8df4-f4d7a103ec4f";

describe("RiverRat signup allowlist", () => {
  it("rejects any other email before insert on auth.users", () => {
    expect(signupSql).toMatch(/create or replace function public\.enforce_signup_email_allowlist\(\)/);
    expect(signupSql).toMatch(/before insert on auth\.users/);
    expect(signupSql).toMatch(/trg_enforce_signup_email_allowlist/);
    expect(signupSql).toMatch(/lower\(trim\(coalesce\(NEW\.email, ''\)\)\)/);
    expect(signupSql).toContain("james.martyka@gmail.com");
    expect(signupSql).toContain("trish.dhaene@gmail.com");
    expect(signupSql).toContain("Signup is limited to household emails.");
    expect(signupSql).not.toMatch(/delete from auth\.users/i);
  });
});

describe("RiverRat household lockdown", () => {
  it("blocks a new household and keeps meal writes off this trigger", () => {
    expect(lockdownSql).toMatch(/create or replace function private\.is_household_email\(addr text\)/);
    expect(lockdownSql).toMatch(/set search_path = public/);
    expect(lockdownSql).toMatch(/revoke all on function private\.is_household_email\(text\) from public, anon, authenticated, service_role/);
    expect(lockdownSql).toMatch(/revoke all on function public\.block_extra_households\(\) from public, anon, authenticated, service_role/);
    expect(lockdownSql).toMatch(/lower\(trim\(coalesce\(addr, ''\)\)\)/);
    expect(lockdownSql).toContain("james.martyka@gmail.com");
    expect(lockdownSql).toContain("trish.dhaene@gmail.com");
    expect(lockdownSql).toContain(RIVER_RAT_ID);
    expect(lockdownSql).toMatch(/create or replace function public\.block_extra_households\(\)/);
    expect(lockdownSql).toMatch(/trg_block_extra_households/);
    expect(lockdownSql).toMatch(/before insert on public\.households/);
    expect(lockdownSql).toContain("RiverRat is the only household on this site.");
    expect(lockdownSql).toMatch(/create or replace function public\.create_household\(household_name text\)/);
    expect(lockdownSql).toContain("New houses are disabled.");
    expect(lockdownSql).not.toMatch(/insert into public\.households/i);
    expect(lockdownSql).toMatch(/trg_enforce_membership_email_allowlist/);
    expect(lockdownSql).toMatch(/before insert or update on public\.memberships/);
    expect(lockdownSql).toContain("Only household members can join.");
    expect(lockdownSql).toMatch(/banned_until = 'infinity'/);
    expect(lockdownSql).not.toMatch(/delete from auth\.users/i);
    expect(lockdownSql).not.toMatch(/on public\.meals/i);
    expect(lockdownSql).not.toMatch(/on public\.recipes/i);
    expect(lockdownSql).not.toMatch(/on public\.shopping_lists/i);
    expect(lockdownSql).not.toMatch(/on public\.shopping_items/i);
    expect(lockdownSql).not.toMatch(/on public\.ballot_requests/i);
  });
});
