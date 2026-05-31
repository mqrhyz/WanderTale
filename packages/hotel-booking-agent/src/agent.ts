import { HumanMessage } from "@langchain/core/messages";
import {
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HotelAgentAnnotation, type HotelAgentState } from "./state.js";
import {
  parseRequestNode,
  awaitSearchConfirmNode,
  runSearchNode,
  compareNode,
  awaitSelectionConfirmNode,
  awaitFillConfirmNode,
  fillBookingFormNode,
  paymentHandoffNode,
} from "./nodes/graph-nodes.js";

// Bỏ "await_search_confirm" — UI đã có form đầy đủ, không cần confirm lại trước khi quét.
const CONFIRM_NODES = [
  "await_selection_confirm",
  "await_fill_confirm",
  "payment_handoff",
] as const;

/**
 * Checkpointer: ưu tiên PostgresSaver (state lưu vào DB → không mất khi server reload).
 * Fallback MemorySaver nếu thiếu DATABASE_URL (chỉ phù hợp dev nhanh).
 */
let checkpointer: MemorySaver | PostgresSaver;
let checkpointerReady: Promise<void> = Promise.resolve();

if (process.env.DATABASE_URL?.trim()) {
  const pgSaver = PostgresSaver.fromConnString(process.env.DATABASE_URL.trim());
  // Lazy setup — tạo bảng `checkpoints`, `checkpoint_writes`, ... lần đầu chạy.
  checkpointerReady = pgSaver.setup().catch((err) => {
    console.warn("[hotel-agent] PostgresSaver.setup() failed:", err);
  });
  checkpointer = pgSaver;
  console.log("[hotel-agent] Using PostgresSaver for checkpoints");
} else {
  checkpointer = new MemorySaver();
  console.warn(
    "[hotel-agent] DATABASE_URL chưa được set → dùng MemorySaver (mất state khi server reload)"
  );
}

function buildGraph() {
  const graph = new StateGraph(HotelAgentAnnotation)
    .addNode("parse_request", parseRequestNode)
    .addNode("await_search_confirm", awaitSearchConfirmNode)
    .addNode("run_search", runSearchNode)
    .addNode("compare", compareNode)
    .addNode("await_selection_confirm", awaitSelectionConfirmNode)
    .addNode("await_fill_confirm", awaitFillConfirmNode)
    .addNode("fill_booking_form", fillBookingFormNode)
    .addNode("payment_handoff", paymentHandoffNode)
    .addEdge(START, "parse_request")
    .addEdge("parse_request", "await_search_confirm")
    .addConditionalEdges("await_search_confirm", (s) =>
      s.step === "searching" ? "run_search" : END
    )
    .addEdge("run_search", "compare")
    .addEdge("compare", "await_selection_confirm")
    .addConditionalEdges("await_selection_confirm", (s) =>
      s.step === "await_fill_confirm" ? "await_fill_confirm" : END
    )
    .addConditionalEdges("await_fill_confirm", (s) =>
      s.step === "filling" ? "fill_booking_form" : END
    )
    .addEdge("fill_booking_form", "payment_handoff")
    .addEdge("payment_handoff", END);

  return graph.compile({
    checkpointer,
    // Pause *before* confirm nodes so CLI/API can show plan and call resume()
    interruptBefore: [...CONFIRM_NODES],
  });
}

let compiled: ReturnType<typeof buildGraph> | null = null;

export function getHotelAgentGraph() {
  if (!compiled) compiled = buildGraph();
  return compiled;
}

export type RunHotelAgentInput = {
  threadId: string;
  message: string;
  userProfile?: HotelAgentState["userProfile"];
};

export type AgentRunResult = {
  threadId: string;
  state: Partial<HotelAgentState>;
  interrupted: boolean;
  /** Payload for UI (confirm search / selection / fill / payment) */
  interrupt?: unknown;
  /** LangGraph nodes waiting to run after resume */
  nextNodes: string[];
};

function runConfig(threadId: string): RunnableConfig {
  return { configurable: { thread_id: threadId } };
}

/** Start or continue conversation (no resume payload) */
export async function runHotelAgent(input: RunHotelAgentInput): Promise<AgentRunResult> {
  await checkpointerReady;
  const graph = getHotelAgentGraph();
  await graph.invoke(
    {
      threadId: input.threadId,
      messages: [new HumanMessage(input.message)],
      userProfile: input.userProfile ?? null,
    },
    runConfig(input.threadId)
  );

  return materializeResult(input.threadId);
}

export type ResumeHotelAgentOptions = {
  /** Vá `userProfile` vào state trước khi resume (UI có thể gửi muộn sau lúc quét) */
  userProfile?: HotelAgentState["userProfile"];
};

/** Resume after user confirmation (human-in-the-loop) */
export async function resumeHotelAgent(
  threadId: string,
  resumePayload: unknown,
  options: ResumeHotelAgentOptions = {}
): Promise<AgentRunResult> {
  await checkpointerReady;
  const graph = getHotelAgentGraph();
  const cfg = runConfig(threadId);

  if (options.userProfile) {
    // Patch state trước khi resume — cần thiết khi UI gửi profile sau lúc quét giá.
    // Phải truyền `asNode` vì LangGraph có pending interrupt → cập nhật nặc danh sẽ ambiguous.
    const snap = await graph.getState(cfg);
    const currentProfile = (snap.values as Partial<HotelAgentState>).userProfile;
    const sameProfile =
      currentProfile &&
      currentProfile.fullName === options.userProfile.fullName &&
      currentProfile.email === options.userProfile.email &&
      currentProfile.phone === options.userProfile.phone;
    if (!sameProfile) {
      const asNode = snap.next[0] ?? "parse_request";
      await graph.updateState(cfg, { userProfile: options.userProfile }, asNode);
    }
  }

  await graph.invoke(new Command({ resume: resumePayload }), cfg);
  return materializeResult(threadId);
}

export async function getHotelAgentState(threadId: string): Promise<Partial<HotelAgentState>> {
  await checkpointerReady;
  const graph = getHotelAgentGraph();
  const snap = await graph.getState(runConfig(threadId));
  return snap.values as Partial<HotelAgentState>;
}

/** Read interrupt + waiting nodes from checkpoint (invoke() does not return __interrupt__) */
async function materializeResult(threadId: string): Promise<AgentRunResult> {
  const graph = getHotelAgentGraph();
  const snap = await graph.getState(runConfig(threadId));
  const state = snap.values as Partial<HotelAgentState>;

  const interruptValues = snap.tasks.flatMap((t) =>
    (t.interrupts ?? []).map((i) => i.value)
  );

  const waitingConfirm = snap.next.some((n) =>
    (CONFIRM_NODES as readonly string[]).includes(n)
  );

  const interrupted = interruptValues.length > 0 || waitingConfirm;

  const pendingInterrupt = buildPendingInterrupt(state, snap.next);

  return {
    threadId,
    state: {
      step: state.step,
      searchCriteria: state.searchCriteria,
      searchPlanSummary: state.searchPlanSummary,
      rawOffers: state.rawOffers,
      comparison: state.comparison,
      selectedOffer: state.selectedOffer,
      formFill: state.formFill,
      siteScans: state.siteScans,
      activityLog: state.activityLog,
      confirmedSteps: state.confirmedSteps,
      error: state.error,
      messages: state.messages,
    },
    interrupted,
    interrupt: interruptValues[0] ?? pendingInterrupt,
    nextNodes: [...snap.next],
  };
}

function buildPendingInterrupt(
  state: Partial<HotelAgentState>,
  next: string[]
): unknown | undefined {
  const node = next[0];
  if (node === "await_selection_confirm") {
    return {
      kind: "confirm_selection",
      title: "Chọn phòng",
      summary: state.comparison?.reasoning ?? "",
      data: { comparison: state.comparison },
    };
  }
  if (node === "await_fill_confirm") {
    return {
      kind: "confirm_fill",
      title: "Xác nhận điền form",
      summary: state.userProfile?.fullName ?? "",
      data: { profile: state.userProfile, offer: state.selectedOffer },
    };
  }
  if (node === "payment_handoff") {
    return {
      kind: "payment_handoff",
      title: "Thanh toán thủ công",
      data: { formFill: state.formFill, offer: state.selectedOffer },
    };
  }
  return undefined;
}
