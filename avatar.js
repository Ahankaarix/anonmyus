// Simple avatar generation module
// This creates a simple text-based avatar or returns a default one

/**
 * Generate a simple avatar for anonymous users
 * @param {string} seed - Seed for avatar generation
 * @returns {string} - Simple avatar representation
 */
export default function getAvatar(seed = 'default') {
    // Simple text-based avatars using Unicode characters
    const avatars = [
        '🤖', '👤', '🎭', '👻', '🎪', '🎨', '🎯', '🎲',
        '⚡', '🔥', '💎', '🌟', '🔮', '🎊', '🎈', '🎁',
        '🚀', '🛸', '⭐', '🌙', '☄️', '🌈', '💫', '✨'
    ];
    
    // Use seed to determine avatar
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    const index = Math.abs(hash) % avatars.length;
    return avatars[index];
}

/**
 * Generate a colored terminal avatar
 * @param {string} seed - Seed for avatar generation
 * @returns {string} - Terminal colored avatar
 */
export function getTerminalAvatar(seed = 'default') {
    const colors = [
        '\u001b[31m', // Red
        '\u001b[32m', // Green
        '\u001b[33m', // Yellow
        '\u001b[34m', // Blue
        '\u001b[35m', // Magenta
        '\u001b[36m', // Cyan
        '\u001b[37m', // White
    ];
    
    const shapes = ['●', '■', '▲', '♦', '★', '♠', '♥', '♣'];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const shapeIndex = Math.abs(hash >> 3) % shapes.length;
    
    return `${colors[colorIndex]}${shapes[shapeIndex]}\u001b[0m`;
}
