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

bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
  const mc_data = minecraft_data(bot.version);
  const no_build_movements = new Movements(bot, mc_data);
  no_build_movements.dontCreateFlow = true;
  no_build_movements.canDig = false;
  no_build_movements.allow1by1towers = false;

  const my_prefix = bot.username + ' ';

  let last_path_update = null;
  bot.on('path_update' as any as keyof BotEvents, (results) => {
    const { status } = results;
    if (status === last_path_update) {
      return;
    }
    debug('path_update', status);
    if (status === 'success') {
      chat('on it');
    } else if (status === 'partial') {
      chat("i think i can do that");
    } else if (status === 'timeout') {
      chat("nah");
      chat("too hard");
      bot.pathfinder.stop();
    } else if (status === 'noPath') {
      chat("pretty sure its impossible");
      bot.pathfinder.stop();
    }
    last_path_update = status;
  });

  let last_path_reset = null;
  bot.on('path_reset' as any as keyof BotEvents, (reason) => {
    if (last_path_reset === reason) {
      return;
    }
    if (reason === 'stuck') {
      chat('i think im stuck');
    } else {
      return;
    }
    debug('path_reset:', reason);
    last_path_reset = reason;
  });

  bot.on('goal_reached' as any as keyof BotEvents, () => {
    chat('k done');
    last_path_update = null;
    last_path_reset = null;
  });

  bot.on('path_stop' as any as keyof BotEvents, () => {
    last_path_reset = null;
    last_path_update = null;
  });

  bot.on('chat', (username, raw_message) => {
    if (username === bot.username) {
      return;
    }
    const message = raw_message.trim();
    if (!message.startsWith(my_prefix)) {
      return;
    }
    const command = message.substr(my_prefix.length);

    const player = bot.players[username];

    if (command.startsWith('come')) {
      if (!player) {
        chat(`${username}, i dont see you`);
        return;
      }
      const target = player.entity;
      const { x, y, z } = target.position;

      bot.pathfinder.setMovements(no_build_movements);
      bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
    } else if (command.startsWith('follow')) {
      if (!player) {
        chat(`${username}, i dont see you`);
        return;
      }
      bot.pathfinder.setMovements(no_build_movements);
      bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 3), true);
    } else if (command.startsWith('avoid')) {
      bot.pathfinder.setMovements(no_build_movements);
      bot.pathfinder.setGoal(new goals.GoalInvert(new goals.GoalFollow(player.entity, 5)), true);
    } else if (command.startsWith('where are you')) {
      const { x, y, z } = bot.entity.position;
      chat([x, y, z].map(loc => loc.toFixed(0)).join(', '));
    } else if (command.startsWith('stop')) {
      bot.pathfinder.stop();
    } else if (command.startsWith('i think you should leave')) {
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
      chat('?' + command);
      setTimeout(() => {
        chat(`you told me: ${command}`);
      }, 500);
    }
  });
});

bot.on('error', console.error);
bot.on('kicked', console.error);
