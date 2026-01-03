import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

/**
 * Charge les variables d'environnement depuis les fichiers .env selon l'environnement.
 * Ordre de priorité:
 * 1. .env.{NODE_ENV}.local
 * 2. .env.{NODE_ENV}
 * 3. .env.local
 * 4. .env
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const candidates = [
  `.env.${nodeEnv}.local`,
  `.env.${nodeEnv}`,
  '.env.local',
  '.env'
];

for (const filename of candidates) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}

/**
 * Statut possible de la salle de sport.
 */
export type GymStatus = 'Ouverte' | 'Fermée';

/**
 * Configuration Twilio pour l'envoi de SMS (notifications portail).
 */
export interface TwilioConfig {
  /** SID du compte Twilio */
  accountSid: string;
  /** Token d'authentification Twilio */
  authToken: string;
  /** Numéro de téléphone Twilio expéditeur */
  fromNumber: string;
  /** Liste des numéros de téléphone à notifier pour les ouvertures de portail */
  gateNotificationNumbers: string[];
  /** Région Twilio (ex: 'ie1', 'us1') */
  region: string;
}

/**
 * Configuration complète de l'application.
 * Contient toutes les configurations nécessaires pour le bot Discord.
 */
export interface AppConfig {
  /** Configuration Discord */
  discord: {
    /** Token du bot Discord */
    token: string;
    /** ID client du bot */
    clientId: string;
    /** ID de la guilde (serveur) */
    guildId: string;
  };
  /** Configuration du planning */
  planning: {
    /** Nom de la catégorie Discord pour les canaux de planning */
    categoryName: string;
    /** Nombre de jours à créer à l'avance */
    daysAhead: number;
    /** Expression cron pour la maintenance automatique */
    maintenanceCron: string;
    /** Liste des créneaux horaires */
    timeSlots: string[];
    /** Décalage horaire en heures */
    timeOffsetHours: number;
  };
  /** Configuration du statut de la salle */
  status: {
    /** Statut par défaut au démarrage */
    defaultStatus: GymStatus;
    /** URLs des images pour chaque statut */
    images: Record<GymStatus, string>;
  };
  /** Configuration Twilio (null si non configuré) */
  twilio: TwilioConfig | null;
  /** Configuration des règles */
  rules: {
    /** Nom du rôle à attribuer lors de l'acceptation */
    memberRoleName: string;
    /** Fichier de log des signatures */
    logFile: string;
  };
  /** Configuration des rappels de poubelles */
  trash: {
    /** Nom du channel Discord pour les rappels de poubelles */
    channelName: string;
  };
  /** Timezone de l'application (format IANA) */
  timezone: string;
}

/**
 * Récupère une variable d'environnement requise.
 * Lance une erreur si la variable n'est pas définie.
 *
 * @param {string} key - Nom de la variable d'environnement
 * @returns {string} Valeur de la variable
 * @throws {Error} Si la variable n'est pas définie
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Collecte tous les numéros de téléphone configurés pour les notifications de portail.
 * Recherche GATE_PHONE_NUMBER, GATE_PHONE_NUMBER_1, GATE_PHONE_NUMBER_2, etc.
 *
 * @returns {string[]} Liste des numéros de téléphone configurés
 */
function collectGateNumbers(): string[] {
  const rawNumbers = [
    process.env.GATE_PHONE_NUMBER,
    process.env.GATE_PHONE_NUMBER_1,
    process.env.GATE_PHONE_NUMBER_2
  ];

  return rawNumbers.filter((value): value is string => Boolean(value));
}

/**
 * Construit la configuration Twilio à partir des variables d'environnement.
 * Retourne null si les variables requises ne sont pas définies.
 *
 * @returns {TwilioConfig | null} Configuration Twilio ou null si non configuré
 */
function buildTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    gateNotificationNumbers: collectGateNumbers(),
    region: process.env.TWILIO_REGION ?? 'ie1'
  };
}

/**
 * Parse une variable d'environnement numérique.
 * Retourne la valeur par défaut si la variable n'est pas définie ou invalide.
 *
 * @param {string | undefined} value - Valeur de la variable d'environnement
 * @param {number} defaultValue - Valeur par défaut à retourner
 * @returns {number} Valeur numérique parsée ou valeur par défaut
 */
function parseNumericEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Créneaux horaires par défaut pour le planning.
 */
const planningTimeSlots = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
  '22:00 - 00:00'
];

/**
 * Configuration globale de l'application.
 * Chargée depuis les variables d'environnement au démarrage.
 *
 * @example
 * ```typescript
 * import { config } from './config/env';
 * await client.login(config.discord.token);
 * ```
 */
export const config: AppConfig = {
  discord: {
    token: getRequiredEnv('DISCORD_TOKEN'),
    clientId: getRequiredEnv('DISCORD_CLIENT_ID'),
    guildId: getRequiredEnv('DISCORD_GUILD_ID')
  },
  planning: {
    categoryName: process.env.PLANNING_CATEGORY ?? 'Planning',
    daysAhead: parseNumericEnv(process.env.PLANNING_DAYS_AHEAD, 7),
    maintenanceCron: process.env.PLANNING_CRON ?? '*/1 11-20 * * *',
    timeSlots: planningTimeSlots,
    timeOffsetHours: parseNumericEnv(process.env.TIME_OFFSET_HOURS, 1)
  },
  status: {
    defaultStatus: 'Fermée',
    images: {
      Ouverte: process.env.GYM_STATUS_OPEN_IMAGE
        ?? 'https://cdn.discordapp.com/attachments/1254003995454996522/1278085289893695559/open.png',
      Fermée: process.env.GYM_STATUS_CLOSED_IMAGE
        ?? 'https://cdn.discordapp.com/attachments/1254003995454996522/1278085289054572575/close.png'
    }
  },
  twilio: buildTwilioConfig(),
  rules: {
    memberRoleName: process.env.MEMBER_ROLE_NAME ?? 'Membre',
    logFile: process.env.RULES_LOG_FILE ?? 'signatures_log.txt'
  },
  trash: {
    channelName: process.env.TRASH_CHANNEL_NAME ?? 'rappels-poubelles'
  },
  timezone: process.env.APP_TIMEZONE ?? 'Europe/Paris'
};

