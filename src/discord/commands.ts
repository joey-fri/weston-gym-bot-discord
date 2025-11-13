import {
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Sous-commandes disponibles pour la commande `/gym`.
 */
export const enum GymCommandSub {
  /** Publier ou rafraîchir le statut de la salle */
  Status = 'status',
  /** Synchroniser manuellement les salons de planning */
  Setup = 'setup'
}

/**
 * Commande slash principale `/gym` avec ses sous-commandes.
 */
const gymCommand = new SlashCommandBuilder()
  .setName('gym')
  .setDescription('Gestion du statut de la salle et du planning')
  .addSubcommand(sub =>
    sub
      .setName(GymCommandSub.Status)
      .setDescription('Publier ou rafraîchir le statut de la salle dans ce salon')
  )
  .addSubcommand(sub =>
    sub
      .setName(GymCommandSub.Setup)
      .setDescription('Synchroniser les salons de planning manuellement')
  );

/**
 * Liste des commandes slash à enregistrer sur Discord.
 */
const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
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
export async function registerGuildCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  logger.info(`Enregistrement des commandes slash pour la guilde ${config.discord.guildId}`);

  await rest.put(
    Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
    { body: commands }
  );

  logger.info('Commandes slash synchronisées.');
}

