import {
  CategoryChannel,
  ChannelType,
  Client,
  Guild,
  MessageReaction,
  TextChannel,
  User
} from 'discord.js';
import cron from 'node-cron';

import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Type de poubelle pour les rappels.
 */
export type TrashType = 'noir' | 'jaune';

/**
 * Configuration d'un rappel de poubelle.
 */
interface TrashReminderConfig {
  /** Type de poubelle */
  type: TrashType;
  /** Jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi) */
  dayOfWeek: number;
  /** Heure du rappel (0-23) */
  hour: number;
  /** Créneaux horaires du planning à vérifier */
  timeSlots: string[];
}

/**
 * Gestionnaire des rappels de poubelles.
 * 
 * Responsabilités:
 * - Créer et maintenir le channel Discord pour les rappels
 * - Programmer les rappels automatiques (mercredi 20h pour noir, jeudi 20h pour jaune)
 * - Récupérer les utilisateurs inscrits sur les créneaux pertinents du planning
 * - Envoyer les alertes avec @mention dans le channel dédié
 *
 * @example
 * ```typescript
 * const trashReminderService = new TrashReminderService(client, guildId);
 * await trashReminderService.initialize();
 * ```
 */
export class TrashReminderService {
  /** ID du channel de rappels de poubelles */
  private channelId: string | null = null;
  /** Tâches cron pour les rappels */
  private reminderTasks: Array<ReturnType<typeof cron.schedule>> = [];

  /**
   * Créneaux horaires à vérifier pour les rappels (18-20h, 20-22h, 22-00h).
   */
  private readonly relevantTimeSlots = [
    '18:00 - 20:00',
    '20:00 - 22:00',
    '22:00 - 00:00'
  ];

  /**
   * Configuration des rappels de poubelles.
   */
  private readonly reminderConfigs: TrashReminderConfig[] = [
    {
      type: 'noir',
      dayOfWeek: 3, // Mercredi (0 = dimanche, 3 = mercredi)
      hour: 20,
      timeSlots: this.relevantTimeSlots
    },
    {
      type: 'jaune',
      dayOfWeek: 4, // Jeudi (0 = dimanche, 4 = jeudi)
      hour: 20,
      timeSlots: this.relevantTimeSlots
    }
  ];

  /**
   * Crée une nouvelle instance du gestionnaire de rappels de poubelles.
   *
   * @param {Client} client - Client Discord
   * @param {string} guildId - ID de la guilde Discord
   */
  constructor(
    private readonly client: Client,
    private readonly guildId: string
  ) {}

  /**
   * Initialise le gestionnaire de rappels de poubelles.
   * 
   * Actions effectuées:
   * - Récupère ou crée le channel de rappels
   * - Programme les rappels automatiques
   *
   * @returns {Promise<void>} Promise qui se résout quand l'initialisation est terminée
   * @throws {Error} Si l'initialisation échoue (guilde introuvable, permissions insuffisantes, etc.)
   */
  async initialize(): Promise<void> {
    const guild = await this.fetchGuild();
    const channel = await this.ensureChannel(guild);
    this.channelId = channel.id;

    this.scheduleReminders();
    logger.info('Service de rappels de poubelles initialisé.');
  }

  /**
   * Récupère la guilde Discord depuis le client.
   *
   * @returns {Promise<Guild>} La guilde Discord
   * @throws {Error} Si la guilde est introuvable
   * @private
   */
  private async fetchGuild(): Promise<Guild> {
    const guild = await this.client.guilds.fetch(this.guildId);
    return guild;
  }

  /**
   * Récupère ou crée le channel de rappels de poubelles dans la guilde.
   * Le channel sera créé dans la catégorie "Fonctionnement asso" si elle existe.
   *
   * @param {Guild} guild - Guilde Discord
   * @returns {Promise<TextChannel>} Channel de rappels
   * @private
   */
  private async ensureChannel(guild: Guild): Promise<TextChannel> {
    // Chercher d'abord si le channel existe déjà
    const existing = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel.name === config.trash.channelName
    ) as TextChannel | undefined;

    if (existing) {
      return existing;
    }

    // Chercher la catégorie "Fonctionnement asso" si elle existe
    const category = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === 'Fonctionnement asso'
    ) as CategoryChannel | undefined;

    // Créer le channel dans la catégorie si elle existe, sinon sans catégorie
    const created = await guild.channels.create({
      name: config.trash.channelName,
      type: ChannelType.GuildText,
      parent: category ?? undefined
    });

    const location = category
      ? `dans la catégorie "${category.name}"`
      : 'sans catégorie';
    logger.info(`Channel "${config.trash.channelName}" créé ${location} pour les rappels de poubelles.`);
    return created;
  }

  /**
   * Programme les rappels automatiques avec node-cron.
   * 
   * Les rappels sont programmés selon la configuration:
   * - Poubelle noire: Mercredi à 20h
   * - Poubelle jaune: Jeudi à 20h
   *
   * @private
   */
  private scheduleReminders(): void {
    // Arrêter les tâches existantes si elles existent
    for (const task of this.reminderTasks) {
      task.stop();
    }
    this.reminderTasks = [];

    // Programmer chaque rappel
    for (const reminderConfig of this.reminderConfigs) {
      // Expression cron: minute heure jour-mois mois jour-semaine
      // Pour mercredi à 20h: "0 20 * * 3"
      // Pour jeudi à 20h: "0 20 * * 4"
      const cronExpression = `0 ${reminderConfig.hour} * * ${reminderConfig.dayOfWeek}`;

      const task = cron.schedule(
        cronExpression,
        async () => {
          try {
            await this.sendReminder(reminderConfig);
          } catch (error) {
            logger.error(
              `Erreur lors de l'envoi du rappel pour la poubelle ${reminderConfig.type}.`,
              error
            );
          }
        },
        { timezone: config.timezone }
      );

      this.reminderTasks.push(task);
      logger.info(
        `Rappel programmé pour la poubelle ${reminderConfig.type}: ${cronExpression}`
      );
    }
  }

  /**
   * Envoie un rappel pour un type de poubelle donné.
   * Récupère les utilisateurs inscrits sur les créneaux pertinents et les mentionne.
   *
   * @param {TrashReminderConfig} reminderConfig - Configuration du rappel
   * @private
   */
  private async sendReminder(reminderConfig: TrashReminderConfig): Promise<void> {
    if (!this.channelId) {
      logger.error('Channel de rappels non initialisé.');
      return;
    }

    const guild = await this.fetchGuild();
    const channel = guild.channels.cache.get(this.channelId) as TextChannel | undefined;

    if (!channel) {
      logger.error(`Channel de rappels introuvable: ${this.channelId}`);
      return;
    }

    // Récupérer les utilisateurs inscrits sur les créneaux pertinents
    const users = await this.getUsersFromPlanning(
      guild,
      reminderConfig.dayOfWeek,
      reminderConfig.timeSlots
    );

    // Construire le message avec les mentions
    const mentions = users.length > 0
      ? users.map(user => `<@${user.id}>`).join(' ')
      : '';

    const trashEmoji = reminderConfig.type === 'noir' ? '🗑️' : '🟡';
    const trashName = reminderConfig.type === 'noir' ? 'noire' : 'jaune';

    const message = mentions
      ? `${trashEmoji} **Rappel: Poubelle ${trashName}**\n\nN'oubliez pas de sortir la poubelle ${trashName} ce soir à 20h !\n\n${mentions}`
      : `${trashEmoji} **Rappel: Poubelle ${trashName}**\n\nN'oubliez pas de sortir la poubelle ${trashName} ce soir à 20h !`;

    await channel.send(message);
    logger.info(`Rappel envoyé pour la poubelle ${trashName} (${users.length} utilisateurs mentionnés).`);
  }

  /**
   * Récupère les utilisateurs inscrits sur les créneaux spécifiés du planning pour un jour donné.
   *
   * @param {Guild} guild - Guilde Discord
   * @param {number} dayOfWeek - Jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
   * @param {string[]} timeSlots - Créneaux horaires à vérifier
   * @returns {Promise<User[]>} Liste des utilisateurs inscrits
   * @private
   */
  private async getUsersFromPlanning(
    guild: Guild,
    dayOfWeek: number,
    timeSlots: string[]
  ): Promise<User[]> {
    // Calculer la date du jour concerné
    // Le rappel se déclenche à 20h pour rappeler de sortir la poubelle ce soir
    // Donc on veut toujours le planning du jour même
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    
    // Pour le test ou en production, on cherche toujours le planning d'aujourd'hui
    // car le rappel se déclenche le jour même où il faut sortir la poubelle
    const targetDate = new Date(today);
    targetDate.setHours(0, 0, 0, 0); // Normaliser à minuit pour la comparaison

    // Formater le nom du channel comme dans PlanningManager
    const dayLabel = targetDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toLowerCase();
    const channelName = dayLabel.replace(/\s+/g, '-');
    
    logger.info(`Recherche du channel de planning: ${channelName} (jour actuel: ${currentDayOfWeek}, jour cible config: ${dayOfWeek})`);

    // Trouver le channel de planning
    const planningCategory = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === config.planning.categoryName
    );

    if (!planningCategory) {
      logger.warn(`Catégorie de planning introuvable: ${config.planning.categoryName}`);
      return [];
    }

    const planningChannel = guild.channels.cache.find(
      channel =>
        channel.parentId === planningCategory.id &&
        channel.type === ChannelType.GuildText &&
        channel.name === channelName
    ) as TextChannel | undefined;

    if (!planningChannel) {
      logger.warn(`Channel de planning introuvable: ${channelName}`);
      return [];
    }

    logger.info(`Channel de planning trouvé: ${planningChannel.name} (ID: ${planningChannel.id})`);

    // Récupérer tous les messages du channel
    const messages = await planningChannel.messages.fetch({ limit: 100 });
    logger.info(`Nombre de messages récupérés: ${messages.size}`);
    const usersSet = new Set<string>();

    // Pour chaque créneau horaire à vérifier
    for (const timeSlot of timeSlots) {
      logger.info(`Recherche du créneau: ${timeSlot}`);
      // Trouver le message correspondant au créneau
      const slotMessage = messages.find(msg => msg.content === timeSlot);
      
      if (!slotMessage) {
        logger.warn(`Message pour le créneau ${timeSlot} introuvable`);
        continue;
      }

      logger.info(`Message trouvé pour ${timeSlot} (ID: ${slotMessage.id})`);

      // Récupérer les réactions ✅
      const reaction = slotMessage.reactions.cache.get('✅');
      if (!reaction) {
        logger.warn(`Aucune réaction ✅ trouvée pour le créneau ${timeSlot}`);
        continue;
      }

      // Récupérer tous les utilisateurs qui ont réagi
      const reactedUsers = await reaction.users.fetch();
      logger.info(`Nombre d'utilisateurs ayant réagi sur ${timeSlot}: ${reactedUsers.size}`);
      for (const user of reactedUsers.values()) {
        // Ignorer le bot
        if (!user.bot) {
          usersSet.add(user.id);
          logger.info(`Utilisateur ajouté: ${user.username} (${user.id})`);
        }
      }
    }
    
    logger.info(`Total d'utilisateurs uniques trouvés: ${usersSet.size}`);

    // Convertir les IDs en objets User
    const users: User[] = [];
    for (const userId of usersSet) {
      try {
        const user = await this.client.users.fetch(userId);
        users.push(user);
      } catch (error) {
        logger.warn(`Impossible de récupérer l'utilisateur ${userId}`, error);
      }
    }

    return users;
  }
}

