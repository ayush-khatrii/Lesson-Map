import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCourseGraph,
  hasFlowAccess,
  NODE_HEIGHT,
  type CourseOutline,
} from "../lib/flow/graph";
import { effectiveAiPlan } from "../lib/ai/schema";

const outline: CourseOutline = {
  id: "same",
  title: "Course",
  modules: [
    {
      id: "same",
      title: "First",
      lessons: [
        { id: "same", title: "One" },
        { id: "two", title: "Two" },
      ],
    },
    { id: "empty", title: "Empty", lessons: [] },
    { id: "last", title: "Last", lessons: [{ id: "three", title: "Three" }] },
  ],
};

test("graph preserves order, stable IDs and parent relationships without mutating input", () => {
  const before = JSON.stringify(outline);
  const graph = buildCourseGraph(outline);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, 7);
  assert.equal(graph.edges.length, 6);
  assert.deepEqual(
    graph.edges.find((edge) => edge.target === "lesson:same"),
    {
      id: JSON.stringify(["module:same", "lesson:same"]),
      source: "module:same",
      target: "lesson:same",
      type: "smoothstep",
    },
  );
  assert.equal(
    graph.nodes.find((n) => n.id === "lesson:two")?.data.label,
    "1.2",
  );
  assert.equal(JSON.stringify(outline), before);
  assert.deepEqual(buildCourseGraph(outline), graph);
  const renamed = buildCourseGraph({ ...outline, title: "Changed" });
  assert.deepEqual(
    renamed.nodes.map((n) => n.position),
    graph.nodes.map((n) => n.position),
  );
});

test("uneven and empty module branches do not overlap", () => {
  const { nodes } = buildCourseGraph(outline);
  for (const x of [340, 680]) {
    const column = nodes
      .filter((n) => n.position.x === x)
      .sort((a, b) => a.position.y - b.position.y);
    for (let i = 1; i < column.length; i++)
      assert.ok(column[i].position.y >= column[i - 1].position.y + NODE_HEIGHT);
  }
  assert.deepEqual(
    buildCourseGraph({ id: "empty", title: "", modules: [] }).edges,
    [],
  );
  assert.equal(
    buildCourseGraph({ id: "empty", title: "", modules: [] }).nodes.length,
    1,
  );
});

test("reordering, adding and deleting lessons regenerates the outline", () => {
  const changed = buildCourseGraph({
    ...outline,
    modules: [
      {
        ...outline.modules[0],
        lessons: [outline.modules[0].lessons[1], { id: "new", title: "New" }],
      },
    ],
  });
  assert.equal(
    changed.nodes.find((n) => n.id === "lesson:two")?.data.label,
    "1.1",
  );
  assert.ok(changed.nodes.some((n) => n.id === "lesson:new"));
  assert.ok(!changed.nodes.some((n) => n.id === "lesson:same"));
});

test("large outlines retain unique nodes and valid connections", () => {
  const graph = buildCourseGraph({
    id: "large",
    title: "Long ".repeat(100),
    modules: Array.from({ length: 30 }, (_, m) => ({
      id: `m${m}`,
      title: `Module ${m}`,
      lessons: Array.from({ length: 20 }, (_, l) => ({
        id: `m${m}l${l}`,
        title: "Long lesson ".repeat(30),
      })),
    })),
  });
  const ids = new Set(graph.nodes.map((n) => n.id));
  assert.equal(ids.size, 631);
  assert.ok(graph.edges.every((e) => ids.has(e.source) && ids.has(e.target)));
});

test("only effective paid creator plans unlock Flow", () => {
  for (const plan of ["FREE", "CREATOR", "PROFESSIONAL"] as const) {
    for (const status of ["active", "canceled", "past_due", null]) {
      for (const cancel of [false, true]) {
        const effective = effectiveAiPlan({
          plan,
          subscriptionStatus: status,
          subscriptionCancelAtPeriodEnd: cancel,
          subscriptionCurrentPeriodEnd: null,
        });
        assert.equal(
          hasFlowAccess(effective),
          plan !== "FREE" && status === "active" && !cancel,
        );
      }
    }
  }
  assert.equal(hasFlowAccess(undefined), false);
  assert.equal(hasFlowAccess("unknown"), false);
});
