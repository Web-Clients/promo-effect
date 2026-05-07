import prisma from '../lib/prisma';

/**
 * Generează ID unic pentru booking în formatul: MDPE2026050001
 * MDPE + An(4) + Lună(2) + Număr secvențial(4), resetat lunar.
 *
 * Exemple:
 *   - April 2026: MDPE2026040001, MDPE2026040002, ...
 *   - May 2026: MDPE2026050001 (resetat la 0001)
 */
export async function generateBookingId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear(); // 2026
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 05

  const prefix = `MDPE${year}${month}`; // MDPE202605

  // Găsește ultimul booking din această lună cu noul format
  const lastBooking = await prisma.booking.findFirst({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc',
    },
  });

  let sequenceNumber = 1;

  if (lastBooking) {
    // Extrage numărul secvențial din ultimul ID (după prefix)
    const lastSeq = parseInt(lastBooking.id.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) sequenceNumber = lastSeq + 1;
  }

  // Formatare cu 4 cifre (0001, 0002, ..., 9999)
  const sequenceStr = sequenceNumber.toString().padStart(4, '0');

  return `${prefix}${sequenceStr}`; // Ex: MDPE2026050001
}
