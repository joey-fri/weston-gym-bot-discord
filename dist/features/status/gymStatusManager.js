"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GymStatusManager = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = require("../../utils/logger");
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
class GymStatusManager {
    /**
     * Crée une nouvelle instance du gestionnaire de statut.
     *
     * @param {Record<GymStatus, string>} images - URLs des images pour chaque statut
     * @param {GymStatus} defaultStatus - Statut par défaut au démarrage
     */
    constructor(images, defaultStatus) {
        this.images = images;
        /** Nom de la dernière personne ayant modifié le statut */
        this.lastActionBy = null;
        /** Message Discord affichant le statut */
        this.statusMessage = null;
        this.status = defaultStatus;
    }
    /**
     * Récupère le statut actuel de la salle.
     *
     * @returns {GymStatus} Statut actuel ('Ouverte' ou 'Fermée')
     */
    get currentStatus() {
        return this.status;
    }
    /**
     * Récupère le nom de la dernière personne ayant modifié le statut.
     *
     * @returns {string | null} Nom de l'acteur ou null si aucune action n'a été effectuée
     */
    get lastActor() {
        return this.lastActionBy;
    }
    /**
     * Vérifie si un message de statut a été publié.
     *
     * @returns {boolean} true si un message de statut existe, false sinon
     */
    get hasStatusMessage() {
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
    async publishStatus(channel) {
        if (this.statusMessage) {
            try {
                await this.statusMessage.delete();
            }
            catch (error) {
                logger_1.logger.warn('Impossible de supprimer le message de statut précédent.', error);
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
     * Met à jour le message de statut existant en le supprimant et en créant un nouveau.
     * Cela génère une notification Discord pour les utilisateurs.
     * Ne fait rien si aucun message n'a été publié.
     *
     * @returns {Promise<void>} Promise qui se résout quand le message est mis à jour
     */
    async refreshStatusMessage() {
        if (!this.statusMessage) {
            return;
        }
        // Récupérer le canal depuis le message existant
        const channel = this.statusMessage.channel;
        if (channel.type !== discord_js_1.ChannelType.GuildText) {
            logger_1.logger.warn('Le canal du message de statut n\'est pas un salon texte.');
            return;
        }
        const textChannel = channel;
        const oldMessage = this.statusMessage;
        try {
            // Supprimer l'ancien message
            try {
                await oldMessage.delete();
            }
            catch (error) {
                logger_1.logger.warn('Impossible de supprimer le message de statut précédent.', error);
            }
            // Créer un nouveau message (génère une notification)
            const newMessage = await textChannel.send({
                embeds: [this.buildEmbed()],
                components: [this.buildActionRow()]
            });
            this.statusMessage = newMessage;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la mise à jour du message de statut.', error);
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
    updateStatus(newStatus, actor) {
        this.status = newStatus;
        this.lastActionBy = actor;
        logger_1.logger.info(`Statut de la salle mis à jour: ${newStatus} (par ${actor})`);
    }
    /**
     * Construit l'embed Discord affichant le statut de la salle.
     *
     * @returns {EmbedBuilder} Embed Discord formaté avec le statut actuel
     * @private
     */
    buildEmbed() {
        const lastAction = this.lastActionBy ?? 'N/A';
        return new discord_js_1.EmbedBuilder()
            .setTitle('Statut de la salle de sport')
            .setDescription(`La salle de sport est actuellement **${this.status}**.\n\nDernière action par : **${lastAction}**`)
            .setColor(this.status === 'Ouverte' ? 0x00ff00 : 0xff0000)
            .setImage(this.images[this.status]);
    }
    /**
     * Construit la rangée de boutons interactifs pour la gestion du statut.
     *
     * @returns {ActionRowBuilder<ButtonBuilder>} Rangée de boutons Discord
     * @private
     */
    buildActionRow() {
        return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("openGym" /* GymStatusButton.Open */)
            .setLabel('Ouvrir la salle')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setDisabled(this.status === 'Ouverte'), new discord_js_1.ButtonBuilder()
            .setCustomId("closeGym" /* GymStatusButton.Close */)
            .setLabel('Fermer la salle')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setDisabled(this.status === 'Fermée'), new discord_js_1.ButtonBuilder()
            .setCustomId("openGate" /* GymStatusButton.Gate */)
            .setLabel('Demander ouverture du portail')
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
}
exports.GymStatusManager = GymStatusManager;
