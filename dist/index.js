"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./discord/client");
const commands_1 = require("./discord/commands");
const gymStatusManager_1 = require("./features/status/gymStatusManager");
const gateService_1 = require("./features/gate/gateService");
const rulesService_1 = require("./features/rules/rulesService");
const planningManager_1 = require("./features/planning/planningManager");
const registerEvents_1 = require("./events/registerEvents");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
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
async function main() {
    const client = (0, client_1.createClient)();
    const statusManager = new gymStatusManager_1.GymStatusManager(env_1.config.status.images, env_1.config.status.defaultStatus);
    const gateService = new gateService_1.GateService(env_1.config.twilio);
    const rulesService = new rulesService_1.RulesService();
    const planningManager = new planningManager_1.PlanningManager(client, env_1.config.discord.guildId);
    (0, registerEvents_1.registerEvents)({
        client,
        statusManager,
        gateService,
        rulesService,
        planningManager
    });
    try {
        await (0, commands_1.registerGuildCommands)();
    }
    catch (error) {
        logger_1.logger.error('Impossible de synchroniser les commandes slash.', error);
    }
    await client.login(env_1.config.discord.token);
}
/**
 * Gestionnaire d'erreur global pour les erreurs non capturées.
 * Assure que toutes les erreurs fatales sont loggées avant la fermeture de l'application.
 */
main().catch(error => {
    logger_1.logger.error('Erreur fatale lors de l’exécution du bot.', error);
    process.exitCode = 1;
});
