/**
 * The letter shown in a client's avatar until real logos exist: the first letter of the brand name,
 * skipping the word "شركة" (company) and the article "ال", so "شركة الجبر للسيارات" gives "ج" and
 * "شركة وجناد العقارية" gives "و".
 */
export function avatarLetter(name: string): string {
  const words = name.trim().split(/\s+/);
  const word = words.length > 1 && words[0] === 'شركة' ? words[1] : words[0];
  const brand = word && word.length > 3 && word.startsWith('ال') ? word.slice(2) : word;
  return brand?.charAt(0) ?? '';
}
