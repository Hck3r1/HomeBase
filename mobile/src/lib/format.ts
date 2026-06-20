import { Listing } from '../types/listing';

/** Format integer kobo into a ₦ string (no decimals; NGN minor unit = kobo). */
export function formatNaira(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

/** Contextual price label depending on the listing type. */
export function priceLabelForListing(listing: Listing): string {
  switch (listing.listingType) {
    case 'rent': {
      const r = listing.rentDetails;
      if (r?.monthlyRent != null) return `${formatNaira(r.monthlyRent)}/mo`;
      if (r?.annualRent != null) return `${formatNaira(r.annualRent)}/yr`;
      return 'Price on request';
    }
    case 'sale':
      return listing.saleDetails ? formatNaira(listing.saleDetails.salePrice) : 'Price on request';
    case 'shortstay':
      return listing.shortstayDetails
        ? `${formatNaira(listing.shortstayDetails.nightlyRate)}/night`
        : 'Price on request';
    default:
      return 'Price on request';
  }
}
