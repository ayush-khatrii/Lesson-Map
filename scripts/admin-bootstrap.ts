import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { db } from "../lib/prisma";
import { bootstrapAdmin } from "../lib/admin/bootstrap";

async function readPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Password setup requires an interactive terminal. Run this command in your terminal.",
    );
  // Readline handles raw terminal input, while this output suppresses password echo.
  const muted = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: muted,
    terminal: true,
  });
  try {
    process.stdout.write(
      "New LessonMap password (12–128 characters; input hidden): ",
    );
    const password = await prompt.question("");
    process.stdout.write("\nConfirm password (input hidden): ");
    const confirmation = await prompt.question("");
    process.stdout.write("\n");
    if (password !== confirmation)
      throw new Error("Passwords do not match. No changes were made.");
    return password;
  } finally {
    prompt.close();
    muted.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[args.indexOf("--email") + 1]?.trim().toLowerCase();
  if (
    !args.includes("--email") ||
    !email ||
    !email.includes("@") ||
    args.length !== (args.includes("--set-password") ? 3 : 2)
  )
    throw new Error(
      "Usage: npm run admin:bootstrap -- --email existing-user@example.com [--set-password]",
    );
  const password = args.includes("--set-password")
    ? await readPassword()
    : undefined;
  const methods = await bootstrapAdmin(db, email, password);
  console.log(
    "Super-admin access is ready. Sign in at /dashboard/admin/login and enroll an authenticator.",
  );
  if (password !== undefined)
    console.log(
      "Your LessonMap password has been set. Use it for email sign-in. Existing app and admin sessions were signed out.",
    );
  else if (methods.hasPassword)
    console.log(
      "Email sign-in uses your existing LessonMap password. If you never set it or have forgotten it, rerun with --set-password.",
    );
  else
    console.log(
      "This account has no email password. Rerun with --set-password to create one.",
    );
}
main()
  .catch((error) => {
    const safe = [
      "Usage:",
      "This email",
      "A different super admin",
      "Password",
    ];
    console.error(
      error instanceof Error &&
        safe.some((prefix) => error.message.startsWith(prefix))
        ? error.message
        : "Bootstrap failed. Check database access and apply the dashboard migration first.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
