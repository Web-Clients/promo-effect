# Promo-Effect — taskuri master

Sursa: stenograma ședinței cu Ion, 8 sep 2026.
Design: `docs/superpowers/specs/2026-09-08-meet-ion-design.md`
Ramura: `feat/meet-8sep-ion`

Decizii luate cu Oleg: hartă pe MapLibre GL (glob 3D, gratuit); notificări doar
email; livrare integrală, fără termen intermediar; nimic către Ion până e tot gata.

## Gata

- [x] Filtrare prețuri agent după aprobare + valabilitate (scurgere: rate PENDING intrau în cotații)
- [x] Extragere BL din emailuri — nu recunoștea „B/L Number:" și „Bill of Lading X"
- [x] Diacritice PDF — `backend/fonts/` nu exista nici local, nici pe server
- [x] Coliziune de token la login (`jti`) — două logări în aceeași secundă blocau contul 15 min
- [x] Hartă flotă: glob 3D, rute cerc-mare, fișă tactică, prospețimea poziției
- [x] Stivă locală reproductibilă + capturi vizuale (Postgres brew, seed scenariu)

## În lucru / următoarele

- [ ] Reprodus cazul ofertei expirate arătat de Ion (marfă 15.09 vs ofertă până 14.09)
- [ ] Tarif terestru: `transport_rates` și `land_transport_rates` sunt două autorități paralele, niciuna cu valabilitate
- [ ] Ruta afișată invers („Bălți – Constanța" în loc de „Constanța – Bălți")
- [ ] EXW: adresă concretă de ridicare, nu doar orașul
- [ ] Valabilitate: „valabil până la" pe card, „Nu sunt oferte valabile" + buton solicitare
- [ ] Prețuri: valabilitate implicită la introducere, refuz în trecut, permis în viitor
- [ ] Ecran prețuri inactive (de ce, editează, șterge)
- [ ] Număr săptămână ISO afișat și acceptat la introducere
- [ ] Ofertă: 3 rânduri (maritim / taxe locale + terestru / comision), 2 la CFR-CIF
- [ ] Cabinet client: fără preț, fără date administrative, read-only, hartă, bandă status
- [ ] Agent chinez vede doar segmentul lui (Ningbo→Constanța)
- [ ] ETA reală prin Terminal49; zilele de tranzit nu se mai scriu de mână
- [ ] Istoric preț („ca la bursă")
- [ ] Portal agenți: izolare între agenți, calendar pe rând, date proprii de furnizor
- [ ] Agregator: cea mai bună ofertă per linie și săptămână, 4 carduri pe rând
- [ ] Parsare AI texte WeChat — **blocat: nevoie de 5-10 texte reale de la Ion**
- [ ] Tooltip „i", tur ghidat, changelog
- [ ] PDF în limba utilizatorului + trimitere automată pe email
- [ ] i18n: RO/RU/EN cap-coadă (acum e amestecat vizibil pe EN)
- [ ] Conturi: 4 agenți chinezi (extensibil la 40) + clienți de test
