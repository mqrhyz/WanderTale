#!/usr/bin/env node
/**
 * CLI demo: pnpm dev:hotel-agent
 * Flow: run → (pause) → resume × N until done
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { closeBrowser } from "./tools/playwright-browser.js";
import { resumeHotelAgent, runHotelAgent } from "./agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const threadId = randomUUID();
const profile = {
  fullName: "Nguyen Van A",
  email: "demo@wandertale.vn",
  phone: "+84901234567",
  specialRequests: "Phòng tầng cao, giường đôi",
};

function printAssistantMessages(r: Awaited<ReturnType<typeof runHotelAgent>>) {
  const msgs = r.state.messages ?? [];
  const last = msgs[msgs.length - 1];
  if (last && "content" in last) {
    console.log("\n--- Agent ---");
    console.log(String(last.content));
  }
}

async function main() {
  console.log("Thread:", threadId);
  console.log("--- Bước 1: Parse yêu cầu (Gemini) ---\n");

  let r = await runHotelAgent({
    threadId,
    message:
      "Đặt phòng Đà Lạt 2026-06-01 đến 2026-06-03, 2 người lớn, 1 phòng, ngân sách 2 triệu VND.",
    userProfile: profile,
  });

  printAssistantMessages(r);
  console.log("\nTrạng thái:", r.state.step);
  console.log("Đang chờ user:", r.interrupted ? "có" : "không");
  console.log("Node tiếp theo:", r.nextNodes.join(", ") || "(không)");
  if (r.interrupt) console.log("Interrupt payload:", JSON.stringify(r.interrupt, null, 2));

  let step = 0;
  const maxSteps = 8;

  while (r.interrupted && r.state.step !== "done" && step < maxSteps) {
    step += 1;
    console.log(`\n--- Bước ${step + 1}: Resume (auto approve) ---\n`);

    const payload =
      r.state.step === "await_selection_confirm"
        ? { approved: true, offerIndex: 0 }
        : { approved: true };

    r = await resumeHotelAgent(threadId, payload);
    printAssistantMessages(r);
    console.log("Trạng thái:", r.state.step);
    console.log("Offers:", r.state.rawOffers?.length ?? 0);
    console.log("Đang chờ user:", r.interrupted ? "có" : "không");
    console.log("Node tiếp theo:", r.nextNodes.join(", ") || "(không)");
  }

  if (r.state.step === "done" || r.state.formFill) {
    console.log("\n=== Hoàn tất ===");
    console.log(JSON.stringify(r.state.formFill, null, 2));
  } else if (!r.interrupted) {
    console.log(
      "\n⚠ Graph đã dừng nhưng không ở trạng thái chờ xác nhận. Kiểm tra GEMINI_API_KEY hoặc step:",
      r.state.step
    );
  }

  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
