import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  TextChannel
} from 'discord.js';

import { config, GymStatus } from '../config/env';
import { GymStatusButton, GymStatusManager } from '../features/status/gymStatusManager';
import { GateService } from '../features/gate/gateService';
import { RulesService } from '../features/rules/rulesService';
import { PlanningManager } from '../features/planning/planningManager';
import { GymCommandSub } from '../discord/commands';
import { logger } from '../utils/logger';

/**
 * Contexte partagé entre tous les gestionnaires d'événements Discord.
 * Contient les instances de tous les services nécessaires au fonctionnement du bot.
 */
export interface EventContext {
  /** Client Discord */
  client: Client;
  /** Gestionnaire du statut de la salle */
  statusManager: GymStatusManager;
  /** Service de gestion du portail (SMS Twilio) */
  gateService: GateService;
  /** Service de gestion des règles et attribution de rôles */
  rulesService: RulesService;
  /** Gestionnaire du planning */
  planningManager: PlanningManager;
}

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
export function registerEvents(context: EventContext): void {
  const { client, planningManager } = context;

  client.once('ready', async () => {
    if (!client.user) {
      return;
    }

    logger.info(`Connecté en tant que ${client.user.tag}`);

    try {
      await planningManager.initialize();
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du planning.', error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleChatInputInteraction(interaction, context);
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction, context);
      }
    } catch (error) {
      logger.error('Erreur lors du traitement de l\'interaction.', error);
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
async function handleChatInputInteraction(
  interaction: ChatInputCommandInteraction,
  context: EventContext
): Promise<void> {
  if (interaction.commandName !== 'gym') {
    return;
  }

  const subCommand = interaction.options.getSubcommand() as GymCommandSub;

  if (subCommand === GymCommandSub.Status) {
    await handleGymStatusCommand(interaction, context.statusManager);
    return;
  }

  if (subCommand === GymCommandSub.Setup) {
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
async function handleGymStatusCommand(
  interaction: ChatInputCommandInteraction,
  statusManager: GymStatusManager
): Promise<void> {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: 'Commande indisponible dans ce salon.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  await statusManager.publishStatus(interaction.channel as TextChannel);
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
async function handleButtonInteraction(
  interaction: ButtonInteraction,
  context: EventContext
): Promise<void> {
  const displayName = interaction.member && 'nickname' in interaction.member
    ? (interaction.member as { nickname?: string }).nickname ?? interaction.user.username
    : interaction.user.username;

  switch (interaction.customId) {
    case GymStatusButton.Open:
      await updateGymStatus(interaction, context.statusManager, 'Ouverte', displayName);
      break;
    case GymStatusButton.Close:
      await updateGymStatus(interaction, context.statusManager, 'Fermée', displayName);
      break;
    case GymStatusButton.Gate:
      await context.gateService.handleOpenGate(interaction);
      break;
    case 'acceptRules':
      await context.rulesService.handleAcceptRules(interaction);
      break;
    default:
      logger.debug(`Bouton non géré: ${interaction.customId}`);
      break;
  }
}

/**
 * Met à jour le statut de la salle et rafraîchit le message.
 * 
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {GymStatusManager} statusManager - Gestionnaire du statut
 * @param {GymStatus} status - Nouveau statut ('Ouverte' ou 'Fermée')
 * @param {string} actor - Nom de l'utilisateur qui effectue l'action
 */
async function updateGymStatus(
  interaction: ButtonInteraction,
  statusManager: GymStatusManager,
  status: GymStatus,
  actor: string
): Promise<void> {
  if (!statusManager.hasStatusMessage) {
    await interaction.reply({
      content: 'Aucun message de statut trouvé. Utilisez `/gym status` pour le publier.',
      ephemeral: true
    });
    return;
  }

  statusManager.updateStatus(status, actor);
  await statusManager.refreshStatusMessage();

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content: `Statut mis à jour: ${status}.`,
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: `Statut mis à jour: ${status}.`,
      ephemeral: true
    });
  }
}

