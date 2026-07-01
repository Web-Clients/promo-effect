# Plan complet — Clienți, Contacte, Nomenclator HS, Istoric email/container

Data: 2026-07-01. Branch: `ui-ux-fixes` (fixuri) — deploy prod separat, la aprobare.

## Constatări (verificate pe DB live)

- **NU sunt companii dublate** (0 după nume, 0 după IDNO). Cele care par dublate = 6 clienți demo vechi ("ion srl" etc.) amestecați cu cei 387 reali.
- **Datele extra EXISTĂ deja în DB**: 334 TVA, 382 bancă, 376 SWIFT, 384 IBAN. Nu se VĂD în interfață pentru că modelul/API/UI nu le afișează încă (am adăugat doar coloanele în DB la import).
- Calculatorul: reparat prin normalizare porturi (Shanghai merge). Fix case-insensitive în cod = pe branch, needeployat.

---

## FAZA 1 — Clienți: afișare date complete

1.1 Adaugă în `schema.prisma` (Client): `vatCode`, `bankName`, `swift` (coloanele există deja în DB — sincronizează schema + migrare formală).
1.2 Backend: include noile câmpuri în select/return la GET clients + GET client/:id + create/update.
1.3 Frontend `types.ts` Client: adaugă vatCode/bankName/swift.
1.4 UI ClientsList + detaliu client: afișează IDNO, TVA, Bancă, SWIFT, IBAN, adresă.
1.5 Formular adăugare/editare client: câmpuri pentru toate cele de mai sus.

## FAZA 2 — Contacte multiple per client + abonare

2.1 Model nou `ClientContact` { id, clientId, name, role (Director/Logist/Contabil/etc.), email, phone, subscribed (bool), isPrimary (bool), createdAt }.
2.2 Migrare: mută `contactPerson/email/phone` actuale în câte un ClientContact primar per client.
2.3 Backend CRUD: adaugă/editează/șterge contacte per client; endpoint listă contacte.
2.4 UI: la fiecare client, secțiune "Persoane de contact" — adaugă N contacte, fiecare cu nume, rol, email, telefon.
2.5 Bifă "Primește emailuri/informații" per contact (subscribed) — decidem cui trimitem.
2.6 La trimiterea de notificări/rapoarte: trimite DOAR contactelor cu subscribed=true.

## FAZA 3 — Pagina Clienți: dezvoltare completă

3.1 Căutare reală (nume, IDNO, email, telefon) cu debounce corect (acum e no-op — bug din audit).
3.2 Filtre: status (activ/inactiv), cu/fără email real, oraș.
3.3 Sortare pe coloane (nume, nr. rezervări, sold).
3.4 Paginare reală + număr total.
3.5 Empty state, loading skeleton, badge status corect (bug din audit: status nedefinit → text brut).
3.6 Export CSV/Excel al listei.
3.7 Buton "Completează emailul real" pentru cei 336 cu email placeholder `import-*`.

## FAZA 4 — Deduplicare

4.1 Verificare exactă (făcută: 0 dubluri).
4.2 Verificare fuzzy (near-duplicate): "SRL" vs "S.R.L.", spații, diacritice — raport de potriviri apropiate.
4.3 Curăță cei 6 clienți demo vechi (ion srl, Test etc.) — cu confirmarea ta.
4.4 Constrângere anti-duplicat la creare (avertizează dacă IDNO/nume există deja).

## FAZA 5 — Istoric per client + sincronizare email + selectare pe CONTAINER

5.1 La fiecare client: tab "Istoric" = rezervări + containere + emailuri primite + facturi.
5.2 Atribuire automată email→client: emailul intră → parser extrage → se leagă de client (după IDNO/nume/email expeditor) și de rezervare.
5.3 Selectare/căutare după **NUMĂRUL CONTAINERULUI** (nu al booking-ului) — listă de containere per client, click pe container → istoric + poziție live pe hartă.
5.4 Sincronizare corectă: tot ce se adună din mail apare la clientul corect, legat de containerul corect.
5.5 Timeline container (evenimente tracking) vizibil la client.

## FAZA 6 — Nomenclator vamal HS (Moldova, română)

Sursă oficială publică găsită (vezi mai jos). Modelul `HsCode` există deja (gol).
6.1 Descarcă nomenclatorul oficial RO (legis.md / statistica.gov.md — .docx/.doc).
6.2 Parsează: cod (6/8/9 cifre), descriere RO, capitol, poziție.
6.3 Importă în tabelul `hs_codes` (mii de coduri).
6.4 Taxe vamale: din TARIM (customs.gov.md) — fază separată (cod+descriere au prioritate).
6.5 Selector căutabil în UI: omul scrie "jucării/haine/orice" → rezultate cod HS + descriere (endpoint /hscodes/search există deja).
6.6 Leagă selectorul HS la rezervare/calculator (categorie marfă → cod HS).

## FAZA 7 — Calculator: completare prețuri

7.1 Deploy fix case-insensitive (cod) — la aprobarea deploy-ului.
7.2 Completează base_prices pentru toate porturile × linii × tip container (de la tarifele tale reale).
7.3 Deploy fix upsert base price (re-adăugare fără eroare de duplicat).

## FAZA 8 — Fixuri audit UI/UX (deja începute pe branch)

8.1 BLOCKER: harta falsă landing ✅, role-gating admin ✅, parser email ✅.
8.2 BLOCKER rămase: contact form, CTA-uri marketing, "Șterge"→anulare, "Bun venit Ion"/căutare moartă, ContainerMap crash null AIS.
8.3 HIGH/MEDIUM/LOW: vezi `docs/UI-UX-AUDIT.md`.

## FAZA 9 — Deploy & git

9.1 Commit pe branch în loturi logice.
9.2 Deploy complet backend+frontend pe prod (la aprobare / regulă de permisiune).
9.3 Reconciliere git (prod e pe main@53cfa92, branch e pe a21743d — de aliniat).

---

## Nomenclator — surse oficiale RO (domeniu public)

- Legea + anexa (nomenclatura completă .docx): https://www.legis.md/UserFiles/Image/RO/2021/mo273md/172_anexa.docx
- Statistica MD (.doc): https://statistica.gov.md/files/files/Clasificatoare/Nomenclatura_Combinata_Marfurilor_275.doc
- Portal comerț MD: https://trade.gov.md/ro/articles/nomenclatura-combinata-a-marfurilor-republicii-moldova
- TARIM (tarif integrat cu taxe) — customs.gov.md
- Structură: primele 6 cifre = HS-2022, 7-8 = Nomenclatura Combinată UE, cifra 9 = detaliu național.
