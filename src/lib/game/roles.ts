import { MAFIA_RATIO, MIN_PLAYERS_FOR_SHERIFF } from '../consts';
import type { Role } from '../store/types';

export const computeRoles = (playerCount: number): Role[] => {
  const roles: Role[] = [];
  roles.push('don');
  const mafiaCount = Math.max(1, Math.floor(playerCount * MAFIA_RATIO));
  for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
  if (playerCount >= MIN_PLAYERS_FOR_SHERIFF) roles.push('sheriff');
  while (roles.length < playerCount) roles.push('civilian');
  return roles;
};

export const isMafiaRole = (role: Role | undefined): boolean =>
  role === 'don' || role === 'mafia';

export const isCivilianRole = (role: Role | undefined): boolean =>
  role === 'sheriff' || role === 'civilian';
