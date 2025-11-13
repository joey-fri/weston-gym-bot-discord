import {
  Client,
  GatewayIntentBits,
  Partials
} from 'discord.js';

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
export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.Reaction
    ]
  });
}

