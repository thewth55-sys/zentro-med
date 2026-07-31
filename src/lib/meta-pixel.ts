/**
 * Single source of truth for the company's own Meta Pixel/dataset id
 * (zentro.labs' ad account measuring signups/purchases of the
 * zentro-med product itself — NOT the per-customer conversion
 * tracking feature in `src/lib/conversions/`, which is a different
 * pixel per CRM customer). Referenced by the public landing pages
 * (base PageView init) and by `PurchaseConversionTracker` (the
 * post-checkout value event).
 */
export const META_PIXEL_ID = "1679040453327329";
