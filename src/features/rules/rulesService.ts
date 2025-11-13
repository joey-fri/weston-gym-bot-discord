import { appendFile } from 'fs/promises';

import { ButtonInteraction, Collection, Role } from 'discord.js';

import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Service de gestion des règles et attribution de rôles.
 * 
 * Responsabilités:
 * - Gérer l'acceptation des règles par les membres
 * - Attribuer automatiquement le rôle membre
 * - Logger toutes les acceptations de règles
 *
 * @example
 * ```typescript
 * const rulesService = new RulesService();
 * await rulesService.handleAcceptRules(interaction);
 * ```
 */
export class RulesService {
  /**
   * Traite l'acceptation des règles par un utilisateur.
   * 
   * Fonctionnalités:
   * - Vérifie l'existence du rôle membre
   * - Attribue le rôle à l'utilisateur
   * - Log l'acceptation dans le fichier de log
   * - Répond à l'interaction avec un message de confirmation
   *
   * @param {ButtonInteraction} interaction - Interaction du bouton d'acceptation
   * @returns {Promise<void>} Promise qui se résout quand l'acceptation est traitée
   * @throws {Error} Si le rôle est introuvable ou si l'attribution échoue
   *
   * @example
   * ```typescript
   * await rulesService.handleAcceptRules(interaction);
   * ```
   */
  async handleAcceptRules(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Impossible de déterminer la guilde pour appliquer le rôle.',
        ephemeral: true
      });
      return;
    }

    const guild = interaction.guild;
    const role = this.findRole(guild.roles.cache);

    if (!role) {
      logger.error(`Le rôle "${config.rules.memberRoleName}" est introuvable.`);
      await interaction.reply({
        content: `Le rôle "${config.rules.memberRoleName}" est introuvable. Contactez un administrateur.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(role);
      await this.logSignature(interaction);

      await interaction.editReply({
        content: `Merci, ${interaction.user.username}, vous avez accepté le règlement et obtenu le rôle **${role.name}**.`
      });

      logger.info(`${interaction.user.tag} a accepté le règlement.`);
    } catch (error) {
      logger.error('Erreur lors de l’ajout du rôle de membre.', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l’ajout du rôle. Contactez un administrateur.'
      });
    }
  }

  /**
   * Recherche le rôle membre dans la collection de rôles de la guilde.
   *
   * @param {Collection<string, Role>} roles - Collection des rôles de la guilde
   * @returns {Role | null} Le rôle membre trouvé ou null
   * @private
   */
  private findRole(roles: Collection<string, Role>): Role | null {
    const role = roles.find(candidate => candidate.name === config.rules.memberRoleName) ?? null;
    return role;
  }

  /**
   * Log l'acceptation des règles par un utilisateur.
   *
   * @param {ButtonInteraction} interaction - Interaction contenant les informations utilisateur
   * @private
   */
  private async logSignature(interaction: ButtonInteraction): Promise<void> {
    const now = new Date();
    const formattedDate = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: config.timezone
    });

    const logMessage = `[${formattedDate}] Utilisateur : ${interaction.user.tag} (ID : ${interaction.user.id}) a accepté le règlement.\n`;

    try {
      await appendFile(config.rules.logFile, logMessage, { encoding: 'utf8' });
    } catch (error) {
      logger.error('Impossible d’écrire dans le journal des signatures.', error);
    }
  }
}

