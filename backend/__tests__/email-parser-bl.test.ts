/**
 * Bill-of-lading extraction from carrier emails.
 *
 * These tests drive `parseEmailWithRegex` — the function production actually
 * calls — rather than a helper defined in the test file. The previous version
 * of this suite tested a local `content.match()` helper whose semantics
 * differed from the parser's (full matches instead of capture groups), so it
 * could neither pass nor prove anything about the shipping path.
 *
 * All five samples returned nothing before 8 Sep 2026. The label pattern
 * required the literal "No": `B\/L\s*N[Oo]\.?`. Real carrier mail writes
 * "B/L Number:" or names the document without any qualifier at all
 * ("Bill of Lading COSU1234567890"), and `N[Oo]` cannot match the "Nu" of
 * "Number". Ion reported the visible half of this on 8 Sep — a bill of lading
 * uploaded and then absent from the booking.
 *
 * KEY RULE under test: a BL and a container number are different things and are
 * never the same value. A container is exactly 4 letters + 7 digits (ISO 6346)
 * and must never be accepted as a BL.
 */

import { parseEmailWithRegex } from '../src/modules/emails/email-parser';
import { ParsedEmail } from '../src/modules/emails/email.types';

function email(subject: string, body: string): ParsedEmail {
  return {
    id: 'test',
    from: 'agent@carrier.com',
    subject,
    date: new Date(),
    body,
    attachments: [],
  };
}

describe('BL extraction from carrier emails', () => {
  it('reads "B/L Number:" — the spelling that returned nothing', async () => {
    const r = await parseEmailWithRegex(
      email(
        'Booking Confirmation MEDUKC298446',
        `Dear Customer,
Please find attached the B/L for container FTAU1173171.
B/L Number: MEDUKC298446
Vessel: MSC AYDIN`
      )
    );
    expect(r.blNumber).toBe('MEDUKC298446');
  });

  it('reads an unqualified "Bill of Lading <value>"', async () => {
    const r = await parseEmailWithRegex(
      email(
        'COSCO Bill of Lading COSU1234567890',
        `The Bill of Lading COSU1234567890 has been released.
Container: CCLU1234567
Route: Ningbo to Constanta`
      )
    );
    expect(r.blNumber).toBe('COSU1234567890');
  });

  it('does not swallow the words after an unqualified label', async () => {
    // "Bill of Lading COSU1234567890 has been released" must not yield
    // "COSU1234567890 HAS" — the greedy value pattern has to stop at the token.
    const r = await parseEmailWithRegex(
      email('x', 'The Bill of Lading COSU1234567890 has been released.')
    );
    expect(r.blNumber).not.toMatch(/HAS/);
  });

  it('still reads the classic "B/L No:" form', async () => {
    const r = await parseEmailWithRegex(
      email('Telex release', 'B/L No: HLCUSHA230512345\nTelex release confirmed.')
    );
    expect(r.blNumber).toBe('HLCUSHA230512345');
  });

  it('reads a BL that carries an internal space', async () => {
    const r = await parseEmailWithRegex(email('x', 'B/L Number: ASG 202604078\nVessel: X'));
    expect(r.blNumber).toBe('ASG 202604078');
  });

  it('reads "BL Nr." — the spelling the Romanian office uses', async () => {
    const r = await parseEmailWithRegex(email('x', 'BL Nr. MEDUKC298446'));
    expect(r.blNumber).toBe('MEDUKC298446');
  });

  it('extracts the container number alongside the BL', async () => {
    const r = await parseEmailWithRegex(
      email('x', 'B/L Number: MEDUKC298446\nContainer: FTAU1173171')
    );
    expect(r.containerNumber).toBe('FTAU1173171');
    expect(r.blNumber).toBe('MEDUKC298446');
  });

  it('never accepts a container number as a BL', async () => {
    // A container is 4 letters + 7 digits. If the only labelled value is one,
    // the BL must come back empty rather than wrong.
    const r = await parseEmailWithRegex(email('x', 'B/L Number: FTAU1173171'));
    expect(r.blNumber).toBeUndefined();
  });

  it('returns nothing on plain prose rather than inventing a BL', async () => {
    const r = await parseEmailWithRegex(
      email('Meeting', 'Bill of Lading has been discussed at the meeting yesterday.')
    );
    expect(r.blNumber).toBeUndefined();
  });

  it('falls back to a carrier prefix when no label is present', async () => {
    const r = await parseEmailWithRegex(email('x', 'Ref HLCUSHA230512345 released.'));
    expect(r.blNumber).toBe('HLCUSHA230512345');
  });
});
