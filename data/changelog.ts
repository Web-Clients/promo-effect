/**
 * What changed on the platform, and how the platform works.
 *
 * Ion asked for both on 8 Sep 2026 and drew the line between them himself: a
 * record of what was done, and "un fel de documentație/descriere a ce și cum
 * lucrează". They live together because the second is what makes the first
 * readable — an entry saying a rule changed is only useful next to the rule.
 *
 * This is a versioned file rather than a database table on purpose. Every entry
 * describes a change to the code, so it belongs with the code and lands in the
 * same deploy; a changelog that can drift from what is actually running is
 * worse than none.
 *
 * Write for Ion's team, not for developers: say what a user can now do, or what
 * stopped going wrong, and skip the file names.
 */

export type ChangeKind = 'feature' | 'fix' | 'improvement';

export interface ChangeEntry {
  /** ISO date the change went live, or was finished if it is not deployed yet. */
  date: string;
  kind: ChangeKind;
  /** Which part of the platform, as a translation key under changelog.areas. */
  area: string;
  title: { ro: string; ru: string; en: string };
  body: { ro: string; ru: string; en: string };
}

export interface HowItWorksEntry {
  /** Anchor id, also the order on the page. */
  id: string;
  title: { ro: string; ru: string; en: string };
  body: { ro: string; ru: string; en: string };
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: '2026-09-09',
    kind: 'feature',
    area: 'agents',
    title: {
      ro: 'Portalul agenților chinezi, în engleză și chineză',
      ru: 'Портал китайских агентов на английском и китайском',
      en: 'The Chinese agent portal, in English and Chinese',
    },
    body: {
      ro: 'Fiecare agent are cont propriu și vede doar tarifele lui. Pagina e în engleză și chineză simplificată. Tabelul arată acum valabilitatea și data plecării pentru fiecare tarif, iar cele expirate sunt tăiate, ca agentul să vadă singur de ce un tarif nu mai e ofertat.',
      ru: 'У каждого агента свой аккаунт, и он видит только свои ставки. Страница на английском и упрощённом китайском. В таблице теперь есть срок действия и дата отхода, а просроченные ставки зачёркнуты — агент сам видит, почему ставка больше не котируется.',
      en: 'Each agent has his own account and sees only his own rates. The page is in English and Simplified Chinese. The table now shows the validity window and the departure date, with expired rates struck through, so an agent can see for himself why a rate is no longer being quoted.',
    },
  },
  {
    date: '2026-09-09',
    kind: 'fix',
    area: 'agents',
    title: {
      ro: 'Tarifele agenților nu mai pot rămâne invizibile',
      ru: 'Ставки агентов больше не могут остаться невидимыми',
      en: 'Agent rates can no longer be invisible',
    },
    body: {
      ro: 'Formularul agentului oferea tipuri de container pe care calculatorul nu le putea potrivi, așa că un tarif introdus corect nu apărea în nicio ofertă. Lista vine acum din tarifele reale, iar o valoare pe care calculatorul n-ar recunoaște-o e refuzată la salvare.',
      ru: 'Форма агента предлагала типы контейнеров, которые калькулятор не мог сопоставить, поэтому корректно введённая ставка не появлялась ни в одном предложении. Список берётся из реальных тарифов, а значение, которое калькулятор не распознаёт, отклоняется при сохранении.',
      en: 'The agent form offered container types the calculator could not match, so a correctly entered rate never appeared in any quote. The list now comes from the real pricing tables, and a value the calculator would not recognise is refused on save.',
    },
  },
  {
    date: '2026-09-09',
    kind: 'fix',
    area: 'documents',
    title: {
      ro: 'Diacriticele din facturi și comenzi',
      ru: 'Диакритика в счетах и заказах',
      en: 'Diacritics in invoices and transport orders',
    },
    body: {
      ro: 'Factura, comanda de transport și factura de plată foloseau un font fără ș, ț, ă și î. Toate trei documentele au acum fontul corect.',
      ru: 'Счёт, заказ на перевозку и счёт на оплату использовали шрифт без румынских диакритических знаков. Все три документа теперь используют правильный шрифт.',
      en: 'The invoice, the transport order and the payment invoice used a font without the Romanian diacritics. All three documents now embed the correct font.',
    },
  },
  {
    date: '2026-09-08',
    kind: 'fix',
    area: 'pricing',
    title: {
      ro: 'Ofertele expirate și cele neaprobate nu mai ajung la client',
      ru: 'Просроченные и несогласованные ставки больше не попадают клиенту',
      en: 'Expired and unapproved rates no longer reach a customer',
    },
    body: {
      ro: 'Calculatorul lua tarifele agenților fără să verifice nici valabilitatea, nici dacă fuseseră aprobate. Un tarif în așteptare sau respins putea intra direct într-o cotație. Ambele verificări sunt acum obligatorii.',
      ru: 'Калькулятор брал ставки агентов, не проверяя ни срок действия, ни факт согласования. Ставка на согласовании или отклонённая могла попасть прямо в расчёт. Обе проверки теперь обязательны.',
      en: 'The calculator took agent rates without checking either their validity window or whether they had been approved. A pending or rejected rate could go straight into a quote. Both checks are now mandatory.',
    },
  },
  {
    date: '2026-09-08',
    kind: 'feature',
    area: 'tracking',
    title: {
      ro: 'Harta flotei, pe glob',
      ru: 'Карта флота на глобусе',
      en: 'The fleet map, on a globe',
    },
    body: {
      ro: 'Fiecare container apare pe un glob 3D, cu ruta de la portul de încărcare până la destinație. Harta spune întotdeauna de unde vine poziția și cât e de veche — iar când nava e în larg, unde AIS-ul terestru nu ajunge, o marchează ca estimată în loc să pretindă că o vede.',
      ru: 'Каждый контейнер отображается на 3D-глобусе с маршрутом от порта погрузки до места назначения. Карта всегда показывает источник позиции и её возраст, а когда судно в открытом океане, вне зоны наземного AIS, помечает позицию как расчётную, а не выдаёт её за наблюдение.',
      en: 'Every container appears on a 3D globe with its route from the loading port to the destination. The map always states where a position came from and how old it is — and when a vessel is mid-ocean, beyond terrestrial AIS, it marks the position as estimated rather than pretending to see it.',
    },
  },
  {
    date: '2026-09-08',
    kind: 'fix',
    area: 'documents',
    title: {
      ro: 'Numărul conosamentului se citește din emailurile transportatorilor',
      ru: 'Номер коносамента считывается из писем перевозчиков',
      en: 'Bill of lading numbers are read from carrier emails',
    },
    body: {
      ro: 'Recunoașterea numărului de conosament nu funcționa pentru felul în care îl scriu transportatorii în practică — „B/L Number:" sau doar „Bill of Lading" urmat de număr. Acum sunt acoperite toate formele întâlnite.',
      ru: 'Распознавание номера коносамента не работало с тем, как его пишут перевозчики на практике — «B/L Number:» или просто «Bill of Lading» с номером. Теперь охвачены все встречающиеся варианты.',
      en: 'Bill of lading recognition did not handle the way carriers actually write it — "B/L Number:" or simply "Bill of Lading" followed by the number. All the forms seen in practice are now covered.',
    },
  },
  {
    date: '2026-09-08',
    kind: 'fix',
    area: 'account',
    title: {
      ro: 'Autentificări simultane pe același cont',
      ru: 'Одновременные входы под одной учётной записью',
      en: 'Simultaneous sign-ins on one account',
    },
    body: {
      ro: 'Doi oameni care intrau în aceeași secundă cu același cont primeau o eroare, iar contul se bloca pentru 15 minute. Conta mai ales pentru conturile de test folosite de mai mulți colegi deodată.',
      ru: 'Двое, входившие в одну и ту же секунду под одной учётной записью, получали ошибку, и аккаунт блокировался на 15 минут. Это касалось прежде всего тестовых аккаунтов, которыми пользуются несколько коллег сразу.',
      en: 'Two people signing in within the same second on one account hit an error, and the account then locked for fifteen minutes. It mattered most for shared test accounts.',
    },
  },
];

export const HOW_IT_WORKS: HowItWorksEntry[] = [
  {
    id: 'incoterms',
    title: {
      ro: 'Ce schimbă condiția de livrare',
      ru: 'Что меняет условие поставки',
      en: 'What the delivery term changes',
    },
    body: {
      ro: 'La CFR și CIF furnizorul a plătit deja navlul până în portul de destinație, așa că nu îl mai facturăm încă o dată — oferta conține doar taxele locale, transportul intern și comisionul, iar portul de plecare nu se mai cere. La FOB și EXW navlul intră în ofertă. Sub orice condiție, comisionul se aplică pe taxele locale plus transportul intern și niciodată pe navlu, ca să nu crească atunci când urcă piața navlului.',
      ru: 'При CFR и CIF поставщик уже оплатил фрахт до порта назначения, поэтому мы не выставляем его повторно — в предложение входят только местные сборы, внутренняя перевозка и комиссия, а порт отправления не запрашивается. При FOB и EXW фрахт включается в предложение. При любом условии комиссия считается от местных сборов плюс внутренней перевозки и никогда от фрахта, чтобы не расти вместе с рынком фрахта.',
      en: 'Under CFR and CIF the supplier has already paid the ocean freight to the destination port, so we do not bill it a second time — the quote carries only the local charges, the inland leg and the commission, and the port of loading is not asked for. Under FOB and EXW the freight is part of the quote. Under any term the commission is charged on local charges plus the inland leg and never on the ocean freight, so it does not rise with the freight market.',
    },
  },
  {
    id: 'agent-rates',
    title: {
      ro: 'Cum ajunge tariful unui agent într-o ofertă',
      ru: 'Как ставка агента попадает в предложение',
      en: 'How an agent rate reaches a quote',
    },
    body: {
      ro: 'Agentul își introduce tariful din contul lui, cu valabilitate de la–până la și data plecării. Tariful intră „în așteptare" până când un administrator îl aprobă. Numai un tarif aprobat și valabil la data la care marfa e gata poate intra într-o cotație — restul rămân vizibile agentului, dar nu ies în afară. Agenții nu văd tarifele unul altuia.',
      ru: 'Агент вводит ставку в своём кабинете, с периодом действия и датой отхода. Ставка попадает в статус «на согласовании», пока администратор её не утвердит. В расчёт может попасть только согласованная ставка, действующая на дату готовности груза; остальные видны агенту, но наружу не выходят. Агенты не видят ставки друг друга.',
      en: 'An agent enters his rate from his own account, with a validity window and a departure date. The rate sits as "awaiting approval" until an administrator approves it. Only a rate that is both approved and in force on the cargo-ready date can enter a quote; the rest stay visible to the agent and go no further. Agents cannot see each other rates.',
    },
  },
  {
    id: 'positions',
    title: {
      ro: 'De unde vine poziția de pe hartă',
      ru: 'Откуда берётся позиция на карте',
      en: 'Where a position on the map comes from',
    },
    body: {
      ro: 'Poziția vine din AIS, semnalul pe care navele îl emit singure. Receptoarele de pe coastă nu acoperă mijlocul oceanului, iar recepția prin satelit costă separat, așa că pe traseul China–Constanța există o perioadă fără semnal. În lipsa unui semnal proaspăt harta folosește ultima poziție cunoscută, ultimul eveniment raportat sau portul, și scrie de fiecare dată care dintre ele — plus cât e de veche. Nu inventăm o poziție ca să pară că nava se mișcă.',
      ru: 'Позиция берётся из AIS — сигнала, который суда передают сами. Береговые приёмники не покрывают середину океана, а спутниковый приём стоит отдельно, поэтому на маршруте Китай–Констанца есть период без сигнала. При отсутствии свежего сигнала карта использует последнюю известную позицию, последнее событие или порт и каждый раз указывает, что именно и насколько это давно. Мы не выдумываем позицию, чтобы судно казалось движущимся.',
      en: 'Positions come from AIS, the signal ships broadcast themselves. Shore receivers do not cover mid-ocean and satellite reception is a paid service, so a China–Constanța voyage has a stretch with no signal. Without a fresh fix the map falls back to the last known position, the last reported event, or the port, and always says which — and how old it is. We do not invent a position to make a vessel look like it is moving.',
    },
  },
  {
    id: 'documents',
    title: {
      ro: 'Documentele comenzii',
      ru: 'Документы заказа',
      en: 'Order documents',
    },
    body: {
      ro: 'La CFR și CIF nu mai cerem datele furnizorului, pentru că marfa e deja pe drum: se încarcă numărul de conosament, actele existente și un câmp de comentarii. Numărul de conosament e verificat să nu fie deja folosit de altă rezervare. Documentele generate — factura, comanda de transport, factura de plată — folosesc fontul cu diacritice românești.',
      ru: 'При CFR и CIF мы не запрашиваем данные поставщика, поскольку груз уже в пути: загружается номер коносамента, имеющиеся документы и поле для комментариев. Номер коносамента проверяется на то, что он не занят другой бронью. Формируемые документы — счёт, заказ на перевозку, счёт на оплату — используют шрифт с румынской диакритикой.',
      en: 'Under CFR and CIF we no longer ask for supplier details, because the cargo is already moving: you upload the bill of lading number, the existing paperwork and a comments field. The bill of lading number is checked against other bookings so the same one cannot be used twice. Generated documents — invoice, transport order, payment invoice — use the font that carries Romanian diacritics.',
    },
  },
];
