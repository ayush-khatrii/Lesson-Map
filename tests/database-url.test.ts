import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { databaseConnectionString } from "../lib/database-url";

test("SSL aliases retain certificate verification without the pg compatibility warning", () => {
  for (const mode of ["prefer", "require", "verify-ca"]) {
    const input = `postgresql://user:p%40ss@db.example.test:5432/app?sslmode=${mode}&channel_binding=require`;
    const normalized = databaseConnectionString(input)!;
    const url = new URL(normalized);
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.get("channel_binding"), "require");
    assert.equal(url.username, "user");
    assert.equal(url.password, "p%40ss");
    assert.equal(url.host, "db.example.test:5432");
    const client = new pg.Client({ connectionString: normalized });
    const ssl = client.ssl as boolean | { rejectUnauthorized?: boolean };
    assert.notEqual(ssl, false);
    if (typeof ssl === "object") assert.notEqual(ssl.rejectUnauthorized, false);
  }
});

test("explicit SSL modes and libpq compatibility retain their chosen semantics", () => {
  for (const query of [
    "",
    "?sslmode=verify-full",
    "?sslmode=disable",
    "?uselibpqcompat=true&sslmode=require",
  ]) {
    const input = `postgresql://user@localhost/test${query}`;
    assert.equal(databaseConnectionString(input), input);
  }
  assert.equal(databaseConnectionString(undefined), undefined);
});
