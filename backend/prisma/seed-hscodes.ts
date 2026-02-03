/**
 * Seed script for HS Codes
 * Common import categories from China to Moldova
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common HS codes for China-Moldova imports
const hsCodesData = [
  // CHAPTER 39 - PLASTICS
  { code: '3901', chapter: '39', heading: '3901', description: 'Polimeri de etilenă, în forme primare', descriptionEn: 'Polymers of ethylene, in primary forms', dutyRate: 6.5, keywords: 'plastic polietilena' },
  { code: '3904', chapter: '39', heading: '3904', description: 'Polimeri de clorură de vinil, în forme primare', descriptionEn: 'Polymers of vinyl chloride, in primary forms', dutyRate: 6.5, keywords: 'pvc vinil plastic' },
  { code: '3917', chapter: '39', heading: '3917', description: 'Tuburi și țevi din materiale plastice', descriptionEn: 'Tubes, pipes and hoses of plastics', dutyRate: 6.5, keywords: 'tevi plastic conducte' },
  { code: '3920', chapter: '39', heading: '3920', description: 'Alte plăci, foi, filme din materiale plastice', descriptionEn: 'Other plates, sheets, film of plastics', dutyRate: 6.5, keywords: 'folie plastic ambalaj' },
  { code: '3923', chapter: '39', heading: '3923', description: 'Articole pentru transportul sau ambalarea mărfurilor din plastic', descriptionEn: 'Articles for conveyance or packing of goods, of plastics', dutyRate: 6.5, keywords: 'cutii plastic ambalaj containere' },
  { code: '3926', chapter: '39', heading: '3926', description: 'Alte articole din materiale plastice', descriptionEn: 'Other articles of plastics', dutyRate: 6.5, keywords: 'diverse plastic accesorii' },

  // CHAPTER 61-62 - CLOTHING
  { code: '6101', chapter: '61', heading: '6101', description: 'Paltoane, jachete pentru bărbați sau băieți, tricotate', descriptionEn: 'Men\'s overcoats, jackets, knitted', dutyRate: 12, keywords: 'haine barbati palton jacheta tricotaje' },
  { code: '6102', chapter: '61', heading: '6102', description: 'Paltoane, jachete pentru femei sau fete, tricotate', descriptionEn: 'Women\'s overcoats, jackets, knitted', dutyRate: 12, keywords: 'haine femei palton jacheta tricotaje' },
  { code: '6104', chapter: '61', heading: '6104', description: 'Costume, rochii, fuste pentru femei sau fete, tricotate', descriptionEn: 'Women\'s suits, dresses, skirts, knitted', dutyRate: 12, keywords: 'costume rochii fuste femei tricotaje' },
  { code: '6109', chapter: '61', heading: '6109', description: 'Tricouri, maiouri și alte cămăși, tricotate', descriptionEn: 'T-shirts, singlets and other vests, knitted', dutyRate: 12, keywords: 'tricouri maiouri haine' },
  { code: '6110', chapter: '61', heading: '6110', description: 'Pulovere, veste, jachete tricotate', descriptionEn: 'Jerseys, pullovers, cardigans, knitted', dutyRate: 12, keywords: 'pulovere veste jachete tricotaje' },
  { code: '6201', chapter: '62', heading: '6201', description: 'Paltoane, jachete pentru bărbați sau băieți', descriptionEn: 'Men\'s overcoats, jackets', dutyRate: 12, keywords: 'haine barbati palton jacheta' },
  { code: '6202', chapter: '62', heading: '6202', description: 'Paltoane, jachete pentru femei sau fete', descriptionEn: 'Women\'s overcoats, jackets', dutyRate: 12, keywords: 'haine femei palton jacheta' },
  { code: '6203', chapter: '62', heading: '6203', description: 'Costume, pantaloni pentru bărbați', descriptionEn: 'Men\'s suits, trousers', dutyRate: 12, keywords: 'costume pantaloni barbati' },
  { code: '6204', chapter: '62', heading: '6204', description: 'Costume, rochii, fuste pentru femei', descriptionEn: 'Women\'s suits, dresses, skirts', dutyRate: 12, keywords: 'costume rochii fuste femei' },
  { code: '6205', chapter: '62', heading: '6205', description: 'Cămăși pentru bărbați sau băieți', descriptionEn: 'Men\'s shirts', dutyRate: 12, keywords: 'camasi barbati' },

  // CHAPTER 64 - FOOTWEAR
  { code: '6401', chapter: '64', heading: '6401', description: 'Încălțăminte impermeabilă cu tălpi și fețe din cauciuc sau plastic', descriptionEn: 'Waterproof footwear with rubber/plastic soles and uppers', dutyRate: 8, keywords: 'incaltaminte cizme cauciuc plastic' },
  { code: '6402', chapter: '64', heading: '6402', description: 'Încălțăminte cu tălpi și fețe din cauciuc sau plastic', descriptionEn: 'Footwear with rubber/plastic soles and uppers', dutyRate: 8, keywords: 'incaltaminte pantofi adidasi plastic' },
  { code: '6403', chapter: '64', heading: '6403', description: 'Încălțăminte cu tălpi din cauciuc/plastic și fețe din piele', descriptionEn: 'Footwear with rubber/plastic soles and leather uppers', dutyRate: 8, keywords: 'incaltaminte pantofi piele' },
  { code: '6404', chapter: '64', heading: '6404', description: 'Încălțăminte cu tălpi din cauciuc/plastic și fețe textile', descriptionEn: 'Footwear with rubber/plastic soles and textile uppers', dutyRate: 8, keywords: 'incaltaminte pantofi textil adidasi sport' },

  // CHAPTER 84 - MACHINERY
  { code: '8414', chapter: '84', heading: '8414', description: 'Pompe de aer sau de vid, compresoare', descriptionEn: 'Air or vacuum pumps, compressors', dutyRate: 0, keywords: 'pompe compresoare echipamente industriale' },
  { code: '8415', chapter: '84', heading: '8415', description: 'Mașini și aparate pentru condiționarea aerului', descriptionEn: 'Air conditioning machines', dutyRate: 2.7, keywords: 'aer conditionat climatizare' },
  { code: '8418', chapter: '84', heading: '8418', description: 'Frigidere, congelatoare', descriptionEn: 'Refrigerators, freezers', dutyRate: 2.2, keywords: 'frigider congelator electrocasnice' },
  { code: '8450', chapter: '84', heading: '8450', description: 'Mașini de spălat rufe', descriptionEn: 'Washing machines', dutyRate: 2.2, keywords: 'masina spalat rufe electrocasnice' },
  { code: '8471', chapter: '84', heading: '8471', description: 'Mașini automate de prelucrare a datelor (calculatoare)', descriptionEn: 'Automatic data processing machines (computers)', dutyRate: 0, keywords: 'calculatoare computere laptopuri' },
  { code: '8473', chapter: '84', heading: '8473', description: 'Părți și accesorii pentru mașini de birou', descriptionEn: 'Parts and accessories for office machines', dutyRate: 0, keywords: 'piese accesorii calculatoare' },
  { code: '8479', chapter: '84', heading: '8479', description: 'Mașini și aparate mecanice cu funcție proprie', descriptionEn: 'Machines having individual functions', dutyRate: 1.7, keywords: 'masini utilaje industriale' },

  // CHAPTER 85 - ELECTRICAL EQUIPMENT
  { code: '8501', chapter: '85', heading: '8501', description: 'Motoare electrice și generatoare', descriptionEn: 'Electric motors and generators', dutyRate: 2.7, keywords: 'motoare electrice generatoare' },
  { code: '8504', chapter: '85', heading: '8504', description: 'Transformatoare electrice, convertoare statice', descriptionEn: 'Electric transformers, static converters', dutyRate: 2.7, keywords: 'transformatoare convertoare alimentare' },
  { code: '8516', chapter: '85', heading: '8516', description: 'Aparate electrotermice (fier de călcat, cuptoare)', descriptionEn: 'Electric space heating apparatus', dutyRate: 2.7, keywords: 'fier calcat cuptor incalzire electrocasnice' },
  { code: '8517', chapter: '85', heading: '8517', description: 'Aparate telefonice, echipamente de telecomunicații', descriptionEn: 'Telephone sets, telecommunications equipment', dutyRate: 0, keywords: 'telefoane smartphone comunicatii' },
  { code: '8518', chapter: '85', heading: '8518', description: 'Microfoane, difuzoare, căști', descriptionEn: 'Microphones, loudspeakers, headphones', dutyRate: 2, keywords: 'difuzoare boxe casti audio' },
  { code: '8519', chapter: '85', heading: '8519', description: 'Aparate de înregistrare sau redare a sunetului', descriptionEn: 'Sound recording/reproducing apparatus', dutyRate: 3.5, keywords: 'player audio inregistrare' },
  { code: '8523', chapter: '85', heading: '8523', description: 'Discuri, benzi, dispozitive de stocare', descriptionEn: 'Discs, tapes, solid-state storage devices', dutyRate: 0, keywords: 'memorie stocare usb ssd hdd' },
  { code: '8525', chapter: '85', heading: '8525', description: 'Aparate de transmisie, camere video', descriptionEn: 'Transmission apparatus, video cameras', dutyRate: 0, keywords: 'camere video transmisie' },
  { code: '8528', chapter: '85', heading: '8528', description: 'Monitoare și proiectoare, televizoare', descriptionEn: 'Monitors, projectors, TVs', dutyRate: 14, keywords: 'televizor monitor proiector display' },
  { code: '8536', chapter: '85', heading: '8536', description: 'Aparate electrice de comutare, protecție', descriptionEn: 'Electrical switching/protection apparatus', dutyRate: 2.7, keywords: 'intrerupatoare prize electrice' },
  { code: '8544', chapter: '85', heading: '8544', description: 'Fire, cabluri electrice izolate', descriptionEn: 'Insulated wire and cables', dutyRate: 3.7, keywords: 'cabluri fire electrice' },

  // CHAPTER 87 - VEHICLES
  { code: '8711', chapter: '87', heading: '8711', description: 'Motociclete, motorete', descriptionEn: 'Motorcycles, mopeds', dutyRate: 6, keywords: 'motociclete scutere mopede' },
  { code: '8712', chapter: '87', heading: '8712', description: 'Biciclete și alte vehicule cu pedale', descriptionEn: 'Bicycles and other cycles', dutyRate: 15, keywords: 'biciclete' },
  { code: '8714', chapter: '87', heading: '8714', description: 'Părți și accesorii pentru vehicule', descriptionEn: 'Parts and accessories for vehicles', dutyRate: 3.5, keywords: 'piese accesorii auto' },

  // CHAPTER 94 - FURNITURE
  { code: '9401', chapter: '94', heading: '9401', description: 'Scaune și părți ale acestora', descriptionEn: 'Seats and parts thereof', dutyRate: 0, keywords: 'scaune fotolii canapele' },
  { code: '9403', chapter: '94', heading: '9403', description: 'Mobilă din alte materiale (lemn, metal, plastic)', descriptionEn: 'Other furniture (wood, metal, plastic)', dutyRate: 0, keywords: 'mobilier dulapuri mese' },
  { code: '9403.10', chapter: '94', heading: '9403', subheading: '9403.10', description: 'Mobilă metalică pentru birouri', descriptionEn: 'Metal furniture for offices', dutyRate: 0, keywords: 'mobilier birou metal' },
  { code: '9403.20', chapter: '94', heading: '9403', subheading: '9403.20', description: 'Altă mobilă metalică', descriptionEn: 'Other metal furniture', dutyRate: 0, keywords: 'mobilier metal' },
  { code: '9403.30', chapter: '94', heading: '9403', subheading: '9403.30', description: 'Mobilă din lemn pentru birouri', descriptionEn: 'Wooden furniture for offices', dutyRate: 0, keywords: 'mobilier birou lemn' },
  { code: '9403.40', chapter: '94', heading: '9403', subheading: '9403.40', description: 'Mobilă din lemn pentru bucătării', descriptionEn: 'Wooden furniture for kitchens', dutyRate: 0, keywords: 'mobilier bucatarie lemn' },
  { code: '9403.50', chapter: '94', heading: '9403', subheading: '9403.50', description: 'Mobilă din lemn pentru dormitoare', descriptionEn: 'Wooden furniture for bedrooms', dutyRate: 0, keywords: 'mobilier dormitor lemn pat' },
  { code: '9403.60', chapter: '94', heading: '9403', subheading: '9403.60', description: 'Altă mobilă din lemn', descriptionEn: 'Other wooden furniture', dutyRate: 0, keywords: 'mobilier lemn divers' },
  { code: '9403.70', chapter: '94', heading: '9403', subheading: '9403.70', description: 'Mobilă din materiale plastice', descriptionEn: 'Furniture of plastics', dutyRate: 0, keywords: 'mobilier plastic' },
  { code: '9404', chapter: '94', heading: '9404', description: 'Somiere, saltele, articole de pat', descriptionEn: 'Mattress supports, mattresses, bedding', dutyRate: 0, keywords: 'saltele somiere lenjerie pat' },
  { code: '9405', chapter: '94', heading: '9405', description: 'Aparate de iluminat, corpuri de iluminat', descriptionEn: 'Lamps and lighting fittings', dutyRate: 3.7, keywords: 'lampi lustre iluminat corpuri' },
  { code: '9406', chapter: '94', heading: '9406', description: 'Construcții prefabricate', descriptionEn: 'Prefabricated buildings', dutyRate: 0, keywords: 'constructii prefabricate case' },

  // CHAPTER 95 - TOYS & GAMES
  { code: '9503', chapter: '95', heading: '9503', description: 'Alte jucării; modele reduse', descriptionEn: 'Other toys; reduced-size models', dutyRate: 0, keywords: 'jucarii jocuri copii' },
  { code: '9504', chapter: '95', heading: '9504', description: 'Articole pentru jocuri de societate, jocuri video', descriptionEn: 'Video games, society games', dutyRate: 0, keywords: 'jocuri video console' },
  { code: '9506', chapter: '95', heading: '9506', description: 'Articole și echipamente pentru sport', descriptionEn: 'Sports articles and equipment', dutyRate: 2.7, keywords: 'sport echipament fitness' },

  // CHAPTER 39/40 - MORE PLASTICS AND RUBBER
  { code: '4011', chapter: '40', heading: '4011', description: 'Pneuri noi din cauciuc pentru automobile', descriptionEn: 'New pneumatic tyres, of rubber', dutyRate: 4.5, keywords: 'anvelope pneuri cauciuc auto' },
  { code: '4015', chapter: '40', heading: '4015', description: 'Îmbrăcăminte și accesorii din cauciuc vulcanizat', descriptionEn: 'Articles of apparel of vulcanized rubber', dutyRate: 6.5, keywords: 'manusi cauciuc accesorii' },

  // CHAPTER 44 - WOOD
  { code: '4410', chapter: '44', heading: '4410', description: 'Plăci din lemn aglomerat (PAL)', descriptionEn: 'Particle board', dutyRate: 10, keywords: 'pal placi lemn aglomerat' },
  { code: '4411', chapter: '44', heading: '4411', description: 'Plăci din fibre de lemn (MDF, HDF)', descriptionEn: 'Fibreboard of wood', dutyRate: 10, keywords: 'mdf hdf placi fibre lemn' },
  { code: '4418', chapter: '44', heading: '4418', description: 'Tâmplărie și elemente pentru construcții din lemn', descriptionEn: 'Builders\' joinery of wood', dutyRate: 3, keywords: 'usi ferestre tamplarie lemn' },

  // CHAPTER 48 - PAPER
  { code: '4818', chapter: '48', heading: '4818', description: 'Hârtie igienică, batiste, prosoape din hârtie', descriptionEn: 'Toilet paper, tissues, towels', dutyRate: 0, keywords: 'hartie igienica servetele prosoape' },
  { code: '4819', chapter: '48', heading: '4819', description: 'Cutii, saci, pungi din hârtie sau carton', descriptionEn: 'Cartons, boxes, bags of paper', dutyRate: 0, keywords: 'cutii carton ambalaje pungi' },
  { code: '4820', chapter: '48', heading: '4820', description: 'Registre, caiete, agende din hârtie', descriptionEn: 'Registers, notebooks, diaries', dutyRate: 0, keywords: 'caiete agende registre papetarie' },

  // CHAPTER 69-70 - CERAMICS AND GLASS
  { code: '6910', chapter: '69', heading: '6910', description: 'Chiuvete, lavoare din ceramică', descriptionEn: 'Ceramic sinks, wash basins', dutyRate: 0, keywords: 'chiuvete sanitare ceramica' },
  { code: '6911', chapter: '69', heading: '6911', description: 'Veselă și alte articole de menaj din porțelan', descriptionEn: 'Tableware of porcelain', dutyRate: 0, keywords: 'vesela farfurii portelan' },
  { code: '6912', chapter: '69', heading: '6912', description: 'Veselă din alte materiale ceramice', descriptionEn: 'Tableware of other ceramic', dutyRate: 0, keywords: 'vesela farfurii ceramica' },
  { code: '7010', chapter: '70', heading: '7010', description: 'Damigene, sticle, borcane din sticlă', descriptionEn: 'Carboys, bottles, jars of glass', dutyRate: 0, keywords: 'sticle borcane sticla' },
  { code: '7013', chapter: '70', heading: '7013', description: 'Articole din sticlă pentru uz casnic', descriptionEn: 'Glassware for household use', dutyRate: 0, keywords: 'pahare vase sticla articole' },

  // CHAPTER 73 - IRON AND STEEL
  { code: '7306', chapter: '73', heading: '7306', description: 'Țevi și tuburi din fier sau oțel', descriptionEn: 'Tubes and pipes of iron or steel', dutyRate: 0, keywords: 'tevi tub metal otel fier' },
  { code: '7307', chapter: '73', heading: '7307', description: 'Accesorii pentru țevi din fier sau oțel', descriptionEn: 'Tube or pipe fittings of iron or steel', dutyRate: 0, keywords: 'accesorii tevi otel fier' },
  { code: '7318', chapter: '73', heading: '7318', description: 'Șuruburi, piulițe, buloane din fier sau oțel', descriptionEn: 'Screws, bolts, nuts of iron or steel', dutyRate: 3.7, keywords: 'suruburi piulite buloane otel' },
  { code: '7323', chapter: '73', heading: '7323', description: 'Articole de menaj din fier sau oțel', descriptionEn: 'Table, kitchen articles of iron or steel', dutyRate: 0, keywords: 'oale cratite vase otel inox' },

  // CHAPTER 76 - ALUMINUM
  { code: '7610', chapter: '76', heading: '7610', description: 'Construcții și părți din aluminiu', descriptionEn: 'Aluminium structures and parts', dutyRate: 6, keywords: 'profile aluminiu constructii' },
  { code: '7615', chapter: '76', heading: '7615', description: 'Articole de menaj din aluminiu', descriptionEn: 'Table, kitchen articles of aluminium', dutyRate: 6, keywords: 'vase oale aluminiu bucatarie' },
];

async function seedHsCodes() {
  console.log('Seeding HS codes...');

  let created = 0;
  let skipped = 0;

  for (const hsCode of hsCodesData) {
    try {
      await prisma.hsCode.upsert({
        where: { code: hsCode.code },
        update: {
          description: hsCode.description,
          descriptionEn: hsCode.descriptionEn,
          chapter: hsCode.chapter,
          heading: hsCode.heading,
          subheading: hsCode.subheading || null,
          dutyRate: hsCode.dutyRate,
          vatRate: 20, // Standard Moldova VAT
          keywords: hsCode.keywords,
          isActive: true,
        },
        create: {
          code: hsCode.code,
          description: hsCode.description,
          descriptionEn: hsCode.descriptionEn,
          chapter: hsCode.chapter,
          heading: hsCode.heading,
          subheading: hsCode.subheading || null,
          dutyRate: hsCode.dutyRate,
          vatRate: 20,
          keywords: hsCode.keywords,
          isActive: true,
        },
      });
      created++;
    } catch (error) {
      console.error(`Failed to seed HS code ${hsCode.code}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Seeded ${created} HS codes, skipped ${skipped}`);
}

seedHsCodes()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
