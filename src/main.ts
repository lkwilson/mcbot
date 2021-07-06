import mineflayer from 'mineflayer';

const bot = mineflayer.createBot({
  username: 'greed',
  host: '192.168.1.133',
  port: 25500,
});

import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder'
import { goals } from 'mineflayer-pathfinder';
import minecraft_data from 'minecraft-data';

bot.loadPlugin(pathfinder);

function build_come_handler() {
  const mcData = minecraft_data(bot.version);

  const defaultMove = new Movements(bot, mcData)
  defaultMove.dontCreateFlow = true;
  defaultMove.canDig = false;
  defaultMove.allow1by1towers = false;

  return {
    handle(username, command, args: string[]) {
      if (command !== 'come') {
        console.debug('come handler ignoring command:', command);
        return;
      } else if (args.length !== 0) {
        bot.chat(`I'll come, but I'm not sure what you mean by ${args.join(' ')}`);
      }

      if (!bot.players[username]) {
        bot.chat(`${username}, I don't see you!`);
        return;
      }
      const target = bot.players[username].entity;
      const { x, y, z } = target.position;

      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
      bot.chat('k');
    },
  };
}

bot.once('spawn', () => {
  const handlers = [
    build_come_handler(),
  ];

  bot.on('chat', (username, message) => {
    if (username === bot.username) {
      console.debug("Bot ignoring own chat");
      return;
    }
    const full_command = message.trim().split(' ').filter(arg => arg.length !== 0);
    if (full_command.length < 2) {
      console.debug(username, "sent a bad command", ...full_command);
      return;
    }
    const [_, command, ...args] = full_command;

    console.debug("command found:", command, ...args);
    handlers.forEach(handler => {
      handler.handle(username, command, args);
    });
  });
});

bot.on('error', console.error);
