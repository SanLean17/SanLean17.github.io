import {collect} from './bluesky.mjs';
// Future adapters must return verified source records with the same contract.
// X_ES and DBD_WEB are deliberately disabled: no paid API, fragile scraper or credentials.
export const enabledSources=[{id:'bluesky',collect}];
