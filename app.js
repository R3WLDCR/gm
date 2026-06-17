const DEFAULT_ROLES = [
  { id: "werewolf", name: "人狼", team: "人狼陣営", count: 1 },
  { id: "madman", name: "裏切り者", team: "人狼陣営", count: 1 },
  { id: "seer", name: "預言者", team: "村人陣営", count: 1 },
  { id: "medium", name: "霊媒師", team: "村人陣営", count: 1 },
  { id: "knight", name: "ボディガード", team: "村人陣営", count: 1 },
  { id: "villager", name: "村人", team: "村人陣営", count: 0 },
];

const STANDARD_ROLE_ORDER = ["werewolf", "seer", "medium", "knight", "madman"];
const ACTION_ROLE_ORDER = ["medium", "seer", "knight", "werewolf"];
const ACTION_ROLE_LABELS = {
  medium: "霊媒師",
  seer: "預言者",
  knight: "ボディガード",
  werewolf: "人狼",
};
const STORAGE_KEY = "werewolf-gm-state";
const SYNC_META_KEY = "werewolf-gm-sync-meta-v1";
const DEVICE_ID_KEY = "werewolf-gm-device-id";
const SYNC_DELAY_MS = 3000;
const APP_VERSION = "v1.1.0";

const state = {
  players: [],
  roles: DEFAULT_ROLES.map((role) => ({ ...role })),
  screen: "setup",
  phase: "setup",
  day: 0,
  timerSeconds: 300,
  timerBase: 300,
  timerRunning: false,
  timerFocus: false,
  timerResetCount: 0,
  showVoteTable: false,
  voteSelectedPlayerId: "",
  exiledPlayerIds: [],
  attackedPlayerIds: [],
  votes: {},
  logs: [],
  memo: "",
  roleDealQueue: [],
  roleDealIndex: 0,
  roleDealSelectedPlayerIds: [],
  seerBlinkPlayerId: "",
  actionRoleIndex: ACTION_ROLE_ORDER.length,
  actionComplete: false,
  actionSelectedTargetId: "",
  actionResultVisible: false,
  actionGateRoleId: "",
  actionGateSeconds: 0,
  actionBlockedRoleId: "",
  actionBlockedSeconds: 0,
  guardedPlayerId: "",
  lastGuardedPlayerId: "",
  nightStartGuardedPlayerId: "",
  playerSortMode: "manual",
  participationCountedForDeal: false,
};

const phaseLabels = {
  setup: ["準備中", "準"],
  night: ["夜", "夜"],
  day: ["昼", "昼"],
  vote: ["投票", "票"],
};

const els = {};
let timerId = null;
let actionGateTimerId = null;
let actionBlockedTimerId = null;
let actionRenderKey = "";
let syncTimer = null;
let supabaseClient = null;
let syncUser = null;
let pendingCloudRecord = null;
let applyingCloudState = false;
let hadLocalDataAtStartup = Boolean(localStorage.getItem(STORAGE_KEY));
let syncMeta = restoreSyncMeta();
const deviceId = getOrCreateDeviceId();

document.addEventListener("DOMContentLoaded", () => {
  [
    "saveBtn",
    "resetBtn",
    "resetFirstNightBtn",
    "playerName",
    "addPlayerBtn",
    "playerList",
    "startBtn",
    "roleList",
    "balanceBadge",
    "presetBtn",
    "assignBtn",
    "clearDeathsBtn",
    "dealPlayerCount",
    "roundProgressStatus",
    "progressStartBtn",
    "startRoleDealBtn",
    "shuffleSeatsBtn",
    "roundTable",
    "dayLabel",
    "phaseInitial",
    "phaseOrb",
    "timerMinus",
    "timerPlus",
    "timerDisplay",
    "timerStart",
    "timerReset",
    "voteStartBtn",
    "skipToVoteBtn",
    "backToTimerBtn",
    "exileBtn",
    "voteRoundTable",
    "actionRoleTitle",
    "actionHelp",
    "actionRoundTable",
    "previousActionRoleBtn",
    "nextDayBtn",
    "logList",
    "copyLogBtn",
    "freeMemo",
    "roleDialog",
    "roleDialogName",
    "roleDialogRole",
    "roleDialogTeam",
    "syncPanel",
    "syncStatusBadge",
    "syncStatusText",
    "syncConfigNotice",
    "syncSignedOutPanel",
    "syncSignedInPanel",
    "syncAccountEmail",
    "lastSyncText",
    "loginForm",
    "loginEmailInput",
    "loginPasswordInput",
    "signupForm",
    "signupEmailInput",
    "signupPasswordInput",
    "manualSyncBtn",
    "downloadCloudBtn",
    "uploadLocalBtn",
    "logoutBtn",
    "appVersionBadge",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  restore();
  bindEvents();
  render();
  initializeSync();
});

function bindEvents() {
  els.addPlayerBtn.addEventListener("click", addPlayer);
  els.startBtn.addEventListener("click", startRoundTable);
  els.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addPlayer();
  });
  els.presetBtn?.addEventListener("click", applyPreset);
  els.assignBtn?.addEventListener("click", assignRoles);
  els.clearDeathsBtn?.addEventListener("click", () => {
    state.players.forEach((player) => {
      player.alive = true;
    });
    addLog("全員を生存に戻した");
    renderAndStore();
  });
  els.saveBtn?.addEventListener("click", () => {
    store();
    addLog("保存した");
    render();
  });
  els.resetBtn?.addEventListener("click", resetGame);
  els.resetFirstNightBtn?.addEventListener("click", resetToFirstNight);
  document.querySelectorAll(".screen-tab").forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.screen));
  });
  document.querySelectorAll(".playerSortBtn").forEach((button) => {
    button.addEventListener("click", () => setPlayerSortMode(button.dataset.sort));
  });
  document.querySelectorAll(".phaseBtn").forEach((button) => {
    button.addEventListener("click", () => setPhase(button.dataset.phase));
  });
  els.timerMinus?.addEventListener("click", () => shiftTimer(-60));
  els.timerPlus?.addEventListener("click", () => shiftTimer(60));
  els.timerStart.addEventListener("click", toggleTimer);
  els.timerReset.addEventListener("click", resetTimer);
  els.voteStartBtn.addEventListener("click", showVoteRoundTable);
  els.skipToVoteBtn.addEventListener("click", skipTimerToVoteButton);
  els.backToTimerBtn.addEventListener("click", backToTimerScreen);
  els.exileBtn.addEventListener("click", exileSelectedPlayer);
  document.querySelectorAll(".timerPresetBtn").forEach((button) => {
    button.addEventListener("click", () => setTimerMinutes(Number(button.dataset.minutes)));
  });
  document.querySelectorAll(".noteBtn").forEach((button) => {
    button.addEventListener("click", () => addSelectedNote(button.dataset.note));
  });
  els.nightKillBtn?.addEventListener("click", killNightTarget);
  els.voteBtn?.addEventListener("click", addVote);
  els.previousActionRoleBtn?.addEventListener("click", backToPreviousActionRole);
  els.nextDayBtn.addEventListener("click", nextDay);
  els.copyLogBtn.addEventListener("click", copyLog);
  els.progressStartBtn.addEventListener("click", startProgress);
  els.startRoleDealBtn.addEventListener("click", startRoleDeal);
  els.shuffleSeatsBtn.addEventListener("click", shuffleSeats);
  els.loginForm?.addEventListener("submit", handleLogin);
  els.signupForm?.addEventListener("submit", handleSignup);
  els.manualSyncBtn?.addEventListener("click", () => synchronizeNow({ manual: true }));
  els.downloadCloudBtn?.addEventListener("click", downloadPendingCloudState);
  els.uploadLocalBtn?.addEventListener("click", uploadLocalState);
  els.logoutBtn?.addEventListener("click", handleLogout);
  window.addEventListener("online", () => synchronizeNow());
  window.addEventListener("resize", fitSingleLineNames);
  window.addEventListener("orientationchange", () => window.setTimeout(fitSingleLineNames, 120));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") synchronizeNow();
  });
  els.freeMemo.addEventListener("input", () => {
    state.memo = els.freeMemo.value;
    store();
  });
}

function addPlayer() {
  const name = els.playerName.value.trim();
  if (!name) return;
  state.players.push({
    id: crypto.randomUUID(),
    name,
    active: true,
    roleId: "",
    alive: true,
    totalParticipations: 0,
    dailyParticipations: {},
  });
  els.playerName.value = "";
  addLog(`${name} が参加`);
  renderAndStore();
}

function toggleParticipation(id) {
  const player = findPlayer(id);
  if (!player) return;
  player.active = !isActivePlayer(player);
  if (!player.active) {
    player.roleId = "";
    player.alive = true;
    delete state.votes[id];
  }
  addLog(`${player.name} は ${player.active ? "参加" : "休み"}`);
  renderAndStore();
}

function startRoundTable() {
  state.screen = "deal";
  state.participationCountedForDeal = false;
  state.roleDealQueue = [];
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  getActivePlayers().forEach((player) => {
    player.roleId = "";
    player.alive = true;
  });
  addLog("円卓画面へ移動");
  renderAndStore();
}

function startProgress() {
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.screen = "table";
  state.phase = "night";
  state.day = state.day || 1;
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.guardedPlayerId = "";
  resetTimerValue(240);
  addLog("進行開始");
  renderAndStore();
}

function startNightActions() {
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.screen = "action";
  state.phase = "night";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  assignRemainingVillagers();
  state.actionRoleIndex = 0;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.nightStartGuardedPlayerId = state.lastGuardedPlayerId;
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function showVoteRoundTable() {
  state.screen = "table";
  state.phase = "vote";
  state.timerRunning = false;
  state.timerFocus = false;
  stopTimer();
  state.showVoteTable = true;
  state.voteSelectedPlayerId = "";
  renderAndStore();
}

function skipTimerToVoteButton() {
  state.screen = "table";
  state.phase = "day";
  state.timerSeconds = 0;
  state.timerRunning = false;
  state.timerFocus = true;
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  stopTimer();
  renderAndStore();
}

function backToTimerScreen() {
  state.phase = "day";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.timerRunning = false;
  state.timerFocus = false;
  stopTimer();
  renderAndStore();
}

function confirmRemovePlayer(id) {
  const player = findPlayer(id);
  if (!player) return;
  if (!confirm(`${player.name} を参加者登録から削除しますか？`)) return;
  removePlayer(id);
}

function removePlayer(id) {
  const player = findPlayer(id);
  state.players = state.players.filter((item) => item.id !== id);
  delete state.votes[id];
  if (player) addLog(`${player.name} を外した`);
  renderAndStore();
}

function movePlayer(id, direction) {
  if (state.playerSortMode !== "manual") return;
  const index = state.players.findIndex((player) => player.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.players.length) return;
  const [player] = state.players.splice(index, 1);
  state.players.splice(nextIndex, 0, player);
  renderAndStore();
}

function toggleAlive(id) {
  const player = findPlayer(id);
  if (!player || !isActivePlayer(player)) return;
  player.alive = !player.alive;
  addLog(`${player.name} は ${player.alive ? "生存" : "死亡"}`);
  renderAndStore();
}

function applyPreset() {
  const count = getActivePlayers().length;
  const next = getStandardRoleCounts(count);
  state.roles.forEach((role) => {
    role.count = next[role.id] ?? role.count;
  });
  addLog(`${count}人用の標準配役にした`);
  renderAndStore();
}

function getStandardRoleCounts(count) {
  const next = Object.fromEntries(DEFAULT_ROLES.map((role) => [role.id, 0]));
  STANDARD_ROLE_ORDER.slice(0, count).forEach((id) => {
    next[id] = 1;
  });
  return next;
}

function startRoleDeal() {
  const players = getActivePlayers();
  if (!players.length) return;
  if (state.participationCountedForDeal && !confirm("新しい卓として参加数をもう一度記録して配役を始めますか？")) return;
  const counts = getStandardRoleCounts(players.length);
  recordParticipationsForDeal(players);
  state.roles.forEach((role) => {
    role.count = counts[role.id] ?? 0;
  });
  state.players.forEach((player) => {
    if (isActivePlayer(player)) player.roleId = "";
  });
  state.roleDealQueue = STANDARD_ROLE_ORDER.filter((id) => counts[id] > 0);
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.screen = "deal";
  addLog("配役を開始");
  renderAndStore();
}

function recordParticipationsForDeal(players) {
  const todayKey = getTodayKey();
  players.forEach((player) => {
    player.totalParticipations = (player.totalParticipations || 0) + 1;
    player.dailyParticipations = player.dailyParticipations || {};
    player.dailyParticipations[todayKey] = (player.dailyParticipations[todayKey] || 0) + 1;
  });
  state.participationCountedForDeal = true;
}

function assignRoles() {
  const deck = state.roles.flatMap((role) => Array.from({ length: role.count }, () => role.id));
  const players = getActivePlayers();
  if (deck.length !== players.length || !players.length) {
    addLog("配役数と参加者数が合っていない");
    renderAndStore();
    return;
  }
  shuffle(deck);
  state.players.forEach((player) => {
    if (!isActivePlayer(player)) {
      player.roleId = "";
      player.alive = true;
    }
  });
  players.forEach((player, index) => {
    player.roleId = deck[index];
    player.alive = true;
  });
  state.screen = "deal";
  state.phase = "night";
  state.day = 1;
  state.votes = {};
  resetTimerValue(240);
  addLog("配役完了。1日目の夜へ");
  renderAndStore();
}

function setRoleCount(id, delta) {
  const role = state.roles.find((item) => item.id === id);
  if (!role) return;
  role.count = Math.max(0, role.count + delta);
  renderAndStore();
}

function setPhase(phase) {
  state.screen = "table";
  state.phase = phase;
  if (phase === "night") resetTimerValue(240);
  if (phase === "day") resetTimerValue(300);
  if (phase === "vote") resetTimerValue(180);
  if (phase !== "vote") state.votes = {};
  addLog(`${phaseLabels[phase][0]}へ移行`);
  renderAndStore();
}

function setScreen(screen) {
  const previousScreen = state.screen;
  state.screen = screen;
  if (screen === "action" && previousScreen !== "action") restartNightActions();
  else renderAndStore();
}

function setPlayerSortMode(mode) {
  if (!["manual", "daily", "total"].includes(mode)) return;
  state.playerSortMode = mode;
  renderAndStore();
}

function restartNightActions() {
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  assignRemainingVillagers();
  state.actionRoleIndex = 0;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.nightStartGuardedPlayerId = state.lastGuardedPlayerId;
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function shiftTimer(delta) {
  resetTimerValue(Math.max(60, state.timerBase + delta));
  renderAndStore();
}

function setTimerMinutes(minutes) {
  resetTimerValue(Math.max(1, minutes) * 60);
  state.timerFocus = true;
  state.timerResetCount = 0;
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.exiledPlayerIds = [];
  renderAndStore();
}

function toggleTimer() {
  state.timerRunning = !state.timerRunning;
  state.timerResetCount = 0;
  if (state.timerRunning) {
    startTimer();
  } else {
    stopTimer();
  }
  renderAndStore();
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    state.timerSeconds = Math.max(0, state.timerSeconds - 1);
    if (state.timerSeconds === 0) {
      stopTimer();
      state.timerRunning = false;
      addLog("タイマー終了");
    }
    render();
    store();
  }, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function resetTimer() {
  const wasRunning = state.timerRunning;
  state.timerSeconds = state.timerBase;
  state.timerRunning = false;
  if (state.timerFocus) {
    state.timerResetCount = wasRunning ? state.timerResetCount + 1 : 2;
    if (state.timerResetCount >= 2) {
      state.timerFocus = false;
      state.timerResetCount = 0;
    }
  }
  stopTimer();
  renderAndStore();
}

function resetTimerValue(seconds) {
  state.timerBase = seconds;
  state.timerSeconds = seconds;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerResetCount = 0;
  state.showVoteTable = false;
  stopTimer();
}

function addSelectedNote(label) {
  if (!els.nightTarget) return;
  const player = findPlayer(els.nightTarget.value);
  addLog(player ? `${label}: ${player.name}` : label);
  renderAndStore();
}

function killNightTarget() {
  if (!els.nightTarget) return;
  const player = findPlayer(els.nightTarget.value);
  if (!player) return;
  player.alive = false;
  addLog(`夜の死亡: ${player.name}`);
  renderAndStore();
}

function addVote() {
  if (!els.voteTarget) return;
  const id = els.voteTarget.value;
  const player = findPlayer(id);
  if (!player) return;
  state.votes[id] = (state.votes[id] || 0) + 1;
  addLog(`投票: ${player.name}`);
  renderAndStore();
}

function nextDay() {
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.day += 1;
  state.phase = "night";
  state.votes = {};
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  resetActionSelection();
  resetTimerValue(240);
  addLog(`${state.day}日目の夜へ`);
  renderAndStore();
}

async function copyLog() {
  const text = state.logs.map((log) => `[${log.time}] ${log.text}`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    addLog("ログをコピーした");
  } catch {
    addLog("コピーできなかった");
  }
  renderAndStore();
}

function resetGame() {
  if (!confirm("卓を初期化しますか？")) return;
  stopTimer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  localStorage.removeItem(STORAGE_KEY);
  state.players = [];
  state.roles = DEFAULT_ROLES.map((role) => ({ ...role }));
  state.screen = "setup";
  state.phase = "setup";
  state.day = 0;
  state.timerSeconds = 300;
  state.timerBase = 300;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerResetCount = 0;
  state.votes = {};
  state.logs = [];
  state.memo = "";
  state.roleDealQueue = [];
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.lastGuardedPlayerId = "";
  state.nightStartGuardedPlayerId = "";
  state.attackedPlayerIds = [];
  state.playerSortMode = "manual";
  state.participationCountedForDeal = false;
  resetActionSelection();
  renderAndStore();
}

function resetToFirstNight() {
  if (!confirm("進行を初日夜に戻しますか？")) return;
  stopTimer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.screen = "deal";
  state.phase = "night";
  state.day = 1;
  state.votes = {};
  state.exiledPlayerIds = [];
  state.attackedPlayerIds = [];
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.lastGuardedPlayerId = "";
  state.nightStartGuardedPlayerId = "";
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  getActivePlayers().forEach((player) => {
    player.alive = true;
  });
  resetActionSelection();
  resetTimerValue(240);
  addLog("初日へ戻した");
  renderAndStore();
}

function render() {
  renderScreen();
  renderHeader();
  renderPlayers();
  renderRoles();
  renderRoundTable();
  renderVoteRoundTable();
  renderActionRoundTable();
  renderSelectors();
  renderVotes();
  renderLog();
  renderSyncStatus();
  fitSingleLineNames();
}

function fitSingleLineNames() {
  document.querySelectorAll(".player-row strong, .round-seat strong, .seat-name, .medium-result-card strong").forEach((element) => {
    element.style.fontSize = "";
    const baseSize = Number.parseFloat(getComputedStyle(element).fontSize);
    const maxWidth = element.clientWidth;
    if (!baseSize || !maxWidth || element.scrollWidth <= maxWidth) return;

    const nextSize = Math.max(8, Math.floor((baseSize * maxWidth) / element.scrollWidth));
    element.style.fontSize = `${nextSize}px`;
  });
}

function renderScreen() {
  document.querySelectorAll(".screen-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === state.screen);
  });
  document.querySelectorAll(".screen-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.screenPanel === state.screen);
  });
}

function renderHeader() {
  if (els.appVersionBadge) els.appVersionBadge.textContent = APP_VERSION;
  const activePlayerCount = getActivePlayers().length;
  els.balanceBadge.textContent = `${activePlayerCount} / ${state.players.length}`;
  els.balanceBadge.style.background = activePlayerCount ? "#edf5f2" : "#fae8ea";

  const phase = phaseLabels[state.phase];
  els.dayLabel.textContent = state.phase === "setup" ? phase[0] : `${state.day}日目 ${phase[0]}`;
  els.phaseInitial.textContent = phase[1];
  els.timerDisplay.textContent = formatTime(state.timerSeconds);
  els.timerDisplay.classList.toggle("timer-count-hidden", state.timerSeconds > 30);
  els.timerDisplay.classList.toggle("timer-warning", state.timerSeconds > 0 && state.timerSeconds <= 30);
  els.timerDisplay.classList.toggle("timer-ended", state.timerSeconds === 0);
  const timerRing = document.querySelector(".timer-ring");
  timerRing?.setAttribute("aria-label", `残り時間 ${formatTime(state.timerSeconds)}`);
  timerRing?.style.setProperty("--timer-progress", getTimerProgress());
  timerRing?.classList.toggle("timer-warning", state.timerSeconds > 0 && state.timerSeconds <= 30);
  timerRing?.classList.toggle("timer-ended", state.timerSeconds === 0);
  els.voteStartBtn.hidden = state.timerSeconds !== 0 || !state.timerFocus;
  els.timerStart.textContent = state.timerRunning ? "⏸" : "開始";
  els.freeMemo.value = state.memo;
  document.querySelector(".table-panel")?.classList.toggle("timer-focus", state.timerFocus);
  document.querySelector(".table-panel")?.classList.toggle("vote-table-mode", state.showVoteTable);
  document.querySelector(".vote-table-actions")?.toggleAttribute("hidden", !state.showVoteTable);
  if (els.exileBtn) {
    els.exileBtn.disabled = !state.voteSelectedPlayerId;
  }
  if (els.previousActionRoleBtn) {
    els.previousActionRoleBtn.disabled = !canGoPreviousActionRole();
  }

  document.querySelectorAll(".phaseBtn").forEach((button) => {
    button.classList.toggle("active", button.dataset.phase === state.phase);
  });
  document.querySelectorAll(".playerSortBtn").forEach((button) => {
    button.classList.toggle("active", button.dataset.sort === state.playerSortMode);
  });
  renderRoundProgressStatus();
}

function renderRoundProgressStatus() {
  if (!els.roundProgressStatus) return;
  els.roundProgressStatus.textContent = getRoundProgressText();
}

function getRoundProgressText() {
  if (state.phase === "setup") return "準備中";
  const phase = phaseLabels[state.phase]?.[0] || "";
  const dayText = state.day ? `${state.day}日目` : "1日目";
  return `${dayText} ${phase} ${formatTime(state.timerSeconds)}`;
}

function getTimerProgress() {
  if (!state.timerBase) return "0deg";
  const ratio = Math.max(0, Math.min(1, state.timerSeconds / state.timerBase));
  return `${Math.round(ratio * 360)}deg`;
}

function renderPlayers() {
  els.playerList.innerHTML = "";
  const manualMode = state.playerSortMode === "manual";
  getDisplayPlayers().forEach(({ player, index }) => {
    const active = isActivePlayer(player);
    const todayCount = getTodayParticipationCount(player);
    const row = document.createElement("div");
    row.className = `player-row ${manualMode ? "manual-sort" : ""} ${active ? "" : "inactive"}`;
    row.dataset.playerId = player.id;
    row.draggable = manualMode;
    row.innerHTML = `
      <label class="participation-toggle">
        <input type="checkbox" data-action="participation" ${active ? "checked" : ""} />
        <span>${active ? "参加" : "休み"}</span>
      </label>
      <strong>${escapeHtml(player.name)}</strong>
      <span class="participation-stats">今日 ${todayCount} / 累計 ${player.totalParticipations || 0}</span>
      <div class="player-order-actions" aria-label="${escapeHtml(player.name)}の並び替え" ${manualMode ? "" : "hidden"}>
        <button class="mini-button" data-action="move-up" title="上へ" aria-label="${escapeHtml(player.name)}を上へ" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="mini-button" data-action="move-down" title="下へ" aria-label="${escapeHtml(player.name)}を下へ" ${index === state.players.length - 1 ? "disabled" : ""}>↓</button>
      </div>
      <button class="mini-button trash-button" data-action="remove" title="削除" aria-label="${escapeHtml(player.name)}を削除">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"></path>
        </svg>
      </button>
    `;
    row.querySelector('[data-action="participation"]').addEventListener("change", () => toggleParticipation(player.id));
    row.querySelector('[data-action="move-up"]')?.addEventListener("click", () => movePlayer(player.id, -1));
    row.querySelector('[data-action="move-down"]')?.addEventListener("click", () => movePlayer(player.id, 1));
    row.querySelector('[data-action="remove"]').addEventListener("click", () => confirmRemovePlayer(player.id));
    if (manualMode) {
      row.addEventListener("dragstart", handlePlayerDragStart);
      row.addEventListener("dragover", handlePlayerDragOver);
      row.addEventListener("dragleave", handlePlayerDragLeave);
      row.addEventListener("drop", handlePlayerDrop);
      row.addEventListener("dragend", handlePlayerDragEnd);
    }
    els.playerList.appendChild(row);
  });
}

function getDisplayPlayers() {
  const rows = state.players.map((player, index) => ({ player, index }));
  if (state.playerSortMode === "daily") {
    return rows.sort((a, b) => getTodayParticipationCount(b.player) - getTodayParticipationCount(a.player) || a.index - b.index);
  }
  if (state.playerSortMode === "total") {
    return rows.sort((a, b) => (b.player.totalParticipations || 0) - (a.player.totalParticipations || 0) || a.index - b.index);
  }
  return rows;
}

function getTodayParticipationCount(player) {
  return player.dailyParticipations?.[getTodayKey()] || 0;
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderRoles() {
  if (!els.roleList) return;
  els.roleList.innerHTML = "";
  state.roles.forEach((role) => {
    const row = document.createElement("div");
    row.className = "role-row";
    row.innerHTML = `
      <div class="role-meta">
        <span class="role-name">${role.name}</span>
        <span class="role-team">${role.team}</span>
      </div>
      <div class="role-count">
        <button aria-label="${role.name}を減らす">-</button>
        <span>${role.count}</span>
        <button aria-label="${role.name}を増やす">+</button>
      </div>
    `;
    const buttons = row.querySelectorAll("button");
    buttons[0].addEventListener("click", () => setRoleCount(role.id, -1));
    buttons[1].addEventListener("click", () => setRoleCount(role.id, 1));
    els.roleList.appendChild(row);
  });
}

function renderRoundTable() {
  if (!els.roundTable) return;
  renderRoundTableInto(els.roundTable, { hideRoles: false, dealMode: isRoundTableDealMode() });
}

function renderVoteRoundTable() {
  if (!els.voteRoundTable) return;
  els.voteRoundTable.hidden = !state.showVoteTable;
  if (!state.showVoteTable) {
    els.voteRoundTable.innerHTML = "";
    return;
  }
  renderRoundTableInto(els.voteRoundTable, { hideRoles: true, voteMode: true });
}

function renderActionRoundTable() {
  if (!els.actionRoundTable) return;
  const roleId = getCurrentActionRoleId();
  const nextActionRenderKey = [roleId, state.actionSelectedTargetId, state.actionResultVisible, state.actionBlockedRoleId].join("|");
  if (nextActionRenderKey !== actionRenderKey) {
    actionRenderKey = nextActionRenderKey;
    replayActionPanelAnimation();
  }
  const roleName = roleId ? ACTION_ROLE_LABELS[roleId] : "夜の行動";
  els.actionRoleTitle.textContent = roleId ? roleName : "夜の行動完了";
  els.actionHelp.textContent = getActionHelpText(roleId, roleName);

  if (!roleId) {
    els.actionRoundTable.innerHTML = '<div class="round-empty">夜の行動が完了しました</div>';
    return;
  }

  if (state.actionBlockedRoleId === roleId) {
    renderBlockedRoleCountdown(roleName);
    return;
  }

  if (roleId === "medium") {
    renderMediumResult();
    return;
  }

  if (state.screen === "action" && (roleId === "seer" || roleId === "knight")) {
    startActionGateCountdown(roleId);
  }

  if (roleId === "seer" && state.actionSelectedTargetId) {
    renderSeerResult();
    return;
  }

  if (roleId === "knight" && state.actionSelectedTargetId) {
    renderKnightResult();
    return;
  }

  if (roleId === "werewolf" && state.actionSelectedTargetId) {
    renderWerewolfResult();
    return;
  }

  const players = getActionDisplayPlayers(roleId);
  renderRoundTableInto(els.actionRoundTable, { hideRoles: true, actionMode: true, players });
}

function renderBlockedRoleCountdown(roleName) {
  els.actionRoleTitle.textContent = roleName;
  els.actionHelp.textContent = "役職者が死亡しているため結果は表示しません";
  els.actionRoundTable.innerHTML = `
    <div class="blocked-role-card">
      <span>${roleName}</span>
      <strong>${state.actionBlockedSeconds}</strong>
    </div>
  `;
}

function getActionHelpText(roleId, roleName) {
  if (!roleId) return "次の日へ進めます";
  return roleId === "medium" ? "直近の追放者を確認してください" : `${roleName}の対象を選んでください`;
}

function replayActionPanelAnimation() {
  els.actionRoundTable.classList.remove("flip-in");
  void els.actionRoundTable.offsetWidth;
  els.actionRoundTable.classList.add("flip-in");
}

function renderMediumResult() {
  const player = getLastExiledPlayer();
  if (!player) {
    els.actionRoundTable.innerHTML = '<div class="round-empty">直前の追放者がいません</div>';
    return;
  }
  const result = player.roleId === "werewolf" ? "人狼" : "村人";
  startActionGateCountdown("medium");
  const gateReady = isActionGateReady("medium");
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card medium-only-result-card has-result">
      <strong>${escapeHtml(player.name)}</strong>
      <em class="${getResultColorClass(result)}">${result}</em>
      <button class="primary-button medium-ok-button" type="button" ${gateReady ? "" : "disabled"}>${gateReady ? "OK" : state.actionGateSeconds}</button>
    </div>
  `;
  els.actionRoundTable.querySelector(".medium-ok-button")?.addEventListener("click", () => handleActionTarget(player));
}

function renderSeerResult() {
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player) {
    resetActionSelection();
    renderActionRoundTable();
    return;
  }
  const result = player.roleId === "werewolf" ? "人狼" : "村人";
  const gateReady = isActionGateReady("seer");
  const canAdvance = !state.actionResultVisible || gateReady;
  els.actionHelp.textContent = state.actionResultVisible
    ? (gateReady ? "結果を確認してください" : `${state.actionGateSeconds}秒後に次へ進めます`)
    : "対象を確認してください";
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card seer-result-card ${state.actionResultVisible ? "medium-only-result-card has-result" : ""}">
      ${state.actionResultVisible ? "" : "<span>占い対象</span>"}
      <strong>${escapeHtml(player.name)}</strong>
      ${state.actionResultVisible ? `<em class="${getResultColorClass(result)}">${result}</em>` : ""}
      <div class="action-confirm-actions">
        <button class="secondary-button medium-ok-button action-back-button" type="button">戻る</button>
        <button class="primary-button medium-ok-button seer-ok-button" type="button" ${canAdvance ? "" : "disabled"}>${canAdvance ? "OK" : state.actionGateSeconds}</button>
      </div>
    </div>
  `;
  els.actionRoundTable.querySelector(".action-back-button")?.addEventListener("click", backActionSelection);
  els.actionRoundTable.querySelector(".seer-ok-button")?.addEventListener("click", handleSeerOk);
}

function getResultColorClass(result) {
  return result === "人狼" ? "werewolf-result" : "villager-result";
}

function renderKnightResult() {
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player) {
    resetActionSelection();
    renderActionRoundTable();
    return;
  }
  const gateReady = isActionGateReady("knight");
  els.actionHelp.textContent = gateReady ? "護衛先を確認してください" : `${state.actionGateSeconds}秒後に操作できます`;
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card knight-result-card medium-only-result-card">
      <strong>${escapeHtml(player.name)}</strong>
      <div class="action-confirm-actions">
        <button class="secondary-button medium-ok-button action-back-button" type="button">戻る</button>
        <button class="primary-button medium-ok-button knight-ok-button" type="button" ${gateReady ? "" : "disabled"}>${gateReady ? "OK" : state.actionGateSeconds}</button>
      </div>
    </div>
  `;
  els.actionRoundTable.querySelector(".action-back-button")?.addEventListener("click", backActionSelection);
  els.actionRoundTable.querySelector(".knight-ok-button")?.addEventListener("click", handleKnightOk);
}

function renderWerewolfResult() {
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player) {
    resetActionSelection();
    renderActionRoundTable();
    return;
  }
  startActionGateCountdown("werewolf");
  const gateReady = isActionGateReady("werewolf");
  els.actionHelp.textContent = gateReady ? "襲撃先を確認してください" : `${state.actionGateSeconds}秒後に操作できます`;
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card werewolf-result-card">
      <span>襲撃先</span>
      <strong>${escapeHtml(player.name)}</strong>
      <div class="action-confirm-actions">
        <button class="secondary-button medium-ok-button action-back-button" type="button">戻る</button>
        <button class="primary-button medium-ok-button werewolf-ok-button" type="button" ${gateReady ? "" : "disabled"}>${gateReady ? "OK" : state.actionGateSeconds}</button>
      </div>
    </div>
  `;
  els.actionRoundTable.querySelector(".action-back-button")?.addEventListener("click", backActionSelection);
  els.actionRoundTable.querySelector(".werewolf-ok-button")?.addEventListener("click", handleWerewolfOk);
}

function renderRoundTableInto(container, { hideRoles, voteMode = false, actionMode = false, dealMode = false, players = getActivePlayers() }) {
  if (container === els.roundTable) {
    els.dealPlayerCount.textContent = `${players.length}人`;
    els.progressStartBtn.hidden = !dealMode || !isRoleDealComplete();
    els.startRoleDealBtn.hidden = !dealMode;
    els.shuffleSeatsBtn.hidden = !dealMode;
  }
  container.innerHTML = "";
  container.classList.toggle("role-dealing", dealMode && !hideRoles && state.roleDealQueue.length > 0);

  if (!players.length) {
    const empty = document.createElement("div");
    empty.className = "round-empty";
    empty.textContent = "準備タブで今回参加する人を選んでください";
    container.appendChild(empty);
    return;
  }

  const tableCore = document.createElement("div");
  tableCore.className = "table-core";
  tableCore.innerHTML = dealMode && !hideRoles ? getRoleDealCenterHtml() : "";
  container.appendChild(tableCore);
  const okButton = tableCore.querySelector('[data-action="role-ok"]');
  const backButton = tableCore.querySelector('[data-action="role-back"]');
  okButton?.addEventListener("click", confirmCurrentRole);
  backButton?.addEventListener("click", backRoleDeal);

  const gmSeat = document.createElement("div");
  gmSeat.className = "gm-seat";
  gmSeat.textContent = "GM";
  container.appendChild(gmSeat);

  players.forEach((player, index) => {
    const angle = getSeatAngle(index, players.length);
    const radiusX = 36;
    const radiusY = 36;
    const x = 50 + Math.cos(angle) * radiusX;
    const y = 50 + Math.sin(angle) * radiusY;
    const role = hideRoles ? null : getRole(player.roleId);
    const status = getSeatStatus(player);
    const actionDisabled = actionMode && !canSelectActionTarget(getCurrentActionRoleId(), player);
    const seat = document.createElement("button");
    seat.type = "button";
    seat.className = `round-seat ${player.alive ? "" : "dead"} ${actionDisabled ? "action-disabled" : ""} ${status ? `status-${status.type}` : ""} ${state.exiledPlayerIds.includes(player.id) ? "exiled" : ""} ${voteMode && state.voteSelectedPlayerId === player.id ? "vote-selected" : ""} ${!hideRoles && player.roleId ? "assigned" : ""} ${hideRoles ? "" : getRoleColorClass(player.roleId)} ${!hideRoles && shouldBlinkSeerTarget(player) ? "seer-blink" : ""} ${
      state.roleDealSelectedPlayerIds.includes(player.id) ? "selected" : ""
    }`;
    seat.disabled = actionDisabled;
    seat.draggable = !hideRoles;
    seat.dataset.playerId = player.id;
    seat.style.setProperty("--seat-x", `${x}%`);
    seat.style.setProperty("--seat-y", `${y}%`);
    seat.innerHTML = `
      <strong>${escapeHtml(player.name)}</strong>
      <small>${role ? escapeHtml(role.name) : hideRoles ? "" : "未配役"}</small>
      ${status ? `<span class="seat-status-badge">${status.label}</span>` : ""}
    `;
    if (actionMode) {
      seat.addEventListener("click", () => handleActionTarget(player));
    } else if (voteMode) {
      seat.addEventListener("click", () => selectVotePlayer(player.id));
    } else if (!hideRoles) {
      seat.addEventListener("click", () => (dealMode ? handleRoundSeatClick(player) : revealRole(player)));
      seat.addEventListener("dragstart", handleSeatDragStart);
      seat.addEventListener("dragover", handleSeatDragOver);
      seat.addEventListener("dragleave", handleSeatDragLeave);
      seat.addEventListener("drop", handleSeatDrop);
      seat.addEventListener("dragend", handleSeatDragEnd);
    }
    container.appendChild(seat);
  });
}

function isRoundTableDealMode() {
  return state.phase === "setup" || (state.phase === "night" && state.day <= 1 && !state.actionComplete && (state.roleDealQueue.length > 0 || isRoleDealComplete()));
}

function getSeatStatus(player) {
  if (state.exiledPlayerIds.includes(player.id)) return { type: "exiled", label: "追放" };
  if (state.attackedPlayerIds.includes(player.id)) return { type: "attacked", label: "襲撃" };
  if (!player.alive) return { type: "dead", label: "死亡" };
  return null;
}

function selectVotePlayer(id) {
  state.voteSelectedPlayerId = state.voteSelectedPlayerId === id ? "" : id;
  renderAndStore();
}

function exileSelectedPlayer() {
  if (!state.voteSelectedPlayerId) return;
  if (!state.exiledPlayerIds.includes(state.voteSelectedPlayerId)) {
    state.exiledPlayerIds.push(state.voteSelectedPlayerId);
  }
  const player = findPlayer(state.voteSelectedPlayerId);
  if (player) player.alive = false;
  addLog(player ? `${player.name} を追放` : "追放");
  state.voteSelectedPlayerId = "";
  const result = getGameResult();
  if (result.ended) {
    addLog(`ゲーム終了: ${result.winner}の勝利`);
  } else {
    startNightActions();
    return;
  }
  renderAndStore();
}

function getCurrentActionRoleId() {
  if (state.actionComplete) return "";
  return ACTION_ROLE_ORDER[state.actionRoleIndex] || "";
}

function advanceActionRole() {
  while (state.actionRoleIndex < ACTION_ROLE_ORDER.length) {
    const roleId = getCurrentActionRoleId();
    if (!hasLivingRole(roleId)) {
      if (hasAssignedRole(roleId)) {
        stopActionGateCountdown();
        startBlockedRoleCountdown(roleId);
        return;
      }
      state.actionRoleIndex += 1;
      continue;
    }
    if (!getActionTargetPlayers(roleId).length) {
      state.actionRoleIndex += 1;
      continue;
    }
    return;
  }
  if (!state.actionComplete) {
    stopActionGateCountdown();
    state.actionComplete = true;
    addLog("夜の行動完了");
  }
}

function canGoPreviousActionRole() {
  if (!ACTION_ROLE_ORDER.length) return false;
  if (getCurrentActionRoleId() === "medium" && getLastExiledPlayer()) return true;
  return state.actionComplete || state.actionRoleIndex > 0;
}

function backToPreviousActionRole() {
  if (!canGoPreviousActionRole()) return;
  if (getCurrentActionRoleId() === "medium") {
    backToExileScreen();
    return;
  }
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.actionComplete = false;
  state.actionRoleIndex = Math.max(0, Math.min(ACTION_ROLE_ORDER.length - 1, state.actionRoleIndex - 1));
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function backToExileScreen() {
  const exiledPlayer = getLastExiledPlayer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  stopTimer();
  state.screen = "table";
  state.phase = "vote";
  state.timerRunning = false;
  state.timerFocus = false;
  state.showVoteTable = true;
  state.voteSelectedPlayerId = exiledPlayer?.id || "";
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  resetActionSelection();
  if (exiledPlayer) {
    state.exiledPlayerIds.pop();
    exiledPlayer.alive = true;
    removeLatestLog(`${exiledPlayer.name} を追放`);
  }
  renderAndStore();
}

function startActionGateCountdown(roleId) {
  if (state.actionGateRoleId === roleId) return;
  if (state.actionGateRoleId === `${roleId}:done`) return;
  stopActionGateCountdown();
  state.actionGateRoleId = roleId;
  state.actionGateSeconds = 10;
  actionGateTimerId = window.setInterval(() => {
    state.actionGateSeconds = Math.max(0, state.actionGateSeconds - 1);
    if (state.actionGateSeconds === 0) {
      stopActionGateCountdown();
    }
    renderAndStore();
  }, 1000);
}

function stopActionGateCountdown() {
  if (actionGateTimerId) window.clearInterval(actionGateTimerId);
  actionGateTimerId = null;
  if (state.actionGateRoleId && state.actionGateSeconds === 0) {
    state.actionGateRoleId = `${state.actionGateRoleId}:done`;
  }
}

function isActionGateReady(roleId) {
  return state.actionGateRoleId !== roleId || state.actionGateSeconds <= 0;
}

function startBlockedRoleCountdown(roleId) {
  if (state.actionBlockedRoleId === roleId && actionBlockedTimerId) return;
  stopBlockedRoleCountdown();
  state.actionBlockedRoleId = roleId;
  state.actionBlockedSeconds = 10;
  renderAndStore();
  actionBlockedTimerId = window.setInterval(() => {
    state.actionBlockedSeconds = Math.max(0, state.actionBlockedSeconds - 1);
    if (state.actionBlockedSeconds === 0) {
      stopBlockedRoleCountdown();
      state.actionRoleIndex += 1;
      state.actionBlockedRoleId = "";
      state.actionBlockedSeconds = 0;
      resetActionSelection();
      advanceActionRole();
    }
    renderAndStore();
  }, 1000);
}

function stopBlockedRoleCountdown() {
  if (actionBlockedTimerId) window.clearInterval(actionBlockedTimerId);
  actionBlockedTimerId = null;
}

function handleActionTarget(player) {
  const roleId = getCurrentActionRoleId();
  if (!roleId || !player) return;
  if (roleId === "medium" && !isActionGateReady(roleId)) return;
  if (!canSelectActionTarget(roleId, player)) return;

  if (roleId === "seer") {
    state.actionSelectedTargetId = player.id;
    state.actionResultVisible = false;
    renderAndStore();
    return;
  } else if (roleId === "knight") {
    state.actionSelectedTargetId = player.id;
    state.actionResultVisible = false;
    renderAndStore();
    return;
  } else if (roleId === "medium") {
    addLog(formatActionLog("霊媒", "medium", player, getDivinationResult(player)));
  } else if (roleId === "werewolf") {
    state.actionSelectedTargetId = player.id;
    state.actionResultVisible = false;
    renderAndStore();
    return;
  }

  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function handleKnightOk() {
  if (!isActionGateReady("knight")) return;
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player || !canSelectActionTarget("knight", player)) {
    resetActionSelection();
    renderAndStore();
    return;
  }
  state.guardedPlayerId = player.id;
  state.lastGuardedPlayerId = player.id;
  addLog(formatActionLog("護衛", "knight", player));
  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function canSelectActionTarget(roleId, player) {
  if (!roleId || !player) return false;
  if (roleId === "medium") return true;
  if (!player.alive) return false;
  if (roleId === "seer" && player.roleId === "seer") return false;
  if (roleId === "knight" && player.roleId === "knight") return false;
  if (roleId === "knight" && player.id === state.nightStartGuardedPlayerId) return false;
  return true;
}

function handleWerewolfOk() {
  if (!isActionGateReady("werewolf")) return;
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player || !player.alive) {
    resetActionSelection();
    renderAndStore();
    return;
  }
  resolveNightAttack(player);
}

function resolveNightAttack(player) {
  const actorNames = getActionActorNames("werewolf");
  if (state.guardedPlayerId === player.id) {
    addLog(`襲撃失敗: ${actorNames} → ${player.name}`);
  } else {
    player.alive = false;
    if (!state.attackedPlayerIds.includes(player.id)) {
      state.attackedPlayerIds.push(player.id);
    }
    addLog(`襲撃成功: ${actorNames} → ${player.name}`);
  }

  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  finishNightActions();
}

function finishNightActions() {
  const result = getGameResult();
  if (result.ended) {
    addLog(`ゲーム終了: ${result.winner}の勝利`);
  } else {
    state.screen = "table";
    state.phase = "day";
    state.day += 1;
    state.showVoteTable = false;
    state.voteSelectedPlayerId = "";
    resetTimerValue(300);
    addLog(`${state.day}日目の昼へ`);
  }
  renderAndStore();
}

function handleSeerOk() {
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player) {
    resetActionSelection();
    renderAndStore();
    return;
  }
  if (!state.actionResultVisible) {
    state.actionResultVisible = true;
    renderAndStore();
    return;
  }
  if (!isActionGateReady("seer")) return;
  addLog(formatActionLog("占い", "seer", player, getDivinationResult(player)));
  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  renderAndStore();
}

function backActionSelection() {
  const roleId = getCurrentActionRoleId();
  if (roleId !== "seer" && roleId !== "knight") {
    stopActionGateCountdown();
    state.actionGateRoleId = "";
    state.actionGateSeconds = 0;
  }
  resetActionSelection();
  renderAndStore();
}

function resetActionSelection() {
  state.actionSelectedTargetId = "";
  state.actionResultVisible = false;
}

function getActionActorNames(roleId) {
  const players = getLivingPlayers().filter((player) => player.roleId === roleId);
  return players.length ? players.map((player) => player.name).join("、") : "";
}

function formatActionLog(actionName, roleId, target, result = "") {
  const actorNames = getActionActorNames(roleId);
  const actionText = actorNames ? `${actionName}: ${actorNames} → ${target.name}` : `${actionName}: ${target.name}`;
  return result ? `${actionText} = ${result}` : actionText;
}

function getDivinationResult(player) {
  return player.roleId === "werewolf" ? "人狼" : "村人";
}

function hasLivingRole(roleId) {
  return getLivingPlayers().some((player) => player.roleId === roleId);
}

function hasAssignedRole(roleId) {
  return getActivePlayers().some((player) => player.roleId === roleId);
}

function getActionTargetPlayers(roleId) {
  if (roleId === "medium") {
    const player = getLastExiledPlayer();
    return player ? [player] : [];
  }
  if (roleId === "knight") {
    return getLivingPlayers().filter((player) => player.roleId !== "knight");
  }
  if (roleId === "seer") {
    return getLivingPlayers().filter((player) => player.roleId !== "seer");
  }
  return getLivingPlayers();
}

function getActionDisplayPlayers(roleId) {
  return roleId === "medium" ? getActionTargetPlayers(roleId) : getActivePlayers();
}

function getLivingPlayers() {
  return getActivePlayers().filter((player) => player.alive);
}

function getLastExiledPlayer() {
  for (let index = state.exiledPlayerIds.length - 1; index >= 0; index -= 1) {
    const player = findPlayer(state.exiledPlayerIds[index]);
    if (player) return player;
  }
  return null;
}

function getGameResult() {
  const livingPlayers = getActivePlayers().filter((player) => player.alive);
  const werewolfCount = livingPlayers.filter((player) => player.roleId === "werewolf").length;
  const villageCount = livingPlayers.length - werewolfCount;

  if (werewolfCount === 0) {
    return { ended: true, winner: "村人陣営" };
  }
  if (werewolfCount >= villageCount) {
    return { ended: true, winner: "人狼陣営" };
  }
  return { ended: false, winner: "" };
}

function getRoleDealCenterHtml() {
  if (!state.roleDealQueue.length) return "";
  const roleId = state.roleDealQueue[state.roleDealIndex];
  const remaining = Math.max(0, state.roleDealQueue.length - state.roleDealIndex);
  if (!roleId) {
    return "<span>配役</span><strong>完了</strong><small>全員に割り当て済み</small>";
  }
  const role = getRole(roleId);
  const selectedPlayers = state.roleDealSelectedPlayerIds.map(findPlayer).filter(Boolean);
  const canBack = state.roleDealIndex > 0;
  const selectedText = selectedPlayers.length
    ? `${selectedPlayers.map((player) => escapeHtml(player.name)).join("、")} に割り当て`
    : "参加者を選択";
  return `
    <span>次の役職</span>
    <strong>${escapeHtml(role ? role.name : "未配役")}</strong>
    <small>${selectedText}</small>
    <div class="role-deal-actions">
      <button class="secondary-button" data-action="role-back" ${canBack ? "" : "disabled"}>戻る</button>
      <button class="primary-button role-ok-button" data-action="role-ok">OK</button>
    </div>
  `;
}

function shouldBlinkSeerTarget(player) {
  const roleId = state.roleDealQueue[state.roleDealIndex];
  return roleId === "seer" && state.roleDealSelectedPlayerIds.length > 0 && player.id === getSeerBlinkPlayerId();
}

function isRoleDealComplete() {
  return state.roleDealQueue.length > 0 && state.roleDealIndex >= state.roleDealQueue.length;
}

function handleRoundSeatClick(player) {
  if (state.roleDealQueue.length) {
    assignCurrentRole(player);
    return;
  }
  revealRole(player);
}

function assignCurrentRole(player) {
  const roleId = state.roleDealQueue[state.roleDealIndex];
  if (!roleId) return;
  if (player.roleId && player.roleId !== roleId) return;
  const role = getRole(roleId);
  if (state.roleDealSelectedPlayerIds.includes(player.id)) {
    player.roleId = "";
    state.roleDealSelectedPlayerIds = state.roleDealSelectedPlayerIds.filter((id) => id !== player.id);
    if (roleId === "seer") state.seerBlinkPlayerId = "";
    addLog(`${player.name}: ${role ? role.name : "未配役"} を解除`);
    renderAndStore();
    return;
  }
  if (roleId !== "werewolf") {
    state.roleDealSelectedPlayerIds.forEach((id) => {
      const selectedPlayer = findPlayer(id);
      if (selectedPlayer && selectedPlayer.id !== player.id) selectedPlayer.roleId = "";
    });
    state.roleDealSelectedPlayerIds = [];
  }
  player.roleId = roleId;
  if (!state.roleDealSelectedPlayerIds.includes(player.id)) {
    state.roleDealSelectedPlayerIds.push(player.id);
  }
  if (roleId === "seer") state.seerBlinkPlayerId = "";
  addLog(`${player.name}: ${role ? role.name : "未配役"} を選択`);
  renderAndStore();
}

function confirmCurrentRole() {
  const roleId = state.roleDealQueue[state.roleDealIndex];
  if (!roleId) return;
  state.roleDealIndex += 1;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  if (state.roleDealIndex >= state.roleDealQueue.length) assignRemainingVillagers();
  addLog(`${getRole(roleId)?.name || "未配役"} を決定`);
  renderAndStore();
}

function backRoleDeal() {
  if (state.roleDealIndex <= 0) return;
  if (state.roleDealIndex >= state.roleDealQueue.length) {
    getActivePlayers().forEach((player) => {
      if (player.roleId === "villager") player.roleId = "";
    });
  }
  state.roleDealIndex -= 1;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  const previousRoleId = state.roleDealQueue[state.roleDealIndex];
  getActivePlayers().forEach((player) => {
    if (player.roleId === previousRoleId) player.roleId = "";
  });
  addLog(`${getRole(previousRoleId)?.name || "前の役職"}へ戻る`);
  renderAndStore();
}

function getSeerBlinkPlayerId() {
  const current = findPlayer(state.seerBlinkPlayerId);
  if (current && isActivePlayer(current) && current.roleId !== "werewolf" && current.roleId !== "seer") return current.id;
  const candidates = getActivePlayers().filter((player) => player.roleId !== "werewolf" && player.roleId !== "seer");
  if (!candidates.length) return "";
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  state.seerBlinkPlayerId = selected.id;
  store();
  return selected.id;
}

function assignRemainingVillagers() {
  getActivePlayers().forEach((player) => {
    if (!player.roleId) player.roleId = "villager";
  });
}

function handlePlayerDragStart(event) {
  if (state.playerSortMode !== "manual") return;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", event.currentTarget.dataset.playerId);
}

function handlePlayerDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drop-target");
  event.dataTransfer.dropEffect = "move";
}

function handlePlayerDragLeave(event) {
  event.currentTarget.classList.remove("drop-target");
}

function handlePlayerDrop(event) {
  event.preventDefault();
  const fromId = event.dataTransfer.getData("text/plain");
  const toId = event.currentTarget.dataset.playerId;
  event.currentTarget.classList.remove("drop-target");
  if (!fromId || !toId || fromId === toId) return;
  movePlayerToPosition(fromId, toId);
}

function handlePlayerDragEnd() {
  document.querySelectorAll(".player-row").forEach((row) => {
    row.classList.remove("dragging", "drop-target");
  });
}

function movePlayerToPosition(fromId, toId) {
  if (state.playerSortMode !== "manual") return;
  const fromIndex = state.players.findIndex((player) => player.id === fromId);
  const toIndex = state.players.findIndex((player) => player.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;
  const [player] = state.players.splice(fromIndex, 1);
  state.players.splice(toIndex, 0, player);
  renderAndStore();
}

function getSeatAngle(index, total) {
  if (total === 1) return -Math.PI / 2;
  const start = -Math.PI / 2;
  return start + (Math.PI * 2 * index) / total;
}

function handleSeatDragStart(event) {
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", event.currentTarget.dataset.playerId);
}

function handleSeatDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drop-target");
  event.dataTransfer.dropEffect = "move";
}

function handleSeatDragLeave(event) {
  event.currentTarget.classList.remove("drop-target");
}

function handleSeatDrop(event) {
  event.preventDefault();
  const fromId = event.dataTransfer.getData("text/plain");
  const toId = event.currentTarget.dataset.playerId;
  event.currentTarget.classList.remove("drop-target");
  if (!fromId || !toId || fromId === toId) return;
  swapPlayers(fromId, toId);
}

function handleSeatDragEnd() {
  document.querySelectorAll(".round-seat").forEach((seat) => {
    seat.classList.remove("dragging", "drop-target");
  });
}

function swapPlayers(fromId, toId) {
  const fromIndex = state.players.findIndex((player) => player.id === fromId);
  const toIndex = state.players.findIndex((player) => player.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;
  const fromName = state.players[fromIndex].name;
  const toName = state.players[toIndex].name;
  [state.players[fromIndex], state.players[toIndex]] = [state.players[toIndex], state.players[fromIndex]];
  addLog(`席替え: ${fromName} と ${toName}`);
  renderAndStore();
}

function shuffleSeats() {
  const activePlayers = getActivePlayers();
  if (activePlayers.length < 2) return;
  const shuffled = [...activePlayers];
  shuffle(shuffled);
  let nextIndex = 0;
  state.players = state.players.map((player) => (isActivePlayer(player) ? shuffled[nextIndex++] : player));
  addLog("席替えした");
  renderAndStore();
}

function renderSelectors() {
  if (!els.nightTarget || !els.voteTarget) return;
  const living = getActivePlayers().filter((player) => player.alive);
  const options = living
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("");
  els.nightTarget.innerHTML = options || '<option value="">対象なし</option>';
  els.voteTarget.innerHTML = options || '<option value="">対象なし</option>';
}

function renderVotes() {
  if (!els.voteBoard) return;
  els.voteBoard.innerHTML = "";
  const rows = Object.entries(state.votes)
    .map(([id, count]) => ({ player: findPlayer(id), count }))
    .filter((row) => row.player && isActivePlayer(row.player))
    .sort((a, b) => b.count - a.count);

  if (!rows.length) {
    els.voteBoard.innerHTML = '<div class="log-item">票なし</div>';
    return;
  }

  rows.forEach(({ player, count }) => {
    const row = document.createElement("div");
    row.className = "vote-row";
    row.innerHTML = `<strong>${escapeHtml(player.name)}</strong><span class="vote-count">${count}</span>`;
    els.voteBoard.appendChild(row);
  });
}

function renderLog() {
  els.logList.innerHTML = "";
  state.logs.slice(0, 18).forEach((log) => {
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<time>${log.time}</time><span>${escapeHtml(log.text)}</span>`;
    els.logList.appendChild(item);
  });
}

function revealRole(player) {
  const role = getRole(player.roleId);
  els.roleDialogName.textContent = player.name;
  els.roleDialogRole.textContent = role ? role.name : "未配役";
  els.roleDialogTeam.textContent = role ? role.team : "";
  els.roleDialog.showModal();
}

function addLog(text) {
  state.logs.unshift({
    time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    text,
  });
}

function removeLatestLog(text) {
  const index = state.logs.findIndex((log) => log.text === text);
  if (index >= 0) state.logs.splice(index, 1);
}

function findPlayer(id) {
  return state.players.find((player) => player.id === id);
}

function getRole(id) {
  return state.roles.find((role) => role.id === id);
}

function getRoleColorClass(roleId) {
  if (!roleId) return "";
  return `role-color-${roleId}`;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initializeSync() {
  const config = window.SYNC_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) {
    syncMeta.status = "unconfigured";
    renderSyncStatus();
    return;
  }
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data } = await supabaseClient.auth.getSession();
  syncUser = data.session?.user || null;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    syncUser = session?.user || null;
    pendingCloudRecord = null;
    renderSyncStatus();
    if (syncUser) synchronizeNow({ initial: true });
  });
  renderSyncStatus();
  if (syncUser) synchronizeNow({ initial: true });
}

async function handleLogin(event) {
  event.preventDefault();
  if (!ensureSyncConfigured()) return;
  setSyncBusy("ログイン中");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: els.loginEmailInput.value.trim(),
    password: els.loginPasswordInput.value,
  });
  if (error) return setSyncError(toJapaneseAuthError(error.message));
  els.loginForm.reset();
}

async function handleSignup(event) {
  event.preventDefault();
  if (!ensureSyncConfigured()) return;
  setSyncBusy("登録中");
  const { error } = await supabaseClient.auth.signUp({
    email: els.signupEmailInput.value.trim(),
    password: els.signupPasswordInput.value,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) return setSyncError(toJapaneseAuthError(error.message));
  els.signupForm.reset();
  syncMeta.status = "local";
  renderSyncStatus();
  addLog("確認メールを送信しました");
  renderAndStore();
}

async function handleLogout() {
  if (!ensureSyncConfigured()) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) return setSyncError(error.message);
  syncUser = null;
  syncMeta.status = "local";
  saveSyncMeta();
  renderSyncStatus();
}

async function synchronizeNow({ initial = false, manual = false } = {}) {
  cancelScheduledSync();
  if (!supabaseClient || !syncUser) return;
  if (!navigator.onLine) {
    syncMeta.status = "offline";
    renderSyncStatus();
    return;
  }
  if (pendingCloudRecord && !manual) return;
  setSyncBusy("同期中");
  const cloudRecord = await fetchCloudRecord();
  if (cloudRecord === undefined) return;
  if (!cloudRecord) {
    await uploadLocalState();
    return;
  }
  const cloudIsNew = isAfter(cloudRecord.updated_at, syncMeta.lastCloudUpdatedAt);
  if (initial && !syncMeta.lastCloudUpdatedAt && hadLocalDataAtStartup) {
    showCloudConflict(cloudRecord);
    return;
  }
  if (cloudIsNew && cloudRecord.updated_by_device !== deviceId) {
    showCloudConflict(cloudRecord);
    return;
  }
  if (syncMeta.dirty) {
    await uploadLocalState();
    return;
  }
  syncMeta.status = "synced";
  syncMeta.lastCloudUpdatedAt = cloudRecord.updated_at || syncMeta.lastCloudUpdatedAt;
  syncMeta.lastSyncedAt = new Date().toISOString();
  saveSyncMeta();
  renderSyncStatus();
}

async function fetchCloudRecord() {
  const { data, error } = await supabaseClient
    .from("gm_user_states")
    .select("payload, updated_at, updated_by_device")
    .eq("user_id", syncUser.id)
    .maybeSingle();
  if (error) {
    setSyncError(error.message);
    return undefined;
  }
  return data || null;
}

async function uploadLocalState() {
  if (!supabaseClient || !syncUser || !navigator.onLine) return;
  setSyncBusy("アップロード中");
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabaseClient
    .from("gm_user_states")
    .upsert({
      user_id: syncUser.id,
      payload: getStatePayload(),
      updated_at: updatedAt,
      updated_by_device: deviceId,
    })
    .select("updated_at, updated_by_device")
    .single();
  if (error) return setSyncError(error.message);
  pendingCloudRecord = null;
  syncMeta.dirty = false;
  syncMeta.status = "synced";
  syncMeta.lastCloudUpdatedAt = data.updated_at || updatedAt;
  syncMeta.lastSyncedAt = new Date().toISOString();
  saveSyncMeta();
  renderSyncStatus();
}

async function downloadPendingCloudState() {
  if (!pendingCloudRecord) {
    const record = await fetchCloudRecord();
    if (!record) return;
    pendingCloudRecord = record;
  }
  await applyCloudRecord(pendingCloudRecord);
}

async function applyCloudRecord(record) {
  if (!record?.payload) return;
  applyingCloudState = true;
  stopTimer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  applySavedState(record.payload, { resetActionScreen: true });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getStatePayload()));
  applyingCloudState = false;
  pendingCloudRecord = null;
  hadLocalDataAtStartup = true;
  syncMeta.dirty = false;
  syncMeta.status = "synced";
  syncMeta.localUpdatedAt = record.updated_at || new Date().toISOString();
  syncMeta.lastCloudUpdatedAt = record.updated_at || "";
  syncMeta.lastSyncedAt = new Date().toISOString();
  saveSyncMeta();
  render();
}

function showCloudConflict(record) {
  pendingCloudRecord = record;
  syncMeta.status = syncMeta.dirty ? "conflict" : "remote";
  saveSyncMeta();
  renderSyncStatus();
}

function markLocalDirty() {
  syncMeta.localUpdatedAt = new Date().toISOString();
  syncMeta.dirty = true;
  if (syncUser) syncMeta.status = "local";
  saveSyncMeta();
  scheduleAutoSync();
}

function scheduleAutoSync() {
  if (!supabaseClient || !syncUser || pendingCloudRecord) return;
  cancelScheduledSync();
  syncTimer = window.setTimeout(() => synchronizeNow(), SYNC_DELAY_MS);
}

function cancelScheduledSync() {
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = null;
}

function renderSyncStatus() {
  if (!els.syncStatusBadge) return;
  const configured = Boolean(supabaseClient);
  const signedIn = Boolean(syncUser);
  const shouldOpen = !configured || !signedIn || Boolean(pendingCloudRecord) || ["error", "remote", "conflict", "unconfigured"].includes(syncMeta.status);
  els.syncPanel.open = shouldOpen;
  els.syncConfigNotice.hidden = configured;
  els.syncSignedOutPanel.hidden = signedIn || !configured;
  els.syncSignedInPanel.hidden = !signedIn;
  els.syncAccountEmail.textContent = syncUser?.email || "-";
  els.lastSyncText.textContent = formatSyncTime(syncMeta.lastSyncedAt) || "未同期";
  els.downloadCloudBtn.hidden = !pendingCloudRecord;
  els.uploadLocalBtn.hidden = !pendingCloudRecord;
  els.manualSyncBtn.disabled = !signedIn || syncMeta.status === "syncing";
  const statusMap = {
    unconfigured: ["未設定", "Supabaseの接続設定が必要です"],
    local: ["端末内", signedIn ? "未同期の変更があります" : "端末内に保存中"],
    offline: ["オフライン", "通信復帰後に同期します"],
    syncing: ["同期中", syncMeta.error || "同期中"],
    synced: ["同期済み", "クラウドと同期されています"],
    remote: ["更新あり", "別端末の更新があります"],
    conflict: ["競合", "残すデータを選択してください"],
    error: ["エラー", syncMeta.error || "同期できませんでした"],
  };
  const [badge, text] = statusMap[syncMeta.status] || statusMap.local;
  els.syncStatusBadge.textContent = signedIn ? badge : configured ? "未ログイン" : "未設定";
  els.syncStatusBadge.className = `sync-status-badge status-${syncMeta.status}`;
  els.syncStatusText.textContent = signedIn ? text : configured ? "ログインすると同期できます" : text;
}

function restoreSyncMeta() {
  try {
    return {
      status: "local",
      dirty: false,
      localUpdatedAt: "",
      lastCloudUpdatedAt: "",
      lastSyncedAt: "",
      error: "",
      ...JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}"),
    };
  } catch {
    return { status: "local", dirty: false, localUpdatedAt: "", lastCloudUpdatedAt: "", lastSyncedAt: "", error: "" };
  }
}

function saveSyncMeta() {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function ensureSyncConfigured() {
  if (supabaseClient) return true;
  syncMeta.status = "unconfigured";
  renderSyncStatus();
  return false;
}

function getAuthRedirectUrl() {
  return `${location.origin}${location.pathname}`;
}

function isAfter(value, baseline) {
  if (!value) return false;
  if (!baseline) return true;
  return new Date(value).getTime() > new Date(baseline).getTime();
}

function setSyncBusy(label) {
  syncMeta.status = "syncing";
  syncMeta.error = label;
  renderSyncStatus();
}

function setSyncError(message) {
  syncMeta.status = "error";
  syncMeta.error = message;
  saveSyncMeta();
  renderSyncStatus();
}

function toJapaneseAuthError(message) {
  if (/invalid login credentials/i.test(message)) return "メールアドレスまたはパスワードが違います";
  if (/email not confirmed/i.test(message)) return "確認メール内のリンクを開いてください";
  if (/user already registered/i.test(message)) return "このメールアドレスは登録済みです";
  return message;
}

function formatSyncTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function store() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getStatePayload()));
  if (!applyingCloudState) markLocalDirty();
}

function getStatePayload() {
  return {
    players: state.players,
    roles: state.roles,
    screen: state.screen,
    phase: state.phase,
    day: state.day,
    timerSeconds: state.timerSeconds,
    timerBase: state.timerBase,
    timerFocus: state.timerFocus,
    timerResetCount: state.timerResetCount,
    showVoteTable: state.showVoteTable,
    voteSelectedPlayerId: state.voteSelectedPlayerId,
    exiledPlayerIds: state.exiledPlayerIds,
    attackedPlayerIds: state.attackedPlayerIds,
    votes: state.votes,
    logs: state.logs,
    memo: state.memo,
    roleDealQueue: state.roleDealQueue,
    roleDealIndex: state.roleDealIndex,
    roleDealSelectedPlayerIds: state.roleDealSelectedPlayerIds,
    seerBlinkPlayerId: state.seerBlinkPlayerId,
    actionRoleIndex: state.actionRoleIndex,
    actionComplete: state.actionComplete,
    actionSelectedTargetId: state.actionSelectedTargetId,
    actionResultVisible: state.actionResultVisible,
    actionGateRoleId: state.actionGateRoleId,
    actionGateSeconds: state.actionGateSeconds,
    actionBlockedRoleId: state.actionBlockedRoleId,
    actionBlockedSeconds: state.actionBlockedSeconds,
    guardedPlayerId: state.guardedPlayerId,
    lastGuardedPlayerId: state.lastGuardedPlayerId,
    nightStartGuardedPlayerId: state.nightStartGuardedPlayerId,
    playerSortMode: state.playerSortMode,
    participationCountedForDeal: state.participationCountedForDeal,
  };
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    applySavedState(JSON.parse(raw), { resetActionScreen: true });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function applySavedState(saved, { resetActionScreen = false } = {}) {
  state.players = normalizePlayers(saved.players || []);
  state.roles = mergeRoles(saved.roles || []);
  state.screen = saved.screen || "setup";
  state.phase = saved.phase || "setup";
  state.day = saved.day || 0;
  state.timerSeconds = saved.timerSeconds || 300;
  state.timerBase = saved.timerBase || 300;
  state.timerFocus = saved.timerFocus || false;
  state.timerResetCount = saved.timerResetCount || 0;
  state.showVoteTable = saved.showVoteTable || false;
  state.voteSelectedPlayerId = saved.voteSelectedPlayerId || "";
  state.exiledPlayerIds = saved.exiledPlayerIds || [];
  state.attackedPlayerIds = saved.attackedPlayerIds || [];
  state.timerRunning = false;
  state.votes = saved.votes || {};
  state.logs = saved.logs || [];
  state.memo = saved.memo || "";
  state.roleDealQueue = saved.roleDealQueue || [];
  state.roleDealIndex = saved.roleDealIndex || 0;
  state.roleDealSelectedPlayerIds = saved.roleDealSelectedPlayerIds || (saved.roleDealSelectedPlayerId ? [saved.roleDealSelectedPlayerId] : []);
  state.seerBlinkPlayerId = saved.seerBlinkPlayerId || "";
  state.actionRoleIndex = Number.isInteger(saved.actionRoleIndex) ? saved.actionRoleIndex : ACTION_ROLE_ORDER.length;
  state.actionComplete = saved.actionComplete === true;
  state.actionSelectedTargetId = saved.actionSelectedTargetId || "";
  state.actionResultVisible = saved.actionResultVisible === true;
  state.actionGateRoleId = saved.actionGateRoleId || "";
  state.actionGateSeconds = Number.isFinite(Number(saved.actionGateSeconds)) ? Number(saved.actionGateSeconds) : 0;
  state.actionBlockedRoleId = saved.actionBlockedRoleId || "";
  state.actionBlockedSeconds = Number.isFinite(Number(saved.actionBlockedSeconds)) ? Number(saved.actionBlockedSeconds) : 0;
  state.guardedPlayerId = saved.guardedPlayerId || "";
  state.lastGuardedPlayerId = saved.lastGuardedPlayerId || "";
  state.nightStartGuardedPlayerId = saved.nightStartGuardedPlayerId || state.lastGuardedPlayerId || "";
  state.playerSortMode = ["manual", "daily", "total"].includes(saved.playerSortMode) ? saved.playerSortMode : "manual";
  state.participationCountedForDeal = saved.participationCountedForDeal === true;
  if (resetActionScreen && state.screen === "action") {
    state.actionRoleIndex = 0;
    state.actionComplete = false;
    state.actionGateRoleId = "";
    state.actionGateSeconds = 0;
    state.actionBlockedRoleId = "";
    state.actionBlockedSeconds = 0;
    state.guardedPlayerId = "";
    state.nightStartGuardedPlayerId = state.lastGuardedPlayerId;
    resetActionSelection();
  }
}

function normalizePlayers(players) {
  return players.map((player) => ({
    ...player,
    active: player.active !== false,
    alive: player.alive !== false,
    totalParticipations: Number.isFinite(Number(player.totalParticipations)) ? Number(player.totalParticipations) : 0,
    dailyParticipations: normalizeParticipationMap(player.dailyParticipations),
  }));
}

function normalizeParticipationMap(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => [key, Number.isFinite(Number(count)) ? Number(count) : 0]),
  );
}

function getActivePlayers() {
  return state.players.filter(isActivePlayer);
}

function isActivePlayer(player) {
  return player.active !== false;
}

function mergeRoles(savedRoles) {
  return DEFAULT_ROLES.map((role) => {
    const saved = savedRoles.find((item) => item.id === role.id);
    return saved ? { ...role, count: saved.count } : { ...role };
  });
}

function renderAndStore() {
  render();
  store();
}

