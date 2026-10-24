/**
 * The brands of road-legal vehicles sold in the US, 2000–2026, with the model
 * years each sold. The make dropdown offers only these.
 *
 * Cars, SUVs, pickups and vans: every make EPA rated for that model year
 * (fueleconomy.gov), which is every light-duty vehicle certified for US roads.
 * Commercial trucks (class 3–8) are not EPA-rated, so they are listed by hand
 * from NHTSA's catalog.
 *
 * NHTSA's own make list also holds every trailer, body and race-car builder
 * that ever filed a VIN (140–330 "makes" a year), which is why it is filtered.
 *
 * `vpic` lists other spellings NHTSA uses for the make; `epa` is EPA's spelling
 * when it differs from `name`. Generated 2026-10-24 from EPA's make menus.
 */

export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2026;

export type RoadMake = {
  name: string;
  from: number;
  to: number;
  kind: 'light' | 'truck';
  /** EPA's name, when it differs. */
  epa?: string;
  /** Other names NHTSA's catalog uses for it. */
  vpic?: string[];
};

const light = (name: string, from: number, to: number, extra: Partial<RoadMake> = {}): RoadMake => ({ name, from, to, kind: 'light', ...extra });
const truck = (name: string, from: number, to: number, extra: Partial<RoadMake> = {}): RoadMake => ({ name, from, to, kind: 'truck', ...extra });

export const ROAD_MAKES: RoadMake[] = [
  light('Acura', 2000, 2026),
  light('Alfa Romeo', 2009, 2026),
  light('Aston Martin', 2000, 2026),
  light('Audi', 2000, 2026),
  light('Azure Dynamics', 2012, 2012),
  light('Bentley', 2000, 2026),
  light('BMW', 2000, 2026),
  light('BMW Alpina', 2003, 2008),
  light('Bugatti', 2006, 2026, { vpic: ['Bugatti Rimac', 'Rimac'] }),
  light('Buick', 2000, 2026),
  light('BYD', 2012, 2020),
  light('Cadillac', 2000, 2026),
  light('Chevrolet', 2000, 2026),
  light('Chrysler', 2000, 2026),
  light('Coda', 2012, 2013, { epa: 'CODA Automotive' }),
  light('Daewoo', 2000, 2004),
  light('Dodge', 2000, 2026),
  light('Ferrari', 2000, 2026),
  light('Fiat', 2012, 2026),
  light('Fisker', 2012, 2024),
  light('Ford', 2000, 2026),
  light('Genesis', 2017, 2026),
  light('GMC', 2000, 2026),
  light('Honda', 2000, 2026),
  light('Hummer', 2000, 2010),
  light('Hyundai', 2000, 2026),
  light('INEOS', 2023, 2026, { epa: 'INEOS Automotive' }),
  light('Infiniti', 2000, 2026),
  light('Isuzu', 2000, 2009),
  light('Jaguar', 2000, 2026),
  light('Jeep', 2000, 2026),
  light('Kandi', 2021, 2021),
  light('Karma', 2018, 2021),
  light('Kia', 2000, 2026),
  light('Koenigsegg', 2018, 2020),
  light('Lamborghini', 2000, 2026),
  light('Land Rover', 2000, 2026),
  light('Lexus', 2000, 2026),
  light('Lincoln', 2000, 2026),
  light('London Taxi', 2003, 2003, { vpic: ['London'] }),
  light('Lordstown', 2023, 2023),
  light('Lotus', 2000, 2026),
  light('Lucid', 2022, 2026),
  light('Mahindra', 2011, 2011),
  light('Maserati', 2002, 2026),
  light('Maybach', 2004, 2012),
  light('Mazda', 2000, 2026),
  light('McLaren', 2012, 2026, { epa: 'McLaren Automotive' }),
  light('Mercedes-Benz', 2000, 2026),
  light('Mercury', 2000, 2011),
  light('MINI', 2002, 2026),
  light('Mitsubishi', 2000, 2026),
  light('Mobility Ventures', 2014, 2016, { epa: 'Mobility Ventures LLC' }),
  light('Morgan', 2002, 2003),
  light('Nissan', 2000, 2026),
  light('Oldsmobile', 2000, 2004),
  light('Pagani', 2014, 2023),
  light('Plymouth', 2000, 2001),
  light('Polestar', 2020, 2026),
  light('Pontiac', 2000, 2010),
  light('Porsche', 2000, 2026),
  light('Qvale', 2000, 2000),
  light('Ram', 2011, 2026),
  light('Rivian', 2022, 2026),
  light('Rolls-Royce', 2000, 2026),
  light('Roush', 2001, 2021, { epa: 'Roush Performance' }),
  light('RUF', 2018, 2023, { epa: 'RUF Automobile' }),
  light('Saab', 2000, 2012),
  light('Saleen', 2008, 2009, { epa: 'Saleen Performance' }),
  light('Saturn', 2000, 2010),
  light('Scion', 2004, 2016),
  light('Shelby', 2008, 2008),
  light('smart', 2008, 2019),
  light('Spyker', 2005, 2011),
  light('SRT', 2013, 2014),
  light('Subaru', 2000, 2026),
  light('Suzuki', 2000, 2013),
  light('Tecstar', 2008, 2008, { epa: 'Tecstar, LP' }),
  light('Tesla', 2008, 2026),
  light('Toyota', 2000, 2026),
  light('VinFast', 2023, 2026, { epa: 'Vinfast' }),
  light('Volkswagen', 2000, 2026),
  light('Volvo', 2000, 2026),
  light('VPG', 2011, 2013),

  truck('Autocar', 2001, 2026),
  truck('Freightliner', 2000, 2026),
  truck('Hino', 2000, 2026),
  truck('International', 2000, 2026),
  // Isuzu's cars and SUVs ended in 2009; its trucks, filed under the same make, carry on.
  truck('Isuzu Commercial Truck', 2010, 2026, { vpic: ['Isuzu'] }),
  truck('Kenworth', 2000, 2026),
  truck('Mack', 2000, 2026),
  truck('Mitsubishi Fuso', 2000, 2026),
  truck('Peterbilt', 2000, 2026),
  truck('Sprinter (Dodge or Freightliner)', 2003, 2005),
  truck('Sterling', 2000, 2010, { vpic: ['Sterling Truck'] }),
  truck('UD Trucks', 2000, 2013),
  truck('Volvo Trucks', 2000, 2026, { vpic: ['Volvo Truck'] }),
  truck('Western Star', 2000, 2026),
  truck('Workhorse', 2000, 2026),
];

export const ROAD_YEARS: string[] = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => String(LAST_YEAR - i));
