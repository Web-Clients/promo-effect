# Specificație Calculator & Prețuri — din discuția cu clientul (2026-07-01)

Sursă: transcriere convorbire client. Aceasta e SSOT pentru refacerea calculatorului.

## Modelul de preț dorit (2 segmente, fiecare UN singur total)

Clientul NU vrea să vadă costurile descompuse (taxă vamală 180 etc.) — se sperie.
Arătăm **un preț total pe segment**, maxim 2 segmente:

### Segment 1: Shanghai → Constanța (MARITIM)

- **Preț de bază** = Shanghai (port de REFERINȚĂ), ex. 6500 (40HQ)
- **+ Ajustare port** origine (Ningbo = +100 față de Shanghai) → 6600
- **+ Suprataxă maritimă pe greutate** (bandă maritimă, ex. 25-26t = +100) → 6700
- **+ Taxă portuară locală** = din tabelul liniei maritime (CMA 40ft = 700), NU din setări generale
- = UN total pentru segmentul maritim

### Segment 2: Constanța → Chișinău (TERESTRU)

- **Transport terestru** = din tabelul IMPORT (land_transport_rates) după greutate+destinație
  (ex. Chișinău 23.5t → 1650). NU din setarea generală (care dă greșit 600!)
- **+ taxă vamală** (setări generale, ex. 180)
- **+ comision** (setări generale, ex. 200)
- **+ asigurare** (setări generale)
- **+ marjă profit**
- = UN total pentru segmentul terestru

**Total afișat = Segment 1 + Segment 2.** Fără „ajustare port" vizibilă, fără „preț în colț".

## Bug-uri confirmate de client

1. **Transport terestru dă 600 în loc de 1550/1650** — calculatorul ia din setarea generală
   `terrestrialTransportConstanta` (600) în loc de tabelul land_transport_rates. FIX: mereu din tabel
   după greutate(kg)+destinație; scoate fallback-ul pe setarea generală.
2. **Ningbo „nu s-a putut calcula prețul"** — lipsă potrivire (case + preț). Parțial reparat (case),
   restul: prețuri de bază setate de client.
3. **Ajustarea port (Ningbo +100) nu se vede/aplică** în total — de inclus în segmentul maritim.
4. **„Rezervare nouă — ceva nu a mers bine"** — de verificat după deploy (era CORS + calc).

## Setări generale — de reorganizat

**SCOATE din setări generale:**

- Taxe portuare (sunt per linie maritimă → tabelul „Linii maritime / taxă locală", diferă: CMA 20ft=650, 40ft=700)
- Transport terestru Constanța/Odessa (vine din tabelul IMPORT după greutate)

**PĂSTREAZĂ în setări generale:** taxă vamală, comision, asigurare, marjă profit.

Structura nouă pe destinație: „Constanța: taxă vamală + comision + asigurare + marjă",
„Odessa: taxă vamală + comision + asigurare + marjă".

## Greutate → KG peste tot

- Calculator: NU dropdown cu intervale de tone → **câmp liber unde scrii kg**.
- Utilizatorul scrie ex. `23500` (kg) sau cu virgulă `25,500`. Sistemul identifică banda.
- Poate scrie și `25` și să fie interpretat ca tone — dar preferat kg exact (25500) pentru precizie.
- **Benzile maritime diferă de cele terestre**:
  - Terestru: până la 23t = 1550 fix (nicio suprataxă). 24-25t=1700, 25-26t=1800...
  - Maritim: suprataxă pe altă grilă (ex. 25-26t = +100 la freight).
- Greutatea exactă (kg) trebuie mapată separat: bandă terestră ȘI bandă maritimă.

## Port destinație

- Dropdown, **Constanța by default** (dar clar că e dropdown; dacă rămân 3 opțiuni, pot fi și butoane).
- **Setare pentru a ADĂUGA porturi de destinație** (ex. Varna) — completate de ei.
- Când adaugi un port destinație, adaugi și transportul de la acel port → Chișinău.

## Contacte multiple (confirmă F2)

- La fiecare client: **Director** (nume, telefon, email) + **Logist** (nume, familie, email, telefon).
- Buton „adaugă încă o persoană de contact" (email + telefon proprii).
- **Bifă („gălușcă") per contact** = primește mesaje despre statutul containerului.
  - Bifat → primește; nebifat → nu. Decidem cui trimitem (director și/sau logist).
- Folosit la monitorizare: „unde e containerul, în ce etapă" → trimis contactelor bifate.

## Nomenclator marfă (confirmă F6)

- La „greutate marfă / cod HS": selector frumos, scrii cuvânt → cod HS (6 cifre). DEJA făcut + live.
