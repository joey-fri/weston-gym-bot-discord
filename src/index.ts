import { createClient } from './discord/client';
import { registerGuildCommands } from './discord/commands';
import { GymStatusManager } from './features/status/gymStatusManager';
import { GateService } from './features/gate/gateService';
import { RulesService } from './features/rules/rulesService';
import { PlanningManager } from './features/planning/planningManager';
import { registerEvents } from './events/registerEvents';
import { config } from './config/env';
import { logger } from './utils/logger';

/**
 * Point d'entrée principal de l'application.
 * Initialise tous les services nécessaires, enregistre les événements Discord,
 * synchronise les commandes slash et démarre le bot.
 *
 * @returns {Promise<void>} Promise qui se résout quand le bot est démarré
 * @throws {Error} Si une erreur fatale survient lors de l'initialisation
 *
 * @example
 * ```typescript
 * main().catch(error => {
 *   logger.error('Erreur fatale', error);
 *   process.exit(1);
 * });
 * ```
 */
async function main(): Promise<void> {
  const client = createClient();

  const statusManager = new GymStatusManager(
    config.status.images,
    config.status.defaultStatus
  );

  const gateService = new GateService(config.twilio);
  const rulesService = new RulesService();
  const planningManager = new PlanningManager(client, config.discord.guildId);

  registerEvents({
    client,
    statusManager,
    gateService,
    rulesService,
    planningManager
  });

  try {
    await registerGuildCommands();
  } catch (error) {
    logger.error('Impossible de synchroniser les commandes slash.', error);
  }

  await client.login(config.discord.token);
}

/**
 * Gestionnaire d'erreur global pour les erreurs non capturées.
 * Assure que toutes les erreurs fatales sont loggées avant la fermeture de l'application.
 */
main().catch(error => {
  logger.error('Erreur fatale lors de l’exécution du bot.', error);
  process.exitCode = 1;
});

