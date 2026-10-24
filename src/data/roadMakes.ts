/**
 * The brands of road-legal vehicles sold in the US, 2000–2027, with the model
 * years each sold. The make dropdown offers only these.
 *
 * Cars, SUVs, pickups and vans: every make EPA rated for that model year
 * (fueleconomy.gov), which is every light-duty vehicle certified for US roads.
 * Commercial trucks (class 3–8) are not EPA-rated, so they are listed by hand
 * from NHTSA's catalog, as are street motorcycles and motorhome builders. The
 * keyless catalog has no motorcycles or motorhomes, so their models come from
 * NHTSA through the vpic-catalog edge function (`nhtsa` below: the make to ask
 * for, and the exact make names to keep, since NHTSA matches loosely).
 * Brands still selling run to 2027, the newest model year on sale.
 *
 * NHTSA's own make list also holds every trailer, body and race-car builder
 * that ever filed a VIN (140–330 "makes" a year), which is why it is filtered.
 *
 * `vpic` lists other spellings NHTSA uses for the make; `epa` is EPA's spelling
 * when it differs from `name`. Generated 2026-10-24 from EPA's make menus.
 */

export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2027;

export type RoadMake = {
  name: string;
  from: number;
  to: number;
  kind: 'light' | 'truck' | 'motorcycle' | 'rv';
  /** EPA's name, when it differs. */
  epa?: string;
  /** Other names NHTSA's catalog uses for it. */
  vpic?: string[];
  /** Models from NHTSA directly: the make to ask for, its make names, and the vehicle type. */
  nhtsa?: { make: string; names: string[]; type?: 'motorcycle' };
};

const light = (name: string, from: number, to: number, extra: Partial<RoadMake> = {}): RoadMake => ({ name, from, to, kind: 'light', ...extra });
const moto = (name: string, from: number, to: number, make: string, names: string[]): RoadMake => ({
  name,
  from,
  to,
  kind: 'motorcycle',
  nhtsa: { make, names, type: 'motorcycle' },
});
const rv = (name: string, from: number, to: number, make: string, names: string[]): RoadMake => ({ name, from, to, kind: 'rv', nhtsa: { make, names } });
const truck = (name: string, from: number, to: number, extra: Partial<RoadMake> = {}): RoadMake => ({ name, from, to, kind: 'truck', ...extra });

export const ROAD_MAKES: RoadMake[] = [
  light('Acura', 2000, 2027),
  light('Alfa Romeo', 2009, 2027),
  light('Aston Martin', 2000, 2027),
  light('Audi', 2000, 2027),
  light('Azure Dynamics', 2012, 2012),
  light('Bentley', 2000, 2027),
  light('BMW', 2000, 2027),
  light('BMW Alpina', 2003, 2008),
  light('Bugatti', 2006, 2027, { vpic: ['Bugatti Rimac', 'Rimac'] }),
  light('Buick', 2000, 2027),
  light('BYD', 2012, 2020),
  light('Cadillac', 2000, 2027),
  light('Chevrolet', 2000, 2027),
  light('Chrysler', 2000, 2027),
  light('Coda', 2012, 2013, { epa: 'CODA Automotive' }),
  light('Daewoo', 2000, 2004),
  light('Dodge', 2000, 2027),
  light('Ferrari', 2000, 2027),
  light('Fiat', 2012, 2027),
  light('Fisker', 2012, 2024),
  light('Ford', 2000, 2027),
  light('Genesis', 2017, 2027),
  light('GMC', 2000, 2027),
  light('Honda', 2000, 2027),
  light('Hummer', 2000, 2010),
  light('Hyundai', 2000, 2027),
  light('INEOS', 2023, 2027, { epa: 'INEOS Automotive' }),
  light('Infiniti', 2000, 2027),
  light('Isuzu', 2000, 2009),
  light('Jaguar', 2000, 2027),
  light('Jeep', 2000, 2027),
  light('Kandi', 2021, 2021),
  light('Karma', 2018, 2021),
  light('Kia', 2000, 2027),
  light('Koenigsegg', 2018, 2020),
  light('Lamborghini', 2000, 2027),
  light('Land Rover', 2000, 2027),
  light('Lexus', 2000, 2027),
  light('Lincoln', 2000, 2027),
  light('London Taxi', 2003, 2003, { vpic: ['London'] }),
  light('Lordstown', 2023, 2023),
  light('Lotus', 2000, 2027),
  light('Lucid', 2022, 2027),
  light('Mahindra', 2011, 2011),
  light('Maserati', 2002, 2027),
  light('Maybach', 2004, 2012),
  light('Mazda', 2000, 2027),
  light('McLaren', 2012, 2027, { epa: 'McLaren Automotive' }),
  light('Mercedes-Benz', 2000, 2027),
  light('Mercury', 2000, 2011),
  light('MINI', 2002, 2027),
  light('Mitsubishi', 2000, 2027),
  light('Mobility Ventures', 2014, 2016, { epa: 'Mobility Ventures LLC' }),
  light('Morgan', 2002, 2003),
  light('Nissan', 2000, 2027),
  light('Oldsmobile', 2000, 2004),
  light('Pagani', 2014, 2023),
  light('Plymouth', 2000, 2001),
  light('Polestar', 2020, 2027),
  light('Pontiac', 2000, 2010),
  light('Porsche', 2000, 2027),
  light('Qvale', 2000, 2000),
  light('Ram', 2011, 2027),
  light('Rivian', 2022, 2027),
  light('Rolls-Royce', 2000, 2027),
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
  light('Subaru', 2000, 2027),
  light('Suzuki', 2000, 2013),
  light('Tecstar', 2008, 2008, { epa: 'Tecstar, LP' }),
  light('Tesla', 2008, 2027),
  light('Toyota', 2000, 2027),
  light('VinFast', 2023, 2027, { epa: 'Vinfast' }),
  light('Volkswagen', 2000, 2027),
  light('Volvo', 2000, 2027),
  light('VPG', 2011, 2013),

  truck('Autocar', 2001, 2027),
  truck('Freightliner', 2000, 2027),
  truck('Hino', 2000, 2027),
  truck('International', 2000, 2027),
  // Isuzu's cars and SUVs ended in 2009; its trucks, filed under the same make, carry on.
  truck('Isuzu Commercial Truck', 2010, 2027, { vpic: ['Isuzu'] }),
  truck('Kenworth', 2000, 2027),
  truck('Mack', 2000, 2027),
  truck('Mitsubishi Fuso', 2000, 2027),
  truck('Peterbilt', 2000, 2027),
  truck('Sprinter (Dodge or Freightliner)', 2003, 2005),
  truck('Sterling', 2000, 2010, { vpic: ['Sterling Truck'] }),
  truck('UD Trucks', 2000, 2013),
  truck('Volvo Trucks', 2000, 2027, { vpic: ['Volvo Truck'] }),
  truck('Western Star', 2000, 2027),
  truck('Workhorse', 2000, 2027),

  // Street motorcycles, scooters and three-wheelers. NHTSA's motorcycle list for a
  // brand also holds its dirt bikes and ATVs; the shop can skip those.
  moto('Aprilia', 2000, 2027, 'aprilia', ['APRILIA']),
  moto('Benelli', 2000, 2027, 'benelli', ['BENELLI', 'BENELLI Q.J. SRL']),
  moto('BMW Motorrad', 2000, 2027, 'bmw', ['BMW']),
  moto('Buell', 2000, 2017, 'buell', ['BUELL', 'BUELL (EBR)']),
  moto('Can-Am (Spyder, Ryker)', 2008, 2027, 'can-am', ['CAN-AM', 'BRP']),
  moto('CFMOTO', 2017, 2027, 'cfmoto', ['CFMOTO']),
  moto('Ducati', 2000, 2027, 'ducati', ['DUCATI']),
  moto('Energica', 2019, 2027, 'energica', ['ENERGICA']),
  moto('Harley-Davidson', 2000, 2027, 'harley-davidson', ['HARLEY-DAVIDSON', 'HARLEY']),
  moto('Honda Motorcycles', 2000, 2027, 'honda', ['HONDA']),
  moto('Husqvarna', 2000, 2027, 'husqvarna', ['HUSQVARNA']),
  moto('Indian', 2000, 2027, 'indian motorcycle', ['INDIAN MOTORCYCLE']),
  moto('Kawasaki', 2000, 2027, 'kawasaki', ['KAWASAKI']),
  moto('KTM', 2000, 2027, 'ktm', ['KTM']),
  moto('Kymco', 2000, 2027, 'kymco', ['KYMCO']),
  moto('LiveWire', 2022, 2027, 'livewire', ['LIVEWIRE']),
  moto('Moto Guzzi', 2000, 2027, 'moto guzzi', ['MOTO GUZZI']),
  moto('MV Agusta', 2000, 2027, 'mv agusta', ['MV AGUSTA MOTOR']),
  moto('Piaggio', 2000, 2027, 'piaggio', ['PIAGGIO', 'PIAGGIO AND VESPA']),
  moto('Polaris (Slingshot)', 2015, 2027, 'polaris', ['POLARIS']),
  moto('Royal Enfield', 2000, 2027, 'royal enfield', ['ROYAL ENFIELD', 'ROYAL ENFIELD HIGHWAY MOTORCYCLE', 'ROYAL ENFIELD HIGHWAY MOTORCYCLE AND J PRODUCT FAMILY']),
  moto('Suzuki Motorcycles', 2000, 2027, 'suzuki', ['SUZUKI']),
  moto('Triumph', 2000, 2027, 'triumph', ['TRIUMPH']),
  moto('Ural', 2000, 2027, 'ural', ['URAL', 'URAL (IMZ-KAZAKHSTAN, LLC)', 'URAL NEO', 'URAL SIDECARS & SOLOS']),
  moto('Vespa', 2000, 2027, 'vespa', ['VESPA', 'PIAGGIO AND VESPA']),
  moto('Victory', 2000, 2017, 'victory', ['VICTORY']),
  moto('Yamaha', 2000, 2027, 'yamaha', ['YAMAHA']),
  moto('Zero', 2010, 2027, 'zero motorcycles', ['ZERO MOTORCYCLES']),

  // Motorhome builders (the coach). The chassis under a gas Class A or a Class C is
  // usually a Ford, Chevrolet, Freightliner, Spartan or Workhorse: pick that to work
  // on the engine and drivetrain.
  rv('Airstream', 2000, 2027, 'airstream', ['AIRSTREAM', 'AIRSTREAM INC.']),
  rv('Coachmen', 2000, 2027, 'coachmen', ['COACHMEN']),
  rv('Country Coach', 2000, 2009, 'country coach', ['COUNTRY COACH']),
  rv('Damon', 2000, 2010, 'damon', ['DAMON']),
  rv('Dynamax', 2000, 2027, 'dynamax', ['DYNAMAX CORPORATION']),
  rv('Entegra Coach', 2009, 2027, 'entegra', ['ENTEGRA']),
  rv('Fleetwood RV', 2000, 2027, 'fleetwood', ['FLEETWOOD RV, INC.', 'FLEETWOOD ENTERPRISES']),
  rv('Forest River', 2000, 2027, 'forest river', ['FOREST RIVER']),
  rv('Foretravel', 2000, 2027, 'foretravel', ['FORETRAVEL']),
  rv('Gulf Stream', 2000, 2027, 'gulf stream', ['GULF STREAM COACH, INC.']),
  rv('Holiday Rambler', 2000, 2027, 'holiday rambler', ['HOLIDAY RAMBLER']),
  rv('Jayco', 2000, 2027, 'jayco', ['JAYCO']),
  rv('Monaco', 2000, 2027, 'monaco', ['MONACO', 'MONACO RV']),
  rv('Newmar', 2000, 2027, 'newmar', ['NEWMAR CORPORATION']),
  rv('Nexus RV', 2011, 2027, 'nexus', ['NEXUS']),
  rv('Phoenix Cruiser', 2000, 2027, 'phoenix cruiser', ['PHOENIX CRUISER']),
  rv('Pleasure-Way', 2000, 2027, 'pleasure-way', ['PLEASURE-WAY']),
  rv('Prevost', 2000, 2027, 'prevost', ['PREVOST']),
  rv('Rexhall', 2000, 2014, 'rexhall', ['REXHALL INDUSTRIES, INC.']),
  rv('Spartan (RV chassis)', 2000, 2027, 'spartan', ['SPARTAN', 'SPARTAN MOTORS', 'SPARTAN MOTORS CHASSIS', 'SPARTAN RV CHASSIS']),
  rv('Thor Motor Coach', 2000, 2027, 'thor', ['THOR', 'THOR INDIANA, INC.', 'THOR MANUFACTURING LLC']),
  rv('Tiffin', 2000, 2027, 'tiffin', ['TIFFIN MOTORHOMES, INC']),
  rv('Winnebago', 2000, 2027, 'winnebago', ['WINNEBAGO', 'WINNEBAGO OF INDIANA']),
];

export const ROAD_YEARS: string[] = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => String(LAST_YEAR - i));
