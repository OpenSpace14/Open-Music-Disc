import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    Message
} from 'discord.js';
import { embeds } from '../embeds/index.js';
import { cst } from '../utils/constants.js';

import type { Bot } from '../@types/index.js';


export const name = 'queue';
export const aliases = ['q', 'list'];
export const description = 'Show currnet playlist';
export const usage = 'queue';
export const voiceChannel = true;
export const showHelp = true;
export const sendTyping = false;
export const requireAdmin = false;
export const options = [];


export const execute = async (bot: Bot, client: Client, message: Message) => {
    const player = client.lavashark.getPlayer(message.guild!.id);

    if (!player) {
        return message.reply({ content: client.i18n.t('commands:ERROR_NO_PLAYING'), allowedMentions: { repliedUser: false } });
    }


    if (player.setting.queuePage) {
        try {
            await player.setting.queuePage.msg?.delete();
        } catch (_) { }
    }

    player.setting.queuePage = {
        maxPage: Math.ceil(player.queue.tracks.length / 10),
        curPage: 1,
        msg: null
    };

    const page = player.setting.queuePage.curPage;
    const startIdx = (page - 1) * 10;
    const endIdx = page * 10;

    const nowplaying = client.i18n.t('commands:MESSAGE_NOW_PLAYING_TITLE', { title: player.current?.title });
    let tracksQueue = '';
    const tracks = player.queue.tracks.slice(startIdx, endIdx)
        .map((track, index) => {
            return `${startIdx + index + 1}. \`${track.title}\``;
        });

    if (tracks.length < 1) {
        tracksQueue = '------------------------------';
    }
    else if (tracks.length === player.queue.tracks.length) {
        tracksQueue = tracks.join('\n');
    }
    else {
        tracksQueue = tracks.join('\n');
        tracksQueue += `\n\n----- Page ${page}/${player.setting.queuePage.maxPage} -----`;
    }


    const methods = ['OFF', 'SINGLE', 'ALL'];
    const repeatMode = player.repeatMode;

    const prevButton = new ButtonBuilder().setCustomId('queuelist-prev').setEmoji(cst.button.prev).setStyle(ButtonStyle.Secondary);
    const nextButton = new ButtonBuilder().setCustomId('queuelist-next').setEmoji(cst.button.next).setStyle(ButtonStyle.Secondary);
    const delButton = new ButtonBuilder().setCustomId('queuelist-delete').setLabel(cst.button.delete).setStyle(ButtonStyle.Primary);
    const clsButton = new ButtonBuilder().setCustomId('queuelist-clear').setLabel(cst.button.clear).setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton, delButton, clsButton);

    player.setting.queuePage.msg = await message.reply({
        embeds: [embeds.queue(bot, nowplaying, tracksQueue, methods[repeatMode])],
        components: [row],
        allowedMentions: { repliedUser: false },
    });

    return message.react('👍');
};


export const slashExecute = async (bot: Bot, client: Client, interaction: ChatInputCommandInteraction) => {
    const player = client.lavashark.getPlayer(interaction.guild!.id);

    if (!player) {
        return interaction.editReply({ content: client.i18n.t('commands:ERROR_NO_PLAYING'), allowedMentions: { repliedUser: false } });
    }


    if (player.setting.queuePage) {
        try {
            await player.setting.queuePage.msg?.delete();
        } catch (_) { }
    }

    player.setting.queuePage = {
        maxPage: Math.ceil(player.queue.tracks.length / 10),
        curPage: 1,
        msg: null
    };

    const page = player.setting.queuePage.curPage;
    const startIdx = (page - 1) * 10;
    const endIdx = page * 10;

    const nowplaying = client.i18n.t('commands:MESSAGE_NOW_PLAYING_TITLE', { title: player.current?.title });
    let tracksQueue = '';
    const tracks = player.queue.tracks.slice(startIdx, endIdx)
        .map((track, index) => {
            return `${startIdx + index + 1}. \`${track.title}\``;
        });

    if (tracks.length < 1) {
        tracksQueue = '------------------------------';
    }
    else if (tracks.length === player.queue.tracks.length) {
        tracksQueue = tracks.join('\n');
    }
    else {
        tracksQueue = tracks.join('\n');
        tracksQueue += `\n\n----- Page ${page}/${player.setting.queuePage.maxPage} -----`;
    }


    const methods = ['OFF', 'SINGLE', 'ALL'];
    const repeatMode = player.repeatMode;

    const prevButton = new ButtonBuilder().setCustomId('queuelist-prev').setEmoji(cst.button.prev).setStyle(ButtonStyle.Secondary);
    const nextButton = new ButtonBuilder().setCustomId('queuelist-next').setEmoji(cst.button.next).setStyle(ButtonStyle.Secondary);
    const delButton = new ButtonBuilder().setCustomId('queuelist-delete').setLabel(cst.button.delete).setStyle(ButtonStyle.Primary);
    const clsButton = new ButtonBuilder().setCustomId('queuelist-clear').setLabel(cst.button.clear).setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton, delButton, clsButton);

    player.setting.queuePage.msg = await interaction.editReply({
        embeds: [embeds.queue(bot, nowplaying, tracksQueue, methods[repeatMode])],
        components: [row],
        allowedMentions: { repliedUser: false },
    });
};