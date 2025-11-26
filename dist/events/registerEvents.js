"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvents = registerEvents;
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
/**
 * Enregistre tous les événements Discord nécessaires au fonctionnement du bot.
 *
 * Événements enregistrés:
 * - `ready`: Initialisation du planning au démarrage
 * - `interactionCreate`: Gestion des commandes slash et boutons interactifs
 *
 * @param {EventContext} context - Contexte contenant tous les services nécessaires
 *
 * @example
 * ```typescript
 * registerEvents({
 *   client,
 *   statusManager,
 *   gateService,
 *   rulesService,
 *   planningManager
 * });
 * ```
 */
function registerEvents(context) {
    const { client, planningManager } = context;
    client.once('ready', async () => {
        if (!client.user) {
            return;
        }
        logger_1.logger.info(`Connecté en tant que ${client.user.tag}`);
        try {
            await planningManager.initialize();
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation du planning.', error);
        }
    });
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isChatInputCommand()) {
                await handleChatInputInteraction(interaction, context);
            }
            else if (interaction.isButton()) {
                await handleButtonInteraction(interaction, context);
            }
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du traitement de l\'interaction.', error);
        }
    });
}
/**
 * Gère les interactions de type commande slash (chat input).
 *
 * Commandes gérées:
 * - `/gym status`: Publie le statut de la salle
 * - `/gym setup`: Synchronise le planning manuellement
 *
 * @param {ChatInputCommandInteraction} interaction - L'interaction de commande slash
 * @param {EventContext} context - Contexte avec les services nécessaires
 */
async function handleChatInputInteraction(interaction, context) {
    if (interaction.commandName !== 'gym') {
        return;
    }
    const subCommand = interaction.options.getSubcommand();
    if (subCommand === "status" /* GymCommandSub.Status */) {
        await handleGymStatusCommand(interaction, context.statusManager);
        return;
    }
    if (subCommand === "setup" /* GymCommandSub.Setup */) {
        await interaction.deferReply({ ephemeral: true });
        await context.planningManager.syncPlanningCommand();
        await interaction.editReply('Synchronisation du planning terminée.');
    }
}
/**
 * Gère la sous-commande `/gym status`.
 * Publie ou rafraîchit le message de statut de la salle dans le salon courant.
 *
 * @param {ChatInputCommandInteraction} interaction - L'interaction de commande
 * @param {GymStatusManager} statusManager - Gestionnaire du statut de la salle
 */
async function handleGymStatusCommand(interaction, statusManager) {
    if (!interaction.channel || interaction.channel.type !== discord_js_1.ChannelType.GuildText) {
        await interaction.reply({
            content: 'Commande indisponible dans ce salon.',
            ephemeral: true
        });
        return;
    }
    await interaction.deferReply({ ephemeral: true });
    await statusManager.publishStatus(interaction.channel);
    await interaction.editReply('Statut de la salle publié.');
}
/**
 * Gère les interactions de type bouton.
 *
 * Boutons gérés:
 * - `openGym`: Ouvre la salle
 * - `closeGym`: Ferme la salle
 * - `openGate`: Demande l'ouverture du portail
 * - `acceptRules`: Accepte les règles et attribue le rôle membre
 *
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {EventContext} context - Contexte avec les services nécessaires
 */
async function handleButtonInteraction(interaction, context) {
    const displayName = interaction.member && 'nickname' in interaction.member
        ? interaction.member.nickname ?? interaction.user.username
        : interaction.user.username;
    switch (interaction.customId) {
        case "openGym" /* GymStatusButton.Open */:
            await updateGymStatus(interaction, context.statusManager, 'Ouverte', displayName);
            break;
        case "closeGym" /* GymStatusButton.Close */:
            await updateGymStatus(interaction, context.statusManager, 'Fermée', displayName);
            break;
        case "openGate" /* GymStatusButton.Gate */:
            await context.gateService.handleOpenGate(interaction);
            break;
        case 'acceptRules':
            await context.rulesService.handleAcceptRules(interaction);
            break;
        default:
            logger_1.logger.debug(`Bouton non géré: ${interaction.customId}`);
            break;
    }
}
/**
 * Met à jour le statut de la salle et rafraîchit le message.
 * N'affiche un message que s'il y a une erreur.
 *
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {GymStatusManager} statusManager - Gestionnaire du statut
 * @param {GymStatus} status - Nouveau statut ('Ouverte' ou 'Fermée')
 * @param {string} actor - Nom de l'utilisateur qui effectue l'action
 */
async function updateGymStatus(interaction, statusManager, status, actor) {
    try {
        if (!statusManager.hasStatusMessage) {
            await interaction.reply({
                content: 'Aucun message de statut trouvé. Utilisez `/gym status` pour le publier.',
                ephemeral: true
            });
            return;
        }
        // Différer la mise à jour pour éviter un message visible
        await interaction.deferUpdate();
        statusManager.updateStatus(status, actor);
        await statusManager.refreshStatusMessage();
    }
    catch (error) {
        logger_1.logger.error('Erreur lors de la mise à jour du statut de la salle.', error);
        // Afficher un message d'erreur seulement en cas de problème
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `Erreur lors de la mise à jour du statut: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                ephemeral: true
            });
        }
        else {
            await interaction.reply({
                content: `Erreur lors de la mise à jour du statut: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                ephemeral: true
            });
        }
    }
}
