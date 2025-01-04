import path from 'path';
import * as fs from 'fs';

import { Events } from 'discord.js';
import { cst } from './../utils/constants';

import type { Client } from 'discord.js';
import type { Bot } from './../@types';


const loadDiscordEvents = (bot: Bot, client: Client) => {
    return new Promise<void>(async (resolve, reject) => {
        bot.logger.emit('log', bot.shardId, `-> loading Discord Events ......`);

        const files = fs.readdirSync(`${__dirname}/../events/discord/`);

        bot.logger.emit('log', bot.shardId, `+--------------------------------+`);
        for (const file of files) {
            try {
                const eventModule = await import(path.join('file://', `${__dirname}/../events/discord/${file}`));
                const event = eventModule.default.default;
                const eventName = file.split('.')[0];

                if (!bot.config.bot.textCommand && eventName === Events.MessageCreate) {
                    continue;
                }

                client.on(eventName, event.bind(null, bot, client));
                bot.logger.emit('log', bot.shardId, `| Loaded event ${file.split('.')[0].padEnd(17, ' ')} |`);
            } catch (error) {
                reject(error);
            }
        }
        bot.logger.emit('log', bot.shardId, `+--------------------------------+`);
        bot.logger.emit('log', bot.shardId, `${cst.color.grey}-- loading Discord Events finished --${cst.color.white}`);

        resolve();
    });
};

export { loadDiscordEvents };