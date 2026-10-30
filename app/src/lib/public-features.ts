import 'server-only';
import { getSettings } from './catalog';
import { publicFeatures, type PublicFeatures } from './features';

/* Options visibles côté client, d'après les options achetées */
export async function getPublicFeatures(): Promise<PublicFeatures> {
  return publicFeatures((await getSettings()).enabledOptions);
}
