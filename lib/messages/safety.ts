// Used to keep phone numbers, emails and links out of messages once
// contact details become a paid feature (Monetization > credits).
export function containsContactDetails(text: string) {
  const digits = /(?:\d[\s\-.]?){10,}/;
  const email = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  const link = /(https?:\/\/|www\.)\S+/i;
  return digits.test(text) || email.test(text) || link.test(text);
}