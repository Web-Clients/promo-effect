# Client Requirements Update — 25 Mar 2026

Source: Admin Promo-Effect (screenshots + text)

---

## 1. REZERVĂRI — Redesign complet

**Stare actuală:** Lista cu UUID-uri, info lipsă
**Ce trebuie:**

### Tabel principal (lista de rezervări):
| Data | Port | Linie | Vas | Container Nr | BL Nr | Greutate | Tip | Beneficiar | Preț | TLX | DOC | Status |
|------|------|-------|-----|-------------|-------|----------|-----|-----------|------|-----|-----|--------|

- **Nr. Rezervare** = Nr. BL (Bill of Lading) din document, NU UUID
- Afișează: ruta, shipper, beneficiar, data sosire Constanța
- **TLX** = box/badge vizibil când China face Telex Release
- **DOC** = box/badge vizibil când clientul încarcă actele
- Click pe rând → pagină detaliată

### Consolidare pagini:
- **Urmărire Container** → NU mai e pagină separată, se integrează în Rezervări
- **Marfă în Drum** → devine Arhivă (containere transportate + comenzi închise)
- Din prima pagină (Rezervări) → butoane/tab-uri sus: **LA ÎNCĂRCARE | ÎN DRUM | PORT | LIVRATE**

### Pagina detaliată (click pe rând):
- Poziția pe hartă
- Rata stabilită (introdusă manual)
- Acces clienți din cabinetul lor personal
- Posibilitate tipărire automată: comandă de transport + cont de plată

---

## 2. CALCULATOR — Îmbunătățiri majore

### 2.1 Destinație finală
- Adaugă dropdown "Destinație Finală" (nu doar Constanța, ci și Chișinău, etc.)
- Selectarea destinației finale adaugă automat ruta terestră (ex: Constanța → Chișinău)

### 2.2 Condiții de livrare (Incoterms)
Dropdown nou obligatoriu la selectare port:

**EXW [Port]** (Ex Works):
- Include: taxă export China + preluare din depozitul vânzătorului
- Componente afișate: transport China + vamă + depozitare
- Ex: 1100 USD = 500 transport China + 250 vamă + 350 depozitare

**FOB [Port]** (Free On Board):
- Include: navlu + livrare la destinație
- Componente: tarif maritim + ajustare port + taxe portuare

**CFR Constanța** (Cost and Freight):
- Clientul alege linia maritimă din dropdown
- Vede DOAR costul Constanța → Chișinău
- Componente: transport terestru + expediție + taxe locale + comision

### 2.3 Structura prețului detaliat (la expandare ofertă):
**Rata 1: [Port Origine] → Constanța:**
- Tarif Maritim | Ajustare Port | Taxe Portuare

**Rata 2: Constanța → [Destinație Finală]:**
- Transport Terestru | Taxe Vamale | Comision
- (taxele stabilite de noi, clientul vede doar suma totală)

### 2.4 Prețuri
- Trebuie afișate MEREU ultimele prețuri adăugate
- Sau: la adăugare preț nou → prețul vechi nu mai e afișat

### 2.5 Nomenclator mărfuri (Cod HS)
- NU funcționează în prezent → de fixat

---

## 3. ADMINISTRARE PREȚURI — Restructurare

### 3.1 Prețuri de Bază (Freight)
- Un singur port de bază (ex: SHANGHAI)
- Preț pentru 4-5-6 linii maritime
- Tipuri container expandate:
  - **20DV** (20' Dry Van)
  - **40DV/HQ** (40' Dry Van / High Cube)
  - **45HQ** (45' High Cube)
  - **20OT** (20' Open Top)
  - **40OT** (40' Open Top)
  - **20 REEFER** (20' Refrigerated)
  - **40 REEFER** (40' Refrigerated)

### 3.2 Ajustări Port Origine
- Toate porturile cu +/- față de portul de bază
- Ex: Ningbo/Shenzhen = Shanghai → ajustare 0
- Qingdao = +100 față de Shanghai
- Se ajustează o dată la 2-3 luni

### 3.3 Intervale Greutate (Setări Generale)
Trebuie 3 rânduri per tip container (NU cele 4 actuale):

**Per fiecare tip (20DV, 40DV/HQ, 45HQ, 20/40 REEFER):**
- 1-18 tone
- 18-23 tone
- 23-24 t / 24-25 t / 25-26 t / 26-27 t / 27-28 t

Cu coloane: Etichetă | Min (t) | Max (t) | + Maritim ($) | + Terestru ($)

### 3.4 Acces Agenți Chinezi
- Ulterior 2-3 agenți chinezi vor avea acces să ajusteze prețurile zilnic
- Rol: AGENT — dashboard dedicat

### 3.5 Preț lipsă în baza de date
- Dacă clientul selectează un container și nu există preț → mesaj:
  "Contactați un reprezentant al companiei pentru calculare"
- NU afișa eroare, ci offer opțiune de contact

---

## 4. PRIORITĂȚI

Ordinea de importanță:
1. Calculator funcțional cu Incoterms + destinație finală
2. Rezervări redesign (consolidare 3 pagini în 1)
3. Prețuri admin restructurare (tipuri container + intervale)
4. Cod HS funcțional
5. Acces clienți în cabinetul personal
