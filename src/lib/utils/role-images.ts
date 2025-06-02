type RoleImageMap = {
  [key: string]: string[];
};

const roleImages: RoleImageMap = {
  don: [
    '/src/assets/mafia-don-character.png',
    '/src/assets/mafia-don-character-2.png',
  ],
  mafia: [
    '/src/assets/mafia-regular-character.png',
    '/src/assets/mafia-regular-character-2.png',
    '/src/assets/mafia-regular-character-3.png',
    '/src/assets/mafia-regular-character-4.png',
  ],
  sheriff: [
    '/src/assets/sheriff-character-1.png',
  ],
  civilian: [
    '/src/assets/civilian-character-1.png',
    '/src/assets/civilian-character-2.png',
    '/src/assets/civilian-character-3.png',
    '/src/assets/civilian-character-4.png',
  ],
};

export function getRandomRoleImage(role: string): string {
  const images = roleImages[role] || [];
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
} 