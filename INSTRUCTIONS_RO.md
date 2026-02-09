# PROMO-EFECT — Ghid de Utilizare a Platformei

**Promo-Efect** — platformă logistică pentru importul de containere din China (Shanghai, Ningbo, Qingdao, Xiamen, Shenzhen, Guangzhou) către Constanța (România) și Odessa (Ucraina), cu livrare finală la adresa clientului.

Platforma are **3 roluri**: **Admin**, **Client** și **Agent**.

---

## Meniu lateral (sidebar)

Fiecare rol vede propriile puncte de meniu:

| Punct de meniu | Client | Agent | Admin |
|---|:---:|:---:|:---:|
| **Panou de control** | da | redirecționat la „Prețurile Mele" | da |
| **Rezervări** | da | da | da |
| **Urmărire** | da | da | da |
| **Calculator Preț** | da | da | da |
| **Profilul Meu** | da | da | da |
| **Prețurile Mele** | — | da | — |
| **Clienți** | — | — | da |
| **Facturi** | — | — | da |
| **AI Email Parser** | — | — | da |
| **Rapoarte** | — | — | da |
| **Administrare Prețuri** | — | — | da |
| **Agenți Chinezi** | — | — | da |
| **Gestionare Porturi** | — | — | da |
| **Panou Admin** | — | — | da |
| **Utilizatori** | — | — | da |
| **Setări Admin** | — | — | da |

In header-ul de sus se află:
- Bara de căutare: „Caută rezervări, containere, clienți..."
- Butonul **Rezervare Nouă** (creează rezervare rapidă)
- Notificări (clopoțel)
- Buton temă luminoasă/întunecată
- Buton **Deconectare**

---

# PARTEA I — CLIENT

## 1. Panou de control (pagina principală)

După autentificare, clientul vede pagina **„Panou de control"** cu mesajul „Bun venit, {Nume}! Iată sumarul activității logistice pentru astăzi".

**4 carduri KPI:**
- **Total Rezervări** — câte rezervări aveți în total
- **În Tranzit** — câte containere sunt acum pe mare
- **Venit Total** — suma totală a rezervărilor dvs. (în USD)
- **Livrate** — câte containere au fost livrate

In colțul dreapta sus: indicator **Live** / „Actualizat acum".

---

## 2. Calculator Preț

Din meniul lateral → **„Calculator Preț"**.

Titlu pagină: **„Calculator de Prețuri"** — „Obțineți cele mai bune oferte de la toate liniile maritime".

### Cum se folosește pas cu pas:

**Pasul 1 — Completați formularul „Detalii Transport":**

| Câmp | Descriere |
|---|---|
| **Port Origine** * | Selectați portul din China (Shanghai, Ningbo, Qingdao, etc.) |
| **Port Destinație** | Constanța sau Odessa (hint: „Alegeți portul de tranzit") |
| **Containere** * | Selectați tipul (20DC, 40DC, 40HC, 20RF, 40RF) + cantitatea. Se afișează „Total: X container/containere". Puteți adăuga până la 5 tipuri diferite prin butonul **„Adaugă alt tip de container"** |
| **Greutate Marfă** * | Selectați intervalul de greutate (ex: 1-5 tone, 5-10 tone, etc.) |
| **Categorie Marfă (Cod HS)** | Opțional — căutați după cod sau descriere (ex: 9403.30 sau „mobilier") |
| **Data Pregătire Marfă** * | Când marfa este gata de expediere |

**Pasul 2 — Apăsați butonul **„Calculează Prețuri"****

Sistemul afișează „Se calculează oferte... Analizăm toate liniile maritime pentru cele mai bune prețuri"

**Pasul 3 — Vedeți rezultatele:**

In partea de sus — cursul **USD → MDL** și data calculului.

Mai jos — **lista ofertelor** (maxim 5), sortate de la cel mai ieftin. Fiecare ofertă arată:
- **Poziția** (#1, #2, etc.)
- **Linia maritimă** (MSC, Maersk, Hapag-Lloyd, CMA CGM, Cosco, Yangming)
- **Zile tranzit** (ex: 35 zile)
- **Disponibilitate**: „Disponibil", „Limitat" sau „Indisponibil"
- **Ruta** (ex: Shanghai → Constanța → Chișinău)
- **Prețul total** în USD și MDL

**Pasul 4 — Click pe ofertă** pentru a vedea **„Defalcare Costuri"**:
- **Tarif Maritim** — costul navlului
- **Ajustare Port** — supliment pentru portul de origine
- **Taxe Portuare** — taxe la portul de destinație
- **Taxe Vamale** — costul vămuirii
- **Transport Terestru** — livrare de la port la adresă
- **Comision** — comisionul platformei

**Pasul 5 — Apăsați **„Selectează Această Ofertă"****

### Plasarea comenzii — formularul „Date Furnizor":

Se afișează oferta selectată (linia maritimă, ruta, preț, containere comandate) și trebuie completat:

| Câmp | Descriere |
|---|---|
| **Nume Furnizor** * | Ex: China Trading Co. |
| **Persoană de Contact** * | Ex: Zhang Wei |
| **Adresa Furnizor** * | Ex: 123 Industrial Zone, Shanghai, China |
| **Email Furnizor** * | supplier@example.com |
| **Telefon Furnizor** * | +86 123 456 7890 |
| **Descriere Marfă** * | Ex: Mobilier din lemn - 50 seturi canapele |
| **Valoare Factură** * | Ex: 15000 |
| **Monedă** | USD / EUR / CNY |
| **Instrucțiuni Speciale** | Opțional — cerințe speciale pentru transport |

Butonul **„Plasează Comanda"**. Sub buton: „La plasarea comenzii, vom trimite 3 email-uri: către furnizor, agent și dvs."

Dacă totul e ok: „**Comanda a fost plasată cu succes! Număr rezervare: BK-XXXXX**" + „Am trimis email-uri către furnizor, agent și dvs. cu detaliile comenzii."

Notă la final: „* Prețurile sunt orientative și pot varia în funcție de disponibilitate și condiții speciale."

---

## 3. Rezervări

Din meniul lateral → **„Rezervări"**.

Titlu pagină: **„Rezervări"** — „Gestionează toate rezervările de transport".

### Ce vedeți:

**Bara de căutare:** „Caută Nr. Rezervare sau Nr. Container..."

**Filtru dropdown:** „Toate Stările", Ciornă, Trimisă, Confirmată, În Tranzit, Livrată, Anulată.

**Tab-uri de filtrare rapidă:** Toate | În Așteptare | Confirmate | În Tranzit | Livrate | Anulate

**Tabelul cu rezervări** (coloane):
| Nr. Rezervare | Client (doar admin) | Linie Maritimă | Container | Rută | ETA | Preț | Status |

**Statusurile posibile ale unei rezervări:**
- **Ciornă** — rezervare salvată dar netrimisă
- **În Așteptare** — așteaptă procesare
- **Trimisă** — trimisă pentru procesare
- **Confirmată** — confirmată de operator
- **În Tranzit** — containerul este pe mare
- **Livrată** — marfa a ajuns la destinație
- **Anulată** — rezervarea a fost anulată

Click pe o rezervare → se deschide **pagina de detalii**.

### Detalii Rezervare (pagina BookingDetail):

Titlu: „Rezervare {NR}" sau „Cerere de Rezervare Nouă" (dacă e nouă).

Secțiuni:
1. **Detalii Rută**: Port Origine, Port Destinație
2. **Detalii Container**: Tip Container, Linie Maritimă Preferată, Număr Container (opțional)
3. **Informații Administrative** (doar admin): Stare Rezervare (dropdown cu toate statusurile), Număr Container, Preț Ofertat (USD)

Buton **„Trimite Cererea"** (nouă) sau **„Salvează Modificările"** (existentă).

**Harta GPS** — se afișează automat când rezervarea e în status „În Tranzit" sau are vehicul alocat.

---

## 4. Urmărire

Din meniul lateral → **„Urmărire"**.

Titlu pagină: **„Urmărire Container"** — „Monitorizați statusul și poziția containerelor în timp real".

### Ce vedeți:

**4 carduri statistici:**
- **Total Containere** — câte containere aveți
- **În Tranzit** — câte sunt pe drum
- **Livrate** — câte au ajuns
- **Întârziate** — câte au depășit ETA

**Secțiunea „Caută Container":**
- Câmpul de introducere: „ex., MSCU1234567"
- Butonul **„Urmărește"**

**După căutare — rezultatul:**

Info container (4 coloane): Nr. Container | Tip | Stare Curentă | ETA

Info suplimentare: Booking | Client | Rută | Locație Curentă

**Hartă Urmărire** — hartă interactivă cu poziția containerului (buton „Ascunde Harta" / „Afișează Harta").

**Istoric Urmărire** — cronologia evenimentelor cu tipuri:
- Rezervare creată → Container ridicat → Gate In - Origine → Încărcat pe navă → Plecare din origine → Sosire transbordare → Plecare transbordare → Sosire la destinație → Descărcat → Vămuire → Gate Out → Livrat

Buton **„Adaugă Eveniment"** — deschide un modal cu:
- Tip Eveniment * (dropdown)
- Data și Ora *
- Locație *
- Nume Port
- Navă
- Note

**Sidebar dreapta — „Containere Recente":** lista ultimelor 5 containere (click pentru a le urmări).

---

## 5. Profilul Meu

Din meniul lateral → **„Profilul Meu"**.

**4 tab-uri:**
1. **Profil** — Informații Profil (nume, email, telefon, etc.)
2. **Parola** — Schimbă Parola
3. **Notificări** — Preferințe Notificări (Email, SMS, Newsletter — activare/dezactivare)
4. **Securitate** — Autentificare cu Doi Factori (2FA): Activează/Dezactivează + scanare QR cod

---

# PARTEA II — AGENT

## 1. Prețurile Mele

La autentificare, agentul este redirecționat automat la **„Prețurile Mele"**.

Titlu pagină: **„Prețurile Mele"** + numele companiei și codul de agent.

### Ce vedeți:

**4 carduri statistici:**
- **Total Prețuri** — câte prețuri ați trimis
- **În Așteptare** — câte așteaptă aprobarea
- **Aprobate** — câte au fost aprobate
- **Respinse** — câte au fost respinse

**Tab-uri de filtrare:** Toate | În Așteptare | Aprobate | Respinse

**Tabelul cu prețuri** (coloane):
| Linie | Port | Container | Greutate | Preț | Status | Acțiuni |

**Statusurile posibile:**
- **În așteptare** — trimis, așteaptă aprobarea administratorului
- **Aprobat** — prețul e activ în calculatorul clienților
- **Respins** — respins + motivul respingerii (se afișează sub status)

**Acțiuni:** Editează (iconiță creion) | Șterge (iconiță coș) — ștergere doar pt. prețuri ne-aprobate.

### Adăugare/Editare Preț:

Butonul **„Adaugă Preț"** deschide modalul cu titlul **„Adaugă Preț Nou"** (sau „Editează Preț"):

Subtitlu: „Prețul va fi trimis pentru aprobare de către administrator".

| Câmp | Descriere |
|---|---|
| **Linie Maritimă** | MSC, Maersk, Hapag-Lloyd, CMA CGM, Cosco, Yangming |
| **Port Origine** | Shanghai, Ningbo, Qingdao, Shenzhen, Guangzhou, Xiamen |
| **Tip Container** | 20ft, 40ft, 40ft HC |
| **Greutate** | 1-5 tone, 5-10 tone, 10-15 tone, 15-20 tone, 20-24 tone |
| **Preț Freight (USD)** | Prețul propus per container |
| **Valid Din** | Data de la care prețul e valid |
| **Valid Până** | Data până la care prețul e valid |
| **Data Plecării** | Data estimată a plecării navei |
| **Motiv / Note** | Opțional — Ex: Promoție specială, condiții de piață... |

Butonul **„Trimite pentru Aprobare"** (sau „Actualizează" la editare).

Mesaj la succes: „Prețul a fost trimis pentru aprobare".

---

## 2. Calculator Preț + Rezervări + Urmărire

Agentul are acces la aceleași funcții ca și clientul: **Calculator Preț**, **Rezervări**, **Urmărire**, **Profilul Meu** — funcționează identic.

---

# PARTEA III — ADMINISTRATOR

## 1. Panou de control

Pagina principală a clientului/adminului: **„Panou de control"** — aceleași KPI-uri (Total Rezervări, În Tranzit, Venit Total, Livrate) + grafice **Venit Săptămânal** (ultimele 4 săptămâni) și **Status Rezervări** (distribuție pe statusuri).

---

## 2. Panou Admin

Din meniul lateral → **„Panou Admin"**.

Titlu: **„Panou Admin"** — „Bun venit, Ion! Iată un rezumat al platformei."

### Ce vedeți:

**5 carduri statistici:**
- **Utilizatori** — total + „+X luna aceasta"
- **Rezervări** — total + „X luna aceasta"
- **Venituri** — total USD + „$X luna aceasta"
- **Containere** — total + „X în tranzit"
- **Configurare Prețuri** — câte prețuri Platformă + câte prețuri Agenți

**3 carduri detaliate:**
- **Stare Rezervări**: În așteptare / Confirmate / În tranzit / Livrate (cu numere)
- **Tip Utilizatori**: Administratori / Clienți / Agenți (cu numere)
- **Stare Sistem**: starea componentelor (OK / Warning / Error)

**Acțiuni Rapide** — 6 butoane cu link-uri:
- Prețuri → Administrare Prețuri
- Agenți → Agenți Chinezi
- Clienți → Clienți
- Rezervări → Rezervări
- Rapoarte → Rapoarte
- Setări → Setări Admin

**Rezervări Recente** — ultimele 5 rezervări (cu link „Vezi toate →")

**Utilizatori Noi** — ultimii utilizatori înregistrați

**Atenție necesară** — alertă dacă există containere cu întârzieri sau facturi neachitate.

---

## 3. Administrare Prețuri

Din meniul lateral → **„Administrare Prețuri"**.

Titlu: **„Administrare Prețuri"** — „Gestionați prețurile de bază, ajustările de port și setările generale".

**4 carduri statistici:** Total Prețuri | Prețuri Active | Ajustări Port | Companii Transport

### Tab 1: „Prețuri de Bază"

Subtitlu: **„Prețuri de Bază (Freight)"**

Buton **„+ Adaugă Preț"** → deschide formularul **„Adăugare Preț de Bază"**:

| Câmp | Opțiuni |
|---|---|
| **Companie Transport** | MSC, COSCO, Maersk, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM |
| **Port Origine** | Shanghai, Ningbo, Shenzhen, Qingdao, Tianjin, Xiamen, Guangzhou, Dalian, Hong Kong |
| **Port Destinație** | Constanța, Odessa |
| **Tip Container** | 20DC, 40DC, 40HC, 20RF, 40RF |
| **Preț de Bază (USD)** | valoare numerică |
| **Zile Tranzit** | ex: 30 |
| **Valid Din / Valid Până La** | date |
| **Preț activ** | checkbox (Activ/Inactiv) |

Tabelul prețurilor de bază (coloane): Companie | Port Origine | Port Dest. | Container | Preț (USD) | Zile | Status (Activ/Inactiv) | Acțiuni (Editează / Șterge)

### Tab 2: „Ajustări Port Origine"

Subtitlu: **„Ajustări Port Origine"** — „Ajustări de preț bazate pe portul de origine din China"

Buton **„+ Adaugă Ajustare"** → deschide formularul:
- **Port Origine** (dropdown)
- **Ajustare Preț (USD)** — „Valoare pozitivă pentru adăugare, negativă pentru reducere"
- **Note** (opțional)

Tabelul (coloane): Port | Ajustare (USD) — cu + sau - | Note | Acțiuni (Editează / Șterge)

### Tab 3: „Setări Generale"

Titlu: **„Setări Generale de Preț"**

**Secțiunea „Intervale de Greutate (Pentru Calculator)":**
- Tabel cu: Etichetă (ex: 1-10 tone) | Min | Max | Activat
- Buton **„+ Adaugă Interval"**
- Notă: „Aceste intervale sunt folosite în calculatorul de pe site pentru a determina costurile."

**Secțiunea „Constanța (România)":**
- Taxe Portuare (USD) — implicit: $221.67
- Transport Terestru (USD) — implicit: $600

**Secțiunea „Odessa (Ucraina)":**
- Taxe Portuare (USD) — implicit: $200
- Transport Terestru (USD) — implicit: $550

**Secțiunea „Costuri Generale":**
- Taxe Vamale (USD) — implicit: $150
- Comision (USD) — implicit: $200
- Asigurare (USD) — implicit: $50

**Secțiunea „Marja de Profit":**
- Procent Profit (%) — implicit: 10%

Buton **„Salvează Setările"**.

**Formula de calcul a prețului final pentru client:**
```
PREȚ TOTAL = (Tarif Maritim + Ajustare Port + Taxe Portuare + Taxe Vamale +
              Transport Terestru + Comision + Asigurare) × (1 + Marja de Profit%)
```

---

## 4. Agenți Chinezi

Din meniul lateral → **„Agenți Chinezi"**.

Funcții:
- Vizualizare lista tuturor agenților
- Creare agent nou cu câmpurile: Email, Parola, Nume, Telefon, Companie, Nume Contact, ID WeChat
- Editare/ștergere agent

Aici se aprobă și prețurile agenților (statusul prețurilor: În așteptare → Aprobat / Respins).

---

## 5. Gestionare Porturi

Din meniul lateral → **„Gestionare Porturi"**.

Funcții:
- Adăugare port nou (modal „Adaugare port nou"): Nume port, tip: Origine / Destinatie
- Editare port (modal „Editare port")
- Ștergere port

---

## 6. Utilizatori

Din meniul lateral → **„Utilizatori"**.

Funcții:
- Lista tuturor utilizatorilor cu filtrare: „Caută utilizatori..." + filtru Rol (CLIENT, AGENT, ADMIN, SUPER_ADMIN)
- Editare utilizator
- Resetare parolă (buton) — „Parola a fost resetată. Utilizatorul va primi un email."
- Paginare: Anterior / Următor

---

## 7. Facturi

Din meniul lateral → **„Facturi"**.

Titlu: **„Facturi"**

### Carduri statistici:
- **Total Facturi** — număr total
- **Total Facturat** — suma totală (USD)
- **Total Încasat** — suma achitată (USD)
- **De Încasat** — restanțe (USD)

### Filtre:
- Căutare: „Caută după număr factură sau client..."
- Dropdown status: Toate statusurile, Ciornă, Neachitată, Achitată, Scadentă, Anulată

### Tabelul (coloane):
Nr. Factură | Client | Sumă | Data Scadentă | Status | Acțiuni (vizualizare + descărcare PDF)

### Creare factură — buton „Factură Nouă":
- **Client** * (dropdown: „Selectează client")
- **Booking** * (dropdown: „Selectează booking")
- **Data Scadentă** * (implicit: 30 zile de la azi)
- **Discount (%)** — opțional
- **Note** — opțional

Buton **„Creează Factură"**

### Detalii factură (modal):
- Info client (companie, email, telefon)
- Info booking (număr, rută)
- Date: Data Emiterii | Data Scadentă | Data Plății (dacă achitată)
- Defalcare: Subtotal | TVA (19%) | **Total** | Achitat | De plată
- **Istoric Plăți** — listă cu sumă, metodă, dată, referință
- Note
- Acțiuni:
  - **Descarcă PDF** — descarcă factura
  - **Trimite** — trimite factura pe email clientului (doar pentru Ciornă)
  - **Înregistrează Plată** — modal cu: Sumă, Data Plății, Metodă de Plată (Transfer Bancar / Numerar / Card / Altele), Referință, Note
  - **Anulează** — anulează factura (cu motiv opțional)

**Statusurile facturilor:**
- **Ciornă** — factură salvată, netrimisă
- **Trimisă** — trimisă clientului
- **Neachitată** — trimisă dar neplătită
- **Achitată** — plata a fost efectuată
- **Scadentă** — termenul de plată a expirat
- **Anulată** — factura a fost anulată

---

## 8. Clienți

Din meniul lateral → **„Clienți"**.

Vizualizare și gestionare clienți. Modal **„Client Nou"** / **„Editare Client"**:
- Nume Companie (ex: SRL Exemplu)
- Persoană Contact (ex: Ion Popescu)
- Email (ex: contact@exemplu.md)
- Telefon (ex: +373 69 123 456)
- Adresă (ex: str. Exemplu 123, Chișinău)
- Cod Fiscal (IDNO) (ex: 1234567890123)
- Cont Bancar

---

## 9. Rapoarte

Din meniul lateral → **„Rapoarte"**.

Titlu: **„Rapoarte"** — „Analizați performanța și obțineți informații valoroase."

Grafice:
- **Venit Lunar** — grafic pe lunile Ian, Feb, Mar, Apr, Mai, Iun, Iul, Aug
- **Containere după Portul de Origine** — Shanghai, Qingdao, Ningbo, Shenzhen

---

## 10. Setări Admin

Din meniul lateral → **„Setări Admin"**.

Setări sistem: Companie (Promo-Efect SRL), email, telefon, adresă, fus orar (Europe/Chisinau), format dată (DD/MM/YYYY).

Integrări:
- Email Provider: GMAIL
- Tracking Provider: SEARATES
- AI Provider: ANTHROPIC_CLAUDE
- Storage: LOCAL_FILESYSTEM
- 1C Integration: FTP

---

## 11. Rezervări (funcții suplimentare admin)

Adminul vede **toate** rezervările din sistem (coloana „Client" e vizibilă).

**Acțiuni în masă** — selectați una sau mai multe rezervări cu checkbox-uri, apare bara de acțiuni:
- „X rezervare/rezervări selectate"
- **Exportă** — export date
- **Schimbă Starea** — schimbare status în masă
- **Generează Facturi** — creare facturi automat din rezervările selectate
- **Șterge** — ștergere rezervări (cu confirmare: „Sigur doriți să ștergeți X rezervări?")

In detalii rezervare, adminul poate: schimba starea, edita numărul containerului, modifica prețul, adăuga note interne.

---

## 12. Urmărire (funcții suplimentare admin)

Adminul vede toate containerele din sistem. Poate adăuga manual evenimente de tracking (butonul „Adaugă Eveniment").

---

# FLUX DE LUCRU COMPLET

```
1. AGENTUL: „Prețurile Mele" → „Adaugă Preț" → completează formularul → „Trimite pentru Aprobare"
   Status preț: În așteptare
   ↓
2. ADMINUL: „Agenți Chinezi" → vede prețul nou → aprobă sau respinge
   Status preț: Aprobat (prețul apare în Calculator)
   ↓
3. CLIENTUL: „Calculator Preț" → completează formularul → „Calculează Prețuri"
   Vede lista de oferte sortate de la cel mai ieftin
   ↓
4. CLIENTUL: selectează oferta → completează „Date Furnizor" → „Plasează Comanda"
   Se trimit 3 email-uri (furnizor, agent, client)
   ↓
5. ADMINUL: „Rezervări" → vede rezervarea nouă → schimbă starea: Confirmată → În Tranzit
   ↓
6. CLIENTUL: „Urmărire" → caută nr. container → vede pe hartă poziția și evenimentele
   ↓
7. ADMINUL: adaugă evenimente de tracking pe măsură ce containerul avansează
   ↓
8. Container livrat → ADMINUL schimbă starea: Livrată
   ↓
9. ADMINUL: „Facturi" → „Factură Nouă" → selectează client + booking → „Creează Factură"
   ↓
10. ADMINUL: deschide factura → „Trimite" → clientul primește factura pe email
    ↓
11. Clientul plătește → ADMINUL: „Înregistrează Plată" (sumă, dată, metodă) → status: Achitată
```

---

**Versiunea platformei:** v1.2
**Suport tehnic:** Contactați administratorul platformei.
