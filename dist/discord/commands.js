"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGuildCommands = registerGuildCommands;
const discord_js_1 = require("discord.js");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
/**
 * Commande slash principale `/gym` avec ses sous-commandes.
 */
const gymCommand = new discord_js_1.SlashCommandBuilder()
    .setName('gym')
    .setDescription('Gestion du statut de la salle et du planning')
    .addSubcommand(sub => sub
    .setName("status" /* GymCommandSub.Status */)
    .setDescription('Publier ou rafraîchir le statut de la salle dans ce salon'))
    .addSubcommand(sub => sub
    .setName("setup" /* GymCommandSub.Setup */)
    .setDescription('Synchroniser les salons de planning manuellement'));
/**
 * Liste des commandes slash à enregistrer sur Discord.
 */
const commands = [
    gymCommand.toJSON()
];
/**
 * Enregistre les commandes slash sur Discord pour la guilde configurée.
 * Cette fonction doit être appelée avant ou après la connexion du bot.
 * Les commandes sont synchronisées avec Discord via l'API REST.
 *
 * @returns {Promise<void>} Promise qui se résout quand les commandes sont enregistrées
 * @throws {Error} Si l'enregistrement échoue (erreur réseau, token invalide, etc.)
 *
 * @example
 * ```typescript
 * try {
 *   await registerGuildCommands();
 *   logger.info('Commandes enregistrées avec succès');
 * } catch (error) {
 *   logger.error('Erreur lors de l\'enregistrement', error);
 * }
 * ```
 */
async function registerGuildCommands() {
    const rest = new discord_js_1.REST({ version: '10' }).setToken(env_1.config.discord.token);
    logger_1.logger.info(`Enregistrement des commandes slash pour la guilde ${env_1.config.discord.guildId}`);
    await rest.put(discord_js_1.Routes.applicationGuildCommands(env_1.config.discord.clientId, env_1.config.discord.guildId), { body: commands });
    logger_1.logger.info('Commandes slash synchronisées.');
}
