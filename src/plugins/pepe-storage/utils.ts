import {UltraId, UltraRare} from '.';

/**
 * for comparisons, generate an ID from an ultras number and name
 * @remark the vid and card property may change. Vids are currently gifs,
 *         because Discord doesn't allow animated webp or looping mp4s
 * @param pepe
 * @returns `${pepe.number} - ${pepe.name}`
 */
export const ultraId = (pepe: UltraRare): UltraId =>
  `[${pepe.number}] ${pepe.name}`;
