export const MODULE_ID = "rations-and-rot";
export const MODULE_TITLE = "Rations & Rot";
export const MODULE_VERSION = "1.0.2";

export const SECONDS_PER_HOUR = 60 * 60;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export const FLAGS = Object.freeze({
  TRACKING: "tracking"
});

export const STATES = Object.freeze({
  FRESH: "fresh",
  WARNING: "warning",
  SPOILED: "spoiled"
});

export const SETTINGS = Object.freeze({
  ENABLE_AUTOMATION: "enableAutomation",
  AUTO_DETECT_DND5E: "autoDetectDnd5e",
  ENABLE_NAME_MATCHING: "enableNameMatching",
  NAME_PATTERN: "namePattern",
  DEFAULT_SHELF_LIFE_DAYS: "defaultShelfLifeDays",
  WARNING_HOURS: "warningHours",
  ACTOR_SCOPE: "actorScope",
  ACTOR_FOLDER_PATTERN: "actorFolderPattern",
  ACTOR_FOLDER_RECURSIVE: "actorFolderRecursive",
  SELECTED_ACTOR_IDS: "selectedActorIds",
  SELECTED_ACTOR_FOLDER_IDS: "selectedActorFolderIds",
  NOTIFICATION_AUDIENCE: "notificationAudience",
  PLAYERS_CAN_MANAGE: "playersCanManage",
  DASHBOARD_VISIBLE_TO_PLAYERS: "dashboardVisibleToPlayers",
  DEBUG_LOGGING: "debugLogging",
  DASHBOARD_POSITION: "dashboardPosition",
  INVENTORY_POSITION: "inventoryPosition",
  ACTOR_PICKER_POSITION: "actorPickerPosition",
  CUSTOM_ITEM_POSITION: "customItemPosition"
});

export const STORAGE_PRESETS = Object.freeze([
  { value: 2, label: "Hot / exposed", hint: "Spoils twice as fast." },
  { value: 1, label: "Normal", hint: "Normal spoilage rate." },
  { value: 0.5, label: "Cool storage", hint: "Spoils at half speed." },
  { value: 0.25, label: "Cold storage", hint: "Spoils at quarter speed." },
  { value: 0.1, label: "Preserved", hint: "Spoils at one tenth speed." },
  { value: 0, label: "Suspended", hint: "Spoilage does not advance." }
]);

export const DEFAULT_NAME_PATTERN = String.raw`\b(ration|food|meal|bread|meat|fish|cheese|milk|fruit|vegetable|egg|stew|soup|sausage|ham|jerky)\b`;
