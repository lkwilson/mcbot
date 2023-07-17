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

  const getClosestPlayer = new BehaviorGetClosestEntity(
    bot,
    targets,
    EntityFilters().PlayersOnly
  );
  const followPlayer = new BehaviorFollowEntity(bot, targets);
  followPlayer.movements.canDig = false;
  followPlayer.movements.canOpenDoors = true;

  const lookAtPlayer = new BehaviorLookAtEntity(bot, targets);

  let followDist = 2;

  const followTransitions = [
    new StateTransition({
      parent: getClosestPlayer,
      child: followPlayer,
      shouldTransition: () => true,
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

  const followTransition = new NestedStateMachine(
    followTransitions,
    getClosestPlayer
  );

  const botStateMachine = new BotStateMachine(bot, followTransition);

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
        key: "leave",
        help: "I get sad and leave",
        async handler() {
          await sleep(1000);
          chat("oh");
          await sleep(3000);
          chat("k");
          await sleep(3000);
          bot.quit();
        },
      },
      {
        key: "stop",
        help: "I might be doing something bad so I just up and leave",
        handler() {
          chat("k bye");
          bot.quit();
        },
      },
      {
        key: "come",
        help: "I'll start following you",
        handler() {
          const playerEntity = bot.players[username]?.entity;
          if (playerEntity == null) {
            chat("I can't seem to find you..");
            return;
          }
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
