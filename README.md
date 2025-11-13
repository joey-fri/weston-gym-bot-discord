# Weston Gym Bot Discord

Un bot Discord moderne et professionnel pour la gestion complète d'une salle de sport, développé en TypeScript avec Discord.js v14.

## 📋 Description

Weston Gym Bot est une solution complète de gestion de salle de sport via Discord. Il permet de gérer le statut d'ouverture/fermeture de la salle, le planning des créneaux horaires, les demandes d'ouverture de portail via SMS, et l'acceptation des règles par les membres.

## ✨ Fonctionnalités

### 🏋️ Gestion du statut de la salle
- Affichage du statut actuel (Ouverte/Fermée) avec embeds Discord
- Boutons interactifs pour changer le statut
- Historique de la dernière action effectuée
- Images personnalisables pour chaque statut

### 📅 Système de planning
- Création automatique de canaux Discord pour les jours à venir
- Gestion des créneaux horaires personnalisables
- Système de réactions pour indiquer sa présence
- Maintenance automatique du planning

### 🚪 Gestion du portail (Twilio)
- Demandes d'ouverture de portail via bouton interactif
- Envoi de SMS via Twilio aux administrateurs
- Logs des demandes d'ouverture
- Support multi-numéros de notification

### 📜 Gestion des règles
- Bouton d'acceptation des règles
- Attribution automatique d'un rôle membre
- Logs des acceptations

## 🛠️ Technologies utilisées

- **TypeScript** - Langage de développement
- **Discord.js v14** - API Discord
- **Twilio** - Service SMS pour les notifications portail
- **node-cron** - Planification de tâches (maintenance planning)
- **dotenv** - Gestion des variables d'environnement

## 📦 Prérequis

- Node.js v18+ (recommandé: v20+)
- npm ou yarn
- Un bot Discord avec token
- Un compte Twilio (optionnel, pour la fonctionnalité portail)

## 🚀 Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/joey-fri/weston-gym-bot-discord.git
   cd weston-gym-bot-discord
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   
   Puis éditer le fichier `.env` avec vos valeurs.

4. **Compiler le projet**
   ```bash
   npm run build
   ```

5. **Démarrer le bot**
   ```bash
   npm start
   ```

   Pour le développement:
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

### Variables d'environnement

Voir le fichier `.env.example` pour la liste complète des variables nécessaires.

#### Variables Discord (requises)
- `DISCORD_TOKEN` - Token du bot Discord
- `DISCORD_CLIENT_ID` - ID client du bot
- `DISCORD_GUILD_ID` - ID de la guilde (serveur Discord)

#### Variables Twilio (optionnelles)
- `TWILIO_ACCOUNT_SID` - SID du compte Twilio
- `TWILIO_AUTH_TOKEN` - Token d'authentification Twilio
- `TWILIO_PHONE_NUMBER` - Numéro Twilio expéditeur
- `TWILIO_REGION` - Région Twilio (défaut: 'ie1')
- `GATE_PHONE_NUMBER` - Numéro de téléphone pour notifications portail
- `GATE_PHONE_NUMBER_1`, `GATE_PHONE_NUMBER_2` - Numéros supplémentaires

#### Variables de configuration (optionnelles)
- `PLANNING_CATEGORY` - Nom de la catégorie de planning (défaut: 'Planning')
- `PLANNING_DAYS_AHEAD` - Nombre de jours à créer à l'avance (défaut: 7)
- `PLANNING_CRON` - Expression cron pour la maintenance (défaut: '*/1 11-20 * * *')
- `TIME_OFFSET_HOURS` - Décalage horaire en heures (défaut: 1)
- `APP_TIMEZONE` - Timezone de l'application (défaut: 'Europe/Paris')
- `MEMBER_ROLE_NAME` - Nom du rôle membre (défaut: 'Membre')
- `RULES_LOG_FILE` - Fichier de log des signatures (défaut: 'signatures_log.txt')
- `GYM_STATUS_OPEN_IMAGE` - URL de l'image statut ouvert
- `GYM_STATUS_CLOSED_IMAGE` - URL de l'image statut fermé

### Configuration du bot Discord

1. Créer une application sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Créer un bot et copier le token
3. Activer les intents suivants:
   - Guilds
   - Guild Messages
   - Guild Message Reactions
   - Message Content
   - Direct Messages
4. Inviter le bot sur votre serveur avec les permissions nécessaires:
   - Gérer les canaux
   - Envoyer des messages
   - Gérer les messages
   - Utiliser les embeds
   - Ajouter des réactions
   - Gérer les rôles (pour les règles)

## 📖 Guide d'utilisation

### Commandes slash

- `/gym status` - Publier ou rafraîchir le statut de la salle dans le salon courant
- `/gym setup` - Synchroniser manuellement les salons de planning

### Utilisation du planning

1. Les canaux de planning sont créés automatiquement
2. Réagir avec ✅ sur un créneau horaire pour indiquer sa présence

### Ouverture du portail

1. Cliquer sur le bouton "Demander ouverture du portail" dans le message de statut
2. Un SMS est envoyé aux numéros configurés
3. La demande est loggée dans `portal_logs.txt`

## 🏗️ Architecture du projet

```
src/
├── config/
│   └── env.ts              # Configuration et gestion des variables d'environnement
├── discord/
│   ├── client.ts           # Création et configuration du client Discord
│   └── commands.ts         # Définition des commandes slash
├── events/
│   └── registerEvents.ts   # Enregistrement des événements Discord
├── features/
│   ├── gate/
│   │   └── gateService.ts  # Service de gestion du portail (Twilio)
│   ├── planning/
│   │   └── planningManager.ts  # Gestionnaire de planning
│   ├── rules/
│   │   └── rulesService.ts # Service d'acceptation des règles
│   └── status/
│       └── gymStatusManager.ts  # Gestionnaire du statut de la salle
├── utils/
│   └── logger.ts           # Utilitaire de logging
└── index.ts                # Point d'entrée de l'application
```

### Principes de conception

- **Séparation des responsabilités**: Chaque feature a son propre service
- **Configuration centralisée**: Toute la configuration via variables d'environnement
- **TypeScript strict**: Utilisation du mode strict pour la sécurité des types
- **Gestion d'erreurs**: Logging complet et gestion gracieuse des erreurs
- **Modularité**: Code organisé en modules réutilisables

## 📝 Scripts disponibles

- `npm run build` - Compile le TypeScript vers JavaScript
- `npm start` - Lance le bot en mode production
- `npm run dev` - Lance le bot en mode développement avec hot-reload


## 👤 Auteur

Développé avec ❤️ pour la gestion de notre salle de sport associative.

---