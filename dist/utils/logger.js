"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Mappage des niveaux de log vers leurs préfixes d'affichage.
 */
const prefixes = {
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
function log(level, message, ...args) {
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
exports.logger = {
    /**
     * Log un message informatif.
     *
     * @param {string} message - Message à logger
     * @param {...unknown[]} args - Arguments supplémentaires
     */
    info: (message, ...args) => log('info', message, ...args),
    /**
     * Log un avertissement.
     *
     * @param {string} message - Message d'avertissement
     * @param {...unknown[]} args - Arguments supplémentaires
     */
    warn: (message, ...args) => log('warn', message, ...args),
    /**
     * Log une erreur.
     *
     * @param {string} message - Message d'erreur
     * @param {...unknown[]} args - Arguments supplémentaires (typiquement l'objet Error)
     */
    error: (message, ...args) => log('error', message, ...args),
    /**
     * Log un message de debug (uniquement en développement).
     *
     * @param {string} message - Message de debug
     * @param {...unknown[]} args - Arguments supplémentaires
     */
    debug: (message, ...args) => log('debug', message, ...args)
};
