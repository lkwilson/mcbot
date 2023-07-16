import "dotenv/config";

import mineflayer from "mineflayer";

import { pathfinder } from "mineflayer-pathfinder";

// Import required behaviors.
import {
  StateTransition,
  BotStateMachine,
  EntityFilters,
  BehaviorFollowEntity,
  BehaviorLookAtEntity,
  BehaviorGetClosestEntity,
  NestedStateMachine,
} from "mineflayer-statemachine";

// helper funcs
function error(...args: any[]): never {
  console.error(...args);
  process.exit(1);
}

const isDevelopment = process.env.IS_DEV == "yes";
function debug(...args: any[]) {
  if (isDevelopment) {
    console.debug("D", ...args);
  }
}

function chat(msg: string) {
  bot.chat(msg);
  debug("B", msg);
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
if (portStr != null) {
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

// Load your dependency plugins.
bot.loadPlugin(pathfinder);

// wait for our bot to login.
bot.once("spawn", () => {
  // This targets object is used to pass data between different states. It can be left empty.
  const targets = {};

  // Create our states
  const getClosestPlayer = new BehaviorGetClosestEntity(
    bot,
    targets,
    EntityFilters().PlayersOnly
  );
  const followPlayer = new BehaviorFollowEntity(bot, targets);
  const lookAtPlayer = new BehaviorLookAtEntity(bot, targets);

  // Create our transitions
  const transitions = [
    // We want to start following the player immediately after finding them.
    // Since getClosestPlayer finishes instantly, shouldTransition() should always return true.
    new StateTransition({
      parent: getClosestPlayer,
      child: followPlayer,
      shouldTransition: () => true,
    }),

    // If the distance to the player is less than two blocks, switch from the followPlayer
    // state to the lookAtPlayer state.
    new StateTransition({
      parent: followPlayer,
      child: lookAtPlayer,
      shouldTransition: () => followPlayer.distanceToTarget() < 2,
    }),

    // If the distance to the player is more than two blocks, switch from the lookAtPlayer
    // state to the followPlayer state.
    new StateTransition({
      parent: lookAtPlayer,
      child: followPlayer,
      shouldTransition: () => lookAtPlayer.distanceToTarget() >= 2,
    }),
  ];

  // Now we just wrap our transition list in a nested state machine layer. We want the bot
  // to start on the getClosestPlayer state, so we'll specify that here.
  const rootLayer = new NestedStateMachine(transitions, getClosestPlayer);

  // We can start our state machine simply by creating a new instance.
  const botStateMachine = new BotStateMachine(bot, rootLayer);

  bot.on("chat", async (username, raw_message) => {
    botStateMachine; // increase reference count for now

    const my_prefix = bot.username + " ";

    if (username === bot.username) {
      return;
    }
    const message = raw_message.trim();
    if (!message.startsWith(my_prefix)) {
      return;
    }
    const command = message.substring(my_prefix.length);

    const player = bot.players[username];

    if (command.startsWith("i think you should leave")) {
      await sleep(1000);
      chat("oh");
      await sleep(3000);
      chat("k");
      await sleep(3000);
      bot.quit();
    } else if (command.startsWith("stop")) {
      bot.quit();
    } else {
      chat("?");
      await sleep(500);
      chat("I don't understand");
    }
  });
});
