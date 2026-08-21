const DEFAULT_ROLES = [
  { id: "werewolf", name: "人狼", team: "人狼陣営", count: 1 },
  { id: "madman", name: "裏切り者", team: "人狼陣営", count: 1 },
  { id: "seer", name: "預言者", team: "市民陣営", count: 1 },
  { id: "medium", name: "霊媒師", team: "市民陣営", count: 1 },
  { id: "knight", name: "ボディガード", team: "市民陣営", count: 1 },
  { id: "villager", name: "市民", team: "市民陣営", count: 0 },
];

const RULE_SELECTABLE_ROLE_IDS = ["werewolf", "madman", "seer", "medium", "knight"];
const DEFAULT_ENABLED_ROLE_IDS = ["werewolf", "madman", "seer", "medium", "knight", "villager"];
const STANDARD_ROLE_ORDER = ["werewolf", "seer", "medium", "knight", "madman"];
const ACTION_ROLE_ORDER = ["medium", "knight", "seer", "werewolf"];
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
const APP_VERSION = "v1.28.3";
const LARGE_STATE_DB_NAME = "werewolf-gm-data";
const LARGE_STATE_DB_VERSION = 1;
const LARGE_STATE_STORE_NAME = "state";
const LARGE_STATE_KEY = "large-state";
const MEDIUM_GATE_MIN_SECONDS = 5;
const MEDIUM_GATE_MAX_SECONDS = 12;
const ACTION_GATE_MIN_SECONDS = 5;
const ACTION_GATE_MAX_SECONDS = 20;
const VICTORY_BACK_DELAY_MS = 10000;
const VICTORY_REVEAL_STEP_SECONDS = 5;
const PLEA_TIMER_SECONDS = 30;
const NIGHT_TRANSITION_MIN_SECONDS = 3;
const NIGHT_TRANSITION_MAX_SECONDS = 8;
const NIGHT_TRANSITION_OK_DELAY_SECONDS = 5;
const ATTACK_RESULT_REVEAL_SECONDS = 5;
const ATTACK_RESULT_OK_DELAY_SECONDS = 5;
const ATTACK_RESULT_PAUSE_SECONDS = 3;
const ATTACK_RESULT_STAGE_NIGHT_COMPLETE = "night-complete";
const ATTACK_RESULT_STAGE_NIGHT_WAIT = "night-wait";
const ATTACK_RESULT_STAGE_DAWN = "dawn";
const ATTACK_RESULT_STAGE_RESULT = "result";
const ATTACK_RESULT_STAGE_READY = "ready";
const VOTE_START_DELAY_SECONDS = 5;
const DEBUG_HISTORY_LIMIT = 10;

const state = {
  players: [],
  roles: DEFAULT_ROLES.map((role) => ({ ...role })),
  enabledRoleIds: [...DEFAULT_ENABLED_ROLE_IDS],
  allowWerewolfSelfAttack: false,
  allowWerewolfSkipAttack: true,
  screen: "setup",
  phase: "setup",
  day: 0,
  timerSeconds: 300,
  timerBase: 300,
  timerRunning: false,
  timerFocus: false,
  timerEndRevealSeconds: 0,
  timerResetCount: 0,
  showVoteTable: false,
  voteSelectedPlayerId: "",
  showPleaTimer: false,
  pleaTargetPlayerId: "",
  pleaSeconds: PLEA_TIMER_SECONDS,
  pleaRunning: false,
  exiledPlayerIds: [],
  attackedPlayerIds: [],
  exiledPlayerDays: {},
  attackedPlayerDays: {},
  votes: {},
  voteRecords: [],
  voteVoterId: "",
  voteTargetId: "",
  editingVoteRecordIndex: -1,
  revoteCandidateIds: [],
  revoteAssignIndex: 0,
  revoteTargetSelectMode: false,
  pendingRevotePleaCandidateIds: [],
  showRevotePleaTimer: false,
  revotePleaCandidateIds: [],
  revotePleaRoundIndex: 0,
  revotePleaSeconds: PLEA_TIMER_SECONDS,
  revotePleaRunning: false,
  showNightTransition: false,
  nightTransitionSeconds: NIGHT_TRANSITION_MIN_SECONDS,
  nightTransitionOkSeconds: NIGHT_TRANSITION_OK_DELAY_SECONDS,
  nightTransitionOutcome: "night",
  nightTransitionWinner: "",
  showAttackResult: false,
  attackResultTargetId: "",
  attackResultSucceeded: false,
  attackResultWinner: "",
  attackResultStage: ATTACK_RESULT_STAGE_NIGHT_COMPLETE,
  attackResultPauseSeconds: ATTACK_RESULT_PAUSE_SECONDS,
  attackResultRevealSeconds: ATTACK_RESULT_REVEAL_SECONDS,
  attackResultOkSeconds: ATTACK_RESULT_OK_DELAY_SECONDS,
  logs: [],
  matchHistory: [],
  currentMatchId: "",
  currentMatchStartedAt: 0,
  currentMatchArchived: false,
  tournamentName: "",
  tournamentDate: "",
  matchNumber: 0,
  selectedLogMatchId: "current",
  roleDealQueue: [],
  roleDealIndex: 0,
  roleDealSelectedPlayerIds: [],
  seerBlinkPlayerId: "",
  seerCheckResults: {},
  actionRoleIndex: ACTION_ROLE_ORDER.length,
  actionComplete: false,
  actionIntroRoleId: "",
  actionSelectedTargetId: "",
  actionResultVisible: false,
  actionGateRoleId: "",
  actionGateSeconds: 0,
  actionGateBaseSeconds: 0,
  actionBlockedRoleId: "",
  actionBlockedSeconds: 0,
  guardedPlayerId: "",
  lastGuardedPlayerId: "",
  nightStartGuardedPlayerId: "",
  playerSortMode: "manual",
  participationCountedForDeal: false,
  gameWinner: "",
  victoryShownAt: 0,
  victoryRevealStage: "announcement",
  victoryRevealSeconds: VICTORY_REVEAL_STEP_SECONDS,
  victoryDismissed: false,
  undoHistory: [],
  logRestorePoints: {},
  nextLogId: 1,
};

const phaseLabels = {
  setup: ["準備中", "準"],
  night: ["夜", "夜"],
  day: ["昼", "昼"],
  vote: ["投票", "票"],
};

const els = {};
let timerId = null;
let timerEndRevealTimerId = null;
let timerEndSoundPlaying = false;
let nightTransitionSoundPlaying = false;
let pleaTimerId = null;
let revotePleaTimerId = null;
let nightTransitionTimerId = null;
let nightTransitionFallbackTimerId = null;
let attackResultRevealTimerId = null;
let actionGateTimerId = null;
let actionBlockedTimerId = null;
let victoryBackTimerId = null;
let victoryRevealTimerId = null;
let victorySoundPlayed = false;
let actionRenderKey = "";
let largeStateDbPromise = null;
let largeStateSaveQueue = Promise.resolve();
let largeStateDirty = true;
let largeStateAvailable = true;
let legacyLargeStatePendingMigration = false;
let syncTimer = null;
let supabaseClient = null;
let syncUser = null;
let syncAuthReady = false;
let pendingCloudRecord = null;
let applyingCloudState = false;
let hadLocalDataAtStartup = Boolean(localStorage.getItem(STORAGE_KEY));
let syncMeta = restoreSyncMeta();
const deviceId = getOrCreateDeviceId();

document.addEventListener("DOMContentLoaded", async () => {
  [
    "saveBtn",
    "resetBtn",
    "resetFirstNightBtn",
    "undoStepBtn",
    "playerName",
    "addPlayerBtn",
    "tournamentNameInput",
    "tournamentDateInput",
    "matchNumberInput",
    "allowWerewolfSelfAttackInput",
    "allowWerewolfSkipAttackInput",
    "progressBadge",
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
    "randomTimerPresetBtn",
    "timerDisplay",
    "voteTransitionMessage",
    "timerEndSound",
    "nightTransitionSound",
    "timerStart",
    "timerReset",
    "voteStartBtn",
    "stopTimerSoundBtn",
    "skipToVoteBtn",
    "backToTimerBtn",
    "pleaBtn",
    "exileBtn",
    "voteRoundTable",
    "voteVoterSelect",
    "voteTargetSelect",
    "voteRemainingText",
    "recordVoteBtn",
    "clearVotesBtn",
    "startRevotePleaBtn",
    "startRevotePleaTimerBtn",
    "voteSummary",
    "voteRecordList",
    "revoteNotice",
    "revoteAssistPanel",
    "revoteFixedTargetName",
    "revoteAssignedText",
    "revoteNextBtn",
    "revotePleaTimerView",
    "revotePleaProgress",
    "revotePleaTimerDisplay",
    "revotePleaTimerToggleBtn",
    "revotePleaNextBtn",
    "revotePleaBackBtn",
    "revotePleaStartBtn",
    "nightTransitionView",
    "nightTransitionLead",
    "nightTransitionTitle",
    "nightTransitionSeconds",
    "nightTransitionOkBtn",
    "attackResultView",
    "attackResultLead",
    "attackResultName",
    "attackResultMessage",
    "attackResultOkBtn",
    "pleaTimerView",
    "pleaTimerDisplay",
    "pleaTimerToggleBtn",
    "pleaBackBtn",
    "pleaExileBtn",
    "actionRoleTitle",
    "actionHelp",
    "actionRoundTable",
    "previousActionRoleBtn",
    "nextDayBtn",
    "logList",
    "copyLogBtn",
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
    "headerMatchInfo",
    "headerTournamentName",
    "headerMatchNumber",
    "victoryBanner",
    "victoryLeadText",
    "victoryVisualMark",
    "victoryWinnerText",
    "victoryMessageText",
    "victoryBackBtn",
    "victoryReviewActions",
    "prepareNextMatchBtn",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  restore();
  await restoreLargeState();
  const largeStateSaved = await saveLargeStateNow();
  if (largeStateSaved || !legacyLargeStatePendingMigration) store({ markDirty: false });
  bindEvents();
  render();
  resumeNightTransitionTimer();
  resumeAttackResultRevealTimer();
  resumeVictoryRevealTimer();
  resumeTimerEndRevealCountdown();
  initializeSync();
});

function bindEvents() {
  els.addPlayerBtn.addEventListener("click", addPlayer);
  els.startBtn.addEventListener("click", startRoundTable);
  els.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addPlayer();
  });
  [els.tournamentNameInput, els.tournamentDateInput, els.matchNumberInput].forEach((input) => {
    input?.addEventListener("change", updateCurrentMatchInfo);
  });
  document.querySelectorAll("[data-role-rule]").forEach((input) => {
    input.addEventListener("change", updateGameRules);
  });
  [els.allowWerewolfSelfAttackInput, els.allowWerewolfSkipAttackInput].forEach((input) => {
    input?.addEventListener("change", updateGameRules);
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
  els.undoStepBtn?.addEventListener("click", undoLastStep);
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
  els.stopTimerSoundBtn?.addEventListener("click", stopTimerEndSound);
  els.timerEndSound?.addEventListener("ended", () => {
    timerEndSoundPlaying = false;
    render();
  });
  els.skipToVoteBtn.addEventListener("click", skipTimerToVoteButton);
  els.backToTimerBtn.addEventListener("click", backToTimerScreen);
  els.exileBtn.addEventListener("click", handleExileButton);
  els.voteVoterSelect?.addEventListener("change", () => {
    state.voteVoterId = els.voteVoterSelect.value;
    renderAndStore();
  });
  els.voteTargetSelect?.addEventListener("change", () => {
    state.voteTargetId = els.voteTargetSelect.value;
    renderAndStore();
  });
  els.recordVoteBtn?.addEventListener("click", recordVote);
  els.clearVotesBtn?.addEventListener("click", resetVoteRecords);
  els.startRevotePleaBtn?.addEventListener("click", startPendingRevotePlea);
  els.startRevotePleaTimerBtn?.addEventListener("click", startPendingRevotePleaTimer);
  els.revoteNextBtn?.addEventListener("click", advanceRevoteAssignment);
  els.revotePleaBackBtn?.addEventListener("click", backFromRevotePleaTimer);
  els.revotePleaTimerToggleBtn?.addEventListener("click", toggleRevotePleaTimer);
  els.revotePleaNextBtn?.addEventListener("click", startNextRevotePleaRound);
  els.revotePleaStartBtn?.addEventListener("click", startRevoteAfterPlea);
  els.nightTransitionOkBtn?.addEventListener("click", completeNightTransition);
  els.attackResultOkBtn?.addEventListener("click", completeAttackResult);
  els.pleaBackBtn?.addEventListener("click", backFromPleaTimer);
  els.pleaTimerToggleBtn?.addEventListener("click", togglePleaTimer);
  els.pleaExileBtn?.addEventListener("click", confirmPleaExile);
  document.querySelectorAll(".timerPresetBtn").forEach((button) => {
    button.addEventListener("click", () => setTimerMinutes(Number(button.dataset.minutes)));
  });
  els.randomTimerPresetBtn?.addEventListener("click", () => setTimerMinutes(Math.floor(Math.random() * 9) + 1));
  document.querySelectorAll(".noteBtn").forEach((button) => {
    button.addEventListener("click", () => addSelectedNote(button.dataset.note));
  });
  els.nightKillBtn?.addEventListener("click", killNightTarget);
  els.voteBtn?.addEventListener("click", addVote);
  els.previousActionRoleBtn?.addEventListener("click", backToPreviousActionRole);
  els.nextDayBtn.addEventListener("click", nextDay);
  els.copyLogBtn.addEventListener("click", copyLog);
  els.victoryBackBtn?.addEventListener("click", dismissVictoryFullscreen);
  els.prepareNextMatchBtn?.addEventListener("click", prepareNextMatch);
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
  archiveCurrentMatch();
  beginNewMatch();
  clearGameWinner();
  resetNightTransitionState();
  resetAttackResultState();
  resetPleaTimerState();
  resetVoteSession();
  state.screen = "deal";
  state.phase = "setup";
  state.day = 0;
  state.participationCountedForDeal = false;
  state.roleDealQueue = [];
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.seerCheckResults = {};
  state.exiledPlayerIds = [];
  state.attackedPlayerIds = [];
  state.exiledPlayerDays = {};
  state.attackedPlayerDays = {};
  state.actionComplete = false;
  state.actionIntroRoleId = "";
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
  pushUndoSnapshot("進行開始");
  clearGameWinner();
  resetNightTransitionState();
  resetAttackResultState();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.screen = "table";
  state.phase = "night";
  state.day = state.day || 1;
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.guardedPlayerId = "";
  state.seerCheckResults = {};
  resetTimerValue(240);
  addLog("進行開始");
  markLatestLogRestorable();
  renderAndStore();
}

function updateCurrentMatchInfo() {
  state.tournamentName = els.tournamentNameInput?.value.trim().slice(0, 80) || "";
  state.tournamentDate = els.tournamentDateInput?.value || "";
  const number = Number(els.matchNumberInput?.value);
  state.matchNumber = Number.isInteger(number) && number > 0 ? Math.min(number, 999) : 0;
  renderAndStore();
}

function updateGameRules() {
  const enabledRoleIds = Array.from(document.querySelectorAll("[data-role-rule]:checked"), (input) => input.dataset.roleRule);
  state.enabledRoleIds = normalizeEnabledRoleIds(enabledRoleIds);
  state.allowWerewolfSelfAttack = els.allowWerewolfSelfAttackInput?.checked === true;
  state.allowWerewolfSkipAttack = els.allowWerewolfSkipAttackInput?.checked !== false;
  renderAndStore();
}

function beginNewMatch({ createId = true } = {}) {
  state.logs = [];
  state.logRestorePoints = {};
  state.nextLogId = 1;
  state.currentMatchId = createId ? `match-${crypto.randomUUID()}` : "";
  state.currentMatchStartedAt = createId ? Date.now() : 0;
  state.currentMatchArchived = false;
  state.selectedLogMatchId = "current";
  markLargeStateDirty();
}

function archiveCurrentMatch() {
  if (!state.currentMatchId || state.currentMatchArchived || !state.logs.length) return false;
  const winner = getWinnerFromLogs(state.logs, state.gameWinner);
  state.matchHistory.unshift({
    id: state.currentMatchId,
    startedAt: state.currentMatchStartedAt || Date.now(),
    savedAt: Date.now(),
    status: winner ? "finished" : "interrupted",
    winner,
    tournamentName: state.tournamentName,
    tournamentDate: state.tournamentDate,
    matchNumber: state.matchNumber,
    playerNames: getActivePlayers().map((player) => player.name),
    logs: state.logs.map((log) => ({ ...log })),
  });
  state.currentMatchArchived = true;
  markLargeStateDirty();
  return true;
}

function finalizeGameWinner(winner) {
  setGameWinner(winner);
  addLog(`ゲーム終了: ${winner}の勝利`);
  archiveCurrentMatch();
  markLatestLogRestorable();
}

function startNightActions({ recordUndo = true } = {}) {
  if (recordUndo) pushUndoSnapshot("夜行動へ");
  clearGameWinner();
  resetNightTransitionState();
  resetAttackResultState();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  resetPleaTimerState();
  resetVoteSession();
  state.screen = "action";
  state.phase = "night";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  assignRemainingVillagers();
  state.actionRoleIndex = 0;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.nightStartGuardedPlayerId = state.lastGuardedPlayerId;
  resetActionSelection();
  advanceActionRole();
  prepareActionIntroForCurrentRole();
  renderAndStore();
}

function showVoteRoundTable() {
  pushUndoSnapshot("投票へ");
  resetNightTransitionState();
  resetAttackResultState();
  resetPleaTimerState();
  resetVoteSession();
  state.screen = "table";
  state.phase = "vote";
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  stopTimer();
  stopTimerEndSound();
  stopTimerEndRevealCountdown();
  state.showVoteTable = true;
  state.voteSelectedPlayerId = "";
  renderAndStore();
}

function skipTimerToVoteButton() {
  pushUndoSnapshot("投票ボタン表示へ");
  resetPleaTimerState();
  resetVoteSession();
  state.screen = "table";
  state.phase = "day";
  state.timerSeconds = 0;
  state.timerRunning = false;
  state.timerFocus = true;
  state.timerEndRevealSeconds = VOTE_START_DELAY_SECONDS;
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  stopTimer();
  startTimerEndRevealCountdown();
  renderAndStore();
}

function backToTimerScreen() {
  resetPleaTimerState();
  resetVoteSession();
  state.phase = "day";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  stopTimer();
  stopTimerEndSound();
  stopTimerEndRevealCountdown();
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
  const enabled = new Set(normalizeEnabledRoleIds(state.enabledRoleIds));
  STANDARD_ROLE_ORDER.filter((id) => enabled.has(id)).slice(0, count).forEach((id) => {
    next[id] = 1;
  });
  next.villager = Math.max(0, count - Object.values(next).reduce((total, roleCount) => total + roleCount, 0));
  return next;
}

function startRoleDeal() {
  const players = getActivePlayers();
  if (!players.length) return;
  if (state.participationCountedForDeal && !confirm("新しい卓として参加数をもう一度記録して配役を始めますか？")) return;
  pushUndoSnapshot("配役開始");
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
  markLatestLogRestorable();
  renderAndStore();
}

function editPlayerName(id) {
  const player = findPlayer(id);
  if (!player) return;
  const name = prompt("参加者名を修正", player.name);
  if (name === null) return;
  const nextName = name.trim();
  if (!nextName || nextName === player.name) return;
  const previousName = player.name;
  player.name = nextName;
  addLog(`${previousName} の名前を ${nextName} に変更`);
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
  pushUndoSnapshot("配役完了");
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
  clearGameWinner();
  resetTimerValue(240);
  addLog("配役完了。1日目の夜へ");
  markLatestLogRestorable();
  renderAndStore();
}

function setRoleCount(id, delta) {
  const role = state.roles.find((item) => item.id === id);
  if (!role) return;
  role.count = Math.max(0, role.count + delta);
  renderAndStore();
}

function setPhase(phase) {
  pushUndoSnapshot(`${phaseLabels[phase][0]}へ`);
  clearGameWinner();
  state.screen = "table";
  state.phase = phase;
  if (phase === "night") resetTimerValue(240);
  if (phase === "day") resetTimerValue(300);
  if (phase === "vote") resetTimerValue(180);
  if (phase !== "vote") state.votes = {};
  addLog(`${phaseLabels[phase][0]}へ移行`);
  markLatestLogRestorable();
  renderAndStore();
}

function setScreen(screen) {
  const previousScreen = state.screen;
  state.screen = screen;
  if (screen === "action" && previousScreen !== "action" && state.phase === "night" && !state.actionComplete) {
    restartNightActions();
  }
  else renderAndStore();
}

function setPlayerSortMode(mode) {
  if (!["manual", "daily", "total"].includes(mode)) return;
  state.playerSortMode = mode;
  renderAndStore();
}

function restartNightActions() {
  pushUndoSnapshot("夜行動を再開");
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  assignRemainingVillagers();
  state.actionRoleIndex = 0;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.nightStartGuardedPlayerId = state.lastGuardedPlayerId;
  resetActionSelection();
  advanceActionRole();
  prepareActionIntroForCurrentRole();
  renderAndStore();
}

function shiftTimer(delta) {
  resetTimerValue(Math.max(60, state.timerBase + delta));
  renderAndStore();
}

function setTimerMinutes(minutes) {
  resetPleaTimerState();
  resetVoteSession();
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
    stopTimerEndSound();
    if (state.phase === "day") unlockTimerEndSound();
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
      state.timerEndRevealSeconds = VOTE_START_DELAY_SECONDS;
      if (state.phase === "day") playTimerEndSound();
      startTimerEndRevealCountdown();
    }
    render();
    store();
  }, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function unlockTimerEndSound() {
  const sound = els.timerEndSound;
  if (!sound || sound.dataset.unlocked === "true") return;
  sound.muted = true;
  const unlock = sound.play();
  if (!unlock?.then) return;
  unlock
    .then(() => {
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
      sound.dataset.unlocked = "true";
    })
    .catch(() => {
      sound.muted = false;
    });
}

function playTimerEndSound() {
  const sound = els.timerEndSound;
  if (!sound) return;
  stopTimerEndSound();
  sound.currentTime = 0;
  const playback = sound.play();
  timerEndSoundPlaying = true;
  playback?.catch(() => {
    timerEndSoundPlaying = false;
    render();
  });
}

function stopTimerEndSound() {
  const sound = els.timerEndSound;
  if (sound) {
    sound.pause();
    sound.currentTime = 0;
  }
  if (!timerEndSoundPlaying) return;
  timerEndSoundPlaying = false;
  render();
}

function playNightTransitionSound() {
  const sound = els.nightTransitionSound;
  if (!sound) return;
  stopNightTransitionSound();
  let playback;
  try {
    sound.currentTime = 0;
    playback = sound.play();
  } catch {
    return;
  }
  nightTransitionSoundPlaying = true;
  playback?.catch(() => {
    nightTransitionSoundPlaying = false;
  });
}

function unlockNightTransitionSound() {
  const sound = els.nightTransitionSound;
  if (!sound || sound.dataset.unlocked === "true") return;
  let unlock;
  try {
    sound.muted = true;
    unlock = sound.play();
  } catch {
    sound.muted = false;
    return;
  }
  if (!unlock?.then) return;
  unlock
    .then(() => {
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
      sound.dataset.unlocked = "true";
    })
    .catch(() => {
      sound.muted = false;
    });
}

function stopNightTransitionSound() {
  const sound = els.nightTransitionSound;
  try {
    sound.pause();
    sound.currentTime = 0;
  } catch {
    // Audio failures must not interrupt the game flow.
  }
  nightTransitionSoundPlaying = false;
}

function resumeTimerEndRevealCountdown() {
  if (state.timerEndRevealSeconds > 0 && state.timerSeconds === 0 && state.timerFocus && !state.showVoteTable) {
    startTimerEndRevealCountdown();
  }
}

function startTimerEndRevealCountdown() {
  if (state.timerEndRevealSeconds <= 0) return;
  stopTimerEndRevealCountdown();
  timerEndRevealTimerId = window.setInterval(() => {
    state.timerEndRevealSeconds = Math.max(0, state.timerEndRevealSeconds - 1);
    if (state.timerEndRevealSeconds === 0) stopTimerEndRevealCountdown();
    renderAndStore();
  }, 1000);
}

function stopTimerEndRevealCountdown() {
  if (timerEndRevealTimerId) window.clearInterval(timerEndRevealTimerId);
  timerEndRevealTimerId = null;
}

function startPleaTimer() {
  if (state.pleaSeconds === 0) state.pleaSeconds = PLEA_TIMER_SECONDS;
  stopPleaTimer();
  state.pleaRunning = true;
  pleaTimerId = window.setInterval(() => {
    state.pleaSeconds = Math.max(0, state.pleaSeconds - 1);
    if (state.pleaSeconds === 0) {
      stopPleaTimer();
    }
    renderAndStore();
  }, 1000);
}

function togglePleaTimer() {
  if (!state.showPleaTimer) return;
  if (state.pleaRunning) {
    stopPleaTimer();
  } else {
    startPleaTimer();
  }
  renderAndStore();
}

function stopPleaTimer() {
  if (pleaTimerId) window.clearInterval(pleaTimerId);
  pleaTimerId = null;
  state.pleaRunning = false;
}

function resetPleaTimerState() {
  stopPleaTimer();
  state.showPleaTimer = false;
  state.pleaTargetPlayerId = "";
  state.pleaSeconds = PLEA_TIMER_SECONDS;
  state.pleaRunning = false;
}

function startRevotePleaTimer() {
  if (state.revotePleaSeconds === 0) state.revotePleaSeconds = PLEA_TIMER_SECONDS;
  stopRevotePleaTimer();
  state.revotePleaRunning = true;
  revotePleaTimerId = window.setInterval(() => {
    state.revotePleaSeconds = Math.max(0, state.revotePleaSeconds - 1);
    if (state.revotePleaSeconds === 0) {
      stopRevotePleaTimer();
    }
    renderAndStore();
  }, 1000);
}

function toggleRevotePleaTimer() {
  if (!state.showRevotePleaTimer) return;
  if (state.revotePleaRunning) {
    stopRevotePleaTimer();
  } else {
    startRevotePleaTimer();
  }
  renderAndStore();
}

function stopRevotePleaTimer() {
  if (revotePleaTimerId) window.clearInterval(revotePleaTimerId);
  revotePleaTimerId = null;
  state.revotePleaRunning = false;
}

function resetRevotePleaTimerState() {
  stopRevotePleaTimer();
  state.showRevotePleaTimer = false;
  state.revotePleaCandidateIds = [];
  state.revotePleaRoundIndex = 0;
  state.revotePleaSeconds = PLEA_TIMER_SECONDS;
  state.revotePleaRunning = false;
}

function startNightTransition(result) {
  stopAllLiveTimers();
  els.nightTransitionTitle?.removeAttribute("data-typewriter-text");
  state.showNightTransition = true;
  state.nightTransitionSeconds = getNightTransitionDelaySeconds(result);
  state.nightTransitionOkSeconds = NIGHT_TRANSITION_OK_DELAY_SECONDS;
  state.nightTransitionOutcome = result.ended ? "victory" : "night";
  state.nightTransitionWinner = result.ended ? result.winner : "";
  state.screen = "table";
  state.phase = "vote";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  unlockNightTransitionSound();
  renderAndStore();
  startNightTransitionTimer();
}

function resumeNightTransitionTimer() {
  if (!state.showNightTransition) return;
  startNightTransitionTimer();
}

function startNightTransitionTimer() {
  if (!state.showNightTransition) return;
  stopNightTransitionTimer();
  startNightTransitionFallback();
  if (state.nightTransitionSeconds === 0 && state.nightTransitionOutcome === "victory" && state.nightTransitionWinner) {
    finishVictoryNightTransition(state.nightTransitionWinner);
    return;
  }
  nightTransitionTimerId = window.setInterval(() => {
    try {
      if (state.nightTransitionSeconds > 0) {
        state.nightTransitionSeconds = Math.max(0, state.nightTransitionSeconds - 1);
        if (state.nightTransitionSeconds === 0 && state.nightTransitionOutcome === "victory" && state.nightTransitionWinner) {
          finishVictoryNightTransition(state.nightTransitionWinner);
          return;
        }
        if (state.nightTransitionSeconds === 0 && state.nightTransitionOutcome === "night") {
          playNightTransitionSound();
        }
        if (state.nightTransitionSeconds === 0) stopNightTransitionFallback();
      } else {
        state.nightTransitionOkSeconds = Math.max(0, state.nightTransitionOkSeconds - 1);
      }
      if (state.nightTransitionSeconds === 0 && state.nightTransitionOkSeconds === 0) {
        stopNightTransitionTimer();
      }
      renderAndStore();
    } catch {
      // Keep the screen alive so the fallback timer can recover the transition.
    }
  }, 1000);
}

function finishVictoryNightTransition(winner) {
  if (!winner) return;
  stopNightTransitionTimer();
  state.showNightTransition = false;
  state.nightTransitionSeconds = NIGHT_TRANSITION_MIN_SECONDS;
  state.nightTransitionOkSeconds = NIGHT_TRANSITION_OK_DELAY_SECONDS;
  state.nightTransitionOutcome = "night";
  state.nightTransitionWinner = "";
  finalizeGameWinner(winner);
  renderAndStore();
}

function completeNightTransition() {
  if (state.nightTransitionSeconds > 0 || state.nightTransitionOkSeconds > 0) return;
  stopNightTransitionTimer();
  stopNightTransitionSound();
  const outcome = state.nightTransitionOutcome;
  const winner = state.nightTransitionWinner;
  state.showNightTransition = false;
  state.nightTransitionSeconds = NIGHT_TRANSITION_MIN_SECONDS;
  state.nightTransitionOkSeconds = NIGHT_TRANSITION_OK_DELAY_SECONDS;
  state.nightTransitionOutcome = "night";
  state.nightTransitionWinner = "";
  if (outcome === "victory" && winner) {
    finishVictoryNightTransition(winner);
    return;
  }
  startNightActions({ recordUndo: false });
}

function stopNightTransitionTimer() {
  if (nightTransitionTimerId) window.clearInterval(nightTransitionTimerId);
  nightTransitionTimerId = null;
  stopNightTransitionFallback();
}

function startNightTransitionFallback() {
  stopNightTransitionFallback();
  nightTransitionFallbackTimerId = window.setTimeout(() => {
    try {
      if (!state.showNightTransition || state.nightTransitionSeconds === 0) return;
      state.nightTransitionSeconds = 0;
      if (state.nightTransitionOutcome === "night") playNightTransitionSound();
      renderAndStore();
    } catch {
      // The main transition remains available even if the fallback cannot run.
    }
  }, (NIGHT_TRANSITION_MAX_SECONDS + 2) * 1000);
}

function stopNightTransitionFallback() {
  if (nightTransitionFallbackTimerId) window.clearTimeout(nightTransitionFallbackTimerId);
  nightTransitionFallbackTimerId = null;
}

function resetNightTransitionState() {
  stopNightTransitionTimer();
  stopNightTransitionSound();
  state.showNightTransition = false;
  state.nightTransitionSeconds = NIGHT_TRANSITION_MIN_SECONDS;
  state.nightTransitionOkSeconds = NIGHT_TRANSITION_OK_DELAY_SECONDS;
  state.nightTransitionOutcome = "night";
  state.nightTransitionWinner = "";
}

function getNightTransitionDelaySeconds(result) {
  const activeCount = Math.max(1, getActivePlayers().length);
  const livingCount = getLivingPlayers().length;
  const dayPressure = clampNumber((state.day - 1) / 4, 0, 1);
  const deathPressure = clampNumber((activeCount - livingCount) / Math.max(1, activeCount - 2), 0, 1);
  const pressure = result.ended ? Math.max(0.75, dayPressure, deathPressure) : dayPressure * 0.55 + deathPressure * 0.45;
  const center = NIGHT_TRANSITION_MIN_SECONDS + Math.round(pressure * (NIGHT_TRANSITION_MAX_SECONDS - NIGHT_TRANSITION_MIN_SECONDS));
  const min = Math.max(NIGHT_TRANSITION_MIN_SECONDS, center - 1);
  const max = Math.min(NIGHT_TRANSITION_MAX_SECONDS, center + 1);
  return getRandomInt(min, max);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetAttackResultState() {
  stopAttackResultRevealTimer();
  state.showAttackResult = false;
  state.attackResultTargetId = "";
  state.attackResultSucceeded = false;
  state.attackResultWinner = "";
  state.attackResultStage = ATTACK_RESULT_STAGE_NIGHT_COMPLETE;
  state.attackResultPauseSeconds = ATTACK_RESULT_PAUSE_SECONDS;
  state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
  state.attackResultOkSeconds = ATTACK_RESULT_OK_DELAY_SECONDS;
}

function resumeAttackResultRevealTimer() {
  if (!state.showAttackResult) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_COMPLETE) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_READY && state.attackResultOkSeconds === 0) return;
  startAttackResultRevealTimer();
}

function startAttackResultRevealTimer() {
  if (!state.showAttackResult) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_COMPLETE) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_READY && state.attackResultOkSeconds === 0) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_WAIT && state.attackResultPauseSeconds === 0) {
    state.attackResultStage = ATTACK_RESULT_STAGE_DAWN;
    state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
  }
  stopAttackResultRevealTimer();
  attackResultRevealTimerId = window.setInterval(() => {
    if (state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_WAIT) {
      state.attackResultPauseSeconds = Math.max(0, state.attackResultPauseSeconds - 1);
      if (state.attackResultPauseSeconds === 0) {
        state.attackResultStage = ATTACK_RESULT_STAGE_DAWN;
        state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
      }
    } else if (state.attackResultStage === ATTACK_RESULT_STAGE_READY) {
      state.attackResultOkSeconds = Math.max(0, state.attackResultOkSeconds - 1);
      if (state.attackResultOkSeconds === 0) {
        stopAttackResultRevealTimer();
      }
    } else {
      state.attackResultRevealSeconds = Math.max(0, state.attackResultRevealSeconds - 1);
    }
    if (state.attackResultRevealSeconds === 0 && [ATTACK_RESULT_STAGE_DAWN, ATTACK_RESULT_STAGE_RESULT].includes(state.attackResultStage)) {
      if (state.attackResultStage === ATTACK_RESULT_STAGE_DAWN) {
        state.attackResultStage = ATTACK_RESULT_STAGE_RESULT;
        state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
      } else {
        state.attackResultStage = ATTACK_RESULT_STAGE_READY;
        state.attackResultOkSeconds = ATTACK_RESULT_OK_DELAY_SECONDS;
      }
    }
    renderAndStore();
  }, 1000);
}

function stopAttackResultRevealTimer() {
  if (attackResultRevealTimerId) window.clearInterval(attackResultRevealTimerId);
  attackResultRevealTimerId = null;
}

function resetTimer() {
  const wasRunning = state.timerRunning;
  state.timerSeconds = state.timerBase;
  state.timerRunning = false;
  state.timerEndRevealSeconds = 0;
  if (state.timerFocus) {
    state.timerResetCount = wasRunning ? state.timerResetCount + 1 : 2;
    if (state.timerResetCount >= 2) {
      state.timerFocus = false;
      state.timerResetCount = 0;
    }
  }
  stopTimer();
  stopTimerEndSound();
  stopTimerEndRevealCountdown();
  renderAndStore();
}

function resetTimerValue(seconds) {
  resetNightTransitionState();
  resetAttackResultState();
  resetPleaTimerState();
  resetVoteSession();
  state.timerBase = seconds;
  state.timerSeconds = seconds;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  state.timerResetCount = 0;
  state.showVoteTable = false;
  stopTimer();
  stopTimerEndSound();
  stopTimerEndRevealCountdown();
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

function resetVoteSession() {
  state.votes = {};
  state.voteRecords = [];
  state.voteVoterId = "";
  state.voteTargetId = "";
  state.editingVoteRecordIndex = -1;
  state.revoteCandidateIds = [];
  state.revoteAssignIndex = 0;
  state.revoteTargetSelectMode = false;
  state.pendingRevotePleaCandidateIds = [];
  resetRevotePleaTimerState();
}

function resetVoteRecords() {
  resetVoteSession();
  renderAndStore();
}

function recordVote() {
  const voter = findPlayer(state.voteVoterId);
  const target = findPlayer(state.voteTargetId);
  if (!voter || !target || !voter.alive || !target.alive) return;
  if (voter.id === target.id) return;
  const editIndex = getEditingVoteRecordIndex();
  if (state.voteRecords.some((record, index) => record.voterId === voter.id && index !== editIndex)) return;
  const targetCandidates = getVoteTargetPlayers();
  if (!targetCandidates.some((player) => player.id === target.id)) return;
  pushUndoSnapshot(editIndex >= 0 ? "投票修正" : "投票記録");
  const order = editIndex >= 0 ? state.voteRecords[editIndex].order || editIndex + 1 : state.voteRecords.length + 1;
  if (editIndex >= 0) {
    state.voteRecords[editIndex] = { order, voterId: voter.id, targetId: target.id };
  } else {
    state.voteRecords.push({ order, voterId: voter.id, targetId: target.id });
  }
  syncVoteCountsFromRecords();
  addLog(`${editIndex >= 0 ? "投票修正" : "投票"}${order}: ${voter.name} → ${target.name}`);
  state.voteVoterId = "";
  state.voteTargetId = "";
  state.editingVoteRecordIndex = -1;
  updatePendingRevotePlea();
  startRevoteIfCompletedTie();
  markLatestLogRestorable();
  renderAndStore();
}

function editVoteRecord(index) {
  const record = state.voteRecords[index];
  if (!record) return;
  state.editingVoteRecordIndex = index;
  state.voteVoterId = record.voterId;
  state.voteTargetId = record.targetId;
  renderAndStore();
}

function deleteVoteRecord(index) {
  if (index < 0 || index >= state.voteRecords.length) return;
  state.voteRecords.splice(index, 1);
  renumberVoteRecords();
  syncVoteCountsFromRecords();
  updatePendingRevotePlea();
  if (state.editingVoteRecordIndex === index) {
    state.editingVoteRecordIndex = -1;
    state.voteVoterId = "";
    state.voteTargetId = "";
  } else if (state.editingVoteRecordIndex > index) {
    state.editingVoteRecordIndex -= 1;
  }
  renderAndStore();
}

function moveVoteRecord(index, direction) {
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || index >= state.voteRecords.length || nextIndex >= state.voteRecords.length) return;
  const [record] = state.voteRecords.splice(index, 1);
  state.voteRecords.splice(nextIndex, 0, record);
  renumberVoteRecords();
  if (state.editingVoteRecordIndex === index) {
    state.editingVoteRecordIndex = nextIndex;
  } else if (state.editingVoteRecordIndex === nextIndex) {
    state.editingVoteRecordIndex = index;
  }
  renderAndStore();
}

function handleExileButton() {
  if (state.voteSelectedPlayerId) {
    confirmSelectedPlayerExile();
    return;
  }
  exileTopVotedPlayer();
}

function exileTopVotedPlayer() {
  const topIds = getTopVotedPlayerIds();
  if (!topIds.length) return;
  if (topIds.length > 1) {
    state.pendingRevotePleaCandidateIds = topIds;
    renderAndStore();
    return;
  }
  addLog(formatVoteResultLog("投票結果", topIds));
  markLatestLogRestorable();
  state.voteSelectedPlayerId = topIds[0];
  confirmSelectedPlayerExile();
}

function startRevoteIfCompletedTie() {
  if (isRevoteAssignmentMode()) return;
  if (state.voteRecords.length < getLivingPlayers().length) return;
  const topIds = getTopVotedPlayerIds();
  if (topIds.length > 1) {
    state.pendingRevotePleaCandidateIds = topIds;
  } else {
    state.pendingRevotePleaCandidateIds = [];
  }
}

function updatePendingRevotePlea() {
  if (!state.pendingRevotePleaCandidateIds.length) return;
  if (state.voteRecords.length < getLivingPlayers().length) {
    state.pendingRevotePleaCandidateIds = [];
    return;
  }
  const topIds = getTopVotedPlayerIds();
  state.pendingRevotePleaCandidateIds = topIds.length > 1 ? topIds : [];
}

function startPendingRevotePlea() {
  if (state.pendingRevotePleaCandidateIds.length <= 1) return;
  const candidates = [...state.pendingRevotePleaCandidateIds];
  state.pendingRevotePleaCandidateIds = [];
  pushUndoSnapshot("決選投票へ");
  addLog(formatVoteResultLog("投票結果", candidates));
  markLatestLogRestorable();
  startRevoteAssignment(candidates);
  renderAndStore();
}

function startPendingRevotePleaTimer() {
  if (state.pendingRevotePleaCandidateIds.length <= 1) return;
  const candidates = state.pendingRevotePleaCandidateIds.filter((id) => {
    const player = findPlayer(id);
    return player && player.alive && isActivePlayer(player);
  });
  if (candidates.length <= 1) return;
  pushUndoSnapshot("決戦弁明へ");
  state.pendingRevotePleaCandidateIds = [];
  state.revotePleaCandidateIds = candidates;
  state.revotePleaRoundIndex = 0;
  state.revotePleaSeconds = PLEA_TIMER_SECONDS;
  state.revotePleaRunning = false;
  state.showRevotePleaTimer = true;
  state.showVoteTable = false;
  state.screen = "table";
  state.phase = "vote";
  stopRevotePleaTimer();
  renderAndStore();
}

function startRevotePlea(candidateIds) {
  const candidates = candidateIds.filter((id) => {
    const player = findPlayer(id);
    return player && player.alive && isActivePlayer(player);
  });
  if (candidates.length <= 1) {
    state.voteSelectedPlayerId = candidates[0] || "";
    confirmSelectedPlayerExile();
    return;
  }
  pushUndoSnapshot("決選投票へ");
  startRevoteAssignment(candidates);
}

function backFromRevotePleaTimer() {
  const candidates = [...state.revotePleaCandidateIds];
  resetRevotePleaTimerState();
  state.pendingRevotePleaCandidateIds = candidates;
  state.screen = "table";
  state.phase = "vote";
  state.showVoteTable = true;
  renderAndStore();
}

function startRevoteAfterPlea() {
  if (!state.showRevotePleaTimer) return;
  pushUndoSnapshot("決選投票へ");
  const candidates = [...state.revotePleaCandidateIds];
  addLog(formatVoteResultLog("投票結果", candidates));
  markLatestLogRestorable();
  stopRevotePleaTimer();
  resetRevotePleaTimerState();
  startRevoteAssignment(candidates);
  renderAndStore();
}

function startNextRevotePleaRound() {
  if (!state.showRevotePleaTimer) return;
  if (state.revotePleaRoundIndex >= state.revotePleaCandidateIds.length - 1) return;
  pushUndoSnapshot("次の決戦者");
  state.revotePleaRoundIndex += 1;
  state.revotePleaSeconds = PLEA_TIMER_SECONDS;
  stopRevotePleaTimer();
  state.revotePleaRunning = false;
  renderAndStore();
}

function startRevoteAssignment(candidateIds) {
  state.revoteCandidateIds = candidateIds.filter((id) => {
    const player = findPlayer(id);
    return player && player.alive && isActivePlayer(player);
  });
  state.screen = "table";
  state.phase = "vote";
  state.revoteAssignIndex = 0;
  state.voteRecords = [];
  state.votes = {};
  state.voteVoterId = "";
  state.voteTargetId = "";
  state.editingVoteRecordIndex = -1;
  state.showVoteTable = true;
  state.revoteTargetSelectMode = true;
  addLog("同票のため再投票");
  markLatestLogRestorable();
}

function isRevoteAssignmentMode() {
  return state.revoteCandidateIds.length > 1;
}

function isRevoteTargetSelectMode() {
  return isRevoteAssignmentMode() && state.revoteTargetSelectMode;
}

function getCurrentRevoteTargetId() {
  if (!isRevoteAssignmentMode() || isRevoteTargetSelectMode()) return "";
  return state.revoteCandidateIds[Math.min(state.revoteAssignIndex, state.revoteCandidateIds.length - 2)] || "";
}

function getLastRevoteTargetId() {
  if (!isRevoteAssignmentMode()) return "";
  return state.revoteCandidateIds[state.revoteCandidateIds.length - 1] || "";
}

function advanceRevoteAssignment() {
  if (!isRevoteAssignmentMode()) return;
  if (isRevoteTargetSelectMode()) return;
  pushUndoSnapshot("決戦投票を進める");
  if (state.revoteAssignIndex < state.revoteCandidateIds.length - 2) {
    state.revoteAssignIndex += 1;
    state.revoteTargetSelectMode = true;
    renderAndStore();
    return;
  }
  finalizeRevoteAssignment();
}

function finalizeRevoteAssignment() {
  const lastTargetId = getLastRevoteTargetId();
  if (!lastTargetId) return;
  getVoteVoterPlayers().forEach((player) => {
    if (state.voteRecords.some((record) => record.voterId === player.id)) return;
    state.voteRecords.push({
      order: state.voteRecords.length + 1,
      voterId: player.id,
      targetId: lastTargetId,
    });
  });
  syncVoteCountsFromRecords();
  const topIds = getTopVotedPlayerIds();
  if (!topIds.length) return;
  addLog(formatVoteResultLog("決選投票結果", topIds));
  markLatestLogRestorable();
  if (topIds.length > 1) {
    state.revoteCandidateIds = [];
    state.revoteAssignIndex = 0;
    state.revoteTargetSelectMode = false;
    state.pendingRevotePleaCandidateIds = topIds;
    renderAndStore();
    return;
  }
  state.revoteCandidateIds = [];
  state.revoteAssignIndex = 0;
  state.revoteTargetSelectMode = false;
  state.voteSelectedPlayerId = topIds[0];
  confirmSelectedPlayerExile();
}

function formatVoteResultLog(label, topIds = getTopVotedPlayerIds()) {
  const rows = Object.entries(state.votes)
    .map(([id, count]) => ({ player: findPlayer(id), count }))
    .filter((row) => row.player)
    .sort((a, b) => b.count - a.count || a.player.name.localeCompare(b.player.name, "ja"));
  const summary = rows.map(({ player, count }) => `${player.name} ${count}票`).join("、") || "票なし";
  const topNames = topIds.map((id) => findPlayer(id)?.name).filter(Boolean);
  const suffix = topNames.length > 1 ? `（同票: ${topNames.join("・")}）` : topNames.length === 1 ? `（最多: ${topNames[0]}）` : "";
  return `${label}: ${summary}${suffix}`;
}

function selectRevoteTarget(targetId) {
  if (!isRevoteTargetSelectMode()) return;
  const target = findPlayer(targetId);
  if (!target || !target.alive || !state.revoteCandidateIds.includes(target.id)) return;
  const index = Math.min(state.revoteAssignIndex, state.revoteCandidateIds.length - 2);
  const fixedTargets = state.revoteCandidateIds.slice(0, index);
  const remainingTargets = state.revoteCandidateIds.slice(index).filter((id) => id !== target.id);
  state.revoteCandidateIds = [...fixedTargets, target.id, ...remainingTargets];
  state.revoteAssignIndex = index;
  state.revoteTargetSelectMode = false;
  state.voteSelectedPlayerId = "";
  renderAndStore();
}

function getVoteTargetPlayers() {
  const living = getLivingPlayers();
  const voterId = state.voteVoterId;
  if (!state.revoteCandidateIds.length) return living.filter((player) => player.id !== voterId);
  const candidateSet = new Set(state.revoteCandidateIds);
  return living.filter((player) => candidateSet.has(player.id) && player.id !== voterId);
}

function getRevoteCandidatePlayers() {
  const candidateSet = new Set(state.revoteCandidateIds.slice(state.revoteAssignIndex));
  return getLivingPlayers().filter((player) => candidateSet.has(player.id));
}

function getFirstRevoteTargetIdExcept(voterId) {
  return state.revoteCandidateIds.find((id) => id !== voterId) || "";
}

function getVoteVoterPlayers() {
  const editIndex = getEditingVoteRecordIndex();
  const votedIds = new Set(state.voteRecords.filter((_, index) => index !== editIndex).map((record) => record.voterId));
  const revoteCandidateIds = isRevoteAssignmentMode() ? new Set(state.revoteCandidateIds) : new Set();
  return getLivingPlayers().filter((player) => !votedIds.has(player.id) && !revoteCandidateIds.has(player.id));
}

function getEditingVoteRecordIndex() {
  return Number.isInteger(state.editingVoteRecordIndex) && state.editingVoteRecordIndex >= 0 && state.editingVoteRecordIndex < state.voteRecords.length
    ? state.editingVoteRecordIndex
    : -1;
}

function getVoteAssignmentForVoter(voterId) {
  const record = state.voteRecords.find((item) => item.voterId === voterId);
  if (!record) return null;
  const target = findPlayer(record.targetId);
  return {
    targetId: record.targetId,
    targetName: target?.name || "不明",
  };
}

function syncVoteCountsFromRecords() {
  state.votes = state.voteRecords.reduce((counts, record) => {
    counts[record.targetId] = (counts[record.targetId] || 0) + 1;
    return counts;
  }, {});
}

function pushUndoSnapshot(label) {
  state.undoHistory.unshift({
    label,
    savedAt: Date.now(),
    payload: cloneStatePayload(getStatePayload({ includeUndoHistory: false, includeLogRestorePoints: false, includeMatchHistory: false })),
  });
  state.undoHistory = state.undoHistory.slice(0, DEBUG_HISTORY_LIMIT);
  markLargeStateDirty();
}

function cloneStatePayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function undoLastStep() {
  if (!state.undoHistory.length) return;
  if (!confirm("直前の進行操作に戻しますか？")) return;
  const [snapshot, ...rest] = state.undoHistory;
  applyRestoredPayload(snapshot.payload);
  state.undoHistory = rest;
  markLargeStateDirty();
  renderAndStore();
  resumeVictoryRevealTimer();
}

function markLatestLogRestorable() {
  const log = state.logs[0];
  markLogRestorable(log?.id);
}

function markLogRestorable(logId) {
  if (!logId) return;
  state.logRestorePoints[logId] = cloneStatePayload(getStatePayload({ includeUndoHistory: false, includeLogRestorePoints: false, includeMatchHistory: false }));
  pruneLogRestorePoints();
  markLargeStateDirty();
}

function restoreToLogPoint(logId) {
  const payload = state.logRestorePoints?.[logId];
  if (!payload) return;
  const log = state.logs.find((item) => item.id === logId);
  if (!confirm(`${log?.text || "選択したログ"} まで戻しますか？`)) return;
  applyRestoredPayload(payload);
  renderAndStore();
  resumeVictoryRevealTimer();
}

function applyRestoredPayload(payload) {
  const restorePoints = state.logRestorePoints;
  const matchHistory = state.matchHistory;
  const selectedLogMatchId = state.selectedLogMatchId;
  stopAllLiveTimers();
  applySavedState(payload, { resetActionScreen: false });
  state.matchHistory = matchHistory;
  state.selectedLogMatchId = state.matchHistory.some((match) => match.id === selectedLogMatchId) ? selectedLogMatchId : "current";
  state.logRestorePoints = restorePoints;
  pruneLogRestorePoints();
  stopAllLiveTimers();
  state.timerRunning = false;
  state.timerEndRevealSeconds = 0;
  state.pleaRunning = false;
  state.revotePleaRunning = false;
  if (state.showNightTransition) {
    state.nightTransitionSeconds = 0;
    state.nightTransitionOkSeconds = 0;
  }
  if (state.showAttackResult) {
    state.attackResultStage = ATTACK_RESULT_STAGE_READY;
    state.attackResultPauseSeconds = 0;
    state.attackResultRevealSeconds = 0;
    state.attackResultOkSeconds = 0;
  }
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
}

function pruneLogRestorePoints() {
  const visibleIds = new Set(state.logs.slice(0, 80).map((log) => log.id).filter(Boolean));
  Object.keys(state.logRestorePoints).forEach((id) => {
    if (!visibleIds.has(id)) delete state.logRestorePoints[id];
  });
}

function stopAllLiveTimers() {
  stopTimer();
  stopTimerEndSound();
  stopNightTransitionSound();
  stopTimerEndRevealCountdown();
  stopPleaTimer();
  stopRevotePleaTimer();
  stopNightTransitionTimer();
  stopAttackResultRevealTimer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  stopVictoryBackTimer();
  stopVictoryRevealTimer();
}

function stopVictoryBackTimer() {
  if (!victoryBackTimerId) return;
  window.clearTimeout(victoryBackTimerId);
  victoryBackTimerId = null;
}

function startVictoryRevealTimer() {
  if (!state.gameWinner || state.victoryDismissed || state.victoryRevealStage === "winner") return;
  stopVictoryRevealTimer();
  victoryRevealTimerId = window.setInterval(() => {
    state.victoryRevealSeconds = Math.max(0, state.victoryRevealSeconds - 1);
    if (state.victoryRevealSeconds === 0) {
      if (state.victoryRevealStage === "announcement") {
        state.victoryRevealStage = "prompt";
        state.victoryRevealSeconds = VICTORY_REVEAL_STEP_SECONDS;
      } else {
        state.victoryRevealStage = "winner";
        state.victoryShownAt = Date.now();
        stopVictoryRevealTimer();
      }
    }
    renderAndStore();
  }, 1000);
}

function resumeVictoryRevealTimer() {
  if (!state.gameWinner || state.victoryDismissed || state.victoryRevealStage === "winner") return;
  startVictoryRevealTimer();
}

function stopVictoryRevealTimer() {
  if (victoryRevealTimerId) window.clearInterval(victoryRevealTimerId);
  victoryRevealTimerId = null;
}

function getTopVotedPlayerIds() {
  syncVoteCountsFromRecords();
  const entries = Object.entries(state.votes).filter(([id]) => {
    const player = findPlayer(id);
    return player && player.alive && isActivePlayer(player);
  });
  if (!entries.length) return [];
  const maxCount = Math.max(...entries.map(([, count]) => count));
  return entries.filter(([, count]) => count === maxCount).map(([id]) => id);
}

function getVoteOutcomeDecisionId() {
  if (!state.voteRecords.length || state.pendingRevotePleaCandidateIds.length || isRevoteAssignmentMode()) return "";
  syncVoteCountsFromRecords();
  const topIds = getTopVotedPlayerIds();
  if (topIds.length !== 1) return "";
  const topId = topIds[0];
  const topCount = state.votes[topId] || 0;
  const otherMax = getLivingPlayers()
    .filter((player) => player.id !== topId && isActivePlayer(player))
    .reduce((max, player) => Math.max(max, state.votes[player.id] || 0), 0);
  const remainingVotes = Math.max(0, getVoteVoterPlayers().length - state.voteRecords.length);
  return topCount > otherMax + remainingVotes ? topId : "";
}

function nextDay() {
  pushUndoSnapshot("次の日へ");
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  resetVoteSession();
  state.day += 1;
  state.phase = "night";
  state.votes = {};
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  resetActionSelection();
  resetTimerValue(240);
  addLog(`${state.day}日目の夜へ`);
  markLatestLogRestorable();
  renderAndStore();
}

async function copyLog() {
  const match = getSelectedLogMatch();
  const text = formatGameLogForCopy(match.logs, match.winner, match);
  try {
    await navigator.clipboard.writeText(text);
    if (match.id === "current") addLog("ログをコピーした");
  } catch {
    if (match.id === "current") addLog("コピーできなかった");
  }
  renderAndStore();
}

function resetGame() {
  if (!confirm("卓を初期化しますか？")) return;
  stopTimer();
  stopTimerEndRevealCountdown();
  resetPleaTimerState();
  resetVoteSession();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.players = [];
  state.roles = DEFAULT_ROLES.map((role) => ({ ...role }));
  state.enabledRoleIds = [...DEFAULT_ENABLED_ROLE_IDS];
  state.allowWerewolfSelfAttack = false;
  state.allowWerewolfSkipAttack = true;
  state.screen = "setup";
  state.phase = "setup";
  state.day = 0;
  state.timerSeconds = 300;
  state.timerBase = 300;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  state.timerResetCount = 0;
  state.votes = {};
  state.tournamentName = "";
  state.tournamentDate = "";
  state.matchNumber = 0;
  beginNewMatch({ createId: false });
  state.roleDealQueue = [];
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.seerCheckResults = {};
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.lastGuardedPlayerId = "";
  state.nightStartGuardedPlayerId = "";
  state.exiledPlayerIds = [];
  state.attackedPlayerIds = [];
  state.exiledPlayerDays = {};
  state.attackedPlayerDays = {};
  state.playerSortMode = "manual";
  state.participationCountedForDeal = false;
  clearGameWinner();
  state.undoHistory = [];
  resetActionSelection();
  renderAndStore();
}

function resetToFirstNight() {
  if (!confirm("進行を初日夜に戻しますか？")) return;
  pushUndoSnapshot("初日へ戻す");
  stopTimer();
  stopTimerEndRevealCountdown();
  resetPleaTimerState();
  resetVoteSession();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  state.screen = "deal";
  state.phase = "night";
  state.day = 1;
  state.votes = {};
  state.exiledPlayerIds = [];
  state.attackedPlayerIds = [];
  state.exiledPlayerDays = {};
  state.attackedPlayerDays = {};
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.timerEndRevealSeconds = 0;
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.lastGuardedPlayerId = "";
  clearGameWinner();
  state.nightStartGuardedPlayerId = "";
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.seerCheckResults = {};
  getActivePlayers().forEach((player) => {
    player.alive = true;
  });
  resetActionSelection();
  resetTimerValue(240);
  addLog("初日へ戻した");
  markLatestLogRestorable();
  renderAndStore();
}

function render() {
  renderScreen();
  renderParticipantViewMode();
  renderVictoryBanner();
  renderHeader();
  renderMatchInfoInputs();
  renderGameRuleInputs();
  renderPlayers();
  renderRoles();
  renderRoundTable();
  renderVoteRoundTable();
  renderNightTransitionView();
  renderAttackResultView();
  renderActionRoundTable();
  renderVoteControls();
  renderSelectors();
  renderVotes();
  renderLog();
  renderSyncStatus();
  fitSingleLineNames();
  window.requestAnimationFrame(fitSingleLineNames);
}

function renderMatchInfoInputs() {
  if (els.tournamentNameInput) els.tournamentNameInput.value = state.tournamentName;
  if (els.tournamentDateInput) els.tournamentDateInput.value = state.tournamentDate;
  if (els.matchNumberInput) els.matchNumberInput.value = state.matchNumber ? String(state.matchNumber) : "";
}

function renderGameRuleInputs() {
  const enabledRoleIds = new Set(normalizeEnabledRoleIds(state.enabledRoleIds));
  document.querySelectorAll("[data-role-rule]").forEach((input) => {
    input.checked = enabledRoleIds.has(input.dataset.roleRule);
    input.disabled = input.dataset.roleRule === "werewolf";
  });
  if (els.allowWerewolfSelfAttackInput) els.allowWerewolfSelfAttackInput.checked = state.allowWerewolfSelfAttack;
  if (els.allowWerewolfSkipAttackInput) els.allowWerewolfSkipAttackInput.checked = state.allowWerewolfSkipAttack;
}

function renderParticipantViewMode() {
  document.body.classList.toggle("participant-action-view", isParticipantActionView());
  document.body.classList.toggle("timer-fullscreen-view", isTimerFullscreenView());
  document.body.classList.toggle("plea-fullscreen-view", isPleaFullscreenView());
  document.body.classList.toggle("revote-plea-fullscreen-view", isRevotePleaFullscreenView());
  document.body.classList.toggle("night-transition-fullscreen-view", isNightTransitionFullscreenView());
  document.body.classList.toggle("attack-result-fullscreen-view", isAttackResultFullscreenView());
  const victoryFullscreen = isVictoryFullscreenView();
  document.body.classList.toggle("victory-fullscreen-view", victoryFullscreen);
  document.body.classList.toggle("werewolf-victory-view", victoryFullscreen && state.gameWinner === "人狼陣営");
  document.body.classList.toggle("village-victory-view", victoryFullscreen && state.gameWinner === "市民陣営");
}

function isVictoryFullscreenView() {
  return Boolean(state.gameWinner && !state.victoryDismissed);
}

function isParticipantActionView() {
  if (state.screen !== "action") return false;
  const roleId = getCurrentActionRoleId();
  if (roleId === "medium") return hasLivingRole("medium") && Boolean(getLastExiledPlayer());
  return Boolean(state.actionSelectedTargetId && ["seer", "knight", "werewolf"].includes(roleId));
}

function isTimerFullscreenView() {
  return state.screen === "table" && state.timerFocus && (state.timerRunning || state.timerSeconds === 0) && !state.showVoteTable && !state.showPleaTimer;
}

function isVictoryRoundTableView() {
  return state.screen === "deal" && state.victoryDismissed && Boolean(state.gameWinner);
}

function isPleaFullscreenView() {
  return state.screen === "table" && state.showPleaTimer;
}

function isRevotePleaFullscreenView() {
  return state.screen === "table" && state.showRevotePleaTimer;
}

function isNightTransitionFullscreenView() {
  return state.screen === "table" && state.showNightTransition;
}

function isAttackResultFullscreenView() {
  return state.screen === "table" && state.showAttackResult;
}

function renderVictoryBanner() {
  const visible = Boolean(state.gameWinner && !state.victoryDismissed);
  const revealStage = state.victoryRevealStage || "winner";
  els.victoryBanner?.toggleAttribute("hidden", !visible);
  els.victoryBanner?.classList.toggle("victory-werewolf", visible && state.gameWinner === "人狼陣営");
  els.victoryBanner?.classList.toggle("victory-village", visible && state.gameWinner === "市民陣営");
  els.victoryBanner?.classList.toggle("victory-reveal-announcement", visible && revealStage === "announcement");
  els.victoryBanner?.classList.toggle("victory-reveal-prompt", visible && revealStage === "prompt");
  els.victoryBanner?.classList.toggle("victory-reveal-winner", visible && revealStage === "winner");
  if (visible && revealStage === "winner" && state.gameWinner === "人狼陣営" && !victorySoundPlayed) {
    victorySoundPlayed = true;
    window.requestAnimationFrame(playNightTransitionSound);
  }
  if (els.victoryLeadText) {
    els.victoryLeadText.textContent = !visible ? "" : revealStage === "announcement" ? "ゲーム終了" : revealStage === "prompt" ? "勝利したのは" : "";
  }
  if (els.victoryVisualMark) {
    els.victoryVisualMark.textContent = state.gameWinner === "人狼陣営" ? "✦" : "✧";
  }
  if (els.victoryWinnerText) {
    els.victoryWinnerText.textContent = visible && revealStage === "winner" ? state.gameWinner : "";
  }
  if (els.victoryMessageText) {
    els.victoryMessageText.textContent = "";
  }
  if (els.victoryBackBtn) {
    const canBack = visible && revealStage === "winner" && Date.now() - (state.victoryShownAt || 0) >= VICTORY_BACK_DELAY_MS;
    els.victoryBackBtn.hidden = !canBack || state.victoryDismissed;
  }
  scheduleVictoryBackButton(visible);
}

function scheduleVictoryBackButton(ended) {
  if (victoryBackTimerId) window.clearTimeout(victoryBackTimerId);
  victoryBackTimerId = null;
  if (!ended || state.victoryDismissed) return;
  const remaining = VICTORY_BACK_DELAY_MS - (Date.now() - (state.victoryShownAt || 0));
  if (remaining > 0) {
    victoryBackTimerId = window.setTimeout(render, remaining);
  }
}

function getVictoryTitle(winner) {
  if (winner === "人狼陣営") return "人狼勝利";
  if (winner === "市民陣営") return "市民勝利";
  return "";
}

function getVictoryMessage(winner) {
  if (winner === "人狼陣営") return "血が零れている";
  if (winner === "市民陣営") return "光の演出";
  return "";
}

function fitSingleLineNames() {
  document.querySelectorAll(".player-row strong, .round-seat strong, .seat-name, .medium-result-card strong, .dialog-name, #attackResultName").forEach((element) => {
    element.style.fontSize = "";
    let currentSize = Number.parseFloat(getComputedStyle(element).fontSize);
    const maxWidth = element.clientWidth;
    if (!currentSize || !maxWidth) return;

    for (let i = 0; i < 6 && element.scrollWidth > maxWidth; i += 1) {
      currentSize = Math.max(6, Math.floor((currentSize * maxWidth) / element.scrollWidth));
      element.style.fontSize = `${currentSize}px`;
    }
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
  if (els.progressBadge) els.progressBadge.textContent = getProgressBadgeText();
  const tournamentName = state.tournamentName.trim();
  const matchNumber = state.matchNumber > 0 ? `第${state.matchNumber}試合` : "";
  if (els.headerMatchInfo) els.headerMatchInfo.hidden = !tournamentName && !matchNumber;
  if (els.headerTournamentName) {
    els.headerTournamentName.textContent = tournamentName;
    els.headerTournamentName.hidden = !tournamentName;
  }
  if (els.headerMatchNumber) {
    els.headerMatchNumber.textContent = matchNumber;
    els.headerMatchNumber.hidden = !matchNumber;
  }
  if (els.undoStepBtn) {
    els.undoStepBtn.disabled = !state.undoHistory.length;
    els.undoStepBtn.title = state.undoHistory.length ? `戻す: ${state.undoHistory[0].label}` : "戻せる進行操作はありません";
  }
  const activePlayerCount = getActivePlayers().length;
  els.balanceBadge.textContent = `${activePlayerCount} / ${state.players.length}`;
  els.balanceBadge.style.background = activePlayerCount ? "#edf5f2" : "#fae8ea";

  const phase = phaseLabels[state.phase];
  els.dayLabel.textContent = state.phase === "setup" ? phase[0] : `${state.day}日目 ${phase[0]}`;
  els.phaseInitial.textContent = phase[1];
  const timerDisplayText = state.timerSeconds === 0 ? "" : formatTimerDisplay(state.timerSeconds);
  els.timerDisplay.textContent = timerDisplayText;
  els.timerDisplay.classList.toggle("timer-count-hidden", timerDisplayText === "");
  els.timerDisplay.classList.toggle("timer-warning", state.timerSeconds > 0 && state.timerSeconds <= 30);
  els.timerDisplay.classList.toggle("timer-ended", state.timerSeconds === 0);
  const timerEndVisible = state.timerSeconds === 0 && state.timerFocus;
  const voteTransitionVisible = timerEndVisible && !state.showVoteTable;
  els.voteTransitionMessage?.toggleAttribute("hidden", !voteTransitionVisible);
  if (els.voteTransitionMessage) {
    if (!voteTransitionVisible) {
      els.voteTransitionMessage.removeAttribute("data-reveal-text");
      els.voteTransitionMessage.textContent = "投票";
    } else if (els.voteTransitionMessage.dataset.revealText !== "投票") {
      els.voteTransitionMessage.dataset.revealText = "投票";
      els.voteTransitionMessage.replaceChildren(
        ...Array.from("投票", (character, index) => {
          const span = document.createElement("span");
          span.className = "night-transition-typewriter-char";
          span.textContent = character;
          span.style.setProperty("--typewriter-delay", `${index * 260}ms`);
          return span;
        }),
      );
    }
  }
  const timerRing = document.querySelector(".timer-ring");
  timerRing?.setAttribute("aria-label", `残り時間 ${formatTime(state.timerSeconds)}`);
  timerRing?.style.setProperty("--timer-progress", getTimerProgress());
  timerRing?.classList.toggle("timer-warning", state.timerSeconds > 0 && state.timerSeconds <= 30);
  timerRing?.classList.toggle("timer-ended", state.timerSeconds === 0);
  const voteStartVisible = timerEndVisible && state.timerEndRevealSeconds === 0;
  els.voteStartBtn.hidden = !voteStartVisible;
  els.timerStart.hidden = timerEndVisible;
  els.timerStart.textContent = state.timerRunning ? "⏸" : "開始";
  document.querySelector(".table-panel")?.classList.toggle("timer-focus", state.timerFocus);
  document.querySelector(".table-panel")?.classList.toggle("vote-table-mode", state.showVoteTable);
  document.querySelector(".table-panel")?.classList.toggle("victory-round-table-mode", isVictoryRoundTableView());
  els.victoryReviewActions?.toggleAttribute("hidden", !isVictoryRoundTableView());
  document.querySelector(".table-panel")?.classList.toggle("plea-timer-mode", state.showPleaTimer);
  document.querySelector(".table-panel")?.classList.toggle("revote-plea-timer-mode", state.showRevotePleaTimer);
  document.querySelector(".vote-table-actions")?.toggleAttribute("hidden", !state.showVoteTable);
  document.querySelector(".vote-control-panel")?.toggleAttribute("hidden", !state.showVoteTable);
  if (els.exileBtn) {
    els.exileBtn.disabled = !canUseExileButton();
    els.exileBtn.textContent = "追放";
  }
  renderPleaTimerView();
  renderRevotePleaTimerView();
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
  return getProgressBadgeText();
}

function getProgressBadgeText() {
  if (state.phase === "setup") return "準備中";
  const phase = phaseLabels[state.phase]?.[0] || "";
  const dayText = state.day ? `${state.day}日目` : "1日目";
  return `${dayText} ${phase}`;
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
      <button class="mini-button player-edit-button" data-action="edit" title="名前を編集" aria-label="${escapeHtml(player.name)}の名前を編集">✎</button>
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
    row.querySelector('[data-action="edit"]').addEventListener("click", () => editPlayerName(player.id));
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
  const victoryRoundTable = isVictoryRoundTableView();
  els.voteRoundTable.hidden = !state.showVoteTable && !victoryRoundTable;
  if (!state.showVoteTable && !victoryRoundTable) {
    els.voteRoundTable.innerHTML = "";
    return;
  }
  if (victoryRoundTable) {
    renderRoundTableInto(els.voteRoundTable, { hideRoles: false });
    return;
  }
  const revoteCandidateIds = isRevoteAssignmentMode() ? new Set(state.revoteCandidateIds) : new Set();
  const players = isRevoteTargetSelectMode() ? getRevoteCandidatePlayers() : getLivingPlayers().filter((player) => !revoteCandidateIds.has(player.id));
  renderRoundTableInto(els.voteRoundTable, { hideRoles: true, voteMode: true, players });
}

function renderVoteControls() {
  if (!state.showVoteTable) return;
  const revoteMode = isRevoteAssignmentMode();
  let voters = getVoteVoterPlayers();
  if (!voters.some((player) => player.id === state.voteVoterId)) state.voteVoterId = "";
  if (!revoteMode && !state.voteVoterId && voters.length) state.voteVoterId = voters[0].id;
  let targets = getVoteTargetPlayers();
  if (!targets.some((player) => player.id === state.voteTargetId)) state.voteTargetId = "";
  if (!revoteMode && !state.voteTargetId && state.voteVoterId && targets.length) state.voteTargetId = targets[0].id;
  voters = getVoteVoterPlayers();
  targets = getVoteTargetPlayers();
  document.querySelector(".vote-input-grid")?.toggleAttribute("hidden", revoteMode);
  if (els.voteRemainingText) {
    const remaining = getVoteVoterPlayers().length;
    els.voteRemainingText.textContent = `残り投票者 ${remaining}人`;
  }
  renderPlayerSelect(els.voteVoterSelect, voters, state.voteVoterId, "投票者を選択");
  renderPlayerSelect(els.voteTargetSelect, targets, state.voteTargetId, "投票先を選択");
  if (els.recordVoteBtn) {
    els.recordVoteBtn.disabled = !state.voteVoterId || !state.voteTargetId;
    els.recordVoteBtn.textContent = getEditingVoteRecordIndex() >= 0 ? "投票を修正" : "投票を記録";
  }
  if (els.startRevotePleaBtn) {
    const candidates = state.pendingRevotePleaCandidateIds.map((id) => findPlayer(id)?.name).filter(Boolean);
    els.startRevotePleaBtn.hidden = !candidates.length || revoteMode;
    els.startRevotePleaBtn.disabled = !candidates.length || revoteMode;
    els.startRevotePleaBtn.textContent = "決選投票へ";
  }
  if (els.startRevotePleaTimerBtn) {
    const candidates = state.pendingRevotePleaCandidateIds.map((id) => findPlayer(id)?.name).filter(Boolean);
    els.startRevotePleaTimerBtn.hidden = !candidates.length || revoteMode;
    els.startRevotePleaTimerBtn.disabled = !candidates.length || revoteMode;
    els.startRevotePleaTimerBtn.textContent = "決戦弁明へ";
  }
  if (els.revoteNotice) {
    els.revoteNotice.hidden = !revoteMode;
    if (revoteMode) {
      els.revoteNotice.textContent = isRevoteTargetSelectMode()
        ? `決戦投票の対象を円卓で選択: ${getRevoteCandidatePlayers().map((player) => player.name).join("・")}`
        : `同票のため再投票: ${targets.map((player) => player.name).join("・")}`;
    }
  }
  renderRevoteAssist();
  renderVoteSummary();
  renderVoteRecordList();
}

function canUseExileButton() {
  if (state.voteSelectedPlayerId) return true;
  if (!state.voteRecords.length || state.pendingRevotePleaCandidateIds.length || isRevoteAssignmentMode()) return false;
  return Boolean(getVoteOutcomeDecisionId());
}

function renderRevoteAssist() {
  if (!els.revoteAssistPanel) return;
  const revoteMode = isRevoteAssignmentMode();
  const targetSelectMode = isRevoteTargetSelectMode();
  els.revoteAssistPanel.hidden = !revoteMode || targetSelectMode;
  if (!revoteMode || targetSelectMode) return;
  const currentTarget = findPlayer(getCurrentRevoteTargetId());
  const lastTarget = findPlayer(getLastRevoteTargetId());
  const assignedCount = state.voteRecords.filter((record) => record.targetId === currentTarget?.id).length;
  const remainingCount = getVoteVoterPlayers().length;
  if (els.revoteFixedTargetName) {
    els.revoteFixedTargetName.textContent = currentTarget ? `${currentTarget.name} に投票` : "投票先";
  }
  if (els.revoteAssignedText) {
    els.revoteAssignedText.textContent = `${assignedCount}人選択 / 残り${remainingCount}人`;
  }
  if (els.revoteNextBtn) {
    const finalStep = state.revoteAssignIndex >= state.revoteCandidateIds.length - 2;
    els.revoteNextBtn.textContent = finalStep && lastTarget ? `残りを${lastTarget.name}へ` : "次の投票先へ";
  }
}

function renderPlayerSelect(select, players, selectedId, placeholder) {
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>${players
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("")}`;
  select.value = selectedId;
}

function renderVoteSummary() {
  if (!els.voteSummary) return;
  syncVoteCountsFromRecords();
  const rows = Object.entries(state.votes)
    .map(([id, count]) => ({ player: findPlayer(id), count }))
    .filter((row) => row.player && row.player.alive && isActivePlayer(row.player))
    .sort((a, b) => b.count - a.count || a.player.name.localeCompare(b.player.name, "ja"));
  if (!rows.length) {
    els.voteSummary.innerHTML = '<div class="vote-empty">票なし</div>';
    return;
  }
  const maxCount = rows[0].count;
  els.voteSummary.innerHTML = rows
    .map(
      ({ player, count }) =>
        `<div class="vote-summary-row ${count === maxCount ? "top" : ""}"><strong>${escapeHtml(player.name)}</strong><span>${count}票</span></div>`,
    )
    .join("");
}

function renderVoteRecordList() {
  if (!els.voteRecordList) return;
  if (!state.voteRecords.length) {
    els.voteRecordList.innerHTML = '<div class="vote-empty">履歴なし</div>';
    return;
  }
  els.voteRecordList.innerHTML = state.voteRecords
    .map((record, index) => ({ record, index }))
    .reverse()
    .map(({ record, index }) => {
      const voter = findPlayer(record.voterId);
      const target = findPlayer(record.targetId);
      const order = record.order || index + 1;
      const active = index === getEditingVoteRecordIndex() ? " editing" : "";
      return `
        <div class="vote-record-row${active}">
          <button class="vote-record-main" type="button" data-vote-record-index="${index}">
            <span>${order}票目</span><strong>${escapeHtml(voter?.name || "不明")}</strong><em>→</em><strong>${escapeHtml(target?.name || "不明")}</strong>
          </button>
          <div class="vote-record-actions">
            <button type="button" data-vote-record-move="${index}" data-direction="1" aria-label="${order}票目を上へ" ${index === state.voteRecords.length - 1 ? "disabled" : ""}>上</button>
            <button type="button" data-vote-record-move="${index}" data-direction="-1" aria-label="${order}票目を下へ" ${index === 0 ? "disabled" : ""}>下</button>
            <button type="button" data-vote-record-delete="${index}" aria-label="${order}票目を削除">削除</button>
          </div>
        </div>
      `;
    })
    .join("");
  els.voteRecordList.querySelectorAll("[data-vote-record-index]").forEach((button) => {
    button.addEventListener("click", () => editVoteRecord(Number(button.dataset.voteRecordIndex)));
  });
  els.voteRecordList.querySelectorAll("[data-vote-record-move]").forEach((button) => {
    button.addEventListener("click", () => moveVoteRecord(Number(button.dataset.voteRecordMove), Number(button.dataset.direction)));
  });
  els.voteRecordList.querySelectorAll("[data-vote-record-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteVoteRecord(Number(button.dataset.voteRecordDelete)));
  });
}

function renderNightTransitionView() {
  if (!els.nightTransitionView) return;
  els.nightTransitionView.hidden = !state.showNightTransition;
  els.nightTransitionView.classList.toggle("night-transition-waiting", state.nightTransitionSeconds > 0);
  els.nightTransitionView.classList.toggle("night-transition-victory", state.nightTransitionOutcome === "victory");
  els.nightTransitionView.classList.toggle("night-transition-werewolf-victory", state.nightTransitionOutcome === "victory" && state.nightTransitionWinner === "人狼陣営");
  els.nightTransitionView.classList.toggle("night-transition-village-victory", state.nightTransitionOutcome === "victory" && state.nightTransitionWinner === "市民陣営");
  if (els.nightTransitionLead) {
    els.nightTransitionLead.textContent = "";
  }
  if (els.nightTransitionTitle) {
    const title = state.nightTransitionOutcome === "victory" ? getVictoryTitle(state.nightTransitionWinner) : "夜が訪れます";
    if (state.nightTransitionOutcome === "victory") {
      els.nightTransitionTitle.textContent = title;
    } else if (els.nightTransitionTitle.dataset.typewriterText !== title) {
      els.nightTransitionTitle.dataset.typewriterText = title;
      els.nightTransitionTitle.replaceChildren(
        ...Array.from(title, (character, index) => {
          const span = document.createElement("span");
          span.className = "night-transition-typewriter-char";
          span.textContent = character;
          span.style.setProperty("--typewriter-delay", `${index * 260}ms`);
          return span;
        }),
      );
    }
  }
  if (els.nightTransitionSeconds) {
    els.nightTransitionSeconds.textContent = "";
    els.nightTransitionSeconds.hidden = true;
  }
  if (els.nightTransitionOkBtn) {
    const okReady = state.nightTransitionSeconds === 0 && state.nightTransitionOkSeconds === 0;
    els.nightTransitionOkBtn.hidden = !okReady;
    els.nightTransitionOkBtn.disabled = !okReady;
  }
}

function renderAttackResultView() {
  if (!els.attackResultView) return;
  els.attackResultView.hidden = !state.showAttackResult;
  if (!state.showAttackResult) return;
  els.attackResultView.classList.toggle("attack-result-night-complete", state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_COMPLETE);
  els.attackResultView.classList.toggle("attack-result-night-wait", state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_WAIT);
  els.attackResultView.classList.toggle("attack-result-dawn", state.attackResultStage === ATTACK_RESULT_STAGE_DAWN);
  els.attackResultView.classList.toggle("attack-result-prompt", state.attackResultStage === ATTACK_RESULT_STAGE_RESULT);
  els.attackResultView.classList.toggle("attack-result-ready", state.attackResultStage === ATTACK_RESULT_STAGE_READY);
  const nightCompleteVisible = state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_COMPLETE;
  const promptVisible = state.attackResultStage === ATTACK_RESULT_STAGE_RESULT;
  const nameVisible = state.attackResultStage === ATTACK_RESULT_STAGE_READY;
  const okVisible = nightCompleteVisible || (state.attackResultStage === ATTACK_RESULT_STAGE_READY && state.attackResultOkSeconds === 0);
  const player = findPlayer(state.attackResultTargetId);
  const name = state.attackResultSucceeded ? player?.name || "不明" : "犠牲者なし";
  if (els.attackResultLead) {
    const leadText = nightCompleteVisible ? "夜行動終了" : "朝が訪れます";
    if (state.attackResultStage !== ATTACK_RESULT_STAGE_DAWN) {
      els.attackResultLead.removeAttribute("data-reveal-text");
      els.attackResultLead.textContent = leadText;
    } else if (els.attackResultLead.dataset.revealText !== leadText) {
      els.attackResultLead.dataset.revealText = leadText;
      els.attackResultLead.replaceChildren(
        ...Array.from(leadText, (character, index) => {
          const span = document.createElement("span");
          span.className = "night-transition-typewriter-char";
          span.textContent = character;
          span.style.setProperty("--typewriter-delay", `${index * 260}ms`);
          return span;
        }),
      );
    }
    els.attackResultLead.hidden = !nightCompleteVisible && state.attackResultStage !== ATTACK_RESULT_STAGE_DAWN;
  }
  if (els.attackResultName) {
    els.attackResultName.textContent = nameVisible ? name : "";
    els.attackResultName.hidden = !nameVisible;
    els.attackResultName.classList.toggle("no-victim", !state.attackResultSucceeded);
  }
  if (els.attackResultMessage) {
    els.attackResultMessage.textContent = "本日襲撃されたのは";
    els.attackResultMessage.hidden = !promptVisible;
  }
  if (els.attackResultOkBtn) {
    els.attackResultOkBtn.hidden = !okVisible;
    els.attackResultOkBtn.disabled = !okVisible;
  }
}

function renderPleaTimerView() {
  if (!els.pleaTimerView) return;
  els.pleaTimerView.hidden = !state.showPleaTimer;
  if (!state.showPleaTimer) return;
  if (els.pleaTimerDisplay) {
    els.pleaTimerDisplay.textContent = String(Math.max(0, state.pleaSeconds));
    els.pleaTimerDisplay.classList.toggle("plea-timer-ended", state.pleaSeconds === 0);
  }
  if (els.pleaTimerToggleBtn) {
    els.pleaTimerToggleBtn.textContent = state.pleaRunning ? "停止" : "開始";
  }
  if (els.pleaExileBtn) {
    els.pleaExileBtn.hidden = state.pleaSeconds > 0;
    els.pleaExileBtn.disabled = state.pleaSeconds > 0;
  }
}

function renderRevotePleaTimerView() {
  if (!els.revotePleaTimerView) return;
  els.revotePleaTimerView.hidden = !state.showRevotePleaTimer;
  if (!state.showRevotePleaTimer) return;
  if (els.revotePleaTimerDisplay) {
    els.revotePleaTimerDisplay.textContent = String(Math.max(0, state.revotePleaSeconds));
    els.revotePleaTimerDisplay.classList.toggle("plea-timer-ended", state.revotePleaSeconds === 0);
  }
  if (els.revotePleaProgress) {
    const total = Math.max(1, state.revotePleaCandidateIds.length);
    els.revotePleaProgress.textContent = `${Math.min(total, state.revotePleaRoundIndex + 1)} / ${total}`;
  }
  if (els.revotePleaTimerToggleBtn) {
    els.revotePleaTimerToggleBtn.textContent = state.revotePleaRunning ? "停止" : "開始";
    els.revotePleaTimerToggleBtn.hidden = state.revotePleaSeconds === 0;
  }
  if (els.revotePleaNextBtn) {
    const hasNextRound = state.revotePleaRoundIndex < state.revotePleaCandidateIds.length - 1;
    els.revotePleaNextBtn.hidden = !hasNextRound;
    els.revotePleaNextBtn.disabled = !hasNextRound;
  }
  if (els.revotePleaStartBtn) {
    els.revotePleaStartBtn.hidden = false;
    els.revotePleaStartBtn.disabled = false;
  }
}

function renderActionRoundTable() {
  if (!els.actionRoundTable) return;
  const roleId = getCurrentActionRoleId();
  const nextActionRenderKey = [roleId, state.actionIntroRoleId, state.actionSelectedTargetId, state.actionResultVisible, state.actionBlockedRoleId].join("|");
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

  if (state.actionIntroRoleId === roleId) {
    renderActionRoleIntro(roleName);
    return;
  }

  if (roleId === "medium") {
    renderMediumResult();
    return;
  }

  if (state.screen === "action" && (roleId === "seer" || roleId === "knight" || roleId === "werewolf")) {
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

function renderActionRoleIntro(roleName) {
  els.actionRoleTitle.textContent = roleName;
  els.actionHelp.textContent = "役職を確認してください";
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card medium-only-result-card action-role-intro-card">
      <strong>${escapeHtml(roleName)}</strong>
      <button class="primary-button medium-ok-button action-role-intro-ok-button" type="button">OK</button>
    </div>
  `;
  els.actionRoundTable.querySelector(".action-role-intro-ok-button")?.addEventListener("click", confirmActionRoleIntro);
}

function getActionHelpText(roleId, roleName) {
  if (!roleId) return "次の日へ進めます";
  if (roleId === "medium") return "直近の追放者を確認してください";
  if (roleId === "werewolf") return "襲撃の対象を選んでください";
  return `${roleName}の対象を選んでください`;
}

function replayActionPanelAnimation() {
  els.actionRoundTable.classList.remove("flip-in");
  void els.actionRoundTable.offsetWidth;
  els.actionRoundTable.classList.add("flip-in");
}

function renderMediumResult() {
  if (!hasLivingRole("medium")) {
    stopActionGateCountdown();
    if (hasAssignedRole("medium") && state.actionBlockedRoleId !== "medium") {
      startBlockedRoleCountdown("medium");
    }
    if (hasAssignedRole("medium")) {
      renderBlockedRoleCountdown(ACTION_ROLE_LABELS.medium);
    } else {
      els.actionRoundTable.innerHTML = '<div class="round-empty">霊媒師がいません</div>';
    }
    return;
  }
  const player = getLastExiledPlayer();
  if (!player) {
    els.actionRoundTable.innerHTML = '<div class="round-empty">直前の追放者がいません</div>';
    return;
  }
  const result = player.roleId === "werewolf" ? "人狼" : "市民";
  startActionGateCountdown("medium");
  const gateReady = isActionGateReady("medium");
  els.actionRoundTable.innerHTML = `
    <div class="medium-result-card medium-only-result-card has-result">
      <strong>${escapeHtml(player.name)}</strong>
      <em class="${getResultColorClass(result)}">${result}</em>
      <button class="secondary-button medium-undo-button" type="button">戻る</button>
      <button class="primary-button medium-ok-button" type="button" ${gateReady ? "" : "disabled"}>${gateReady ? "OK" : state.actionGateSeconds}</button>
    </div>
  `;
  els.actionRoundTable.querySelector(".medium-undo-button")?.addEventListener("click", backToExileScreen);
  els.actionRoundTable.querySelector(".medium-ok-button")?.addEventListener("click", () => handleActionTarget(player));
}

function prepareActionIntroForCurrentRole() {
  const roleId = getCurrentActionRoleId();
  state.actionIntroRoleId = roleId === "medium" && hasLivingRole("medium") && Boolean(getLastExiledPlayer()) ? roleId : "";
}

function confirmActionRoleIntro() {
  state.actionIntroRoleId = "";
  renderAndStore();
}

function renderSeerResult() {
  const player = findPlayer(state.actionSelectedTargetId);
  if (!player) {
    resetActionSelection();
    renderActionRoundTable();
    return;
  }
  const result = getSeerResultLabel(state.seerCheckResults[player.id] || getDivinationResult(player));
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

function getWerewolfSkipActionHtml() {
  if (!state.allowWerewolfSkipAttack) return "";
  const gateReady = isActionGateReady("werewolf");
  return `
    <div class="werewolf-skip-action">
      <button class="secondary-button werewolf-skip-button" type="button" ${gateReady ? "" : "disabled"}>${gateReady ? "襲撃なし" : state.actionGateSeconds}</button>
    </div>
  `;
}

function renderRoundTableInto(container, { hideRoles, voteMode = false, actionMode = false, dealMode = false, players = getActivePlayers() }) {
  const revoteTargetSelectMode = voteMode && isRevoteTargetSelectMode();
  const topVotedIds = voteMode && !isRevoteAssignmentMode() && !state.pendingRevotePleaCandidateIds.length ? getTopVotedPlayerIds() : [];
  const topVotedIdSet = new Set(topVotedIds);
  const topVoteFinalized = voteMode && topVotedIds.length > 0 && state.voteRecords.length >= getLivingPlayers().length;
  const earlyDecisionId = voteMode && state.voteSelectedPlayerId && !isRevoteAssignmentMode() ? state.voteSelectedPlayerId : "";
  const voteOutcomeDecisionId = voteMode ? getVoteOutcomeDecisionId() : "";
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
  tableCore.innerHTML = dealMode && !hideRoles
    ? getRoleDealCenterHtml()
    : actionMode && getCurrentActionRoleId() === "werewolf"
      ? getWerewolfSkipActionHtml()
      : "";
  container.appendChild(tableCore);
  const okButton = tableCore.querySelector('[data-action="role-ok"]');
  const backButton = tableCore.querySelector('[data-action="role-back"]');
  okButton?.addEventListener("click", confirmCurrentRole);
  backButton?.addEventListener("click", backRoleDeal);
  tableCore.querySelector(".werewolf-skip-button")?.addEventListener("click", handleWerewolfSkip);

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
    const actionRoleId = actionMode ? getCurrentActionRoleId() : "";
    const status = getSeatStatus(player, actionRoleId);
    const seerRandomWhite = !hideRoles && isSeerRandomWhiteTarget(player);
    const actionDisabled = actionMode && !canSelectActionTarget(getCurrentActionRoleId(), player);
    const voteAssignment = voteMode ? getVoteAssignmentForVoter(player.id) : null;
    const voteSelfDisabled = voteMode && !revoteTargetSelectMode && isRevoteAssignmentMode() && player.id === getCurrentRevoteTargetId();
    const isTopVoted = voteMode && (topVotedIdSet.has(player.id) || player.id === earlyDecisionId || player.id === voteOutcomeDecisionId);
    const isVoteDecision = player.id === earlyDecisionId || player.id === voteOutcomeDecisionId || (topVoteFinalized && topVotedIds.length === 1 && topVotedIds[0] === player.id);
    const voteCount = voteMode ? state.votes[player.id] || 0 : 0;
    const seat = document.createElement("button");
    seat.type = "button";
    seat.className = `round-seat ${player.alive ? "" : "dead"} ${actionDisabled ? "action-disabled" : ""} ${voteSelfDisabled ? "vote-self-disabled" : ""} ${revoteTargetSelectMode ? "revote-target-option" : ""} ${status ? `status-${status.type}` : ""} ${state.exiledPlayerIds.includes(player.id) ? "exiled" : ""} ${isTopVoted ? (isVoteDecision ? "vote-top-final" : "vote-top-current") : ""} ${isTopVoted ? "has-vote-leader" : ""} ${voteMode && state.voteSelectedPlayerId === player.id ? "vote-selected" : ""} ${voteAssignment ? "vote-assigned" : ""} ${voteAssignment?.targetId === getCurrentRevoteTargetId() ? "vote-assigned-current" : ""} ${!hideRoles && player.roleId ? "assigned" : ""} ${hideRoles ? "" : getRoleColorClass(player.roleId)} ${seerRandomWhite ? "seer-blink" : ""} ${
      state.roleDealSelectedPlayerIds.includes(player.id) ? "selected" : ""
    }`;
    seat.disabled = actionDisabled;
    seat.draggable = !hideRoles;
    seat.dataset.playerId = player.id;
    seat.style.setProperty("--seat-x", `${x}%`);
    seat.style.setProperty("--seat-y", `${y}%`);
    seat.innerHTML = `
      ${isTopVoted ? `<span class="vote-leader-badge">${isVoteDecision ? "決定" : topVoteFinalized ? "最多" : "暫定"} ${voteCount}票</span>` : ""}
      <strong>${escapeHtml(player.name)}</strong>
      <small>${role ? escapeHtml(role.name) : revoteTargetSelectMode ? "決戦候補" : voteAssignment ? `→ ${escapeHtml(voteAssignment.targetName)}` : hideRoles ? "" : "未配役"}</small>
      ${status ? `<span class="seat-status-badge">${status.label}</span>` : ""}
      ${seerRandomWhite ? '<span class="seat-status-badge seer-white-badge">ランダム白</span>' : ""}
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
  return state.phase === "setup" || (state.phase === "night" && state.day <= 1 && !state.actionComplete);
}

function getSeatStatus(player, actionRoleId = "") {
  if (state.exiledPlayerIds.includes(player.id)) {
    return { type: "exiled", label: `${state.exiledPlayerDays[player.id] || state.day || 1}日目 処刑` };
  }
  if (state.attackedPlayerIds.includes(player.id)) {
    return { type: "attacked", label: `${state.attackedPlayerDays[player.id] || state.day || 1}日目 襲撃` };
  }
  if (!player.alive) return { type: "dead", label: "処刑" };
  if (actionRoleId === "seer" && state.seerCheckResults[player.id]) {
    return {
      type: state.seerCheckResults[player.id] === "人狼" ? "seer-werewolf" : "seer-villager",
      label: getSeerResultLabel(state.seerCheckResults[player.id]),
    };
  }
  return null;
}

function selectVotePlayer(id) {
  if (isRevoteTargetSelectMode()) {
    selectRevoteTarget(id);
    return;
  }
  if (isRevoteAssignmentMode()) {
    toggleRevoteVoter(id);
    return;
  }
  state.voteSelectedPlayerId = state.voteSelectedPlayerId === id ? "" : id;
  renderAndStore();
}

function toggleRevoteVoter(voterId) {
  const voter = findPlayer(voterId);
  const targetId = getCurrentRevoteTargetId();
  if (!voter || !voter.alive || !targetId) return;
  if (state.revoteCandidateIds.includes(voter.id)) return;
  const existingIndex = state.voteRecords.findIndex((record) => record.voterId === voter.id);
  if (existingIndex >= 0 && state.voteRecords[existingIndex].targetId === targetId) {
    state.voteRecords.splice(existingIndex, 1);
    renumberVoteRecords();
  } else if (existingIndex >= 0) {
    state.voteRecords[existingIndex] = { ...state.voteRecords[existingIndex], targetId };
  } else {
    state.voteRecords.push({
      order: state.voteRecords.length + 1,
      voterId: voter.id,
      targetId,
    });
  }
  syncVoteCountsFromRecords();
  renderAndStore();
}

function renumberVoteRecords() {
  state.voteRecords = state.voteRecords.map((record, index) => ({ ...record, order: index + 1 }));
}

function startPleaForSelectedPlayer() {
  if (!state.voteSelectedPlayerId) return;
  confirmSelectedPlayerExile();
}

function startPleaForTarget(playerId) {
  const player = findPlayer(playerId);
  if (!player || !player.alive || !isActivePlayer(player)) return;
  pushUndoSnapshot("遺言へ");
  state.voteSelectedPlayerId = player.id;
  state.pleaTargetPlayerId = player.id;
  state.pleaSeconds = PLEA_TIMER_SECONDS;
  state.showPleaTimer = true;
  state.showVoteTable = false;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  stopTimer();
  stopTimerEndRevealCountdown();
  stopPleaTimer();
  state.pleaRunning = false;
  renderAndStore();
}

function backFromPleaTimer() {
  const targetId = state.pleaTargetPlayerId;
  resetPleaTimerState();
  state.screen = "table";
  state.phase = "vote";
  state.showVoteTable = true;
  state.voteSelectedPlayerId = targetId;
  renderAndStore();
}

function confirmPleaExile() {
  if (!state.showPleaTimer || state.pleaSeconds > 0) return;
  const targetId = state.pleaTargetPlayerId;
  resetPleaTimerState();
  state.screen = "table";
  state.phase = "vote";
  state.showVoteTable = true;
  state.voteSelectedPlayerId = targetId;
  confirmSelectedPlayerExile();
}

function confirmSelectedPlayerExile() {
  if (!state.voteSelectedPlayerId) return;
  pushUndoSnapshot("追放");
  if (!state.exiledPlayerIds.includes(state.voteSelectedPlayerId)) {
    state.exiledPlayerIds.push(state.voteSelectedPlayerId);
  }
  state.exiledPlayerDays[state.voteSelectedPlayerId] = state.day || 1;
  const player = findPlayer(state.voteSelectedPlayerId);
  if (player) player.alive = false;
  addLog(player ? `${player.name} を追放` : "追放");
  state.voteSelectedPlayerId = "";
  const result = getGameResultAfterExile();
  startNightTransition(result);
  markLatestLogRestorable();
  renderAndStore();
}

function getCurrentActionRoleId() {
  if (state.actionComplete) return "";
  return ACTION_ROLE_ORDER[state.actionRoleIndex] || "";
}

function advanceActionRole({ logComplete = true } = {}) {
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
    if (roleId === "seer" || roleId === "knight" || roleId === "werewolf") {
      startActionGateCountdown(roleId);
    }
    return;
  }
  if (!state.actionComplete) {
    stopActionGateCountdown();
    state.actionComplete = true;
    if (logComplete) addLog("夜の行動完了");
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
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionRoleIndex = Math.max(0, Math.min(ACTION_ROLE_ORDER.length - 1, state.actionRoleIndex - 1));
  resetActionSelection();
  advanceActionRole();
  prepareActionIntroForCurrentRole();
  renderAndStore();
}

function backToExileScreen() {
  const exiledPlayer = getLastExiledPlayer();
  stopActionGateCountdown();
  stopBlockedRoleCountdown();
  stopTimer();
  resetPleaTimerState();
  resetVoteSession();
  state.screen = "table";
  state.phase = "vote";
  state.timerRunning = false;
  state.timerFocus = false;
  state.showVoteTable = true;
  state.voteSelectedPlayerId = exiledPlayer?.id || "";
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  resetActionSelection();
  if (exiledPlayer) {
    state.exiledPlayerIds.pop();
    delete state.exiledPlayerDays[exiledPlayer.id];
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
  state.actionGateBaseSeconds = getRandomActionGateSeconds(roleId);
  state.actionGateSeconds = state.actionGateBaseSeconds;
  actionGateTimerId = window.setInterval(() => {
    state.actionGateSeconds = Math.max(0, state.actionGateSeconds - 1);
    if (state.actionGateSeconds === 0) {
      stopActionGateCountdown();
    }
    renderAndStore();
  }, 1000);
}

function getRandomActionGateSeconds(roleId = "") {
  const min = roleId === "medium" ? MEDIUM_GATE_MIN_SECONDS : ACTION_GATE_MIN_SECONDS;
  const max = roleId === "medium" ? MEDIUM_GATE_MAX_SECONDS : ACTION_GATE_MAX_SECONDS;
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  state.actionBlockedSeconds = getRandomActionGateSeconds(roleId);
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
  let completedLogId = "";

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
    pushUndoSnapshot("霊媒確定");
    state.actionIntroRoleId = "";
    completedLogId = addLog(formatActionLog("霊媒", "medium", player, getMediumResult(player)));
  } else if (roleId === "werewolf") {
    state.actionSelectedTargetId = player.id;
    state.actionResultVisible = false;
    renderAndStore();
    return;
  }

  state.actionRoleIndex += 1;
  state.actionIntroRoleId = "";
  resetActionSelection();
  advanceActionRole();
  if (completedLogId) markLogRestorable(completedLogId);
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
  pushUndoSnapshot("護衛確定");
  state.guardedPlayerId = player.id;
  const logId = addLog(formatActionLog("護衛", "knight", player));
  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  markLogRestorable(logId);
  renderAndStore();
}

function canSelectActionTarget(roleId, player) {
  if (!roleId || !player) return false;
  if (roleId === "medium") return true;
  if (!player.alive) return false;
  if (roleId === "seer" && player.roleId === "seer") return false;
  if (roleId === "knight" && player.roleId === "knight") return false;
  if (roleId === "knight" && player.id === state.nightStartGuardedPlayerId) return false;
  if (roleId === "werewolf" && !state.allowWerewolfSelfAttack && player.roleId === "werewolf") return false;
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
  pushUndoSnapshot("襲撃確定");
  resolveNightAttack(player);
}

function handleWerewolfSkip() {
  if (!isActionGateReady("werewolf")) return;
  pushUndoSnapshot("襲撃なし");
  resolveNightAttack();
}

function resolveNightAttack(player = null) {
  const actorNames = getActionActorNames("werewolf");
  const attackSucceeded = Boolean(player) && state.guardedPlayerId !== player.id;
  if (!player) {
    addLog(`襲撃なし: ${actorNames}`);
  } else if (state.guardedPlayerId === player.id) {
    addLog(`襲撃失敗: ${actorNames} → ${player.name}`);
  } else {
    player.alive = false;
    if (!state.attackedPlayerIds.includes(player.id)) {
      state.attackedPlayerIds.push(player.id);
    }
    state.attackedPlayerDays[player.id] = state.day || 1;
    addLog(`襲撃成功: ${actorNames} → ${player.name}`);
  }
  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  finishNightActions({ attackResult: { targetId: player?.id || "", succeeded: attackSucceeded } });
  markLatestLogRestorable();
  renderAndStore();
}

function finishNightActions({ attackResult = null } = {}) {
  const result = getGameResult();
  if (attackResult) {
    showAttackResultScreen(attackResult, result);
    return;
  }
  if (result.ended) {
    finalizeGameWinner(result.winner);
  } else {
    enterDayAfterNight();
  }
  renderAndStore();
}

function showAttackResultScreen(attackResult, gameResult) {
  state.lastGuardedPlayerId = state.guardedPlayerId || state.lastGuardedPlayerId;
  state.showAttackResult = true;
  state.attackResultTargetId = attackResult.targetId || "";
  state.attackResultSucceeded = attackResult.succeeded === true;
  state.attackResultWinner = gameResult.ended ? gameResult.winner : "";
  state.attackResultStage = ATTACK_RESULT_STAGE_NIGHT_COMPLETE;
  state.attackResultPauseSeconds = ATTACK_RESULT_PAUSE_SECONDS;
  state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
  state.attackResultOkSeconds = ATTACK_RESULT_OK_DELAY_SECONDS;
  state.screen = "table";
  state.phase = "night";
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  stopAllLiveTimers();
  renderAndStore();
}

function completeAttackResult() {
  if (!state.showAttackResult) return;
  if (state.attackResultStage === ATTACK_RESULT_STAGE_NIGHT_COMPLETE) {
    state.attackResultStage = ATTACK_RESULT_STAGE_NIGHT_WAIT;
    state.attackResultPauseSeconds = ATTACK_RESULT_PAUSE_SECONDS;
    startAttackResultRevealTimer();
    renderAndStore();
    return;
  }
  if (state.attackResultStage !== ATTACK_RESULT_STAGE_READY) return;
  if (state.attackResultOkSeconds > 0) return;
  const winner = state.attackResultWinner;
  resetAttackResultState();
  if (winner) {
    finalizeGameWinner(winner);
    renderAndStore();
    return;
  }
  enterDayAfterNight();
  renderAndStore();
}

function enterDayAfterNight() {
  state.lastGuardedPlayerId = state.guardedPlayerId || state.lastGuardedPlayerId;
  state.screen = "table";
  state.phase = "day";
  state.day += 1;
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  resetTimerValue(300);
  addLog(`${state.day}日目の昼へ`);
  markLatestLogRestorable();
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
  pushUndoSnapshot("占い確定");
  const result = getDivinationResult(player);
  state.seerCheckResults[player.id] = result;
  const logId = addLog(formatActionLog("占い", "seer", player, result));
  state.actionRoleIndex += 1;
  resetActionSelection();
  advanceActionRole();
  markLogRestorable(logId);
  renderAndStore();
}

function backActionSelection() {
  const roleId = getCurrentActionRoleId();
  if (roleId !== "seer" && roleId !== "knight") {
    stopActionGateCountdown();
    state.actionGateRoleId = "";
    state.actionGateSeconds = 0;
    state.actionGateBaseSeconds = 0;
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
  return player.roleId === "werewolf" ? "人狼" : "市民";
}

function getMediumResult(player) {
  return player.roleId === "werewolf" ? "人狼" : "市民";
}

function getSeerResultLabel(result) {
  return result === "人狼" ? "人狼" : "市民";
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
    return { ended: true, winner: "市民陣営" };
  }
  if (werewolfCount >= villageCount) {
    return { ended: true, winner: "人狼陣営" };
  }
  return { ended: false, winner: "" };
}

function getGameResultAfterExile() {
  const result = getGameResult();
  if (result.ended || !isForcedWerewolfWinNextNight()) return result;
  return { ended: true, winner: "人狼陣営" };
}

function isForcedWerewolfWinNextNight() {
  if (state.allowWerewolfSkipAttack || state.allowWerewolfSelfAttack) return false;

  const livingPlayers = getLivingPlayers();
  const attackTargets = livingPlayers.filter((player) => player.roleId !== "werewolf");
  if (!attackTargets.length) return false;

  const hasLivingKnight = livingPlayers.some((player) => player.roleId === "knight");
  const guardTargets = hasLivingKnight
    ? livingPlayers.filter((player) => player.roleId !== "knight" && player.id !== state.lastGuardedPlayerId)
    : [null];
  const possibleGuardTargets = guardTargets.length ? guardTargets : [null];

  return attackTargets.every((attackTarget) =>
    possibleGuardTargets.every((guardTarget) => {
      if (guardTarget?.id === attackTarget.id) return false;
      return getGameResultAfterHypotheticalDeath(livingPlayers, attackTarget.id).winner === "人狼陣営";
    }),
  );
}

function getGameResultAfterHypotheticalDeath(livingPlayers, playerId) {
  const survivors = livingPlayers.filter((player) => player.id !== playerId);
  const werewolfCount = survivors.filter((player) => player.roleId === "werewolf").length;
  const villageCount = survivors.length - werewolfCount;
  if (werewolfCount === 0) return { ended: true, winner: "市民陣営" };
  if (werewolfCount >= villageCount) return { ended: true, winner: "人狼陣営" };
  return { ended: false, winner: "" };
}

function setGameWinner(winner) {
  state.gameWinner = winner;
  state.victoryShownAt = 0;
  state.victoryRevealStage = "announcement";
  state.victoryRevealSeconds = VICTORY_REVEAL_STEP_SECONDS;
  state.victoryDismissed = false;
  victorySoundPlayed = false;
  startVictoryRevealTimer();
}

function clearGameWinner() {
  stopVictoryRevealTimer();
  state.gameWinner = "";
  state.victoryShownAt = 0;
  state.victoryRevealStage = "announcement";
  state.victoryRevealSeconds = VICTORY_REVEAL_STEP_SECONDS;
  state.victoryDismissed = false;
  victorySoundPlayed = false;
}

function dismissVictoryFullscreen() {
  stopVictoryRevealTimer();
  state.victoryDismissed = true;
  state.screen = "deal";
  state.phase = "day";
  state.showVoteTable = false;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  stopTimer();
  stopTimerEndRevealCountdown();
  renderAndStore();
}

function prepareNextMatch() {
  if (!state.gameWinner) return;
  if (!confirm("振り返りを終了して、次の試合を準備しますか？")) return;

  archiveCurrentMatch();
  stopAllLiveTimers();
  resetNightTransitionState();
  resetAttackResultState();
  resetPleaTimerState();
  resetVoteSession();
  const nextMatchNumber = state.matchNumber > 0 ? Math.min(999, state.matchNumber + 1) : 0;

  beginNewMatch({ createId: false });
  clearGameWinner();
  state.screen = "setup";
  state.phase = "setup";
  state.day = 0;
  state.matchNumber = nextMatchNumber;
  state.timerSeconds = 300;
  state.timerBase = 300;
  state.timerRunning = false;
  state.timerFocus = false;
  state.timerEndRevealSeconds = 0;
  state.timerResetCount = 0;
  state.showVoteTable = false;
  state.voteSelectedPlayerId = "";
  state.exiledPlayerIds = [];
  state.attackedPlayerIds = [];
  state.exiledPlayerDays = {};
  state.attackedPlayerDays = {};
  state.roleDealQueue = [];
  state.roleDealIndex = 0;
  state.roleDealSelectedPlayerIds = [];
  state.seerBlinkPlayerId = "";
  state.seerCheckResults = {};
  state.actionRoleIndex = ACTION_ROLE_ORDER.length;
  state.actionComplete = false;
  state.actionIntroRoleId = "";
  state.actionGateRoleId = "";
  state.actionGateSeconds = 0;
  state.actionGateBaseSeconds = 0;
  state.actionBlockedRoleId = "";
  state.actionBlockedSeconds = 0;
  state.guardedPlayerId = "";
  state.lastGuardedPlayerId = "";
  state.nightStartGuardedPlayerId = "";
  state.participationCountedForDeal = false;
  state.undoHistory = [];
  state.players.forEach((player) => {
    player.roleId = "";
    player.alive = true;
  });
  resetActionSelection();
  renderAndStore();
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
  return isSeerRandomWhiteTarget(player);
}

function isSeerRandomWhiteTarget(player) {
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
    els.voteBoard.innerHTML = '<div class="vote-empty">票なし</div>';
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
  const selectedMatch = getSelectedLogMatch();
  const visibleHistory = state.matchHistory.filter((match) => match.id !== state.currentMatchId);
  const selectors = document.createElement("div");
  selectors.className = "match-log-selector";
  selectors.innerHTML = `
    <p class="match-log-heading">現在の試合</p>
    ${getMatchLogSelectorHtml({ id: "current", status: state.currentMatchArchived ? "finished" : "current", winner: state.gameWinner, tournamentName: state.tournamentName, tournamentDate: state.tournamentDate, matchNumber: state.matchNumber, playerNames: getActivePlayers().map((player) => player.name), savedAt: state.currentMatchStartedAt }, selectedMatch.id === "current")}
    <p class="match-log-heading">保存済み試合</p>
    ${visibleHistory.length ? visibleHistory.map((match) => getMatchLogSelectorHtml(match, selectedMatch.id === match.id)).join("") : '<p class="match-log-empty">保存済みの試合はありません</p>'}
  `;
  els.logList.appendChild(selectors);

  const logContent = document.createElement("div");
  logContent.className = "match-log-content";
  const groups = groupLogsByDay(selectedMatch.logs.slice(0, 80));
  const currentMatchSelected = selectedMatch.id === "current";
  const hasRestorableLog = currentMatchSelected && state.logs.slice(0, 80).some((log) => state.logRestorePoints?.[log.id]);
  if (currentMatchSelected && state.logs.length && !hasRestorableLog) {
    const notice = document.createElement("div");
    notice.className = "log-restore-notice";
    notice.textContent = "この表示中のログには復元ポイントがありません。新しく発生した進行ログから「ここへ戻る」が表示されます。";
    logContent.appendChild(notice);
  }
  groups.forEach((group) => {
    const block = document.createElement("section");
    block.className = "log-day-block";
    block.innerHTML = `
      <h3>${escapeHtml(group.label)}</h3>
      <div class="log-day-entries">
        ${group.logs
          .map((log) => getLogLineHtml(log, currentMatchSelected))
          .join("")}
      </div>
    `;
    logContent.appendChild(block);
  });
  if (!groups.length) logContent.innerHTML = '<p class="match-log-empty">ログはまだありません</p>';
  els.logList.appendChild(logContent);
  els.logList.querySelectorAll("[data-restore-log-id]").forEach((button) => {
    button.addEventListener("click", () => restoreToLogPoint(button.dataset.restoreLogId));
  });
  els.logList.querySelectorAll("[data-select-log-match]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLogMatchId = button.dataset.selectLogMatch;
      renderAndStore();
    });
  });
  els.logList.querySelectorAll("[data-delete-log-match]").forEach((button) => {
    button.addEventListener("click", () => deleteSavedMatch(button.dataset.deleteLogMatch));
  });
}

function getMatchLogSelectorHtml(match, selected) {
  const summary = getMatchLogSummary(match);
  const deleteButton = match.id === "current" ? "" : `<button class="icon-button match-log-delete" type="button" data-delete-log-match="${escapeHtml(match.id)}" aria-label="この試合を削除" title="削除">×</button>`;
  return `<div class="match-log-row ${selected ? "selected" : ""}"><button class="match-log-select" type="button" data-select-log-match="${escapeHtml(match.id)}"><strong class="match-log-primary">${escapeHtml(summary.title)}</strong>${summary.status ? `<span class="match-log-status">${escapeHtml(summary.status)}</span>` : ""}${summary.meta ? `<small class="match-log-meta">${escapeHtml(summary.meta)}</small>` : ""}</button>${deleteButton}</div>`;
}

function getMatchLogSummary(match) {
  const savedAt = match.savedAt || match.startedAt;
  const date = savedAt ? formatSyncTime(savedAt) : "日時不明";
  const people = Array.isArray(match.playerNames) ? `${match.playerNames.length}人` : "";
  const matchLabel = getMatchNumberLabel(match);
  const status = match.status === "current"
    ? "進行中"
    : match.status === "interrupted"
      ? "中断した試合"
      : match.winner
        ? `${match.winner}の勝利`
        : "終了した試合";
  const title = [match.tournamentName, matchLabel].filter(Boolean).join("　") || status;
  const meta = [formatMatchDate(match.tournamentDate), match.status === "current" ? "" : date, people].filter(Boolean).join("・");
  return { title, status: title === status ? "" : status, meta: meta || (match.status === "current" ? "新しい試合" : "") };
}

function getMatchNumberLabel(match) {
  const number = Number(match.matchNumber);
  return Number.isInteger(number) && number > 0 ? `第${number}試合` : "";
}

function formatMatchDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.replaceAll("-", "/") : "";
}

function getSelectedLogMatch() {
  if (state.selectedLogMatchId !== "current") {
    const historyMatch = state.matchHistory.find((match) => match.id === state.selectedLogMatchId);
    if (historyMatch) return historyMatch;
  }
  return {
    id: "current",
    status: state.currentMatchArchived ? "finished" : "current",
    winner: state.gameWinner,
    tournamentName: state.tournamentName,
    tournamentDate: state.tournamentDate,
    matchNumber: state.matchNumber,
    playerNames: getActivePlayers().map((player) => player.name),
    logs: state.logs,
  };
}

function deleteSavedMatch(matchId) {
  const match = state.matchHistory.find((item) => item.id === matchId);
  if (!match || !confirm("この試合のログを削除しますか？")) return;
  state.matchHistory = state.matchHistory.filter((item) => item.id !== matchId);
  state.selectedLogMatchId = "current";
  markLargeStateDirty();
  renderAndStore();
}

function getLogLineHtml(log, allowRestore = false) {
  const tag = allowRestore && state.logRestorePoints?.[log.id] ? "button" : "div";
  const restoreAttr = tag === "button" ? ` type="button" data-restore-log-id="${escapeHtml(log.id)}" aria-label="${escapeHtml(log.text)}まで戻る"` : "";
  const className = tag === "button" ? "log-line log-line-restorable" : "log-line";
  const restoreBadge = tag === "button" ? '<small class="log-restore-badge">ここへ戻る</small>' : "";
  return `<${tag} class="${className}"${restoreAttr}><time>${escapeHtml(log.time)}</time><span>${escapeHtml(log.text)}</span>${restoreBadge}</${tag}>`;
}

function groupLogsByDay(logs) {
  const groups = [];
  let currentGroup = { label: "準備", logs: [] };
  let pendingLabel = "";
  logs
    .slice()
    .reverse()
    .forEach((log) => {
      const explicitLabel = getExplicitLogDayLabel(log.text);
      const label = explicitLabel || pendingLabel;
      if (label && label !== currentGroup.label) {
        if (currentGroup.logs.length) groups.push(currentGroup);
        currentGroup = { label, logs: [] };
      }
      currentGroup.logs.push(log);
      if (isExileLogText(log.text)) {
        pendingLabel = getNextLogDayLabel(currentGroup.label);
      } else if (explicitLabel) {
        pendingLabel = "";
      }
    });
  if (currentGroup.logs.length) groups.push(currentGroup);
  return groups.reverse().map((group) => ({ ...group, logs: group.logs.reverse() }));
}

function getExplicitLogDayLabel(text) {
  const dayMatch = text.match(/(\d+)日目/);
  if (dayMatch) return `${dayMatch[1]}日目`;
  if (text.includes("初日")) return "1日目";
  return "";
}

function getNextLogDayLabel(label) {
  const match = String(label).match(/(\d+)日目/);
  if (!match) return "";
  return `${Number(match[1]) + 1}日目`;
}

function isExileLogText(text) {
  return text === "追放" || / を追放$/.test(text);
}

function revealRole(player) {
  const role = getRole(player.roleId);
  els.roleDialogName.textContent = player.name;
  els.roleDialogRole.textContent = role ? role.name : "未配役";
  els.roleDialogTeam.textContent = role ? role.team : "";
  els.roleDialog.showModal();
  window.requestAnimationFrame(fitSingleLineNames);
}

function addLog(text) {
  const id = `log-${state.nextLogId++}`;
  state.logs.unshift({
    id,
    time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    text,
  });
  return id;
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

function formatTimerDisplay(seconds) {
  const safeSeconds = Math.max(0, seconds);
  if (!state.timerRunning && safeSeconds === state.timerBase) {
    return String(Math.max(1, Math.ceil(safeSeconds / 60)));
  }
  if (safeSeconds === 30 || safeSeconds === 20) return String(safeSeconds);
  if (safeSeconds <= 10) return String(safeSeconds);
  if (safeSeconds > 0 && safeSeconds % 60 === 0) {
    return String(safeSeconds / 60);
  }
  return "";
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
    syncAuthReady = true;
    syncMeta.status = "unconfigured";
    renderSyncStatus();
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    renderSyncStatus();
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    syncAuthReady = true;
    syncUser = data.session?.user || null;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      syncAuthReady = true;
      syncUser = session?.user || null;
      pendingCloudRecord = null;
      renderSyncStatus();
      if (syncUser) synchronizeNow({ initial: true });
    });
    renderSyncStatus();
    if (syncUser) synchronizeNow({ initial: true });
  } catch (error) {
    syncAuthReady = true;
    syncUser = null;
    setSyncError(formatSyncError(error, "同期初期化"));
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (!ensureSyncConfigured()) return;
  setSyncBusy("ログイン中");
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: els.loginEmailInput.value.trim(),
      password: els.loginPasswordInput.value,
    });
    if (error) return setSyncError(toJapaneseAuthError(error.message));
    els.loginForm.reset();
  } catch (error) {
    setSyncError(formatSyncError(error, "ログイン"));
  }
}

async function handleSignup(event) {
  event.preventDefault();
  if (!ensureSyncConfigured()) return;
  setSyncBusy("登録中");
  try {
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
  } catch (error) {
    setSyncError(formatSyncError(error, "登録"));
  }
}

function formatCurrentGameLogForCopy() {
  return formatGameLogForCopy(state.logs, state.gameWinner, {
    tournamentName: state.tournamentName,
    tournamentDate: state.tournamentDate,
    matchNumber: state.matchNumber,
  });
}

function formatGameLogForCopy(logs, fallbackWinner = "", match = {}) {
  const copyExcludedTexts = new Set(["ログをコピーした", "コピーできなかった", "保存した"]);
  const latestStartIndex = logs.findIndex((log) => log.text === "配役完了。1日目の夜へ");
  const sourceLogs = latestStartIndex >= 0 ? logs.slice(0, latestStartIndex + 1) : logs;
  const entries = sourceLogs.filter((log) => !copyExcludedTexts.has(log.text)).reverse();
  const lines = ["【人狼GMログ】"];
  if (match.tournamentName) lines.push(`大会: ${match.tournamentName}`);
  if (formatMatchDate(match.tournamentDate)) lines.push(`開催日: ${formatMatchDate(match.tournamentDate)}`);
  if (getMatchNumberLabel(match)) lines.push(getMatchNumberLabel(match));
  const winner = getWinnerFromLogs(entries, fallbackWinner);

  if (winner) {
    lines.push(`結果: ${winner}の勝利`);
  }

  let currentSection = "";
  let pendingSection = "";
  entries.forEach((log) => {
    const explicitSection = getExplicitLogSection(log.text, currentSection);
    const section = explicitSection || pendingSection || currentSection;
    if (section && section !== currentSection) {
      lines.push("", `■ ${section}`);
      currentSection = section;
    }
    lines.push(log.text);
    if (isExileLogText(log.text)) {
      pendingSection = getNextNightLogSection(currentSection);
    } else if (explicitSection) {
      pendingSection = "";
    }
  });

  return lines.join("\n").trim();
}

function getWinnerFromLogs(entries, fallbackWinner = "") {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const match = entries[index].text.match(/^ゲーム終了: (.+)の勝利$/);
    if (match) return match[1];
  }
  return fallbackWinner || "";
}

function getExplicitLogSection(text, currentSection) {
  let match = text.match(/^配役完了。(\d+)日目の夜へ$/) || text.match(/^(\d+)日目の夜へ$/);
  if (match) return `${match[1]}日目 夜`;

  match = text.match(/^(\d+)日目の昼へ$/);
  if (match) return `${match[1]}日目 昼`;

  if (text === "進行開始") return currentSection || "1日目 夜";
  return "";
}

function getNextNightLogSection(section) {
  const match = String(section).match(/(\d+)日目/);
  if (!match) return "";
  return `${Number(match[1]) + 1}日目 夜`;
}

async function handleLogout() {
  if (!ensureSyncConfigured()) return;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) return setSyncError(error.message);
    syncUser = null;
    syncMeta.status = "local";
    saveSyncMeta();
    renderSyncStatus();
  } catch (error) {
    setSyncError(formatSyncError(error, "ログアウト"));
  }
}

async function synchronizeNow({ initial = false, manual = false } = {}) {
  try {
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
      await resolveByNewestRecord(cloudRecord);
      return;
    }
    if (cloudIsNew && cloudRecord.updated_by_device !== deviceId) {
      await resolveByNewestRecord(cloudRecord);
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
  } catch (error) {
    setSyncError(formatSyncError(error, "同期"));
  }
}

async function fetchCloudRecord() {
  try {
    const { data, error } = await supabaseClient
      .from("gm_user_states")
      .select("payload, updated_at, updated_by_device")
      .eq("user_id", syncUser.id)
      .maybeSingle();
    if (error) {
      setSyncError(formatSyncError(error, "クラウド取得"));
      return undefined;
    }
    return data || null;
  } catch (error) {
    setSyncError(formatSyncError(error, "クラウド取得"));
    return undefined;
  }
}

async function uploadLocalState() {
  if (!supabaseClient || !syncUser || !navigator.onLine) return;
  setSyncBusy("アップロード中");
  try {
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabaseClient
      .from("gm_user_states")
      .upsert({
        user_id: syncUser.id,
        payload: getCloudStatePayload(),
        updated_at: updatedAt,
        updated_by_device: deviceId,
      }, { onConflict: "user_id" })
      .select("updated_at, updated_by_device")
      .single();
    if (error) return setSyncError(formatSyncError(error, "アップロード"));
    pendingCloudRecord = null;
    syncMeta.dirty = false;
    syncMeta.status = "synced";
    syncMeta.lastCloudUpdatedAt = data.updated_at || updatedAt;
    syncMeta.lastSyncedAt = new Date().toISOString();
    saveSyncMeta();
    renderSyncStatus();
  } catch (error) {
    setSyncError(formatSyncError(error, "アップロード"));
  }
}

async function downloadPendingCloudState() {
  try {
    if (!pendingCloudRecord) {
      const record = await fetchCloudRecord();
      if (!record) return;
      pendingCloudRecord = record;
    }
    await applyCloudRecord(pendingCloudRecord);
  } catch (error) {
    setSyncError(formatSyncError(error, "クラウド取得"));
  }
}

async function applyCloudRecord(record) {
  if (!record?.payload) return;
  applyingCloudState = true;
  try {
    stopAllLiveTimers();
    applySavedState(record.payload, { resetActionScreen: true });
    store({ markDirty: false });
  } finally {
    applyingCloudState = false;
  }
  pendingCloudRecord = null;
  hadLocalDataAtStartup = true;
  syncMeta.dirty = false;
  syncMeta.status = "synced";
  syncMeta.localUpdatedAt = record.updated_at || new Date().toISOString();
  syncMeta.lastCloudUpdatedAt = record.updated_at || "";
  syncMeta.lastSyncedAt = new Date().toISOString();
  saveSyncMeta();
  render();
  resumeNightTransitionTimer();
  resumeAttackResultRevealTimer();
  resumeVictoryRevealTimer();
  resumeTimerEndRevealCountdown();
}

async function resolveByNewestRecord(record) {
  if (!record?.payload) return;
  const cloudTime = toTimestamp(record.updated_at);
  const localTime = toTimestamp(syncMeta.localUpdatedAt);
  if (cloudTime && localTime) {
    if (cloudTime > localTime) {
      await applyCloudRecord(record);
      return;
    }
    if (localTime > cloudTime) {
      await uploadLocalState();
      return;
    }
  }
  if (!syncMeta.dirty && cloudTime) {
    await applyCloudRecord(record);
    return;
  }
  if (syncMeta.dirty && localTime && !cloudTime) {
    await uploadLocalState();
    return;
  }
  showCloudConflict(record);
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
  const authChecking = configured && !syncAuthReady;
  const shouldOpen =
    !configured ||
    (!signedIn && !authChecking) ||
    Boolean(pendingCloudRecord) ||
    ["error", "remote", "conflict", "unconfigured"].includes(syncMeta.status);
  els.syncPanel.open = shouldOpen;
  els.syncConfigNotice.hidden = configured;
  els.syncSignedOutPanel.hidden = signedIn || !configured || authChecking;
  els.syncSignedInPanel.hidden = !signedIn;
  els.syncAccountEmail.textContent = syncUser?.email || "-";
  els.lastSyncText.textContent = formatSyncTime(syncMeta.lastSyncedAt) || "未同期";
  els.downloadCloudBtn.hidden = !pendingCloudRecord;
  els.uploadLocalBtn.hidden = !pendingCloudRecord;
  els.manualSyncBtn.disabled = !signedIn || authChecking || syncMeta.status === "syncing";
  const statusMap = {
    unconfigured: ["未設定", "同期設定を確認してください"],
    local: ["端末内", signedIn ? "未同期の変更があります" : "端末内に保存中"],
    offline: ["オフライン", "通信復帰後に同期します"],
    syncing: ["同期中", syncMeta.error || "同期中"],
    synced: ["同期済み", "クラウドと同期されています"],
    remote: ["更新あり", "クラウド側が新しいため取得できます"],
    conflict: ["競合", "残すデータを選択してください"],
    error: ["エラー", syncMeta.error || "同期できませんでした"],
  };
  const [badge, text] = statusMap[syncMeta.status] || statusMap.local;
  els.syncStatusBadge.textContent = authChecking ? "確認中" : signedIn ? badge : configured ? "未ログイン" : "未設定";
  els.syncStatusBadge.className = `sync-status-badge status-${syncMeta.status}`;
  els.syncStatusText.textContent = authChecking ? "ログイン状態を確認中" : signedIn ? text : configured ? "ログインすると同期できます" : text;
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
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
  } catch {
    // Sync metadata is nonessential while browser storage is being recovered.
  }
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

function toTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
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

function formatSyncError(error, label) {
  const message = getErrorMessage(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `${label}: 通信に失敗しました`;
  }
  if (/jwt|token|session/i.test(message)) {
    return `${label}: ログイン状態を確認してください`;
  }
  if (/duplicate key|conflict/i.test(message)) {
    return `${label}: 同期データの更新に失敗しました`;
  }
  return `${label}: ${message}`;
}

function getErrorMessage(error) {
  if (!error) return "不明なエラー";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "不明なエラー";
  }
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

function store({ markDirty = true } = {}) {
  try {
    const payload = largeStateAvailable ? getLocalStatePayload() : getStatePayload();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Saving must never interrupt game progress.
  }
  queueLargeStateStore();
  if (markDirty && !applyingCloudState) markLocalDirty();
}

function getStatePayload({ includeUndoHistory = true, includeLogRestorePoints = true, includeMatchHistory = true } = {}) {
  const payload = {
    players: state.players,
    roles: state.roles,
    enabledRoleIds: state.enabledRoleIds,
    allowWerewolfSelfAttack: state.allowWerewolfSelfAttack,
    allowWerewolfSkipAttack: state.allowWerewolfSkipAttack,
    screen: state.screen,
    phase: state.phase,
    day: state.day,
    timerSeconds: state.timerSeconds,
    timerBase: state.timerBase,
    timerFocus: state.timerFocus,
    timerEndRevealSeconds: state.timerEndRevealSeconds,
    timerResetCount: state.timerResetCount,
    showVoteTable: state.showVoteTable,
    voteSelectedPlayerId: state.voteSelectedPlayerId,
    showPleaTimer: state.showPleaTimer,
    pleaTargetPlayerId: state.pleaTargetPlayerId,
    pleaSeconds: state.pleaSeconds,
    pleaRunning: state.pleaRunning,
    exiledPlayerIds: state.exiledPlayerIds,
    attackedPlayerIds: state.attackedPlayerIds,
    exiledPlayerDays: state.exiledPlayerDays,
    attackedPlayerDays: state.attackedPlayerDays,
    votes: state.votes,
    voteRecords: state.voteRecords,
    voteVoterId: state.voteVoterId,
    voteTargetId: state.voteTargetId,
    editingVoteRecordIndex: state.editingVoteRecordIndex,
    revoteCandidateIds: state.revoteCandidateIds,
    revoteAssignIndex: state.revoteAssignIndex,
    revoteTargetSelectMode: state.revoteTargetSelectMode,
    pendingRevotePleaCandidateIds: state.pendingRevotePleaCandidateIds,
    showRevotePleaTimer: state.showRevotePleaTimer,
    revotePleaCandidateIds: state.revotePleaCandidateIds,
    revotePleaRoundIndex: state.revotePleaRoundIndex,
    revotePleaSeconds: state.revotePleaSeconds,
    revotePleaRunning: state.revotePleaRunning,
    showNightTransition: state.showNightTransition,
    nightTransitionSeconds: state.nightTransitionSeconds,
    nightTransitionOkSeconds: state.nightTransitionOkSeconds,
    nightTransitionOutcome: state.nightTransitionOutcome,
    nightTransitionWinner: state.nightTransitionWinner,
    showAttackResult: state.showAttackResult,
    attackResultTargetId: state.attackResultTargetId,
    attackResultSucceeded: state.attackResultSucceeded,
    attackResultWinner: state.attackResultWinner,
    attackResultStage: state.attackResultStage,
    attackResultPauseSeconds: state.attackResultPauseSeconds,
    attackResultRevealSeconds: state.attackResultRevealSeconds,
    attackResultOkSeconds: state.attackResultOkSeconds,
    logs: state.logs,
    currentMatchId: state.currentMatchId,
    currentMatchStartedAt: state.currentMatchStartedAt,
    currentMatchArchived: state.currentMatchArchived,
    tournamentName: state.tournamentName,
    tournamentDate: state.tournamentDate,
    matchNumber: state.matchNumber,
    selectedLogMatchId: state.selectedLogMatchId,
    roleDealQueue: state.roleDealQueue,
    roleDealIndex: state.roleDealIndex,
    roleDealSelectedPlayerIds: state.roleDealSelectedPlayerIds,
    seerBlinkPlayerId: state.seerBlinkPlayerId,
    seerCheckResults: state.seerCheckResults,
    actionRoleIndex: state.actionRoleIndex,
    actionComplete: state.actionComplete,
    actionIntroRoleId: state.actionIntroRoleId,
    actionSelectedTargetId: state.actionSelectedTargetId,
    actionResultVisible: state.actionResultVisible,
    actionGateRoleId: state.actionGateRoleId,
    actionGateSeconds: state.actionGateSeconds,
    actionGateBaseSeconds: state.actionGateBaseSeconds,
    actionBlockedRoleId: state.actionBlockedRoleId,
    actionBlockedSeconds: state.actionBlockedSeconds,
    guardedPlayerId: state.guardedPlayerId,
    lastGuardedPlayerId: state.lastGuardedPlayerId,
    nightStartGuardedPlayerId: state.nightStartGuardedPlayerId,
    playerSortMode: state.playerSortMode,
    participationCountedForDeal: state.participationCountedForDeal,
    gameWinner: state.gameWinner,
    victoryShownAt: state.victoryShownAt,
    victoryRevealStage: state.victoryRevealStage,
    victoryRevealSeconds: state.victoryRevealSeconds,
    victoryDismissed: state.victoryDismissed,
  };
  if (includeUndoHistory) {
    payload.undoHistory = state.undoHistory.slice(0, DEBUG_HISTORY_LIMIT);
  }
  if (includeMatchHistory) {
    payload.matchHistory = state.matchHistory;
  }
  if (includeLogRestorePoints) {
    payload.logRestorePoints = state.logRestorePoints;
    payload.nextLogId = state.nextLogId;
  }
  return payload;
}

function getLocalStatePayload() {
  return getStatePayload({ includeUndoHistory: false, includeLogRestorePoints: false, includeMatchHistory: false });
}

function getCloudStatePayload() {
  return getStatePayload({ includeUndoHistory: false, includeLogRestorePoints: false });
}

function getLargeStatePayload() {
  return {
    id: LARGE_STATE_KEY,
    savedAt: Date.now(),
    currentMatchId: state.currentMatchId,
    selectedLogMatchId: state.selectedLogMatchId,
    matchHistory: state.matchHistory,
    undoHistory: state.undoHistory.slice(0, DEBUG_HISTORY_LIMIT),
    logRestorePoints: state.logRestorePoints,
    nextLogId: state.nextLogId,
  };
}

function openLargeStateDatabase() {
  if (largeStateDbPromise) return largeStateDbPromise;
  largeStateDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDBを利用できません"));
      return;
    }
    const request = window.indexedDB.open(LARGE_STATE_DB_NAME, LARGE_STATE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LARGE_STATE_STORE_NAME)) database.createObjectStore(LARGE_STATE_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDBを開けません"));
  });
  return largeStateDbPromise;
}

function readLargeState() {
  return openLargeStateDatabase().then((database) => new Promise((resolve, reject) => {
    const request = database.transaction(LARGE_STATE_STORE_NAME, "readonly").objectStore(LARGE_STATE_STORE_NAME).get(LARGE_STATE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("保存データを読み込めません"));
  }));
}

function writeLargeState(payload) {
  return openLargeStateDatabase().then((database) => new Promise((resolve, reject) => {
    const request = database.transaction(LARGE_STATE_STORE_NAME, "readwrite").objectStore(LARGE_STATE_STORE_NAME).put(payload);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("保存データを書き込めません"));
  }));
}

function queueLargeStateStore() {
  if (!largeStateAvailable) return;
  if (!largeStateDirty) return;
  largeStateDirty = false;
  const payload = getLargeStatePayload();
  largeStateSaveQueue = largeStateSaveQueue
    .catch(() => undefined)
    .then(() => writeLargeState(payload))
    .catch(() => {
      largeStateDirty = true;
      largeStateAvailable = false;
    });
}

function markLargeStateDirty() {
  largeStateDirty = true;
}

async function saveLargeStateNow() {
  if (!largeStateAvailable) return false;
  try {
    await writeLargeState(getLargeStatePayload());
    largeStateDirty = false;
    return true;
  } catch {
    largeStateAvailable = false;
    return false;
  }
}

async function restoreLargeState() {
  try {
    const saved = await readLargeState();
    if (!saved || typeof saved !== "object") return;
    state.matchHistory = mergeMatchHistory(state.matchHistory, saved.matchHistory);
    state.selectedLogMatchId = state.matchHistory.some((match) => match.id === saved.selectedLogMatchId) ? saved.selectedLogMatchId : "current";
    if (saved.currentMatchId === state.currentMatchId) {
      state.undoHistory = Array.isArray(saved.undoHistory) ? saved.undoHistory.slice(0, DEBUG_HISTORY_LIMIT) : state.undoHistory;
      state.logRestorePoints = saved.logRestorePoints && typeof saved.logRestorePoints === "object" ? saved.logRestorePoints : state.logRestorePoints;
      state.nextLogId = Number.isInteger(saved.nextLogId) ? Math.max(state.nextLogId, saved.nextLogId) : state.nextLogId;
      pruneLogRestorePoints();
    }
    markLargeStateDirty();
  } catch {
    largeStateAvailable = false;
  }
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    legacyLargeStatePendingMigration = Boolean(saved.matchHistory || saved.undoHistory || saved.logRestorePoints);
    applySavedState(saved, { resetActionScreen: true });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function applySavedState(saved, { resetActionScreen = false } = {}) {
  state.players = normalizePlayers(saved.players || []);
  state.roles = mergeRoles(saved.roles || []);
  state.enabledRoleIds = normalizeEnabledRoleIds(saved.enabledRoleIds);
  state.allowWerewolfSelfAttack = saved.allowWerewolfSelfAttack === true;
  state.allowWerewolfSkipAttack = saved.allowWerewolfSkipAttack !== false;
  state.screen = saved.screen || "setup";
  state.phase = saved.phase || "setup";
  state.day = saved.day || 0;
  state.timerSeconds = Number.isFinite(Number(saved.timerSeconds)) ? Math.max(0, Number(saved.timerSeconds)) : 300;
  state.timerBase = Number.isFinite(Number(saved.timerBase)) ? Math.max(1, Number(saved.timerBase)) : 300;
  state.timerFocus = saved.timerFocus === true;
  state.timerEndRevealSeconds = Number.isFinite(Number(saved.timerEndRevealSeconds))
    ? Math.max(0, Math.min(VOTE_START_DELAY_SECONDS, Number(saved.timerEndRevealSeconds)))
    : 0;
  state.timerResetCount = saved.timerResetCount || 0;
  state.showVoteTable = saved.showVoteTable || false;
  state.voteSelectedPlayerId = saved.voteSelectedPlayerId || "";
  state.showPleaTimer = saved.showPleaTimer === true;
  state.pleaTargetPlayerId = saved.pleaTargetPlayerId || "";
  state.pleaSeconds = Number.isFinite(Number(saved.pleaSeconds)) ? Number(saved.pleaSeconds) : PLEA_TIMER_SECONDS;
  state.pleaRunning = false;
  if (state.showPleaTimer) {
    state.screen = "table";
    state.phase = "vote";
    state.showVoteTable = false;
  }
  state.exiledPlayerIds = saved.exiledPlayerIds || [];
  state.attackedPlayerIds = saved.attackedPlayerIds || [];
  state.exiledPlayerDays = saved.exiledPlayerDays && typeof saved.exiledPlayerDays === "object" ? saved.exiledPlayerDays : {};
  state.attackedPlayerDays = saved.attackedPlayerDays && typeof saved.attackedPlayerDays === "object" ? saved.attackedPlayerDays : {};
  state.timerRunning = false;
  state.votes = saved.votes || {};
  state.voteRecords = Array.isArray(saved.voteRecords) ? saved.voteRecords : [];
  state.voteVoterId = saved.voteVoterId || "";
  state.voteTargetId = saved.voteTargetId || "";
  state.editingVoteRecordIndex = Number.isInteger(saved.editingVoteRecordIndex) ? saved.editingVoteRecordIndex : -1;
  state.revoteCandidateIds = Array.isArray(saved.revoteCandidateIds) ? saved.revoteCandidateIds : [];
  state.revoteAssignIndex = Number.isInteger(saved.revoteAssignIndex) ? saved.revoteAssignIndex : 0;
  state.revoteTargetSelectMode = saved.revoteTargetSelectMode === true;
  state.pendingRevotePleaCandidateIds = Array.isArray(saved.pendingRevotePleaCandidateIds) ? saved.pendingRevotePleaCandidateIds : [];
  state.showRevotePleaTimer = saved.showRevotePleaTimer === true;
  state.revotePleaCandidateIds = Array.isArray(saved.revotePleaCandidateIds) ? saved.revotePleaCandidateIds : [];
  state.revotePleaRoundIndex = Number.isInteger(saved.revotePleaRoundIndex) ? saved.revotePleaRoundIndex : 0;
  state.revotePleaSeconds = Number.isFinite(Number(saved.revotePleaSeconds)) ? Number(saved.revotePleaSeconds) : PLEA_TIMER_SECONDS;
  state.revotePleaRunning = false;
  if (state.revotePleaCandidateIds.length) {
    state.revotePleaRoundIndex = Math.max(0, Math.min(state.revotePleaRoundIndex, state.revotePleaCandidateIds.length - 1));
  } else {
    state.revotePleaRoundIndex = 0;
  }
  if (state.showRevotePleaTimer) {
    state.screen = "table";
    state.phase = "vote";
    state.showVoteTable = false;
  }
  state.showNightTransition = saved.showNightTransition === true;
  state.nightTransitionSeconds = Number.isFinite(Number(saved.nightTransitionSeconds)) ? Number(saved.nightTransitionSeconds) : NIGHT_TRANSITION_MIN_SECONDS;
  state.nightTransitionOkSeconds = Number.isFinite(Number(saved.nightTransitionOkSeconds))
    ? Math.max(0, Math.min(NIGHT_TRANSITION_OK_DELAY_SECONDS, Number(saved.nightTransitionOkSeconds)))
    : state.nightTransitionSeconds > 0
      ? NIGHT_TRANSITION_OK_DELAY_SECONDS
      : 0;
  state.nightTransitionOutcome = saved.nightTransitionOutcome === "victory" ? "victory" : "night";
  state.nightTransitionWinner = normalizeVillageTeam(saved.nightTransitionWinner || "");
  if (state.showNightTransition) {
    state.screen = "table";
    state.phase = "vote";
    state.showVoteTable = false;
    state.nightTransitionSeconds = Math.max(0, Math.min(NIGHT_TRANSITION_MAX_SECONDS, state.nightTransitionSeconds));
  } else {
    state.nightTransitionOkSeconds = NIGHT_TRANSITION_OK_DELAY_SECONDS;
  }
  state.showAttackResult = saved.showAttackResult === true;
  state.attackResultTargetId = saved.attackResultTargetId || "";
  state.attackResultSucceeded = saved.attackResultSucceeded === true;
  state.attackResultWinner = saved.attackResultWinner || "";
  state.attackResultStage = [
    ATTACK_RESULT_STAGE_NIGHT_COMPLETE,
    ATTACK_RESULT_STAGE_NIGHT_WAIT,
    ATTACK_RESULT_STAGE_DAWN,
    ATTACK_RESULT_STAGE_RESULT,
    ATTACK_RESULT_STAGE_READY,
  ].includes(saved.attackResultStage)
    ? saved.attackResultStage
    : ATTACK_RESULT_STAGE_READY;
  state.attackResultPauseSeconds = Number.isFinite(Number(saved.attackResultPauseSeconds))
    ? Math.max(0, Math.min(ATTACK_RESULT_PAUSE_SECONDS, Number(saved.attackResultPauseSeconds)))
    : ATTACK_RESULT_PAUSE_SECONDS;
  state.attackResultRevealSeconds = Number.isFinite(Number(saved.attackResultRevealSeconds))
    ? Math.max(0, Math.min(ATTACK_RESULT_REVEAL_SECONDS, Number(saved.attackResultRevealSeconds)))
    : ATTACK_RESULT_REVEAL_SECONDS;
  state.attackResultOkSeconds = Number.isFinite(Number(saved.attackResultOkSeconds))
    ? Math.max(0, Math.min(ATTACK_RESULT_OK_DELAY_SECONDS, Number(saved.attackResultOkSeconds)))
    : state.attackResultStage === ATTACK_RESULT_STAGE_READY
      ? ATTACK_RESULT_OK_DELAY_SECONDS
      : 0;
  if (state.showAttackResult) {
    state.screen = "table";
    state.phase = "night";
    state.showVoteTable = false;
  } else {
    state.attackResultStage = ATTACK_RESULT_STAGE_NIGHT_COMPLETE;
    state.attackResultPauseSeconds = ATTACK_RESULT_PAUSE_SECONDS;
    state.attackResultRevealSeconds = ATTACK_RESULT_REVEAL_SECONDS;
    state.attackResultOkSeconds = ATTACK_RESULT_OK_DELAY_SECONDS;
  }
  if (state.revoteCandidateIds.length > 1) {
    state.revoteAssignIndex = Math.max(0, Math.min(state.revoteAssignIndex, state.revoteCandidateIds.length - 2));
    state.revoteTargetSelectMode = state.revoteTargetSelectMode === true;
  } else {
    state.revoteAssignIndex = 0;
    state.revoteTargetSelectMode = false;
  }
  if (state.voteRecords.length) syncVoteCountsFromRecords();
  state.logs = normalizeLogs(saved.logs || []);
  state.nextLogId = Number.isInteger(saved.nextLogId) ? Math.max(saved.nextLogId, getNextLogIdFromLogs(state.logs)) : getNextLogIdFromLogs(state.logs);
  state.logRestorePoints = saved.logRestorePoints && typeof saved.logRestorePoints === "object" ? saved.logRestorePoints : {};
  state.matchHistory = normalizeMatchHistory(saved.matchHistory || []);
  state.currentMatchId = saved.currentMatchId || (state.logs.length ? `match-${crypto.randomUUID()}` : "");
  state.currentMatchStartedAt = Number.isFinite(Number(saved.currentMatchStartedAt)) ? Number(saved.currentMatchStartedAt) : state.logs.length ? Date.now() : 0;
  state.currentMatchArchived = saved.currentMatchArchived === true;
  state.tournamentName = String(saved.tournamentName || "").trim().slice(0, 80);
  state.tournamentDate = /^\d{4}-\d{2}-\d{2}$/.test(saved.tournamentDate || "") ? saved.tournamentDate : "";
  state.matchNumber = Number.isInteger(Number(saved.matchNumber)) && Number(saved.matchNumber) > 0 ? Math.min(Number(saved.matchNumber), 999) : 0;
  state.selectedLogMatchId = state.matchHistory.some((match) => match.id === saved.selectedLogMatchId) ? saved.selectedLogMatchId : "current";
  pruneLogRestorePoints();
  state.roleDealQueue = saved.roleDealQueue || [];
  state.roleDealIndex = saved.roleDealIndex || 0;
  state.roleDealSelectedPlayerIds = saved.roleDealSelectedPlayerIds || (saved.roleDealSelectedPlayerId ? [saved.roleDealSelectedPlayerId] : []);
  state.seerBlinkPlayerId = saved.seerBlinkPlayerId || "";
  state.seerCheckResults = saved.seerCheckResults && typeof saved.seerCheckResults === "object" ? saved.seerCheckResults : {};
  state.actionRoleIndex = Number.isInteger(saved.actionRoleIndex) ? saved.actionRoleIndex : ACTION_ROLE_ORDER.length;
  state.actionComplete = saved.actionComplete === true;
  state.actionIntroRoleId = saved.actionIntroRoleId || "";
  state.actionSelectedTargetId = saved.actionSelectedTargetId || "";
  state.actionResultVisible = saved.actionResultVisible === true;
  state.actionGateRoleId = saved.actionGateRoleId || "";
  state.actionGateSeconds = Number.isFinite(Number(saved.actionGateSeconds)) ? Number(saved.actionGateSeconds) : 0;
  state.actionGateBaseSeconds = Number.isFinite(Number(saved.actionGateBaseSeconds)) ? Number(saved.actionGateBaseSeconds) : 0;
  state.actionBlockedRoleId = saved.actionBlockedRoleId || "";
  state.actionBlockedSeconds = Number.isFinite(Number(saved.actionBlockedSeconds)) ? Number(saved.actionBlockedSeconds) : 0;
  state.guardedPlayerId = saved.guardedPlayerId || "";
  state.lastGuardedPlayerId = saved.lastGuardedPlayerId || "";
  state.nightStartGuardedPlayerId = saved.nightStartGuardedPlayerId || state.lastGuardedPlayerId || "";
  state.playerSortMode = ["manual", "daily", "total"].includes(saved.playerSortMode) ? saved.playerSortMode : "manual";
  state.participationCountedForDeal = saved.participationCountedForDeal === true;
  state.gameWinner = normalizeVillageTeam(saved.gameWinner || "");
  state.victoryShownAt = Number.isFinite(Number(saved.victoryShownAt)) ? Number(saved.victoryShownAt) : 0;
  state.victoryRevealStage = ["announcement", "prompt", "winner"].includes(saved.victoryRevealStage) ? saved.victoryRevealStage : state.gameWinner ? "winner" : "announcement";
  state.victoryRevealSeconds = Number.isFinite(Number(saved.victoryRevealSeconds))
    ? Math.max(0, Math.min(VICTORY_REVEAL_STEP_SECONDS, Number(saved.victoryRevealSeconds)))
    : state.victoryRevealStage === "winner"
      ? 0
      : VICTORY_REVEAL_STEP_SECONDS;
  state.victoryDismissed = saved.victoryDismissed === true;
  state.undoHistory = Array.isArray(saved.undoHistory) ? saved.undoHistory.slice(0, DEBUG_HISTORY_LIMIT) : [];
  markLargeStateDirty();
  if (resetActionScreen && state.screen === "action") {
    const savedNightStartGuardedPlayerId = saved.nightStartGuardedPlayerId || "";
    state.actionRoleIndex = 0;
    state.actionComplete = false;
    state.actionIntroRoleId = "";
    state.actionGateRoleId = "";
    state.actionGateSeconds = 0;
    state.actionGateBaseSeconds = 0;
    state.actionBlockedRoleId = "";
    state.actionBlockedSeconds = 0;
    state.guardedPlayerId = "";
    state.nightStartGuardedPlayerId = savedNightStartGuardedPlayerId || state.lastGuardedPlayerId;
    state.lastGuardedPlayerId = state.nightStartGuardedPlayerId;
    resetActionSelection();
    advanceActionRole({ logComplete: false });
    prepareActionIntroForCurrentRole();
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

function normalizeLogs(logs) {
  let fallbackId = 1;
  return logs.map((log) => ({
    ...log,
    id: log.id || `legacy-log-${fallbackId++}`,
    text: String(log.text || "").replaceAll("村人", "市民"),
  }));
}

function normalizeMatchHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((match) => match && typeof match === "object" && match.id)
    .map((match) => ({
      id: String(match.id),
      startedAt: Number(match.startedAt) || 0,
      savedAt: Number(match.savedAt) || 0,
      status: match.status === "interrupted" ? "interrupted" : "finished",
      winner: normalizeVillageTeam(match.winner || ""),
      tournamentName: String(match.tournamentName || "").trim().slice(0, 80),
      tournamentDate: /^\d{4}-\d{2}-\d{2}$/.test(match.tournamentDate || "") ? match.tournamentDate : "",
      matchNumber: Number.isInteger(Number(match.matchNumber)) && Number(match.matchNumber) > 0 ? Math.min(Number(match.matchNumber), 999) : 0,
      playerNames: Array.isArray(match.playerNames) ? match.playerNames.map((name) => String(name)) : [],
      logs: normalizeLogs(Array.isArray(match.logs) ? match.logs : []),
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

function mergeMatchHistory(...histories) {
  const matchesById = new Map();
  histories.flat().forEach((match) => {
    const normalized = normalizeMatchHistory([match])[0];
    if (!normalized) return;
    const existing = matchesById.get(normalized.id);
    if (!existing || normalized.savedAt >= existing.savedAt) matchesById.set(normalized.id, normalized);
  });
  return normalizeMatchHistory([...matchesById.values()]);
}

function normalizeVillageTeam(team) {
  return team === "村人陣営" ? "市民陣営" : team;
}

function getNextLogIdFromLogs(logs) {
  const maxId = logs.reduce((max, log) => {
    const match = String(log.id || "").match(/^log-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return maxId + 1;
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

function normalizeEnabledRoleIds(roleIds) {
  const selectable = new Set(RULE_SELECTABLE_ROLE_IDS);
  const normalized = Array.isArray(roleIds) ? roleIds.filter((id) => selectable.has(id)) : [...RULE_SELECTABLE_ROLE_IDS];
  if (!normalized.includes("werewolf")) normalized.unshift("werewolf");
  return [...new Set([...normalized, "villager"])];
}

function renderAndStore() {
  render();
  store();
}

