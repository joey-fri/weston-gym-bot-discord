"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GateService = void 0;
const promises_1 = require("fs/promises");
const twilio_1 = require("twilio");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
/**
 * Fichier de log pour les demandes d'ouverture de portail.
 */
const PORTAL_LOG_FILE = 'portal_logs.txt';
/**
 * Service de gestion du portail via SMS Twilio.
 *
 * Responsabilités:
 * - Envoyer des SMS de notification lors des demandes d'ouverture de portail
 * - Logger toutes les demandes d'ouverture
 * - Gérer la configuration Twilio optionnelle
 *
 * @example
 * ```typescript
 * const gateService = new GateService(twilioConfig);
 * if (gateService.isEnabled()) {
 *   await gateService.handleOpenGate(interaction);
 * }
 * ```
 */
class GateService {
    /**
     * Crée une nouvelle instance du service de portail.
     * Si la configuration Twilio n'est pas fournie, le service est désactivé.
     *
     * @param {TwilioConfig | null} twilioConfig - Configuration Twilio ou null
     */
    constructor(twilioConfig) {
        this.twilioConfig = twilioConfig;
        this.client = twilioConfig
            ? new twilio_1.Twilio(twilioConfig.accountSid, twilioConfig.authToken, { region: twilioConfig.region })
            : null;
        if (!this.client) {
            logger_1.logger.warn('Twilio non configuré, la fonctionnalité portail sera désactivée.');
        }
    }
    /**
     * Vérifie si le service de portail est activé.
     *
     * @returns {boolean} true si Twilio est configuré, false sinon
     */
    isEnabled() {
        return this.client !== null;
    }
    /**
     * Traite une demande d'ouverture de portail.
     *
     * Fonctionnalités:
     * - Envoie un SMS aux numéros configurés avec les détails de la demande
     * - Log la demande dans le fichier de log
     * - Répond à l'interaction Discord avec le résultat
     *
     * @param {ButtonInteraction} interaction - Interaction du bouton d'ouverture
     * @returns {Promise<void>} Promise qui se résout quand la demande est traitée
     *
     * @example
     * ```typescript
     * await gateService.handleOpenGate(interaction);
     * ```
     */
    async handleOpenGate(interaction) {
        if (!this.client || !this.twilioConfig) {
            await interaction.reply({
                content: 'La fonctionnalité d’ouverture du portail est indisponible. Contactez un administrateur.',
                ephemeral: true
            });
            return;
        }
        const numbers = this.twilioConfig.gateNotificationNumbers;
        if (numbers.length === 0) {
            await interaction.reply({
                content: 'Aucun numéro de notification portail n’est configuré.',
                ephemeral: true
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const memberNickname = 'nickname' in (interaction.member ?? {})
            ? interaction.member.nickname
            : null;
        const userName = memberNickname ?? interaction.user.username;
        const now = new Date();
        const localizedTime = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: env_1.config.timezone
        });
        const messageBody = `⚠️ Portail : Une demande d'ouverture a été déclenchée par ${userName} à ${localizedTime}. Veuillez vérifier et agir en conséquence.`;
        const results = [];
        for (const number of numbers) {
            try {
                const message = await this.client.messages.create({
                    to: number,
                    from: this.twilioConfig.fromNumber,
                    body: messageBody
                });
                results.push(`Message envoyé à ${number} (SID: ${message.sid})`);
            }
            catch (error) {
                logger_1.logger.error(`Erreur lors de l’envoi du SMS à ${number}`, error);
                results.push(`Échec de l’envoi vers ${number}`);
            }
        }
        await interaction.editReply({
            content: results.join('\n')
        });
        await this.logGateOpening(userName, now);
    }
    /**
     * Log une demande d'ouverture de portail dans le fichier de log.
     *
     * @param {string} userName - Nom de l'utilisateur ayant fait la demande
     * @param {Date} timestamp - Date et heure de la demande
     * @private
     */
    async logGateOpening(userName, timestamp) {
        const formattedDate = timestamp.toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: env_1.config.timezone
        });
        const line = `[${formattedDate}] ${userName} a demandé l'ouverture du portail.\n`;
        try {
            await (0, promises_1.appendFile)(PORTAL_LOG_FILE, line, { encoding: 'utf8' });
        }
        catch (error) {
            logger_1.logger.error('Impossible d’écrire dans portal_logs.txt', error);
        }
    }
}
exports.GateService = GateService;
