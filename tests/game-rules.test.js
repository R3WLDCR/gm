const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function extractFunction(name) {
  const match = appSource.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, "m"));
  assert.ok(match, `${name} was not found in app.js`);
  return match[0];
}

function runFunctions(names, context, expression) {
  const source = names.map(extractFunction).join("\n");
  const sandbox = { ...context, result: undefined };
  vm.runInNewContext(`${source}\nresult = ${expression};`, sandbox);
  return sandbox.result;
}

test("準備中は昼タブと夜タブを開けない", () => {
  const functions = ["isScreenTabDisabled"];
  const context = { state: { phase: "setup", gameWinner: "" } };
  assert.equal(runFunctions(functions, context, 'isScreenTabDisabled("table")'), true);
  assert.equal(runFunctions(functions, context, 'isScreenTabDisabled("action")'), true);
  assert.equal(runFunctions(functions, context, 'isScreenTabDisabled("setup")'), false);
  assert.equal(runFunctions(functions, context, 'isScreenTabDisabled("deal")'), false);
  assert.equal(runFunctions(functions, { state: { phase: "setup", gameWinner: "市民陣営" } }, 'isScreenTabDisabled("table")'), true);
});

test("ゲーム開始後は進行状態に応じて昼夜タブを切り替える", () => {
  const functions = ["isScreenTabDisabled"];
  assert.equal(runFunctions(functions, { state: { phase: "day", gameWinner: "" } }, 'isScreenTabDisabled("table")'), false);
  assert.equal(runFunctions(functions, { state: { phase: "day", gameWinner: "" } }, 'isScreenTabDisabled("action")'), true);
  assert.equal(runFunctions(functions, { state: { phase: "night", gameWinner: "" } }, 'isScreenTabDisabled("table")'), true);
  assert.equal(runFunctions(functions, { state: { phase: "night", gameWinner: "" } }, 'isScreenTabDisabled("action")'), false);
});

test("市民陣営は人狼が0人になると勝利する", () => {
  const players = [{ roleId: "villager", alive: true }];
  const result = runFunctions(["getGameResult"], { getActivePlayers: () => players }, "getGameResult()");
  assert.equal(result.ended, true);
  assert.equal(result.winner, "市民陣営");
});

test("人狼数が市民側以上になると人狼陣営が勝利する", () => {
  const players = [
    { roleId: "werewolf", alive: true },
    { roleId: "villager", alive: true },
  ];
  const result = runFunctions(["getGameResult"], { getActivePlayers: () => players }, "getGameResult()");
  assert.equal(result.ended, true);
  assert.equal(result.winner, "人狼陣営");
});

test("占いと霊媒は人狼だけを人狼と判定する", () => {
  const functions = ["getDivinationResult", "getMediumResult"];
  assert.equal(runFunctions(functions, {}, 'getDivinationResult({ roleId: "werewolf" })'), "人狼");
  assert.equal(runFunctions(functions, {}, 'getDivinationResult({ roleId: "madman" })'), "市民");
  assert.equal(runFunctions(functions, {}, 'getMediumResult({ roleId: "werewolf" })'), "人狼");
  assert.equal(runFunctions(functions, {}, 'getMediumResult({ roleId: "madman" })'), "市民");
});

test("連続護衛設定が前夜と同じ対象の選択可否を切り替える", () => {
  const player = { id: "A", roleId: "villager", alive: true };
  const baseState = { nightStartGuardedPlayerId: "A", allowWerewolfSelfAttack: false };
  const denied = runFunctions(
    ["canSelectActionTarget"],
    { state: { ...baseState, allowConsecutiveGuard: false }, player },
    'canSelectActionTarget("knight", player)',
  );
  const allowed = runFunctions(
    ["canSelectActionTarget"],
    { state: { ...baseState, allowConsecutiveGuard: true }, player },
    'canSelectActionTarget("knight", player)',
  );
  assert.equal(denied, false);
  assert.equal(allowed, true);
});

test("連続護衛設定を追放直後の詰み判定にも適用する", () => {
  const livingPlayers = [
    { id: "K", roleId: "knight" },
    { id: "A", roleId: "villager" },
    { id: "W", roleId: "werewolf" },
  ];
  const baseState = {
    allowWerewolfSkipAttack: false,
    allowWerewolfSelfAttack: false,
    lastGuardedPlayerId: "A",
  };
  const functions = ["getGameResultAfterHypotheticalDeath", "isForcedWerewolfWinNextNight"];
  const forced = runFunctions(
    functions,
    { state: { ...baseState, allowConsecutiveGuard: false }, getLivingPlayers: () => livingPlayers },
    "isForcedWerewolfWinNextNight()",
  );
  const avoidable = runFunctions(
    functions,
    { state: { ...baseState, allowConsecutiveGuard: true }, getLivingPlayers: () => livingPlayers },
    "isForcedWerewolfWinNextNight()",
  );
  assert.equal(forced, true);
  assert.equal(avoidable, false);
});

test("残り票で追いつけない場合だけ投票結果を決定する", () => {
  const players = ["A", "B", "C", "D"].map((id) => ({ id, alive: true, active: true }));
  const runDecision = (voteRecords, votes) =>
    runFunctions(
      ["getVoteOutcomeDecisionId"],
      {
        state: { voteRecords, votes, pendingRevotePleaCandidateIds: [] },
        syncVoteCountsFromRecords() {},
        isRevoteAssignmentMode: () => false,
        getTopVotedPlayerIds: () => {
          const max = Math.max(...Object.values(votes));
          return Object.keys(votes).filter((id) => votes[id] === max);
        },
        getLivingPlayers: () => players,
        isActivePlayer: (player) => player.active,
      },
      "getVoteOutcomeDecisionId()",
    );

  assert.equal(runDecision([{ voterId: "C" }, { voterId: "D" }, { voterId: "A" }], { A: 2, B: 1 }), "A");
  assert.equal(runDecision([{ voterId: "C" }, { voterId: "D" }], { A: 2 }), "");
  assert.equal(
    runDecision([{ voterId: "C" }, { voterId: "D" }, { voterId: "A" }, { voterId: "B" }], { A: 2, B: 2 }),
    "",
  );
});

test("画面スリープ防止は議論タイマーの動作中だけ必要とする", () => {
  const isRequired = (timerRunning, timerSeconds) =>
    runFunctions(
      ["shouldHoldScreenWakeLock"],
      { state: { timerRunning, timerSeconds } },
      "shouldHoldScreenWakeLock()",
    );

  assert.equal(isRequired(true, 300), true);
  assert.equal(isRequired(false, 300), false);
  assert.equal(isRequired(true, 0), false);
});

test("大会回数と試合番号は1から999の整数に収める", () => {
  const normalize = (value) => runFunctions(["normalizeMatchInfoNumber"], {}, `normalizeMatchInfoNumber(${JSON.stringify(value)})`);

  assert.equal(normalize(1), 1);
  assert.equal(normalize(123), 123);
  assert.equal(normalize(1000), 999);
  assert.equal(normalize(0), 0);
  assert.equal(normalize("未設定"), 0);
});

test("昼タイマーは参加人数かける40秒に最も近い分数をすすめる", () => {
  const recommend = (playerCount) =>
    runFunctions(["getRecommendedTimerMinutes"], {}, `getRecommendedTimerMinutes(${JSON.stringify(playerCount)})`);

  assert.equal(recommend(0), 0);
  assert.equal(recommend(5), 3);
  assert.equal(recommend(6), 4);
  assert.equal(recommend(7), 5);
  assert.equal(recommend(20), 9);
});

test("昼タイマーのおすすめ人数は試合途中だけ生存者数を使う", () => {
  const playerCount = (state, activeCount, livingCount) =>
    runFunctions(
      ["shouldUseLivingPlayerCountForDayTimer", "getDayTimerPlayerCount"],
      { state, getActivePlayers: () => Array(activeCount), getLivingPlayers: () => Array(livingCount) },
      "getDayTimerPlayerCount()",
    );

  assert.equal(playerCount({ day: 0, phase: "setup" }, 8, 5), 8);
  assert.equal(playerCount({ day: 3, phase: "day" }, 8, 5), 5);
});

test("昼タイマーの毎日マイナス1分は前日の設定を下限1分まで短縮する", () => {
  const nextMinutes = (mode, previousMinutes) =>
    runFunctions(
      ["getNextDayTimerMinutes"],
      {},
      `getNextDayTimerMinutes(${JSON.stringify(mode)}, ${JSON.stringify(previousMinutes)})`,
    );

  assert.equal(nextMinutes("manual", 5), 0);
  assert.equal(nextMinutes("shorten", 5), 4);
  assert.equal(nextMinutes("shorten", 1), 1);
  assert.equal(nextMinutes("shorten", 0), 0);
});

test("短縮モードを選んだ日は生存者数から次回用の基準だけを決める", () => {
  const baseline = (mode, playerCount) =>
    runFunctions(
      ["getRecommendedTimerMinutes", "getDayTimerBaselineMinutes"],
      {},
      `getDayTimerBaselineMinutes(${JSON.stringify(mode)}, ${JSON.stringify(playerCount)})`,
    );

  assert.equal(baseline("manual", 7), 0);
  assert.equal(baseline("shorten", 5), 3);
  assert.equal(baseline("shorten", 7), 5);
});

test("短縮モードへの切り替えでは当日のタイマーを変更しない", () => {
  const state = {
    dayTimerMode: "manual",
    lastDayTimerMinutes: 0,
    phase: "day",
    timerBase: 420,
    timerSeconds: 275,
    timerFocus: false,
  };
  const result = runFunctions(
    ["setDayTimerMode"],
    {
      state,
      getDayTimerBaselineMinutes: () => 3,
      getDayTimerPlayerCount: () => 5,
      renderAndStore: () => {},
    },
    "(setDayTimerMode('shorten'), ({ timerBase: state.timerBase, timerSeconds: state.timerSeconds, timerFocus: state.timerFocus, baseline: state.lastDayTimerMinutes }))",
  );

  assert.equal(result.timerBase, 420);
  assert.equal(result.timerSeconds, 275);
  assert.equal(result.timerFocus, false);
  assert.equal(result.baseline, 3);
});

test("昼移行時は短縮モードだけ次の分数を準備済みにする", () => {
  const prepare = (mode, previousMinutes) => {
    const state = { dayTimerMode: mode, lastDayTimerMinutes: previousMinutes, timerBase: 0, timerFocus: false, day: 2, phase: "day" };
    return runFunctions(
      [
        "getRecommendedTimerMinutes",
        "shouldUseLivingPlayerCountForDayTimer",
        "getDayTimerPlayerCount",
        "getDayTimerBaselineMinutes",
        "getNextDayTimerMinutes",
        "prepareDayTimerForEntry",
      ],
      {
        state,
        getActivePlayers: () => Array(8),
        getLivingPlayers: () => Array(5),
        resetTimerValue: (seconds) => {
          state.timerBase = seconds;
          state.timerFocus = false;
        },
      },
      "(prepareDayTimerForEntry(), ({ timerBase: state.timerBase, timerFocus: state.timerFocus, lastDayTimerMinutes: state.lastDayTimerMinutes }))",
    );
  };

  const shortened = prepare("shorten", 5);
  assert.equal(shortened.timerBase, 240);
  assert.equal(shortened.timerFocus, true);
  assert.equal(shortened.lastDayTimerMinutes, 4);

  const firstShortenedDay = prepare("shorten", 0);
  assert.equal(firstShortenedDay.timerBase, 300);
  assert.equal(firstShortenedDay.timerFocus, false);
  assert.equal(firstShortenedDay.lastDayTimerMinutes, 3);

  const manual = prepare("manual", 5);
  assert.equal(manual.timerBase, 300);
  assert.equal(manual.timerFocus, false);
  assert.equal(manual.lastDayTimerMinutes, 5);
});

test("死亡済み役職はカウント0かつ同じ役職のときだけOKへ進める", () => {
  const ready = (currentRoleId, blockedRoleId, seconds) =>
    runFunctions(
      ["isBlockedRoleCountdownReady"],
      { state: { actionBlockedRoleId: blockedRoleId, actionBlockedSeconds: seconds } },
      `isBlockedRoleCountdownReady(${JSON.stringify(currentRoleId)})`,
    );

  assert.equal(ready("medium", "medium", 1), false);
  assert.equal(ready("medium", "medium", 0), true);
  assert.equal(ready("seer", "medium", 0), false);
  assert.equal(ready("", "medium", 0), false);
});

test("死亡済み役職のOKで次の役職へ進む", () => {
  const state = {
    actionRoleIndex: 1,
    actionBlockedRoleId: "knight",
    actionBlockedSeconds: 0,
    actionIntroRoleId: "",
    actionSelectedTargetId: "",
    actionResultVisible: false,
  };
  let advanced = 0;
  runFunctions(
    ["isBlockedRoleCountdownReady", "confirmBlockedRoleCountdown"],
    {
      state,
      getCurrentActionRoleId: () => "knight",
      stopBlockedRoleCountdown: () => {},
      resetActionSelection: () => {
        state.actionSelectedTargetId = "";
        state.actionResultVisible = false;
      },
      advanceActionRole: () => {
        advanced += 1;
      },
      renderAndStore: () => {},
    },
    "confirmBlockedRoleCountdown()",
  );

  assert.equal(state.actionRoleIndex, 2);
  assert.equal(state.actionBlockedRoleId, "");
  assert.equal(state.actionBlockedSeconds, 0);
  assert.equal(advanced, 1);
});

test("準備ログでは個別役職の決定だけを隠す", () => {
  const state = {
    roles: [
      { id: "werewolf", name: "人狼" },
      { id: "knight", name: "ボディガード" },
    ],
  };
  const hidden = (text) =>
    runFunctions(
      ["isPreparationRoleDecisionLog"],
      { state },
      `isPreparationRoleDecisionLog(${JSON.stringify(text)})`,
    );

  assert.equal(hidden("ボディガード を決定"), true);
  assert.equal(hidden("人狼 を決定"), true);
  assert.equal(hidden("配役完了。1日目の夜へ"), false);
  assert.equal(hidden("ボディガードを護衛"), false);
});

test("準備ログでは参加者ごとの参加と休みを隠す", () => {
  const hidden = (text) =>
    runFunctions(
      ["isPreparationParticipationLog"],
      {},
      `isPreparationParticipationLog(${JSON.stringify(text)})`,
    );

  assert.equal(hidden("市民A が参加"), true);
  assert.equal(hidden("市民A は 参加"), true);
  assert.equal(hidden("市民A は 休み"), true);
  assert.equal(hidden("市民A の名前を 市民B に変更"), false);
  assert.equal(hidden("配役完了。1日目の夜へ"), false);
});

test("準備ログでは配役開始を隠す", () => {
  const hidden = (text) =>
    runFunctions(
      ["isPreparationProgressLog"],
      {},
      `isPreparationProgressLog(${JSON.stringify(text)})`,
    );

  assert.equal(hidden("配役を開始"), true);
  assert.equal(hidden("配役完了。1日目の夜へ"), false);
});

test("最終配役ログは役職ごとに名前をまとめる", () => {
  const roles = [
    { id: "werewolf", name: "人狼" },
    { id: "seer", name: "預言者" },
    { id: "villager", name: "市民" },
  ];
  const players = [
    { name: "しんたろー", roleId: "werewolf" },
    { name: "人狼B", roleId: "werewolf" },
    { name: "預言者A", roleId: "seer" },
    { name: "市民A", roleId: "villager" },
  ];
  const logs = runFunctions(
    ["getRoleAssignmentLogTexts"],
    {},
    `getRoleAssignmentLogTexts(${JSON.stringify(players)}, ${JSON.stringify(roles)})`,
  );

  assert.deepEqual(Array.from(logs), ["人狼: しんたろー、人狼B", "預言者: 預言者A", "市民: 市民A"]);
});

test("準備ログでは役職選択中の操作を隠す", () => {
  const state = { roles: [{ id: "werewolf", name: "人狼" }] };
  const hidden = (text) =>
    runFunctions(
      ["isPreparationRoleSelectionLog"],
      { state },
      `isPreparationRoleSelectionLog(${JSON.stringify(text)})`,
    );

  assert.equal(hidden("しんたろー: 人狼 を選択"), true);
  assert.equal(hidden("しんたろー: 人狼 を解除"), true);
  assert.equal(hidden("人狼へ戻る"), true);
  assert.equal(hidden("人狼: しんたろー"), false);
});

test("準備の日別ブロックは最終配役だけを残す", () => {
  const state = { roles: [{ id: "werewolf", name: "人狼" }, { id: "seer", name: "預言者" }] };
  const groups = [
    {
      label: "準備",
      logs: [
        { text: "しんたろー の名前を シンタロー に変更" },
        { text: "人狼: シンタロー" },
        { text: "預言者: 預言者A" },
      ],
    },
    { label: "1日目", logs: [{ text: "進行開始" }] },
  ];
  const filtered = runFunctions(
    ["isRoleAssignmentSummaryLog", "filterPreparationLogGroups"],
    { state },
    `filterPreparationLogGroups(${JSON.stringify(groups)})`,
  );

  assert.deepEqual(Array.from(filtered[0].logs, (log) => log.text), ["人狼: シンタロー", "預言者: 預言者A"]);
  assert.equal(filtered[1].logs[0].text, "進行開始");
});

test("ログコピーは進行前の最終配役を残す", () => {
  const state = { roles: [{ id: "werewolf", name: "人狼" }, { id: "villager", name: "市民" }] };
  const logs = [
    { text: "2日目の昼へ" },
    { text: "進行開始" },
    { text: "市民: 市民A、市民B" },
    { text: "人狼: しんたろー" },
    { text: "しんたろー: 人狼 を選択" },
  ];
  const source = runFunctions(
    ["isRoleAssignmentSummaryLog", "getCurrentMatchSourceLogs"],
    { state },
    `getCurrentMatchSourceLogs(${JSON.stringify(logs)})`,
  );

  assert.deepEqual(Array.from(source, (log) => log.text), [
    "2日目の昼へ",
    "進行開始",
    "市民: 市民A、市民B",
    "人狼: しんたろー",
  ]);
});

test("同じ日の役職結果は役職ごとに最新の1件だけ表示する", () => {
  const groups = [
    {
      label: "2日目",
      logs: [
        { text: "2日目の昼へ" },
        { text: "占い: 預言者A → 市民A = 市民" },
        { text: "護衛: 騎士A → 市民A" },
        { text: "占い: 預言者A → 市民B = 人狼" },
      ],
    },
  ];
  const filtered = runFunctions(
    ["isAttackResultLogText", "getRoleResultLogType", "filterDuplicateRoleResultGroups"],
    {},
    `filterDuplicateRoleResultGroups(${JSON.stringify(groups)})`,
  );

  assert.deepEqual(Array.from(filtered[0].logs, (log) => log.text), [
    "2日目の昼へ",
    "護衛: 騎士A → 市民A",
    "占い: 預言者A → 市民B = 人狼",
  ]);
});

test("役職結果の再実行は同じ日と役職の古いログを置き換える", () => {
  const state = {
    logs: [
      { id: "log-1", text: "占い: 預言者A → 市民A = 市民", roleResultKey: "2:seer" },
      { id: "log-0", text: "進行開始" },
    ],
    logRestorePoints: { "log-1": { screen: "action" } },
    nextLogId: 2,
  };
  const logId = runFunctions(
    ["addLog", "upsertRoleResultLog"],
    { state },
    'upsertRoleResultLog("占い: 預言者A → 市民B = 人狼", "seer", 2)',
  );

  assert.equal(logId, "log-2");
  assert.equal(state.logs.filter((log) => log.roleResultKey === "2:seer").length, 1);
  assert.equal(state.logs[0].text, "占い: 預言者A → 市民B = 人狼");
  assert.equal(state.logRestorePoints["log-1"], undefined);
});

test("ログの日別ブロックは準備の次を1日目にする", () => {
  const logs = [
    { text: "2日目の昼へ" },
    { text: "1日目の昼へ" },
    { text: "配役完了。1日目の夜へ" },
    { text: "配役を開始" },
  ];
  const groups = runFunctions(
    ["groupLogsByDay", "getExplicitLogDayLabel", "getNextLogDayLabel", "isExileLogText", "isAttackResultLogText"],
    {},
    `groupLogsByDay(${JSON.stringify(logs)})`,
  );

  assert.deepEqual(Array.from(groups, (group) => group.label), ["準備", "1日目", "2日目"]);
  assert.equal(runFunctions(["getExplicitLogDayLabel"], {}, 'getExplicitLogDayLabel("進行開始")'), "1日目");
});

test("初回の襲撃結果は2日目の朝として扱う", () => {
  assert.equal(runFunctions(["getAttackResultDay"], {}, "getAttackResultDay(1)"), 2);
  assert.equal(runFunctions(["getAttackResultDay"], {}, "getAttackResultDay(4)"), 5);

  const logs = [
    { text: "2日目の昼へ" },
    { text: "襲撃成功: 人狼A → 市民A" },
    { text: "占い: 預言者A → 市民A = 市民" },
    { text: "配役完了。1日目の夜へ" },
    { text: "配役を開始" },
  ];
  const groups = runFunctions(
    ["groupLogsByDay", "getExplicitLogDayLabel", "getNextLogDayLabel", "isExileLogText", "isAttackResultLogText"],
    {},
    `groupLogsByDay(${JSON.stringify(logs)})`,
  );
  const dayTwo = groups.find((group) => group.label === "2日目");

  assert.ok(dayTwo);
  assert.equal(dayTwo.logs.some((log) => log.text.startsWith("襲撃成功:")), true);
});

test("ログの1日は朝から夜行動完了までにする", () => {
  const logs = [
    { text: "3日目の昼へ" },
    { text: "3日目の朝 襲撃成功: 人狼A → 市民B" },
    { text: "夜の行動完了" },
    { text: "占い: 預言者A → 市民B = 人狼" },
    { text: "市民A を追放" },
    { text: "2日目の昼へ" },
    { text: "2日目の朝 襲撃成功: 人狼A → 市民A" },
    { text: "配役完了。1日目の夜へ" },
  ];
  const groups = runFunctions(
    ["groupLogsByDay", "getExplicitLogDayLabel", "getNextLogDayLabel", "isAttackResultLogText"],
    {},
    `groupLogsByDay(${JSON.stringify(logs)})`,
  );
  const dayTwo = groups.find((group) => group.label === "2日目");
  const dayThree = groups.find((group) => group.label === "3日目");

  assert.deepEqual(Array.from(dayTwo.logs, (log) => log.text), [
    "2日目の朝 襲撃成功: 人狼A → 市民A",
    "2日目の昼へ",
    "市民A を追放",
    "占い: 預言者A → 市民B = 人狼",
    "夜の行動完了",
  ]);
  assert.deepEqual(Array.from(dayThree.logs, (log) => log.text), [
    "3日目の朝 襲撃成功: 人狼A → 市民B",
    "3日目の昼へ",
  ]);
  assert.equal(runFunctions(["getSameDayNightLogSection"], {}, 'getSameDayNightLogSection("2日目 昼")'), "2日目 夜");
});
