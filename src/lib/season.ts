import { todayLocal } from './dates';

/** Halloween dress-up: from October 20 through October 31 (Halifax time), every year. */
export function isHalloween(today = todayLocal()) {
  const md = today.slice(5);
  return md >= '10-20' && md <= '10-31';
}
