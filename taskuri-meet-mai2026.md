# Taskuri Meet Client — 7 mai 2026

Lista extrasă din 4 transcrieri meet Oleg + dezvoltator client.

## P0 — Critice

### 1. Calculator: Incoterms toggle

- Ascunde detalii interne (tarif maritim brut, ajustare port, taxe portuare separate)
- Expune doar EXW + FOB + CFR/CIF → sumă totală
- EXW = taxe locale China ~$1000-1100
- FOB = transport maritim China → Constanța
- CFR/CIF = transport Constanța → Chișinău

### 2. BL Parser fixes (4 bug-uri)

- [ ] Container number ≠ BL number (sunt copiate identic)
- [ ] Linie detectată greșit (arată "ONE" când e CMA-CGM)
- [ ] Beneficiar greșit (extrage "Import SRL" în loc de "Comagroteh SRL")
- [ ] Port destinație greșit (extrage "Jo/Ergonjo" în loc de Ningbo)

### 3. Pricing auto-load la rezervare

- Selectare linie Maersk/CMA → preload automat:
  - Freight base (per container type)
  - Port adjustment (Constanța vs Odessa)
  - Taxe portuare locale
  - Taxe vamale (110 USD standard, ajustabile per client)
  - Transport terestru (după greutate)
- Editări per booking se salvează DOAR pentru client-ul respectiv

### 4. Câmp greutate la booking + tarif auto

- până la 18t → 1500 USD
- 18-23t → 1550 USD
- 23-26t → 1650 USD

## P1 — Email & Notificări

### 5. PDF original chinez → atașat email confirmare client

- NU generat nou; folosim draft-ul agentului China
- Doar 1 din 2 PDF-uri primite merge mai departe

### 6. ETA notifications RESCRIS

- NU 2-3 luni înainte
- Start la 5 zile înainte de Constanța
- Notify client la 5d/3d/1d + corecții ETA
- Roșu în dashboard la 5d

### 7. Storage Hapag recalculare

- $46 zi 1 + $8 zile următoare (după 5 zile libere)
- Taie: 30 USD, 70 EUR, 30 EUR, 670 PRR
- Doar 70 EUR release order rămâne fix

## P1 — UX

### 8. Comasare pagini

- "Preț terestru" + "Transport terestru" → 1 pagină
- Toate panourile admin → 1 "Panou Admin" (include Gmail)
- Statistici → admin-only

### 9. Dashboard cleanup

- Scoate "Venit Total" (confidențial) ✅ DEJA FĂCUT
- Rapoarte → admin-only

### 10. Porturi: leagă booking ↔ admin

- Port introdus în booking apare automat în Gestionare cu activ/inactiv
- Bulk-import porturi China (await lista)

## P2 — Date

### 11. Clienți câmpuri complete

- Nume, adresă, email, telefon, persoană contact, director, rechizite bancare
- Field nou: număr comenzi istoric

### 12. Auto-populate booking

- Beneficiar "Decoland" → tot
- Furnizor "Decoland China" → tot
- Agent "Sky" → cod + detalii
- Instrucțiuni speciale rămân text liber

### 13. Containere frigorifice

- Decizie EUR vs USD (Oleg = USD)

## P3 — Pending

- Facturi (când platforma în production)
- Lista porturi China bulk (await)
