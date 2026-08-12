/**
 * GameConfig — global configuration singleton for StarForge Strike.
 *
 * Stores the currently selected plane type and provides metadata
 * for all available fighters. This module is a simple module-level
 * singleton that can be imported and used anywhere in the application.
 */
/**
 * Global configuration object for the game.
 * Currently stores the selected plane type.
 */
export const GameConfig = {
    /** The currently selected plane type. Defaults to 'vanguard'. */
    selectedPlane: 'vanguard',
};
/**
 * Metadata for all three fighter planes.
 * Used by the UI to display plane information in the selection screen.
 */
export const PLANE_DATA = {
    vanguard: {
        name: 'VANGUARD',
        description: 'Balanced fighter with parallel bullet streams. Reliable and versatile.',
        primaryColor: '#2a3a4a',
        accentColor: '#00c8ff',
    },
    phantom: {
        name: 'PHANTOM',
        description: 'Agile interceptor with wide scatter shots. Devastating at close range.',
        primaryColor: '#3a2a4a',
        accentColor: '#ff00c8',
    },
    titan: {
        name: 'TITAN',
        description: 'Heavy assault craft with a massive energy beam. Slow but unstoppable.',
        primaryColor: '#4a3a2a',
        accentColor: '#ffaa00',
    },
};
