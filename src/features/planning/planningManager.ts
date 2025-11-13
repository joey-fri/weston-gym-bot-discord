import {
  CategoryChannel,
  ChannelType,
  Client,
  Guild,
  TextChannel
} from 'discord.js';
import cron from 'node-cron';

import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Gestionnaire du planning.
 * 
 * Responsabilités:
 * - Créer et maintenir les canaux Discord pour le planning
 * - Synchroniser périodiquement le planning
 *
 * @example
 * ```typescript
 * const planningManager = new PlanningManager(client, guildId);
 * await planningManager.initialize();
 * ```
 */
export class PlanningManager {
  /** ID de la catégorie de planning Discord */
  private categoryId: string | null = null;
  /** Tâche cron pour la maintenance automatique */
  private maintenanceTask: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Crée une nouvelle instance du gestionnaire de planning.
   *
   * @param {Client} client - Client Discord
   * @param {string} guildId - ID de la guilde Discord
   */
  constructor(
    private readonly client: Client,
    private readonly guildId: string
  ) {}

  /**
   * Initialise le gestionnaire de planning.
   * 
   * Actions effectuées:
   * - Récupère ou crée la catégorie de planning
   * - Synchronise les canaux de planning
   * - Programme la maintenance automatique
   *
   * @returns {Promise<void>} Promise qui se résout quand l'initialisation est terminée
   * @throws {Error} Si l'initialisation échoue (guilde introuvable, permissions insuffisantes, etc.)
   */
  async initialize(): Promise<void> {
    const guild = await this.fetchGuild();
    const category = await this.ensureCategory(guild);
    this.categoryId = category.id;

    await this.syncPlanning(guild, category);
    this.scheduleMaintenance();
  }

  /**
   * Synchronise manuellement le planning (commande `/gym setup`).
   * 
   * Cette méthode est identique à `initialize()` mais peut être appelée
   * manuellement via une commande slash.
   *
   * @returns {Promise<void>} Promise qui se résout quand la synchronisation est terminée
   */
  async syncPlanningCommand(): Promise<void> {
    const guild = await this.fetchGuild();
    const category = await this.ensureCategory(guild);
    this.categoryId = category.id;
    await this.syncPlanning(guild, category);
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
   * Récupère ou crée la catégorie de planning dans la guilde.
   *
   * @param {Guild} guild - Guilde Discord
   * @returns {Promise<CategoryChannel>} Catégorie de planning
   * @private
   */
  private async ensureCategory(guild: Guild): Promise<CategoryChannel> {
    const existing = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === config.planning.categoryName
    ) as CategoryChannel | undefined;

    if (existing) {
      return existing;
    }

    const created = await guild.channels.create({
      name: config.planning.categoryName,
      type: ChannelType.GuildCategory
    });

    logger.info(`Catégorie "${config.planning.categoryName}" créée.`);
    return created;
  }

  /**
   * Synchronise les canaux de planning avec les jours à venir.
   * 
   * Actions effectuées:
   * - Supprime les canaux hors de la fenêtre autorisée
   * - Crée les canaux manquants pour les jours à venir
   * - Initialise les canaux créés avec les créneaux horaires
   *
   * @param {Guild} guild - Guilde Discord
   * @param {CategoryChannel} category - Catégorie de planning
   * @private
   */
  private async syncPlanning(guild: Guild, category: CategoryChannel): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const desiredChannels: Array<{ name: string; label: string }> = [];
    const allowedNames = new Set<string>();

    for (let i = 0; i < config.planning.daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayLabel = date
        .toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
        .toLowerCase();

      const channelName = dayLabel.replace(/\s+/g, '-');
      desiredChannels.push({ name: channelName, label: dayLabel });
      allowedNames.add(channelName);
    }

    const channels = guild.channels.cache.filter(
      channel =>
        channel.parentId === category.id &&
        channel.type === ChannelType.GuildText
    );

    for (const channel of channels.values()) {
      if (!allowedNames.has(channel.name)) {
        logger.info(`Suppression du salon hors plage: ${channel.name}`);
        await channel.delete('Salon de planning hors fenêtre autorisée');
      }
    }

    for (const { name: channelName, label: dayLabel } of desiredChannels) {
      const existingChannel = guild.channels.cache.find(
        channel =>
          channel.name === channelName &&
          channel.parentId === category.id &&
          channel.type === ChannelType.GuildText
      ) as TextChannel | undefined;

      if (existingChannel) {
        continue;
      }

      logger.info(`Création du salon: ${channelName}`);
      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category
      });

      await this.initializePlanningChannel(newChannel, dayLabel);
    }
  }

  /**
   * Initialise un nouveau canal de planning avec les créneaux horaires.
   *
   * @param {TextChannel} channel - Canal Discord à initialiser
   * @param {string} dayLabel - Label du jour (ex: "lundi 15 janvier")
   * @private
   */
  private async initializePlanningChannel(channel: TextChannel, dayLabel: string): Promise<void> {
    await channel.send({
      embeds: [
        {
          title: `Planning pour ${dayLabel}`,
          description: 'Réagissez avec ✅ sur un créneau pour indiquer votre présence.',
          color: 0xd80c44
        }
      ]
    });

    for (const slot of config.planning.timeSlots) {
      const message = await channel.send(slot);
      await message.react('✅');
    }
  }

  /**
   * Programme la maintenance automatique du planning.
   * La tâche est planifiée selon l'expression cron configurée.
   * 
   * Actions de maintenance:
   * - Synchronise les canaux de planning
   *
   * @private
   */
  private scheduleMaintenance(): void {
    if (this.maintenanceTask) {
      this.maintenanceTask.stop();
      this.maintenanceTask = null;
    }

    this.maintenanceTask = cron.schedule(
      config.planning.maintenanceCron,
      async () => {
        try {
          const guild = await this.fetchGuild();
          const category = await this.ensureCategory(guild);
          this.categoryId = category.id;
          await this.syncPlanning(guild, category);
        } catch (error) {
          logger.error('Erreur lors de la synchronisation planifiée du planning.', error);
        }
      },
      { timezone: config.timezone }
    );
  }
}

