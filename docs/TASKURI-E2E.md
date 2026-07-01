# Promo-Effect — Listă însărcinări E2E (cap-coadă)

Ultima actualizare: 2026-07-01. Surse: 2 transcrieri meeting client + audit UI/UX + cerințe Oleg.
Legendă: ✅ GATA & LIVE · 🔨 în lucru · ⏳ de făcut · 🔎 de verificat

---

## A. INFRASTRUCTURĂ / URGENȚE (rezolvate azi)

- ✅ Login reparat (era CORS — origine sslip.io lipsă din procesul viu; restart cu env corect)
- ✅ „Vezi rezervarea" + „Rezervare Nouă" merg (tot CORS) — verificat prin API public
- ✅ Deploy pe prod deblocat (permisiune ssh) + flux sigur: pull fișier → editează local → push → rebuild
- ✅ Model AI schimbat pe `gpt-5.5-mini` (mai bun+ieftin ca 5.4-mini)

## B. CLIENȚI — date (parțial live)

- ✅ Import 387 clienți din Excel (IDNO, IBAN, bancă, SWIFT, TVA în DB; +3 coloane noi)
- ✅ Verificat: 0 dubluri reale (nume/IDNO); cei „dubli" = 6 clienți demo vechi
- ⏳ **F1** Afișare TVA/bancă/SWIFT/IBAN în ecranul Clienți + în formular (schema+backend gata pe branch; UI + migrare formală rămân)
- ⏳ **F4** Curăță cei 6 clienți demo (ion srl, Test…) — cu confirmare
- ⏳ **F4** Anti-duplicat la creare (avertisment dacă IDNO/nume există)
- ⏳ **F3** Pagina Clienți completă: căutare reală (debounce), filtre (status/oraș), sortare, paginare, export CSV
- ⏳ **F3** Buton „completează email real" pt cei 336 cu email placeholder `import-*`

## C. CONTACTE MULTIPLE (F2)

- ✅ Model `ClientContact` scris în schema (branch): name, role, email, phone, subscribed, isPrimary
- ⏳ Migrare DB (creează tabelul client_contacts pe prod) + mutare contact primar existent
- ⏳ Backend CRUD contacte + include în GET client
- ⏳ UI: la fiecare client — **Director** (nume, telefon, email) + **Logist** (nume, familie, email, telefon)
- ⏳ Buton „adaugă persoană de contact" (email+telefon proprii)
- ⏳ **Bifă „primește mesaje"** per contact → doar bifații primesc statusul containerului
- ⏳ Notificările de monitorizare trimit DOAR contactelor bifate

## D. CALCULATOR — logică preț

- ✅ Case-insensitive porturi (SHANGHAI/Shanghai)
- ✅ **Bug 600→1550**: transport terestru din tabelul IMPORT (kg+destinație), nu setarea generală (era diacritice: chisinau≠Chișinău)
- ✅ **Ningbo/Qingdao calculează**: Shanghai = port de referință (bază Shanghai + ajustare port)
- ✅ **KG peste tot**: câmp liber kg în calculator; mapare kg→tone pt bandă terestră ȘI maritimă; fix `landSurcharge`
- ⏳ **D1** Afișare 2 SEGMENTE, câte UN preț total:
  - Shanghai→Constanța (maritim) = freight + ajustare port + suprataxă greutate + taxă portuară linie
  - Constanța→Chișinău (terestru) = transport + taxă vamală + comision + asigurare + marjă
  - **Ascunde** descompunerea (taxe vamale 180 etc.) + „prețul din colț" — clientul se sperie
- ⏳ **D2** Taxa portuară din tabelul liniei maritime (CMA 20ft=650, 40ft=700), NU din setări generale
- ⏳ **D3** Setări generale: SCOATE taxe portuare + transport terestru Constanța/Odessa; PĂSTREAZĂ taxă vamală, comision, asigurare, marjă profit. Restructurat pe destinație (Constanța / Odessa)
- ⏳ **D4 Incoterms FOB/CFR/EXW** sus în calculator, ÎNAINTE de portul de origine:
  - FOB → cumpărătorul plătește maritim (îl arătăm)
  - CFR/CIF → furnizorul acoperă maritim (nu-l punem pe client)
  - EXW → fără port origine; origine devine portul destinație (Chișinău)
  - Se preia la rezervare (asociere incoterm)
- ⏳ **D5** Port destinație: dropdown, **Constanța by default**; posibilitate de ADĂUGAT porturi (Varna) în setări + transportul lor spre Chișinău
- 🔎 **D6** Marjă profit (0,5% / 2%) — confirmă cum se aplică (procent pe total?)
- 🔎 **D7** „Nu s-a putut calcula prețul" în fluxul de REZERVARE (nu doar calculator) — verifică după fixuri

## E. REZERVĂRI

- 🔎 **E1** „Rezervare nouă — ceva n-a mers bine" — reprodus și verificat (era CORS; de reverificat cu date reale client)
- ⏳ **E2** Asociere incoterm + marfă (HS) la rezervare
- ⏳ **E3** (din audit) „Șterge"→anulare (copy greșit), preț NaN pe câmp gol, butoane Export/Status moarte, paginare

## F. PIPELINE EMAIL → REZERVĂRI (citește greșit)

- 🔎 Diagnostic complet făcut: regex-first, AI condiționat, extragere NEsalvată, fără clasificator
- ⏳ **F-1** AI-first (gpt-5.5-mini citește primul tot: body+PDF), regex doar backup
- ⏳ **F-2** SALVEAZĂ extractedData pe email + link cu rezervarea (audit + corectare manuală)
- ⏳ **F-3** Clasificator: skip emailuri non-shipping (bancă/spam) — 2250 procesate, majoritatea zgomot
- ⏳ **F-4** Corectează, nu doar completează câmpuri goale
- ⏳ **F-5** Re-procesare 98 containere fără navă → prind MMSI → apar pe hartă (doar 37/243 au MMSI acum)
- ⏳ **F-6** Unități kg consistente la extragere

## G. NOMENCLATOR HS (marfă)

- ✅ Import 12.379 coduri oficiale RO (legis.md) + taxe vamale
- ✅ Căutare cu/fără diacritice (keywords normalizate)
- ✅ **Doar 6 cifre** afișate (dezactivat 4/8/9 cifre) — cum a cerut clientul
- ✅ Selector există în UI (HsCodeSelector / HSCodeAutocomplete) → funcțional
- ⏳ **G1** UX filtrare pe categorii (scrii „jucării" → subcategorii 6 cifre), nu doar listă
- ✅ HS NU adaugă preț (doar clasificare) — confirmat, e deja doar clasificare
- ⏳ **G2** Leagă HS la rezervare + calculator (câmp marfă)

## H. HARTĂ / TRACKING

- ⏳ **H1** ContainerMap crash pe AIS null (sog/cog) — fix guard (din audit)
- ⏳ **H2** Enum-uri brute (IN_TRANSIT etc.) → etichete RO
- ⏳ **H3** Re-procesare containere fără MMSI (vezi F-5)

## I. AUDIT UI/UX (docs/UI-UX-AUDIT.md)

- ✅ BLOCKER: harta falsă landing, role-gating admin, parser email JSON→câmpuri (pe branch)
- ⏳ **I1** BLOCKER rămase: Contact form mort, CTA-uri marketing→login, „Bun venit Ion", căutare moartă header, ContainerMap crash
- ⏳ **I2** HIGH: KPI/rapoarte false, Setări nu salvează, notificări 404, meniu mobil, cursor-none, brand portocaliu/clase Tailwind invalide
- ⏳ **I3** MEDIUM/LOW: guard date/monedă, empty states, TVA 20%, i18n, a11y

## J. DEPLOY / GIT

- ✅ Deploy funcțional (aplicat peste prod 53cfa92, păstrează harta)
- ⏳ **J1** Reconciliere git: prod 53cfa92 → GitHub (prod e ÎNAINTEA GitHub — de urcat ca să nu se piardă)
- ⏳ **J2** Aliniere branch ui-ux-fixes cu prod + commit toate schimbările de azi
- ⏳ **J3** Migrări Prisma formale pentru coloanele/tabelele adăugate direct în DB (vat_code, bank_name, swift, client_contacts)

---

## Ordinea de execuție recomandată

1. D1-D3 (afișare 2-segmente + taxă portuară linie + setări) — prioritate #1 client
2. D4 Incoterms + D5 port destinație
3. F2 Contacte
4. F pipeline email
5. B/F1+F3+F4 clienți UI
6. I audit + H hartă
7. J git reconcile + migrări
