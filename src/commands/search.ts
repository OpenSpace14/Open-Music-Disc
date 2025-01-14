import {
    ActionRowBuilder,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    Collection,
    Message,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';

import { dashboard } from '../dashboard/index.js';
import { embeds } from '../embeds/index.js';
import { isUserInBlacklist } from '../utils/functions/isUserInBlacklist.js';
import { LoadType } from '../@types/index.js';

import type { Bot } from '../@types/index.js';


export const name = 'search';
export const aliases = ['find'];
export const description = 'Enter song name to search';
export const usage = 'search <URL/song name>';
export const voiceChannel = true;
export const showHelp = true;
export const sendTyping = true;
export const requireAdmin = false;
export const options = [
    {
        name: 'search',
        description: 'The song name',
        type: 3,
        required: true
    }
];


export const execute = async (bot: Bot, client: Client, message: Message, args: string[]) => {
    if (!args[0]) {
        return message.reply({ content: client.i18n.t('commands:MESSAGE_PLAY_ARGS_ERROR'), allowedMentions: { repliedUser: false } });
    }

    const str = args.join(' ');
    const res = await client.lavashark.search(str);

    if (res.loadType === LoadType.ERROR) {
        bot.logger.emit('error', bot.shardId, `Search Error: ${(res as any).data?.message}`);
        return message.reply({ content: client.i18n.t('commands:ERROR_PLAY_SEARCH', { reason: (res as any).data?.message }), allowedMentions: { repliedUser: false } });
    }
    else if (res.loadType === LoadType.EMPTY) {
        return message.reply({ content: client.i18n.t('commands:MESSAGE_PLAY_SEARCH_NO_MATCH'), allowedMentions: { repliedUser: false } });
    }


    const validBlackist = isUserInBlacklist(message.member?.voice.channel, bot.blacklist);
    if (validBlackist.length > 0) {
        return message.reply({
            embeds: [embeds.blacklist(bot, validBlackist)],
            allowedMentions: { repliedUser: false }
        });
    }


    // Creates the audio player
    const player = client.lavashark.createPlayer({
        guildId: String(message.guild?.id),
        voiceChannelId: String(message.member?.voice.channelId),
        textChannelId: message.channel.id,
        selfDeaf: true
    });

    if (!player.setting) {
        player.setting = {
            queuePage: null,
            volume: null
        };
    }

    const curVolume = player.setting.volume ?? bot.config.bot.volume.default;

    try {
        // Connects to the voice channel
        await player.connect();
        player.metadata = message;
        player.filters.setVolume(curVolume);
    } catch (error) {
        bot.logger.emit('error', bot.shardId, 'Error joining channel: ' + error);
        return message.reply({ content: client.i18n.t('commands:ERROR_PLAY_JOIN_CHANNEL'), allowedMentions: { repliedUser: false } });
    }

    try {
        // Intial dashboard
        if (!player.dashboard) await dashboard.initial(bot, message, player);
    } catch (error) {
        await dashboard.destroy(bot, player);
    }

    await message.react('👍');


    if (res.loadType === LoadType.PLAYLIST) {
        player.addTracks(res.tracks, (message.author as any));

        if (!player.playing) {
            await player.play()
                .catch(async (error) => {
                    bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                    await message.reply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                    return player.destroy();
                });
        }

        return message.reply({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), allowedMentions: { repliedUser: false } });
    }
    else if (res.tracks.length === 1) {
        const track = res.tracks[0];
        player.addTracks(track, (message.author as any));

        if (!player.playing) {
            player.filters.setVolume(curVolume);
            await player.play()
                .catch(async (error) => {
                    bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                    await message.reply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                    return player.destroy();
                });

            player.filters.setVolume(bot.config.bot.volume.default);
        }

        return message.reply({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), allowedMentions: { repliedUser: false } });
    }
    else {
        const select = new StringSelectMenuBuilder()
            .setCustomId('musicSelect')
            .setPlaceholder(client.i18n.t('commands:MESSAGE_PLAY_SELECT_TITLE'))
            .setOptions(res.tracks.map(x => {
                return {
                    label: x.title.length >= 25 ? x.title.substring(0, 22) + '...' : x.title,
                    description: client.i18n.t('commands:MESSAGE_PLAY_SELECT_DURATION', { label: x.duration.label }),
                    value: x.uri
                };
            }));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        const msg = await message.reply({ components: [row.toJSON()] });

        const collector = msg.createMessageComponentCollector({
            time: 20000, // 20s
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async (i: StringSelectMenuInteraction) => {
            if (i.customId != 'musicSelect') return;

            player.addTracks(res.tracks.find(x => x.uri == i.values[0])!, (message.author as any));

            if (!player.playing) {
                player.filters.setVolume(curVolume);
                await player.play()
                    .catch(async (error) => {
                        bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                        await message.reply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                        return player.destroy();
                    });

                player.filters.setVolume(bot.config.bot.volume.default);
            }

            i.deferUpdate();
            await msg.edit({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), components: [], allowedMentions: { repliedUser: false } });
        });

        collector.on('end', async (collected: Collection<string, ButtonInteraction>, reason: string) => {
            if (reason == 'time' && collected.size == 0) {
                if (!player.playing) player.destroy();
                await msg.edit({ content: client.i18n.t('commands:ERROR_TIME_EXPIRED'), components: [], allowedMentions: { repliedUser: false } });
            }
        });
    }
};

export const slashExecute = async (bot: Bot, client: Client, interaction: ChatInputCommandInteraction) => {
    const str = interaction.options.getString('search');
    const res = await client.lavashark.search(str!);

    if (res.loadType === LoadType.ERROR) {
        bot.logger.emit('error', bot.shardId, `Search Error: ${(res as any).data?.message}`);
        return interaction.editReply({ content: client.i18n.t('commands:ERROR_PLAY_SEARCH', { reason: (res as any).data?.message }), allowedMentions: { repliedUser: false } });
    }
    else if (res.loadType === LoadType.EMPTY) {
        return interaction.editReply({ content: client.i18n.t('commands:MESSAGE_PLAY_SEARCH_NO_MATCH'), allowedMentions: { repliedUser: false } });
    }


    const guildMember = interaction.guild!.members.cache.get(interaction.user.id);
    const { channel } = guildMember!.voice;

    const validBlackist = isUserInBlacklist(channel, bot.blacklist);
    if (validBlackist.length > 0) {
        return interaction.editReply({
            embeds: [embeds.blacklist(bot, validBlackist)],
            allowedMentions: { repliedUser: false }
        });
    }


    // Creates the audio player
    const player = client.lavashark.createPlayer({
        guildId: String(interaction.guild?.id),
        voiceChannelId: String(channel?.id),
        textChannelId: interaction.channel?.id,
        selfDeaf: true
    });

    if (!player.setting) {
        player.setting = {
            queuePage: null,
            volume: null
        };
    }

    const curVolume = player.setting.volume ?? bot.config.bot.volume.default;

    try {
        // Connects to the voice channel
        await player.connect();
        player.metadata = interaction;
        player.filters.setVolume(curVolume);
    } catch (error) {
        bot.logger.emit('error', bot.shardId, 'Error joining channel: ' + error);
        return interaction.editReply({ content: client.i18n.t('commands:ERROR_PLAY_JOIN_CHANNEL'), allowedMentions: { repliedUser: false } });
    }

    try {
        // Intial dashboard
        if (!player.dashboard) await dashboard.initial(bot, interaction, player);
    } catch (error) {
        await dashboard.destroy(bot, player);
    }


    if (res.loadType === LoadType.PLAYLIST) {
        player.addTracks(res.tracks, (interaction.user as any));

        if (!player.playing) {
            player.filters.setVolume(curVolume);
            await player.play()
                .catch(async (error) => {
                    bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                    await interaction.reply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                    return player.destroy();
                });
        }

        return interaction.editReply({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), allowedMentions: { repliedUser: false } });
    }
    else if (res.tracks.length === 1) {
        const track = res.tracks[0];
        player.addTracks(track, (interaction.user as any));

        if (!player.playing) {
            player.filters.setVolume(curVolume);
            await player.play()
                .catch(async (error) => {
                    bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                    await interaction.reply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                    return player.destroy();
                });

            player.filters.setVolume(bot.config.bot.volume.default);
        }

        return interaction.editReply({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), allowedMentions: { repliedUser: false } });
    }
    else {
        const select = new StringSelectMenuBuilder()
            .setCustomId('musicSelect')
            .setPlaceholder(client.i18n.t('commands:MESSAGE_PLAY_SELECT_TITLE'))
            .setOptions(res.tracks.map(x => {
                return {
                    label: x.title.length >= 25 ? x.title.substring(0, 22) + '...' : x.title,
                    description: client.i18n.t('commands:MESSAGE_PLAY_SELECT_DURATION', { label: x.duration.label }),
                    value: x.uri
                };
            }));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        const msg = await interaction.editReply({ components: [row.toJSON()] });

        const collector = msg.createMessageComponentCollector({
            time: 20000, // 20s
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async (i: StringSelectMenuInteraction) => {
            if (i.customId != 'musicSelect') return;

            player.addTracks(res.tracks.find(x => x.uri == i.values[0])!, (interaction.user as any));

            if (!player.playing) {
                await player.play()
                    .catch(async (error) => {
                        bot.logger.emit('error', bot.shardId, 'Error playing track: ' + error);
                        await interaction.editReply({ content: client.i18n.t('commands:ERROR_PLAY_MUSIC', { reason: JSON.stringify(error) }), allowedMentions: { repliedUser: false } });
                        return player.destroy();
                    });

                player.filters.setVolume(bot.config.bot.volume.default);
            }

            i.deferUpdate();
            await msg.edit({ content: client.i18n.t('commands:MESSAGE_PLAY_MUSIC_ADD'), components: [], allowedMentions: { repliedUser: false } });
        });

        collector.on('end', async (collected: Collection<string, ButtonInteraction>, reason: string) => {
            if (reason == 'time' && collected.size == 0) {
                if (!player.playing) player.destroy();
                await msg.edit({ content: client.i18n.t('commands:ERROR_TIME_EXPIRED'), components: [], allowedMentions: { repliedUser: false } });
            }
        });
    }
};