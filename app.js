import { createDecisionReceipt, createMission, describeRuleEvidence, evaluateOffer, purchase, replaceMissionPolicy, searchOffers, tightenMission } from "./engine.js";
import { createAppState, parseStoredState, replaceCurrentMission, serializeState, STORAGE_KEY } from "./state.js";
import { activeToolNames, toolContracts } from "./tool-contracts.js";

const stored = parseStoredState(localStorage.getItem(STORAGE_KEY));
const state = stored ?? createAppState();
let mission = state.mission;
let toolController = null;
let toolSync = Promise.resolve();
let activeToolExecutions = 0;
let toolSyncPending = false;

const nodes = {
  timeline: document.querySelector("#timeline"), offers: document.querySelector("#offers"), offersEmpty: document.querySelector("#offers-empty"), offerCount: document.querySelector("#offer-count"),
  authorityStatus: document.querySelector("#authority-status"), missionStatus: document.querySelector("#mission-status"), nextActionTitle: document.querySelector("#next-action-title"), nextActionDetail: document.querySelector("#next-action-detail"), receipt: document.querySelector("#receipt"), receiptHistory: document.querySelector("#receipt-history"), receiptCount: document.querySelector("#receipt-count"),
  search: document.querySelector("#search-button"), searchEmpty: document.querySelector("#search-empty-button"), selectBest: document.querySelector("#select-button"), evaluate: document.querySelector("#evaluate-button"), purchase: document.querySelector("#purchase-button"), revoke: document.querySelector("#revoke-button"), tighten: document.querySelector("#tighten-button"),
  form: document.querySelector("#mission-form"), formStatus: document.querySelector("#form-status"), editMission: document.querySelector("#edit-mission-button"), editorInline: document.querySelector("#mission-editor-inline"), newMission: document.querySelector("#new-mission-button"), reset: document.querySelector("#reset-button"), eraseData: document.querySelector("#erase-data-button"), storageNote: document.querySelector("#storage-note"), webMcpStatus: document.querySelector("#webmcp-status"), webMcpStatusTitle: document.querySelector("#webmcp-status-title"), webMcpStatusDetail: document.querySelector("#webmcp-status-detail"),
  confirmDialog: document.querySelector("#confirm-dialog"), confirmTitle: document.querySelector("#confirm-dialog-title"), confirmDescription: document.querySelector("#confirm-dialog-description"), confirmAction: document.querySelector("#confirm-dialog-action"),
};

function money(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function displayTime(value) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function setMixedValue(node, parts) {
  node.replaceChildren(...parts.map(({ text, numeric = false }) => {
    const span = document.createElement("span");
    span.textContent = text;
    if (numeric) span.className = "numeric";
    return span;
  }));
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    nodes.storageNote.classList.remove("warning");
    nodes.storageNote.textContent = "Mission state and receipts stay in this browser.";
    return true;
  } catch {
    nodes.storageNote.classList.add("warning");
    nodes.storageNote.textContent = "This browser could not save the latest state. Keep this page open or erase challenge data to recover local storage.";
    return false;
  }
}

function confirmAction({ title, description, label, destructive = false }) {
  nodes.confirmTitle.textContent = title;
  nodes.confirmDescription.textContent = description;
  nodes.confirmAction.textContent = label;
  nodes.confirmAction.className = `button ${destructive ? "destructive" : "primary"}`;
  nodes.confirmDialog.returnValue = "";
  nodes.confirmDialog.showModal();
  return new Promise((resolve) => {
    nodes.confirmDialog.addEventListener("close", () => resolve(nodes.confirmDialog.returnValue === "confirm"), { once: true });
  });
}

function clearFieldErrors() {
  for (const input of nodes.form.querySelectorAll("[aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
  for (const error of nodes.form.querySelectorAll(".field-error")) error.remove();
}

function setFieldError(input, message) {
  const error = document.createElement("span");
  error.className = "field-error";
  error.id = `${input.id}-error`;
  error.textContent = message;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error.id);
  input.closest("label").append(error);
}

function validateMissionForm() {
  clearFieldErrors();
  const origin = document.querySelector("#origin-input");
  const destination = document.querySelector("#destination-input");
  const departure = document.querySelector("#date-input");
  const arrival = document.querySelector("#arrival-input");
  const limit = document.querySelector("#limit-input");
  if (!/^[A-Za-z]{3}$/.test(origin.value.trim())) setFieldError(origin, "Enter a three-letter airport code.");
  if (!/^[A-Za-z]{3}$/.test(destination.value.trim())) setFieldError(destination, "Enter a three-letter airport code.");
  if (origin.value.trim().toUpperCase() === destination.value.trim().toUpperCase() && origin.value.trim()) setFieldError(destination, "Destination must differ from origin.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departure.value)) setFieldError(departure, "Choose a departure date.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival.value)) setFieldError(arrival, "Choose an arrival deadline.");
  const limitValue = Number(limit.value);
  if (!Number.isFinite(limitValue) || limitValue < 100 || limitValue > 5000) setFieldError(limit, "Enter a purchase limit from $100 to $5,000.");
  const firstInvalid = nodes.form.querySelector("[aria-invalid='true']");
  if (firstInvalid) {
    nodes.formStatus.textContent = "Correct the highlighted mission fields and try again.";
    firstInvalid.focus();
    return false;
  }
  return true;
}

function activity(actor, title, detail) {
  state.activity.unshift({ id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, actor, title, detail, createdAt: new Date().toISOString() });
}

function addReceipt(receipt) {
  if (!state.receipts.some((item) => item.id === receipt.id)) state.receipts.unshift(receipt);
}

function publicMission() {
  return {
    id: mission.id, status: mission.status, origin: mission.origin, destination: mission.destination, departureDate: mission.departureDate,
    arriveBefore: mission.arriveBefore, permittedCabins: mission.permittedCabins, maxStops: mission.maxStops, refundableOnly: mission.refundableOnly,
    maxTotalCents: mission.maxTotalCents, currency: mission.currency, confirmationMode: mission.confirmationMode, authority: mission.authority,
    expiresAt: mission.expiresAt, policyVersion: mission.policyVersion, quoteVersion: mission.quoteVersion, selectedOfferId: mission.selectedOfferId,
    decision: mission.evaluatedDecision?.decision ?? null, booking: mission.booking,
  };
}

function renderEditor() {
  document.querySelector("#origin-input").value = mission.origin;
  document.querySelector("#destination-input").value = mission.destination;
  document.querySelector("#date-input").value = mission.departureDate;
  document.querySelector("#arrival-input").value = mission.arriveBefore;
  const cabins = mission.permittedCabins;
  document.querySelector("#cabin-input").value = cabins.length > 1 ? "economy_and_premium" : cabins[0];
  document.querySelector("#stops-input").value = String(mission.maxStops);
  document.querySelector("#limit-input").value = String(mission.maxTotalCents / 100);
  document.querySelector("#confirmation-input").value = mission.confirmationMode;
  document.querySelector("#refundable-input").checked = mission.refundableOnly;
}

function renderMandate() {
  document.querySelector("#route-title").textContent = `${mission.origin} → ${mission.destination}`;
  const departure = new Date(`${mission.departureDate}T12:00:00Z`);
  setMixedValue(document.querySelector("#departure-date"), [
    { text: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(departure) },
    { text: ` ${departure.getUTCDate()}, ${departure.getUTCFullYear()}`, numeric: true },
  ]);
  setMixedValue(document.querySelector("#arrival-limit"), [{ text: mission.arriveBefore, numeric: true }, { text: " local" }]);
  document.querySelector("#cabin-limit").textContent = mission.permittedCabins.map((value) => value.replace("_", " ")).join(" or ");
  document.querySelector("#connection-limit").textContent = mission.maxStops === 0 ? "Nonstop only" : `${mission.maxStops} maximum`;
  document.querySelector("#fare-rule").textContent = mission.refundableOnly ? "Fully refundable" : "Any disclosed fare";
  setMixedValue(document.querySelector("#purchase-limit"), [{ text: money(mission.maxTotalCents), numeric: true }, { text: ` ${mission.currency}` }]);
  nodes.authorityStatus.textContent = mission.authority === "active" ? "Active" : "Revoked";
  nodes.authorityStatus.className = `status-pill ${mission.authority === "active" ? "active" : "revoked"}`;
  nodes.tighten.disabled = mission.maxStops === 0 || mission.authority !== "active";
  nodes.revoke.disabled = mission.authority !== "active";
}

function renderActivity() {
  nodes.timeline.replaceChildren();
  for (const entry of state.activity.slice(0, 12)) {
    const item = document.createElement("li");
    const heading = document.createElement("strong");
    heading.textContent = entry.title;
    const actor = document.createElement("span");
    actor.className = "actor";
    actor.textContent = entry.actor;
    heading.append(actor);
    const body = document.createElement("span");
    body.textContent = entry.detail;
    item.append(heading, body);
    nodes.timeline.append(item);
  }
}

function selectOffer(offerId, actor = "agent") {
  const offer = mission.offers.find((candidate) => candidate.id === offerId);
  if (!offer) throw new Error("Offer is not visible in the current mission.");
  Object.assign(mission, { selectedOfferId: offer.id, quoteVersion: 0, evaluatedDecision: null, decisionReceipt: null, status: "offer_selected" });
  activity(actor, "Offer selected", `${offer.airline} ${offer.flight} at ${money(offer.totalCents)} is now the active candidate.`);
  afterMutation();
  return { offer, evaluation: evaluateOffer(mission, offer) };
}

function renderOffers() {
  nodes.offers.replaceChildren();
  nodes.offersEmpty.hidden = mission.offers.length > 0;
  nodes.offerCount.textContent = mission.offers.length ? `${mission.offers.length} sandbox offers` : "No search yet";
  for (const offer of mission.offers) {
    const evaluation = evaluateOffer(mission, offer);
    const card = document.createElement("article");
    card.className = `offer ${evaluation.decision === "denied" ? "denied" : ""} ${mission.selectedOfferId === offer.id ? "selected" : ""}`;
    const airline = document.createElement("div");
    airline.className = "offer-airline";
    const airlineName = document.createElement("strong");
    airlineName.textContent = offer.airline;
    const airlineDetail = document.createElement("small");
    airlineDetail.textContent = `${offer.flight} · ${offer.cabin.replace("_", " ")}`;
    airline.append(airlineName, airlineDetail);
    const schedule = document.createElement("div");
    schedule.className = "offer-time";
    const scheduleTime = document.createElement("strong");
    scheduleTime.textContent = `${displayTime(offer.departure)} → ${displayTime(offer.arrival)}`;
    const scheduleDetail = document.createElement("small");
    scheduleDetail.textContent = `${offer.stops === 0 ? "Nonstop" : `${offer.stops} stop`} · ${offer.refundable ? "Refundable" : "Restricted fare"}${offer.supplierContent ? " · Untrusted supplier content isolated" : ""}`;
    schedule.append(scheduleTime, scheduleDetail);
    const decision = document.createElement("span");
    decision.className = `decision ${evaluation.decision}`;
    decision.textContent = evaluation.decision === "authorized" ? "Eligible" : `Fails ${evaluation.failedRules.join(", ")}`;
    const price = document.createElement("div");
    price.className = "offer-price";
    const priceTotal = document.createElement("strong");
    priceTotal.textContent = money(offer.totalCents, offer.currency);
    const priceDetail = document.createElement("small");
    priceDetail.textContent = "all-in sandbox total";
    price.append(priceTotal, priceDetail);
    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.textContent = mission.selectedOfferId === offer.id ? "Selected" : "Select";
    button.addEventListener("click", () => selectOffer(offer.id, "human"));
    card.append(airline, schedule, decision, price, button);
    nodes.offers.append(card);
  }
}

function renderReceipts() {
  nodes.receiptHistory.replaceChildren();
  nodes.receiptCount.textContent = state.receipts.length ? `${state.receipts.length} persisted` : "No receipts yet";
  if (state.receipts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Authorization, denial, and ticket receipts persist across reloads and new missions.";
    nodes.receiptHistory.append(empty);
    return;
  }
  for (const receipt of state.receipts) {
    const item = document.createElement("article");
    item.className = "history-item";
    const type = document.createElement("span");
    type.className = `history-type ${receipt.type === "denial" ? "denial" : ""}`;
    type.textContent = receipt.type;
    const detail = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = receipt.type === "booking" ? `${receipt.ticketNumber} · ${money(receipt.totalCents, receipt.currency)}` : `${receipt.decision} · policy v${receipt.policyVersion}`;
    const subtitle = document.createElement("small");
    subtitle.textContent = receipt.type === "denial" ? `Failed: ${receipt.failedRules.join(", ")}` : `Mission ${receipt.missionId}`;
    detail.append(title, subtitle);
    const time = document.createElement("small");
    time.textContent = new Date(receipt.createdAt).toLocaleString();
    item.append(type, detail, time);
    nodes.receiptHistory.append(item);
  }
}

function renderCurrentReceipt() {
  const current = mission.booking ?? mission.decisionReceipt;
  nodes.receipt.hidden = !current;
  if (!current) return;
  const booking = Boolean(mission.booking);
  const title = booking ? "Sandbox ticket issued" : current.decision === "authorized" ? "Purchase authorized" : "Purchase denied";
  const fields = booking
    ? [["Order", current.id], ["Ticket", current.ticketNumber], ["Total", money(current.totalCents)], ["Policy evidence", `Version ${current.authorizationReceipt.policyVersion} · all checks passed`]]
    : [["Decision", current.decision], ["Policy", `Version ${current.policyVersion}`], ["Quote", `Version ${current.quoteVersion}`], ["Resolution", current.resolution.replaceAll("_", " ")]];
  nodes.receipt.replaceChildren();
  const eyebrow = document.createElement("p"); eyebrow.className = "eyebrow"; eyebrow.textContent = "Canonical transaction evidence";
  const heading = document.createElement("h2"); heading.textContent = title;
  const grid = document.createElement("div"); grid.className = "receipt-grid";
  for (const [label, value] of fields) { const field = document.createElement("div"); const name = document.createElement("span"); name.textContent = label; const data = document.createElement("strong"); data.textContent = value; field.append(name, data); grid.append(field); }
  nodes.receipt.append(eyebrow, heading, grid);
  if (!booking && current.failedRules.length) {
    const evidence = document.createElement("div"); evidence.className = "receipt-rule-evidence";
    const evidenceTitle = document.createElement("strong"); evidenceTitle.textContent = "Why this purchase was blocked";
    const list = document.createElement("ul");
    for (const rule of current.failedRules) {
      const item = document.createElement("li");
      const name = document.createElement("span"); name.textContent = rule;
      const detail = document.createElement("strong"); detail.textContent = describeRuleEvidence(rule, current.evidence);
      item.append(name, detail); list.append(item);
    }
    evidence.append(evidenceTitle, list); nodes.receipt.append(evidence);
  }
}

function renderControls() {
  const eligible = mission.offers.filter((offer) => evaluateOffer(mission, offer).decision === "authorized");
  nodes.search.disabled = mission.authority !== "active" || mission.status === "ticketed";
  nodes.selectBest.disabled = eligible.length === 0 || mission.authority !== "active" || mission.status === "ticketed";
  nodes.evaluate.disabled = !mission.selectedOfferId || mission.authority !== "active" || mission.status === "ticketed";
  nodes.purchase.disabled = mission.status !== "authorized";
  const purchaseStep = document.createElement("span");
  purchaseStep.textContent = "4";
  nodes.purchase.replaceChildren(purchaseStep, mission.confirmationMode === "autonomous" ? " Purchase" : " Review purchase");
  const labels = { ready: "Ready", offers_ready: "Offers ready", offer_selected: "Offer selected", quote_refreshed: "Quote refreshed", authorized: "Authorized", denied: "Denied", ticketed: "Ticketed", authority_revoked: "Revoked" };
  const nextActions = {
    ready: ["Next: search the sandbox", "Start here when WebMCP is unavailable."],
    offers_ready: ["Next: select an eligible offer", `${eligible.length} offer${eligible.length === 1 ? " passes" : "s pass"} the active mandate.`],
    offer_selected: ["Next: evaluate the selected offer", "FlightSweeper will refresh the quote before applying policy."],
    quote_refreshed: ["Next: evaluate refreshed evidence", "Authorization uses stored policy and supplier evidence."],
    authorized: ["Next: issue the sandbox ticket", "No card is charged and no airline order is created."],
    denied: ["Purchase blocked", "Choose another offer or revise the human mandate."],
    ticketed: ["Sandbox transaction complete", "Inspect the durable receipt below."],
    authority_revoked: ["Purchase authority revoked", "Create or replace the mission to continue."],
  };
  [nodes.nextActionTitle.textContent, nodes.nextActionDetail.textContent] = nextActions[mission.status] ?? nextActions.ready;
  nodes.missionStatus.textContent = labels[mission.status] ?? mission.status;
}

function render() {
  renderEditor(); renderMandate(); renderActivity(); renderOffers(); renderReceipts(); renderCurrentReceipt(); renderControls();
}

function afterMutation() {
  persist();
  render();
  scheduleToolSync();
}

function search(actor = "agent") {
  mission.offers = searchOffers(mission);
  Object.assign(mission, { status: "offers_ready", selectedOfferId: null, quoteVersion: 0, evaluatedDecision: null, decisionReceipt: null });
  activity(actor, "Search completed", `${mission.offers.length} exact-date offers returned from the challenge sandbox.`);
  afterMutation();
  return { missionId: mission.id, offers: mission.offers.map((offer) => ({ ...offer, evaluation: evaluateOffer(mission, offer) })) };
}

function tighten(changes, actor = "agent") {
  tightenMission(mission, changes);
  activity(actor, "Mission tightened", `Policy version ${mission.policyVersion} narrows authority and clears prior selection evidence.`);
  afterMutation();
  return publicMission();
}

function selectBest() {
  const eligible = mission.offers.filter((offer) => evaluateOffer(mission, offer).decision === "authorized").sort((a, b) => a.totalCents - b.totalCents || a.durationMinutes - b.durationMinutes);
  if (!eligible[0]) throw new Error("No offer passes the active mandate.");
  return selectOffer(eligible[0].id, "human");
}

function refreshSelected(actor = "agent") {
  const offer = mission.offers.find((candidate) => candidate.id === mission.selectedOfferId);
  if (!offer) throw new Error("Select an offer before refresh.");
  mission.quoteVersion += 1;
  Object.assign(mission, { status: "quote_refreshed", evaluatedDecision: null, decisionReceipt: null });
  activity(actor, "Quote refreshed", `${offer.flight} remains available at ${money(offer.totalCents)}. Quote version ${mission.quoteVersion}.`);
  afterMutation();
  return { offer, quoteVersion: mission.quoteVersion, refreshed: true };
}

function evaluateSelected(actor = "policy_engine") {
  const offer = mission.offers.find((candidate) => candidate.id === mission.selectedOfferId);
  if (!offer) throw new Error("Select an offer before evaluation.");
  const evaluation = evaluateOffer(mission, offer);
  const receipt = createDecisionReceipt(mission, offer, evaluation, actor);
  mission.evaluatedDecision = evaluation;
  mission.decisionReceipt = receipt;
  mission.status = evaluation.decision === "authorized" ? "authorized" : "denied";
  addReceipt(receipt);
  activity("policy_engine", evaluation.decision === "authorized" ? "Purchase authorized" : "Purchase denied", evaluation.decision === "authorized" ? "Every stored route, fare, authority, freshness, and spending check passed." : `Independent policy checks failed: ${evaluation.failedRules.join(", ")}.`);
  afterMutation();
  return { evaluation, receipt };
}

function purchaseSelected(idempotencyKey = "manual-demo-purchase", actor = "agent", humanConfirmed = false) {
  if (mission.purchasesByKey[idempotencyKey]) {
    const replay = purchase(mission, idempotencyKey);
    activity("policy_engine", "Duplicate safely resolved", "The idempotency key returned the original booking without another purchase.");
    afterMutation();
    return replay;
  }
  const result = purchase(mission, idempotencyKey, { humanConfirmed });
  if (result.replayed) {
    activity("policy_engine", "Duplicate safely resolved", "The retry returned the original booking without another purchase.");
    afterMutation();
    return result;
  }
  const bookingReceipt = { ...result.booking, type: "booking", missionId: mission.id };
  addReceipt(bookingReceipt);
  activity(actor, "Sandbox ticket issued", `${result.booking.ticketNumber} was issued with supplier reference ${result.booking.supplierReference}.`);
  afterMutation();
  return result;
}

function revoke(actor = "human") {
  mission.authority = "revoked";
  if (!mission.booking) mission.status = "authority_revoked";
  activity(actor, "Authority revoked", "Future purchase attempts are denied by the application policy engine.");
  afterMutation();
  return { missionId: mission.id, authority: mission.authority, revoked: true };
}

function handleError(error, actor = "application") {
  const message = error instanceof Error ? error.message : "The action failed.";
  activity(actor, "Action blocked", message);
  nodes.formStatus.textContent = message;
  afterMutation();
  return message;
}

const toolExecutors = {
  read_flight_mission: () => publicMission(), search_flights: () => search("agent"), tighten_flight_mission: (changes) => tighten(changes, "agent"),
  compare_visible_offers: () => mission.offers.map((offer) => ({ offer, evaluation: evaluateOffer(mission, offer) })),
  select_offer: ({ offerId }) => selectOffer(offerId, "agent"), refresh_selected_offer: () => refreshSelected("agent"), evaluate_purchase: () => evaluateSelected("policy_engine"),
  purchase_selected_offer: ({ idempotencyKey }) => purchaseSelected(idempotencyKey, "agent"), get_booking_receipt: () => mission.booking ?? { status: "not_booked" },
  revoke_purchase_authority: () => revoke("agent"),
};

function toolError(error) {
  const message = error instanceof Error ? error.message : "The tool could not complete the action.";
  const code = /valid JSON/i.test(message) ? "invalid_input"
    : /not visible|Select an offer|No offer|No valid mission/i.test(message) ? "invalid_state"
      : /denied|authority|cannot|requires human confirmation/i.test(message) ? "policy_blocked"
        : /Refresh/i.test(message) ? "quote_stale"
          : "tool_failed";
  return { code, message, retryable: code === "quote_stale", nextAction: code === "quote_stale" ? "Refresh the selected offer, evaluate it again, then retry." : "Read the active mission and use a tool available for its current state." };
}

function toolResult(value, isError = false) {
  const structuredContent = isError ? { error: toolError(value) } : value;
  return { ...(isError ? { isError: true } : {}), content: [{ type: "text", text: JSON.stringify(structuredContent) }], structuredContent };
}

function normalizeInput(input) {
  if (typeof input !== "string") return input ?? {};
  try { return JSON.parse(input); } catch { throw new Error("Tool input must be valid JSON."); }
}

async function syncWebMcpTools() {
  if (!document.modelContext?.registerTool) {
    nodes.webMcpStatusTitle.textContent = "Manual demo mode";
    nodes.webMcpStatusDetail.textContent = "WebMCP is unavailable in this browser. Use the on-page controls, or open this URL in ChatGPT desktop or Chrome 149+.";
    nodes.webMcpStatus.classList.add("unavailable");
    return;
  }
  toolController?.abort();
  toolController = new AbortController();
  const names = new Set(activeToolNames(mission));
  for (const contract of toolContracts.filter((tool) => names.has(tool.name))) {
    await document.modelContext.registerTool({
      name: contract.name, description: contract.description, inputSchema: contract.inputSchema, outputSchema: contract.outputSchema,
      annotations: { readOnlyHint: contract.readOnlyHint, untrustedContentHint: contract.untrustedContentHint },
      async execute(rawInput) {
        activeToolExecutions += 1;
        try { return toolResult(await toolExecutors[contract.name](normalizeInput(rawInput))); }
        catch (error) { return toolResult(error, true); }
        finally {
          activeToolExecutions -= 1;
          if (activeToolExecutions === 0 && toolSyncPending) {
            toolSyncPending = false;
            setTimeout(scheduleToolSync, 0);
          }
        }
      },
    }, { signal: toolController.signal });
  }
  nodes.webMcpStatusTitle.textContent = "WebMCP connected";
  nodes.webMcpStatusDetail.textContent = `${names.size} tools are available for the current mission state.`;
  nodes.webMcpStatus.classList.remove("unavailable");
  nodes.webMcpStatus.classList.add("supported");
}

function scheduleToolSync() {
  if (activeToolExecutions > 0) {
    toolSyncPending = true;
    return;
  }
  toolSync = toolSync.then(() => new Promise((resolve) => queueMicrotask(resolve))).then(syncWebMcpTools).catch((error) => {
    nodes.webMcpStatusTitle.textContent = "WebMCP registration failed";
    nodes.webMcpStatusDetail.textContent = "Use the manual sandbox controls while the browser connection is unavailable.";
    nodes.webMcpStatus.classList.add("unavailable");
    console.error(error);
  });
}

nodes.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateMissionForm()) return;
  try {
    const cabin = document.querySelector("#cabin-input").value;
    replaceMissionPolicy(mission, {
      origin: document.querySelector("#origin-input").value.trim().toUpperCase(), destination: document.querySelector("#destination-input").value.trim().toUpperCase(),
      departureDate: document.querySelector("#date-input").value, arriveBefore: document.querySelector("#arrival-input").value,
      permittedCabins: cabin === "economy_and_premium" ? ["economy", "premium_economy"] : [cabin], maxStops: Number(document.querySelector("#stops-input").value),
      refundableOnly: document.querySelector("#refundable-input").checked, maxTotalCents: Math.round(Number(document.querySelector("#limit-input").value) * 100),
      confirmationMode: document.querySelector("#confirmation-input").value,
    });
    activity("human", "Human mandate saved", `Policy version ${mission.policyVersion} replaces prior authority and clears transaction evidence.`);
    nodes.formStatus.textContent = "Mandate saved.";
    nodes.editorInline.hidden = true;
    nodes.editMission.setAttribute("aria-expanded", "false");
    nodes.editMission.textContent = "Edit";
    afterMutation();
  } catch (error) { handleError(error, "human"); }
});

nodes.editMission.addEventListener("click", () => {
  nodes.editorInline.hidden = !nodes.editorInline.hidden;
  nodes.editMission.setAttribute("aria-expanded", String(!nodes.editorInline.hidden));
  nodes.editMission.textContent = nodes.editorInline.hidden ? "Edit" : "Close";
});

nodes.newMission.addEventListener("click", async () => {
  const confirmed = await confirmAction({ title: "Create a new mission?", description: "The active mission and its unpurchased offers will be replaced. Durable decision and booking receipts will remain available.", label: "Create new mission" });
  if (!confirmed) return;
  replaceCurrentMission(state); mission = state.mission; nodes.formStatus.textContent = "New mission created. Previous receipts were preserved."; afterMutation();
});
nodes.reset.addEventListener("click", async () => {
  const confirmed = await confirmAction({ title: "Reset this transaction?", description: "Search results, selection, quote, and current authorization evidence will be cleared. The active mission policy and previously stored receipts will remain.", label: "Reset transaction" });
  if (!confirmed) return;
  const policy = { origin: mission.origin, destination: mission.destination, departureDate: mission.departureDate, arriveBefore: mission.arriveBefore, permittedCabins: [...mission.permittedCabins], maxStops: mission.maxStops, refundableOnly: mission.refundableOnly, maxTotalCents: mission.maxTotalCents, confirmationMode: mission.confirmationMode };
  replaceCurrentMission(state, createMission(policy)); mission = state.mission; nodes.formStatus.textContent = "Transaction reset. Previous receipts were preserved."; afterMutation();
});
nodes.eraseData.addEventListener("click", async () => {
  const confirmed = await confirmAction({ title: "Erase all challenge data?", description: "This permanently removes locally stored missions, activity, idempotency records, decision receipts, and sandbox tickets from this browser. This cannot be undone.", label: "Erase and restart", destructive: true });
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  const fresh = createAppState();
  Object.assign(state, fresh);
  mission = state.mission;
  nodes.formStatus.textContent = "Challenge data erased. A fresh sandbox mission is ready.";
  afterMutation();
});
nodes.search.addEventListener("click", () => { try { search("human"); } catch (error) { handleError(error, "human"); } });
nodes.searchEmpty.addEventListener("click", () => { try { search("human"); } catch (error) { handleError(error, "human"); } });
nodes.selectBest.addEventListener("click", () => { try { selectBest(); } catch (error) { handleError(error, "human"); } });
nodes.evaluate.addEventListener("click", () => { try { if (mission.quoteVersion < 1) refreshSelected("human"); evaluateSelected(); } catch (error) { handleError(error, "human"); } });
nodes.purchase.addEventListener("click", async () => {
  const offer = mission.offers.find((candidate) => candidate.id === mission.selectedOfferId);
  if (!offer) return;
  const confirmed = await confirmAction({ title: "Issue this sandbox ticket?", description: `${offer.airline} ${offer.flight} for ${money(offer.totalCents, offer.currency)} will be recorded against policy version ${mission.policyVersion} and quote version ${mission.quoteVersion}. No card will be charged and no airline order will be created.`, label: "Issue sandbox ticket" });
  if (!confirmed) return;
  try { purchaseSelected("manual-demo-purchase", "human", true); } catch (error) { handleError(error, "human"); }
});
nodes.tighten.addEventListener("click", () => { try { tighten({ maxStops: 0 }, "human"); } catch (error) { handleError(error, "human"); } });
nodes.revoke.addEventListener("click", async () => {
  const confirmed = await confirmAction({ title: "Revoke purchase authority?", description: "Future purchase attempts for this mission will be denied. Existing receipts and any already-issued sandbox ticket will remain available.", label: "Revoke authority", destructive: true });
  if (confirmed) revoke("human");
});

persist();
render();
scheduleToolSync();
