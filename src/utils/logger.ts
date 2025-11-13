/**
 * Niveau de log disponible dans l'application.
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Mappage des niveaux de log vers leurs préfixes d'affichage.
 */
const prefixes: Record<LogLevel, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  debug: '[DEBUG]'
};

/**
 * Fonction interne de logging qui formate et affiche les messages selon leur niveau.
 *
 * @param {LogLevel} level - Le niveau de sévérité du log
 * @param {string} message - Le message à logger
 * @param {...unknown[]} args - Arguments supplémentaires à logger
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const prefix = prefixes[level];
  const output = `${prefix} ${message}`;

  if (level === 'error') {
    console.error(output, ...args);
    return;
  }

  if (level === 'warn') {
    console.warn(output, ...args);
    return;
  }

  console.log(output, ...args);
}

/**
 * Utilitaire de logging pour l'application.
 * Fournit des méthodes pour logger des messages à différents niveaux de sévérité.
 *
 * @example
 * ```typescript
 * logger.info('Bot démarré avec succès');
 * logger.warn('Configuration manquante, utilisation des valeurs par défaut');
 * logger.error('Erreur lors de la connexion à Discord', error);
 * logger.debug('Détails de debug:', data);
 * ```
 */
export const logger = {
  /**
   * Log un message informatif.
   *
   * @param {string} message - Message à logger
   * @param {...unknown[]} args - Arguments supplémentaires
   */
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  
  /**
   * Log un avertissement.
   *
   * @param {string} message - Message d'avertissement
   * @param {...unknown[]} args - Arguments supplémentaires
   */
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  
  /**
   * Log une erreur.
   *
   * @param {string} message - Message d'erreur
   * @param {...unknown[]} args - Arguments supplémentaires (typiquement l'objet Error)
   */
  error: (message: string, ...args: unknown[]) => log('error', message, ...args),
  
  /**
   * Log un message de debug (uniquement en développement).
   *
   * @param {string} message - Message de debug
   * @param {...unknown[]} args - Arguments supplémentaires
   */
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args)
};

