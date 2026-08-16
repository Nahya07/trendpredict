import { providerRegistry } from '../providers/ProviderRegistry';
import { collectAndScoreOne } from '../services/opportunityService';
import { TRACKED_KEYWORDS } from '../config/trackedKeywords';

export async function runTrendSignalCollection() {
  for (const keyword of TRACKED_KEYWORDS) {
    const offers = await providerRegistry.getProductOffers({ keyword, limit: 3 });
    if (!offers.ok || !offers.data?.length) continue;

    // Score the top matching offer for this keyword; a fuller build would score every
    // match (Req #11 product matching), but one representative product per keyword keeps
    // the demo/first-run dataset small and readable.
    await collectAndScoreOne(keyword, offers.data[0]);
  }
}
