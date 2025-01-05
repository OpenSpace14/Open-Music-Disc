import { cst } from './../utils/constants.js';

import type { LavaShark } from 'lavashark';
import type { Bot } from './../@types/index.js';


const checkNodesStats = async (bot: Bot, lavashark: LavaShark) => {
    bot.logger.emit('log', bot.shardId, `-> Checking stats for all nodes ......`);

    try {
        const nodes = lavashark.nodes;
        const pingList = await lavashark.nodesPing();

        bot.logger.emit('log', bot.shardId, `+--------------------------------+`);
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const ping = pingList[i];

            if (ping === -1) {
                bot.logger.emit('log', bot.shardId, `| ${node.identifier}: ${cst.color.red}DISCONNECTED${cst.color.white}`.padEnd(42, ' ') + '|');
            }
            else {
                bot.logger.emit('log', bot.shardId, `| ${node.identifier}: ${cst.color.green}CONNECTED${cst.color.white}${cst.color.grey} (${ping}ms)${cst.color.white}`.padEnd(50, ' ') + '|');
            }
        }
        bot.logger.emit('log', bot.shardId, `+--------------------------------+`);
        bot.logger.emit('log', bot.shardId, `${cst.color.grey}-- All node stats have been checked --${cst.color.white}`);
    } catch (error) {
        console.error('Error checkNodesStats:', error);
    }
};

export { checkNodesStats };