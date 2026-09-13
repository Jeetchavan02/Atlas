import { resolveSafePath, checkSymlinkEscape } from "./src/services/localAgent/workspace.js";
import { registry } from "./src/services/actions.js";

async function runTests() {
  console.log("Running local agent security tests...");
  let passed = 0;
  let failed = 0;

  function assertThrows(fn: () => any, match: string) {
    try {
      fn();
      console.error(`❌ Expected error matching "${match}" but none was thrown.`);
      failed++;
    } catch (e: any) {
      if (e.message.includes(match)) {
        console.log(`✅ Passed: ${match}`);
        passed++;
      } else {
        console.error(`❌ Expected error matching "${match}" but got: ${e.message}`);
        failed++;
      }
    }
  }

  // 1. files.read inside workspace (implicit via boundary check)
  try {
    const p = resolveSafePath("package.json");
    console.log(`✅ Passed: allowed package.json (${p})`);
    passed++;
  } catch (e: any) {
    console.error(`❌ Failed: ${e.message}`);
    failed++;
  }

  // 2. Traversal rejection
  assertThrows(() => resolveSafePath("../secrets.txt"), "escapes workspace");
  assertThrows(() => resolveSafePath("src/../../secrets.txt"), "escapes workspace");
  assertThrows(() => resolveSafePath("some/../.."), "escapes workspace");

  // 3. Sensitive file rejection
  assertThrows(() => resolveSafePath(".env"), "sensitive file blocked");
  assertThrows(() => resolveSafePath(".env.local"), "sensitive file blocked");
  assertThrows(() => resolveSafePath("config/credentials.json"), "sensitive file blocked");
  assertThrows(() => resolveSafePath("certs/prod.pem"), "sensitive file blocked");
  assertThrows(() => resolveSafePath("~/.ssh/id_rsa"), "sensitive file blocked");

  // 4. Registry Execution: Unapproved HIGH risk
  try {
    await registry.execute("files.create", { path: "test.txt", content: "hello" });
    console.error("❌ Expected HIGH risk action to require approval");
    failed++;
  } catch (e: any) {
    if (e.message.includes("requires explicit user approval")) {
      console.log("✅ Passed: HIGH risk action blocked without approval");
      passed++;
    } else {
      console.error("❌ Unexpected error:", e.message);
      failed++;
    }
  }

  // 5. Registry Execution: Approved HIGH risk
  try {
    await registry.execute("terminal.run_safe", { command: "node --version" }, { isApproved: true });
    console.log("✅ Passed: Approved terminal command executed");
    passed++;
  } catch (e: any) {
    console.error("❌ Failed approved terminal execution:", e.message);
    failed++;
  }
  
  // 6. Registry Execution: Arbitrary command blocked
  try {
    await registry.execute("terminal.run_safe", { command: "rm -rf /" }, { isApproved: true });
    console.error("❌ Expected arbitrary command to be blocked");
    failed++;
  } catch (e: any) {
    if (e.message.includes("not in the explicit allowlist")) {
      console.log("✅ Passed: Arbitrary command blocked");
      passed++;
    } else {
      console.error("❌ Unexpected error:", e.message);
      failed++;
    }
  }

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
