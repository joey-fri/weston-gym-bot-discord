import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel
} from 'discord.js';

import { GymStatus } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Identifiants des boutons interactifs pour la gestion du statut de la salle.
 */
export const enum GymStatusButton {
  /** Bouton pour ouvrir la salle */
  Open = 'openGym',
  /** Bouton pour fermer la salle */
  Close = 'closeGym',
  /** Bouton pour demander l'ouverture du portail */
  Gate = 'openGate'
}

/**
 * Gestionnaire du statut de la salle de sport.
 * 
 * Responsabilités:
 * - Gérer l'état actuel de la salle (Ouverte/Fermée)
 * - Publier et mettre à jour le message de statut Discord
 * - Conserver l'historique de la dernière action
 * - Fournir une interface avec boutons interactifs
 *
 * @example
 * ```typescript
 * const statusManager = new GymStatusManager(images, 'Fermée');
 * await statusManager.publishStatus(channel);
 * statusManager.updateStatus('Ouverte', 'John Doe');
 * await statusManager.refreshStatusMessage();
 * ```
 */
export class GymStatusManager {
  /** Statut actuel de la salle */
  private status: GymStatus;
  /** Nom de la dernière personne ayant modifié le statut */
  private lastActionBy: string | null = null;
  /** Message Discord affichant le statut */
  private statusMessage: Message | null = null;

  /**
   * Crée une nouvelle instance du gestionnaire de statut.
   *
   * @param {Record<GymStatus, string>} images - URLs des images pour chaque statut
   * @param {GymStatus} defaultStatus - Statut par défaut au démarrage
   */
  constructor(
    private readonly images: Record<GymStatus, string>,
    defaultStatus: GymStatus
  ) {
    this.status = defaultStatus;
  }

  /**
   * Récupère le statut actuel de la salle.
   *
   * @returns {GymStatus} Statut actuel ('Ouverte' ou 'Fermée')
   */
  get currentStatus(): GymStatus {
    return this.status;
  }

  /**
   * Récupère le nom de la dernière personne ayant modifié le statut.
   *
   * @returns {string | null} Nom de l'acteur ou null si aucune action n'a été effectuée
   */
  get lastActor(): string | null {
    return this.lastActionBy;
  }

  /**
   * Vérifie si un message de statut a été publié.
   *
   * @returns {boolean} true si un message de statut existe, false sinon
   */
  get hasStatusMessage(): boolean {
    return this.statusMessage !== null;
  }

  /**
   * Publie le message de statut dans le salon Discord spécifié.
   * Si un message existe déjà, il est supprimé avant la publication.
   *
   * @param {TextChannel} channel - Salon Discord où publier le statut
   * @returns {Promise<Message>} Message Discord créé
   * @throws {Error} Si la publication échoue (permissions insuffisantes, etc.)
   */
  async publishStatus(channel: TextChannel): Promise<Message> {
    if (this.statusMessage) {
      try {
        await this.statusMessage.delete();
      } catch (error) {
        logger.warn('Impossible de supprimer le message de statut précédent.', error);
      }
    }

    const message = await channel.send({
      embeds: [this.buildEmbed()],
      components: [this.buildActionRow()]
    });

    this.statusMessage = message;
    return message;
  }

  /**
   * Met à jour le message de statut existant avec les informations actuelles.
   * Ne fait rien si aucun message n'a été publié.
   *
   * @returns {Promise<void>} Promise qui se résout quand le message est mis à jour
   */
  async refreshStatusMessage(): Promise<void> {
    if (!this.statusMessage) {
      return;
    }

    try {
      await this.statusMessage.edit({
        embeds: [this.buildEmbed()],
        components: [this.buildActionRow()]
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du message de statut.', error);
    }
  }

  /**
   * Met à jour le statut de la salle et enregistre l'auteur de l'action.
   * N'actualise pas automatiquement le message Discord.
   *
   * @param {GymStatus} newStatus - Nouveau statut ('Ouverte' ou 'Fermée')
   * @param {string} actor - Nom de la personne effectuant l'action
   *
   * @example
   * ```typescript
   * statusManager.updateStatus('Ouverte', 'John Doe');
   * await statusManager.refreshStatusMessage();
   * ```
   */
  updateStatus(newStatus: GymStatus, actor: string): void {
    this.status = newStatus;
    this.lastActionBy = actor;
    logger.info(`Statut de la salle mis à jour: ${newStatus} (par ${actor})`);
  }

  /**
   * Construit l'embed Discord affichant le statut de la salle.
   *
   * @returns {EmbedBuilder} Embed Discord formaté avec le statut actuel
   * @private
   */
  private buildEmbed(): EmbedBuilder {
    const lastAction = this.lastActionBy ?? 'N/A';

    return new EmbedBuilder()
      .setTitle('Statut de la salle de sport')
      .setDescription(
        `La salle de sport est actuellement **${this.status}**.\n\nDernière action par : **${lastAction}**`
      )
      .setColor(this.status === 'Ouverte' ? 0x00ff00 : 0xff0000)
      .setImage(this.images[this.status]);
  }

  /**
   * Construit la rangée de boutons interactifs pour la gestion du statut.
   *
   * @returns {ActionRowBuilder<ButtonBuilder>} Rangée de boutons Discord
   * @private
   */
  private buildActionRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(GymStatusButton.Open)
        .setLabel('Ouvrir la salle')
        .setStyle(ButtonStyle.Success)
        .setDisabled(this.status === 'Ouverte'),
      new ButtonBuilder()
        .setCustomId(GymStatusButton.Close)
        .setLabel('Fermer la salle')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(this.status === 'Fermée'),
      new ButtonBuilder()
        .setCustomId(GymStatusButton.Gate)
        .setLabel('Demander ouverture du portail')
        .setStyle(ButtonStyle.Primary)
    );
  }
}

