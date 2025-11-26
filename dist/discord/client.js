"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const discord_js_1 = require("discord.js");
/**
 * Crée et configure le client Discord avec les intents et partiels nécessaires.
 *
 * Intents configurés:
 * - Guilds: Pour accéder aux informations des serveurs
 * - GuildMessages: Pour recevoir les messages des serveurs
 * - GuildMessageReactions: Pour détecter les réactions aux messages
 * - MessageContent: Pour accéder au contenu des messages
 * - DirectMessages: Pour recevoir les messages privés
 *
 * Partials configurés:
 * - Channel, Message, Reaction: Pour gérer les objets partiels Discord.js
 *
 * @returns {Client} Client Discord configuré et prêt à être connecté
 *
 * @example
 * ```typescript
 * const client = createClient();
 * await client.login(token);
 * ```
 */
function createClient() {
    return new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.GuildMessageReactions,
            discord_js_1.GatewayIntentBits.MessageContent,
            discord_js_1.GatewayIntentBits.DirectMessages
        ],
        partials: [
            discord_js_1.Partials.Channel,
            discord_js_1.Partials.Message,
            discord_js_1.Partials.Reaction
        ]
    });
}
