export const NETWORK_REFERRAL_DISCLOSURE_VERSION = "2026-09-01-v1";

export const NETWORK_COMPENSATION_DISCLOSURE =
  "Crown Network is free for families. Some participating providers may compensate Crown Network if a person referred through the service chooses their facility. Compensation does not determine organic search order.";

export const NETWORK_COMMUNICATION_DISCLOSURE =
  "Communication consent is optional and is not required to browse Crown Network or contact a provider directly. Message and data rates may apply to text messages, and you may reply STOP to opt out.";

export function buildNetworkSharingDisclosure(facilityNames: string[]) {
  const names = facilityNames.join(", ");
  return `I authorize Crown Network to share the contact information and care preferences shown in this request with ${names} so the selected providers may contact me about availability, services, pricing, and tours.`;
}
