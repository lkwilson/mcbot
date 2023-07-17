import "dotenv/config";

import mineflayer from "mineflayer";

import { pathfinder } from "mineflayer-pathfinder";

import {
  StateTransition,
  BotStateMachine,
  EntityFilters,
  BehaviorFollowEntity,
  BehaviorLookAtEntity,
  BehaviorGetClosestEntity,
  NestedStateMachine,
  StateMachineTargets,
  BehaviorIdle,
} from "mineflayer-statemachine";

// helper funcs
function error(...args: any[]): never {
  console.error(...args);
  process.exit(1);
}

const isDevelopment = process.env.IS_DEV == "yes";
function debug(...args: any[]) {
  if (isDevelopment) {
    console.debug("D:", ...args);
    // bot.chat(`D: ${args}`);
  }
}

function chat(msg: string) {
  bot.chat(msg);
  debug("B:", msg);
}

async function sleep(durMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durMs));
}

// env parsing
const username = process.env.USERNAME;
if (username == null) {
  error("USERNAME is unset in .env");
}

const host = process.env.HOST;
if (host == null) {
  error("HOST is unset in .env");
}

let port: number | undefined;
const portStr = process.env.PORT;
if (portStr !== undefined) {
  try {
    port = parseInt(portStr);
  } catch (err) {
    error("Unable to parse PORT from .env:", err);
  }
}

const bot = mineflayer.createBot({
  username,
  host,
  port,
  auth: "microsoft",
  version: "1.19.2",
});

bot.on("error", console.error);
bot.on("kicked", console.error);

bot.loadPlugin(pathfinder);

bot.once("spawn", () => {
  chat("k i'm ready");

  const targets: StateMachineTargets = {};

  const idle = new BehaviorIdle();

  function buildPlayerFollowState() {
    const followPlayer = new BehaviorFollowEntity(bot, targets);
    followPlayer.movements.canDig = false;
    followPlayer.movements.allow1by1towers = false;
    followPlayer.movements.allowFreeMotion = true;

    const lookAtPlayer = new BehaviorLookAtEntity(bot, targets);

    const followDist = 2;

    const followTransitions = [
      new StateTransition({
        parent: idle,
        child: followPlayer,
        shouldTransition: () => targets.entity != null,
      }),
      new StateTransition({
        parent: followPlayer,
        child: idle,
        shouldTransition: () => targets.entity == null,
      }),
      new StateTransition({
        parent: lookAtPlayer,
        child: idle,
        shouldTransition: () => targets.entity == null,
      }),
      new StateTransition({
        parent: followPlayer,
        child: lookAtPlayer,
        shouldTransition: () => followPlayer.distanceToTarget() < followDist,
      }),
      new StateTransition({
        parent: lookAtPlayer,
        child: followPlayer,
        shouldTransition: () => lookAtPlayer.distanceToTarget() >= followDist,
      }),
    ];

    return new NestedStateMachine(followTransitions, idle);
  }

  // nested state machines
  const followTransition = buildPlayerFollowState();

  // main state machine
  let botStateTarget: "idle" | "follow" = "idle";
  const botTransitions = [
    new StateTransition({
      parent: idle,
      child: followTransition,
      shouldTransition: () => botStateTarget == "follow",
    }),
    new StateTransition({
      parent: followTransition,
      child: idle,
      shouldTransition: () => botStateTarget != "follow",
    }),
  ];
  const botStates = new NestedStateMachine(botTransitions, idle);

  // start state machine
  new BotStateMachine(bot, botStates);

  bot.on("chat", async (username, rawMsg) => {
    if (username === bot.username) {
      return;
    }

    const cmd = rawMsg.split(" ").filter((val) => val !== "");
    if (cmd.length === 0) {
      return;
    }

    const prefixes = [bot.username, "bot"];
    if (prefixes.find((prefix) => prefix === cmd[0]) === undefined) {
      return;
    }

    if (cmd.length === 1) {
      await sleep(100);
      chat("hey");
      return;
    }

    const cmdHandlers = [
      {
        key: "bye",
        help: "I might be doing something bad so I just up and leave",
        handler() {
          botStateTarget = "idle";
        },
      },
      {
        key: "follow",
        help: "I'll start following you",
        handler() {
          const playerEntity = bot.players[username]?.entity;
          if (playerEntity == null) {
            chat("I can't seem to find you..");
            return;
          }
          targets.entity = playerEntity;
          botStateTarget = "follow";
        },
      },
      {
        key: "stop",
        help: "I'll start following you",
        handler() {
          botStateTarget = "idle";
        },
      },
      {
        key: "afk",
        help: "I'll afk where you're standing",
        handler() {},
      },
    ];
    const cmdHandler = cmdHandlers.find(
      (cmdHandler) => cmdHandler.key === cmd[1]
    );
    if (cmdHandler === undefined) {
      debug(`Unknown fullCmd: '${cmd}'`);
      await sleep(100);
      chat("?");
      await sleep(500);
      chat("I don't understand");
      return;
    }
    debug(`found fullCmd: '${cmdHandler.key}'`);
    cmdHandler.handler();
  });
});
