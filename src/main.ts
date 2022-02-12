import mineflayer, { Bot, BotEvents } from 'mineflayer';

const bot = mineflayer.createBot({
  username: 'greed',
  host: '192.168.1.133',
  port: 25500,
});

const debug_mode = true;
function debug(...args) {
  if (debug_mode) {
    console.debug('D', ...args);
  }
}

function chat(msg: string) {
  bot.chat(msg);
  debug('B', msg);
}

import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder'
import { goals } from 'mineflayer-pathfinder';
import minecraft_data from 'minecraft-data';

// Load your dependency plugins.
bot.loadPlugin(pathfinder);

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

// wait for our bot to login.
bot.once("spawn", () => {
  // This targets object is used to pass data between different states. It can be left empty.
  const targets = {};

  // Create our states
  const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly);
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
  const bot_state_machine = new BotStateMachine(bot, rootLayer);

  bot.on('chat', (username, raw_message) => {
    bot_state_machine; // increase reference count for now

    const my_prefix = bot.username + ' ';

    if (username === bot.username) {
      return;
    }
    const message = raw_message.trim();
    if (!message.startsWith(my_prefix)) {
      return;
    }
    const command = message.substr(my_prefix.length);

    const player = bot.players[username];

    if (command.startsWith('i think you should leave')) {
      setTimeout(() => {
        chat('oh');
        setTimeout(() => {
          chat('k');
          setTimeout(() => {
            bot.quit();
          }, 3000);
        }, 3000);
      }, 1000);
    } else {
      chat('?');
      setTimeout(() => {
        chat("I don't understand");
      }, 500);
    }
  });
});

bot.on('error', console.error);
bot.on('kicked', console.error);
