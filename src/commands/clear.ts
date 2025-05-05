import i18next from 'i18next';

import { embeds } from '../embeds/index.js';
import { CommandCategory } from '../@types/index.js';

import type { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import type { Bot } from '../@types/index.js';


export const name = 'clear';
export const aliases = ['cls'];
export const description = i18next.t('commands:CONFIG_CLEAR_DESCRIPTION');
export const usage = i18next.t('commands:CONFIG_CLEAR_USAGE');
export const category = CommandCategory.MUSIC;
export const voiceChannel = true;
export const showHelp = true;
export const sendTyping = false;
export const options = [];


export const execute = async (bot: Bot, client: Client, message: Message) => {
    const player = client.lavashark.getPlayer(message.guild!.id);

    if (!player || !player.playing) {
        return message.reply({ embeds: [embeds.textMsg(bot, client.i18n.t('commands:ERROR_NO_PLAYING'))], allowedMentions: { repliedUser: false } });
    }

    player.queue.clear();
    return message.react('👍');
};

export const slashExecute = async (bot: Bot, client: Client, interaction: ChatInputCommandInteraction) => {
    const player = client.lavashark.getPlayer(interaction.guild!.id);

    if (!player || !player.playing) {
        return interaction.editReply({ embeds: [embeds.textMsg(bot, client.i18n.t('commands:ERROR_NO_PLAYING'))], allowedMentions: { repliedUser: false } });
    }

    player.queue.clear();
    return interaction.editReply({ embeds: [embeds.textMsg(bot, client.i18n.t('commands:MESSAGE_CLEAR_SUCCESS'))], allowedMentions: { repliedUser: false } });
};