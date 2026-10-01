import test from "node:test";
import assert from "node:assert/strict";

import { courseMessages } from "../lib/ai/deepseek";

const input = {
  requestId: "11111111-1111-4111-8111-111111111111",
  type: "course" as const,
  topic: "AI systems",
  audience: "software engineers",
  moduleCount: 10,
  lessonsPerModule: 3,
};

test("large AI requests use a compact schema instruction instead of a giant inline JSON schema", () => {
  const [system] = courseMessages(input);
  const message = String(system.content);

  assert.match(message, /exactly 10 modules/i);
  assert.match(message, /exactly 3 lesson objects/i);
  assert.doesNotMatch(message, /minItems|maxItems|additionalProperties|\$schema/i);
  assert.ok(message.length < 4000, `large prompt should stay compact; got ${message.length} chars`);
});
