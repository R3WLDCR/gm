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
