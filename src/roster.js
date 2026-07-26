/* ============================================================================
 * ROSTER — 16 clubs, 3 skaters + 1 goaltender each.
 * Unofficial fan project. Not affiliated with or endorsed by the NHL or the
 * NHLPA. Player names are used descriptively; all crests here are original
 * abstract marks generated in code, not real team logos.
 * ==========================================================================*/

/* Skater ratings 0-99:  spd = speed/acceleration, sht = shot power+accuracy,
 * pss = passing, chk = checking/strength, hnd = stickhandling/puck control.
 * Goalie: ref = reflexes, pos = positioning, rec = rebound control.        */

const TEAMS = [
  {
    id: 'EDM', city: 'Edmonton', name: 'Oilers', abbr: 'EDM',
    colors: { primary: '#FF4C00', secondary: '#041E42', accent: '#FFFFFF', ice: '#ff8b52' },
    crest: 'drop',
    skaters: [
      { n: 97, name: 'C. McDavid',  short: 'MCDAVID',  pos: 'C', spd: 99, sht: 88, pss: 95, chk: 68, hnd: 99 },
      { n: 29, name: 'L. Draisaitl', short: 'DRAISAITL', pos: 'C', spd: 86, sht: 96, pss: 93, chk: 80, hnd: 94 },
      { n: 2,  name: 'E. Bouchard', short: 'BOUCHARD', pos: 'D', spd: 82, sht: 94, pss: 88, chk: 80, hnd: 82 },
    ],
    goalie: { n: 74, name: 'S. Skinner', short: 'SKINNER', ref: 83, pos: 82, rec: 78 },
  },
  {
    id: 'COL', city: 'Colorado', name: 'Avalanche', abbr: 'COL',
    colors: { primary: '#6F263D', secondary: '#236192', accent: '#A2AAAD', ice: '#c1738f' },
    crest: 'peak',
    skaters: [
      { n: 29, name: 'N. MacKinnon', short: 'MACKINNON', pos: 'C', spd: 96, sht: 95, pss: 92, chk: 84, hnd: 95 },
      { n: 8,  name: 'C. Makar',     short: 'MAKAR',     pos: 'D', spd: 95, sht: 90, pss: 94, chk: 74, hnd: 96 },
      { n: 88, name: 'M. Necas',     short: 'NECAS',     pos: 'W', spd: 93, sht: 85, pss: 87, chk: 66, hnd: 89 },
    ],
    goalie: { n: 39, name: 'M. Blackwood', short: 'BLACKWOOD', ref: 82, pos: 80, rec: 76 },
  },
  {
    id: 'TOR', city: 'Toronto', name: 'Maple Leafs', abbr: 'TOR',
    colors: { primary: '#00205B', secondary: '#FFFFFF', accent: '#7BAFD4', ice: '#5c86c9' },
    crest: 'leaf',
    skaters: [
      { n: 34, name: 'A. Matthews', short: 'MATTHEWS', pos: 'C', spd: 88, sht: 99, pss: 86, chk: 82, hnd: 95 },
      { n: 88, name: 'W. Nylander', short: 'NYLANDER', pos: 'W', spd: 92, sht: 91, pss: 88, chk: 64, hnd: 97 },
      { n: 44, name: 'M. Rielly',   short: 'RIELLY',   pos: 'D', spd: 85, sht: 82, pss: 89, chk: 74, hnd: 85 },
    ],
    goalie: { n: 41, name: 'A. Stolarz', short: 'STOLARZ', ref: 84, pos: 83, rec: 79 },
  },
  {
    id: 'TBL', city: 'Tampa Bay', name: 'Lightning', abbr: 'TBL',
    colors: { primary: '#002868', secondary: '#FFFFFF', accent: '#4FA3FF', ice: '#4a76c9' },
    crest: 'bolt',
    skaters: [
      { n: 86, name: 'N. Kucherov', short: 'KUCHEROV', pos: 'W', spd: 88, sht: 91, pss: 99, chk: 60, hnd: 98 },
      { n: 21, name: 'B. Point',    short: 'POINT',    pos: 'C', spd: 91, sht: 93, pss: 88, chk: 66, hnd: 92 },
      { n: 77, name: 'V. Hedman',   short: 'HEDMAN',   pos: 'D', spd: 82, sht: 90, pss: 89, chk: 90, hnd: 85 },
    ],
    goalie: { n: 88, name: 'A. Vasilevskiy', short: 'VASILEVSKIY', ref: 93, pos: 91, rec: 88 },
  },
  {
    id: 'FLA', city: 'Florida', name: 'Panthers', abbr: 'FLA',
    colors: { primary: '#C8102E', secondary: '#041E42', accent: '#B9975B', ice: '#e0596e' },
    crest: 'claw',
    skaters: [
      { n: 19, name: 'M. Tkachuk',  short: 'TKACHUK',  pos: 'W', spd: 84, sht: 90, pss: 88, chk: 97, hnd: 90 },
      { n: 16, name: 'A. Barkov',   short: 'BARKOV',   pos: 'C', spd: 87, sht: 88, pss: 92, chk: 89, hnd: 94 },
      { n: 13, name: 'S. Reinhart', short: 'REINHART', pos: 'C', spd: 84, sht: 94, pss: 87, chk: 70, hnd: 90 },
    ],
    goalie: { n: 72, name: 'S. Bobrovsky', short: 'BOBROVSKY', ref: 89, pos: 90, rec: 84 },
  },
  {
    id: 'VGK', city: 'Vegas', name: 'Golden Knights', abbr: 'VGK',
    colors: { primary: '#B4975A', secondary: '#333F42', accent: '#C8102E', ice: '#cdb888' },
    crest: 'shield',
    skaters: [
      { n: 9,  name: 'J. Eichel',   short: 'EICHEL',   pos: 'C', spd: 92, sht: 91, pss: 93, chk: 78, hnd: 93 },
      { n: 61, name: 'M. Stone',    short: 'STONE',    pos: 'W', spd: 84, sht: 86, pss: 91, chk: 85, hnd: 92 },
      { n: 27, name: 'S. Theodore', short: 'THEODORE', pos: 'D', spd: 89, sht: 86, pss: 87, chk: 72, hnd: 86 },
    ],
    goalie: { n: 33, name: 'A. Hill', short: 'HILL', ref: 85, pos: 84, rec: 80 },
  },
  {
    id: 'NYR', city: 'New York', name: 'Rangers', abbr: 'NYR',
    colors: { primary: '#0038A8', secondary: '#CE1126', accent: '#FFFFFF', ice: '#5b7fd6' },
    crest: 'liberty',
    skaters: [
      { n: 10, name: 'A. Panarin',   short: 'PANARIN',   pos: 'W', spd: 88, sht: 90, pss: 97, chk: 60, hnd: 97 },
      { n: 93, name: 'M. Zibanejad', short: 'ZIBANEJAD', pos: 'C', spd: 85, sht: 93, pss: 86, chk: 80, hnd: 88 },
      { n: 23, name: 'A. Fox',       short: 'FOX',       pos: 'D', spd: 86, sht: 84, pss: 96, chk: 70, hnd: 93 },
    ],
    goalie: { n: 31, name: 'I. Shesterkin', short: 'SHESTERKIN', ref: 94, pos: 90, rec: 86 },
  },
  {
    id: 'DAL', city: 'Dallas', name: 'Stars', abbr: 'DAL',
    colors: { primary: '#006847', secondary: '#8F8F8C', accent: '#FFFFFF', ice: '#3f9d7c' },
    crest: 'star',
    skaters: [
      { n: 21, name: 'J. Robertson', short: 'ROBERTSON', pos: 'W', spd: 86, sht: 95, pss: 88, chk: 72, hnd: 92 },
      { n: 4,  name: 'M. Heiskanen', short: 'HEISKANEN', pos: 'D', spd: 92, sht: 85, pss: 92, chk: 78, hnd: 91 },
      { n: 53, name: 'W. Johnston',  short: 'JOHNSTON',  pos: 'C', spd: 86, sht: 89, pss: 84, chk: 77, hnd: 88 },
    ],
    goalie: { n: 29, name: 'J. Oettinger', short: 'OETTINGER', ref: 91, pos: 89, rec: 85 },
  },
  {
    id: 'BOS', city: 'Boston', name: 'Bruins', abbr: 'BOS',
    colors: { primary: '#FFB81C', secondary: '#111111', accent: '#FFFFFF', ice: '#f0c65a' },
    crest: 'spoke',
    skaters: [
      { n: 88, name: 'D. Pastrnak', short: 'PASTRNAK', pos: 'W', spd: 89, sht: 97, pss: 89, chk: 70, hnd: 95 },
      { n: 28, name: 'E. Lindholm', short: 'LINDHOLM', pos: 'C', spd: 84, sht: 85, pss: 87, chk: 82, hnd: 86 },
      { n: 73, name: 'C. McAvoy',   short: 'MCAVOY',   pos: 'D', spd: 87, sht: 84, pss: 88, chk: 92, hnd: 86 },
    ],
    goalie: { n: 1, name: 'J. Swayman', short: 'SWAYMAN', ref: 88, pos: 86, rec: 82 },
  },
  {
    id: 'CAR', city: 'Carolina', name: 'Hurricanes', abbr: 'CAR',
    colors: { primary: '#CC0000', secondary: '#111111', accent: '#A2AAAD', ice: '#e05555' },
    crest: 'storm',
    skaters: [
      { n: 20, name: 'S. Aho',        short: 'AHO',        pos: 'C', spd: 89, sht: 90, pss: 91, chk: 76, hnd: 92 },
      { n: 37, name: 'A. Svechnikov', short: 'SVECHNIKOV', pos: 'W', spd: 87, sht: 91, pss: 82, chk: 88, hnd: 91 },
      { n: 74, name: 'J. Slavin',     short: 'SLAVIN',     pos: 'D', spd: 85, sht: 74, pss: 87, chk: 89, hnd: 85 },
    ],
    goalie: { n: 31, name: 'F. Andersen', short: 'ANDERSEN', ref: 86, pos: 87, rec: 81 },
  },
  {
    id: 'WPG', city: 'Winnipeg', name: 'Jets', abbr: 'WPG',
    colors: { primary: '#041E42', secondary: '#004C97', accent: '#AC9E7E', ice: '#3d5f8f' },
    crest: 'jet',
    skaters: [
      { n: 81, name: 'K. Connor',    short: 'CONNOR',    pos: 'W', spd: 91, sht: 94, pss: 86, chk: 62, hnd: 92 },
      { n: 55, name: 'M. Scheifele', short: 'SCHEIFELE', pos: 'C', spd: 86, sht: 91, pss: 90, chk: 72, hnd: 90 },
      { n: 44, name: 'J. Morrissey', short: 'MORRISSEY', pos: 'D', spd: 87, sht: 82, pss: 89, chk: 81, hnd: 86 },
    ],
    goalie: { n: 37, name: 'C. Hellebuyck', short: 'HELLEBUYCK', ref: 96, pos: 93, rec: 89 },
  },
  {
    id: 'NJD', city: 'New Jersey', name: 'Devils', abbr: 'NJD',
    colors: { primary: '#CE1126', secondary: '#111111', accent: '#FFFFFF', ice: '#e35367' },
    crest: 'devil',
    skaters: [
      { n: 86, name: 'J. Hughes',   short: 'J. HUGHES', pos: 'C', spd: 97, sht: 89, pss: 95, chk: 56, hnd: 97 },
      { n: 13, name: 'N. Hischier', short: 'HISCHIER',  pos: 'C', spd: 88, sht: 87, pss: 89, chk: 83, hnd: 90 },
      { n: 7,  name: 'D. Hamilton', short: 'HAMILTON',  pos: 'D', spd: 80, sht: 94, pss: 86, chk: 82, hnd: 82 },
    ],
    goalie: { n: 25, name: 'J. Markstrom', short: 'MARKSTROM', ref: 85, pos: 85, rec: 79 },
  },
  {
    id: 'VAN', city: 'Vancouver', name: 'Canucks', abbr: 'VAN',
    colors: { primary: '#00205B', secondary: '#00843D', accent: '#FFFFFF', ice: '#3f7fc4' },
    crest: 'orca',
    skaters: [
      { n: 40, name: 'E. Pettersson', short: 'PETTERSSON', pos: 'C', spd: 89, sht: 91, pss: 92, chk: 70, hnd: 93 },
      { n: 43, name: 'Q. Hughes',     short: 'Q. HUGHES',  pos: 'D', spd: 94, sht: 80, pss: 98, chk: 60, hnd: 97 },
      { n: 6,  name: 'B. Boeser',     short: 'BOESER',     pos: 'W', spd: 82, sht: 93, pss: 82, chk: 68, hnd: 88 },
    ],
    goalie: { n: 32, name: 'K. Lankinen', short: 'LANKINEN', ref: 83, pos: 82, rec: 78 },
  },
  {
    id: 'PIT', city: 'Pittsburgh', name: 'Penguins', abbr: 'PIT',
    colors: { primary: '#FCB514', secondary: '#111111', accent: '#FFFFFF', ice: '#f5c95c' },
    crest: 'penguin',
    skaters: [
      { n: 87, name: 'S. Crosby',   short: 'CROSBY',   pos: 'C', spd: 87, sht: 90, pss: 97, chk: 88, hnd: 98 },
      { n: 71, name: 'E. Malkin',   short: 'MALKIN',   pos: 'C', spd: 79, sht: 92, pss: 92, chk: 86, hnd: 93 },
      { n: 65, name: 'E. Karlsson', short: 'KARLSSON', pos: 'D', spd: 86, sht: 89, pss: 95, chk: 60, hnd: 91 },
    ],
    goalie: { n: 35, name: 'T. Jarry', short: 'JARRY', ref: 80, pos: 78, rec: 74 },
  },
  {
    id: 'WSH', city: 'Washington', name: 'Capitals', abbr: 'WSH',
    colors: { primary: '#C8102E', secondary: '#041E42', accent: '#FFFFFF', ice: '#e35a70' },
    crest: 'capitol',
    skaters: [
      { n: 8,  name: 'A. Ovechkin', short: 'OVECHKIN', pos: 'W', spd: 81, sht: 99, pss: 82, chk: 94, hnd: 89 },
      { n: 17, name: 'D. Strome',   short: 'STROME',   pos: 'C', spd: 80, sht: 84, pss: 89, chk: 70, hnd: 87 },
      { n: 74, name: 'J. Carlson',  short: 'CARLSON',  pos: 'D', spd: 78, sht: 91, pss: 89, chk: 79, hnd: 83 },
    ],
    goalie: { n: 48, name: 'L. Thompson', short: 'THOMPSON', ref: 87, pos: 85, rec: 81 },
  },
  {
    id: 'MTL', city: 'Montreal', name: 'Canadiens', abbr: 'MTL',
    colors: { primary: '#AF1E2D', secondary: '#192168', accent: '#FFFFFF', ice: '#d15865' },
    crest: 'ch',
    skaters: [
      { n: 14, name: 'N. Suzuki',  short: 'SUZUKI',  pos: 'C', spd: 86, sht: 87, pss: 92, chk: 74, hnd: 91 },
      { n: 13, name: 'C. Caufield', short: 'CAUFIELD', pos: 'W', spd: 89, sht: 95, pss: 82, chk: 56, hnd: 92 },
      { n: 48, name: 'L. Hutson',  short: 'HUTSON',  pos: 'D', spd: 93, sht: 76, pss: 96, chk: 54, hnd: 95 },
    ],
    goalie: { n: 35, name: 'S. Montembeault', short: 'MONTY', ref: 82, pos: 81, rec: 77 },
  },
];

/* ============================================================================
 * LEGENDS — all-time lineups, throwback colours. Rated on peak form, which is
 * why a 1980s roster can hang with anybody: that is the whole point.
 * ==========================================================================*/

const LEGEND_TEAMS = [
  {
    id: 'EDM84', city: 'Edmonton', name: "'84 Dynasty", abbr: 'EDM',
    colors: { primary: '#FF4C00', secondary: '#0A2C64', accent: '#FFFFFF', ice: '#ff8b52' },
    crest: 'drop',
    skaters: [
      { n: 99, name: 'W. Gretzky', short: 'GRETZKY', pos: 'C', spd: 89, sht: 91, pss: 99, chk: 52, hnd: 99 },
      { n: 11, name: 'M. Messier', short: 'MESSIER', pos: 'C', spd: 88, sht: 92, pss: 90, chk: 96, hnd: 91 },
      { n: 17, name: 'J. Kurri',   short: 'KURRI',   pos: 'W', spd: 90, sht: 95, pss: 88, chk: 68, hnd: 92 },
    ],
    goalie: { n: 31, name: 'G. Fuhr', short: 'FUHR', ref: 94, pos: 84, rec: 82 },
  },
  {
    id: 'COL96', city: 'Colorado', name: 'Cup Era', abbr: 'COL',
    colors: { primary: '#6F263D', secondary: '#236192', accent: '#A2AAAD', ice: '#c1738f' },
    crest: 'peak',
    skaters: [
      { n: 21, name: 'P. Forsberg', short: 'FORSBERG', pos: 'C', spd: 89, sht: 91, pss: 97, chk: 94, hnd: 98 },
      { n: 19, name: 'J. Sakic',    short: 'SAKIC',    pos: 'C', spd: 90, sht: 96, pss: 94, chk: 70, hnd: 94 },
      { n: 52, name: 'A. Foote',    short: 'FOOTE',    pos: 'D', spd: 78, sht: 72, pss: 78, chk: 96, hnd: 74 },
    ],
    goalie: { n: 33, name: 'P. Roy', short: 'ROY', ref: 97, pos: 96, rec: 90 },
  },
  {
    id: 'ANA97', city: 'Anaheim', name: 'Mighty Ducks', abbr: 'ANA',
    colors: { primary: '#52307C', secondary: '#0B7A75', accent: '#F2E5C4', ice: '#8f6bbf' },
    crest: 'duck',
    skaters: [
      { n: 9,  name: 'P. Kariya',     short: 'KARIYA',     pos: 'W', spd: 98, sht: 93, pss: 92, chk: 48, hnd: 97 },
      { n: 8,  name: 'T. Selanne',    short: 'SELANNE',    pos: 'W', spd: 96, sht: 96, pss: 86, chk: 58, hnd: 94 },
      { n: 27, name: 'S. Niedermayer', short: 'NIEDERMAYER', pos: 'D', spd: 96, sht: 84, pss: 94, chk: 74, hnd: 95 },
    ],
    goalie: { n: 35, name: 'J-S. Giguere', short: 'GIGUERE', ref: 90, pos: 91, rec: 85 },
  },
  {
    id: 'STL98', city: 'St. Louis', name: 'Blue Note', abbr: 'STL',
    colors: { primary: '#003087', secondary: '#041E42', accent: '#FCB514', ice: '#4a70c9' },
    crest: 'note',
    skaters: [
      { n: 44, name: 'C. Pronger',  short: 'PRONGER',  pos: 'D', spd: 79, sht: 91, pss: 86, chk: 99, hnd: 82 },
      { n: 2,  name: 'A. MacInnis', short: 'MACINNIS', pos: 'D', spd: 77, sht: 99, pss: 85, chk: 88, hnd: 79 },
      { n: 16, name: 'B. Hull',     short: 'HULL',     pos: 'W', spd: 86, sht: 99, pss: 80, chk: 60, hnd: 93 },
    ],
    goalie: { n: 31, name: 'C. Joseph', short: 'CUJO', ref: 92, pos: 86, rec: 80 },
  },
  {
    id: 'DET97', city: 'Detroit', name: 'Russian Five', abbr: 'DET',
    colors: { primary: '#CE1126', secondary: '#FFFFFF', accent: '#E8C88C', ice: '#e2596c' },
    crest: 'wing',
    skaters: [
      { n: 19, name: 'S. Yzerman',  short: 'YZERMAN',  pos: 'C', spd: 90, sht: 94, pss: 95, chk: 82, hnd: 96 },
      { n: 91, name: 'S. Fedorov',  short: 'FEDOROV',  pos: 'C', spd: 96, sht: 92, pss: 92, chk: 84, hnd: 95 },
      { n: 5,  name: 'N. Lidstrom', short: 'LIDSTROM', pos: 'D', spd: 85, sht: 88, pss: 95, chk: 84, hnd: 92 },
    ],
    goalie: { n: 30, name: 'C. Osgood', short: 'OSGOOD', ref: 87, pos: 86, rec: 82 },
  },
  {
    id: 'PIT92', city: 'Pittsburgh', name: 'Back-to-Back', abbr: 'PIT',
    colors: { primary: '#FCB514', secondary: '#111111', accent: '#FFFFFF', ice: '#f5c95c' },
    crest: 'penguin',
    skaters: [
      { n: 66, name: 'M. Lemieux', short: 'LEMIEUX', pos: 'C', spd: 91, sht: 99, pss: 99, chk: 80, hnd: 99 },
      { n: 68, name: 'J. Jagr',    short: 'JAGR',    pos: 'W', spd: 90, sht: 96, pss: 93, chk: 90, hnd: 99 },
      { n: 77, name: 'P. Coffey',  short: 'COFFEY',  pos: 'D', spd: 97, sht: 90, pss: 94, chk: 60, hnd: 92 },
    ],
    goalie: { n: 35, name: 'T. Barrasso', short: 'BARRASSO', ref: 88, pos: 83, rec: 79 },
  },
  {
    id: 'BOS72', city: 'Boston', name: 'Big Bad Bruins', abbr: 'BOS',
    colors: { primary: '#FFB81C', secondary: '#111111', accent: '#FFFFFF', ice: '#f0c65a' },
    crest: 'spoke',
    skaters: [
      { n: 4,  name: 'B. Orr',     short: 'ORR',     pos: 'D', spd: 97, sht: 93, pss: 99, chk: 84, hnd: 99 },
      { n: 77, name: 'R. Bourque', short: 'BOURQUE', pos: 'D', spd: 88, sht: 95, pss: 94, chk: 88, hnd: 92 },
      { n: 8,  name: 'C. Neely',   short: 'NEELY',   pos: 'W', spd: 84, sht: 96, pss: 78, chk: 98, hnd: 88 },
    ],
    goalie: { n: 30, name: 'G. Cheevers', short: 'CHEEVERS', ref: 89, pos: 85, rec: 80 },
  },
  {
    id: 'CHI92', city: 'Chicago', name: 'Madhouse', abbr: 'CHI',
    colors: { primary: '#CF0A2C', secondary: '#111111', accent: '#FF671B', ice: '#e04a63' },
    crest: 'feather',
    skaters: [
      { n: 7,  name: 'C. Chelios', short: 'CHELIOS', pos: 'D', spd: 86, sht: 84, pss: 90, chk: 98, hnd: 86 },
      { n: 27, name: 'J. Roenick', short: 'ROENICK', pos: 'C', spd: 93, sht: 92, pss: 88, chk: 86, hnd: 92 },
      { n: 18, name: 'D. Savard',  short: 'SAVARD',  pos: 'C', spd: 92, sht: 88, pss: 96, chk: 58, hnd: 98 },
    ],
    goalie: { n: 30, name: 'E. Belfour', short: 'BELFOUR', ref: 94, pos: 92, rec: 86 },
  },
  {
    id: 'NJD00', city: 'New Jersey', name: 'The Trap', abbr: 'NJD',
    colors: { primary: '#CE1126', secondary: '#111111', accent: '#FFFFFF', ice: '#e35367' },
    crest: 'devil',
    skaters: [
      { n: 4,  name: 'S. Stevens',  short: 'STEVENS',  pos: 'D', spd: 84, sht: 82, pss: 82, chk: 99, hnd: 78 },
      { n: 26, name: 'P. Elias',    short: 'ELIAS',    pos: 'W', spd: 90, sht: 90, pss: 92, chk: 74, hnd: 92 },
      { n: 22, name: 'C. Lemieux',  short: 'C.LEMIEUX', pos: 'W', spd: 84, sht: 88, pss: 76, chk: 94, hnd: 84 },
    ],
    goalie: { n: 30, name: 'M. Brodeur', short: 'BRODEUR', ref: 94, pos: 98, rec: 95 },
  },
  {
    id: 'PHI96', city: 'Philadelphia', name: 'Legion of Doom', abbr: 'PHI',
    colors: { primary: '#F74902', secondary: '#111111', accent: '#FFFFFF', ice: '#fa7a45' },
    crest: 'wingp',
    skaters: [
      { n: 88, name: 'E. Lindros', short: 'LINDROS', pos: 'C', spd: 88, sht: 96, pss: 90, chk: 99, hnd: 92 },
      { n: 10, name: 'J. LeClair', short: 'LECLAIR', pos: 'W', spd: 82, sht: 94, pss: 80, chk: 92, hnd: 87 },
      { n: 2,  name: 'M. Howe',    short: 'HOWE',    pos: 'D', spd: 88, sht: 86, pss: 92, chk: 80, hnd: 90 },
    ],
    goalie: { n: 27, name: 'R. Hextall', short: 'HEXTALL', ref: 89, pos: 84, rec: 76 },
  },
  {
    id: 'MTL77', city: 'Montreal', name: 'Flying Frenchmen', abbr: 'MTL',
    colors: { primary: '#AF1E2D', secondary: '#192168', accent: '#FFFFFF', ice: '#d15865' },
    crest: 'ch',
    skaters: [
      { n: 10, name: 'G. Lafleur',  short: 'LAFLEUR',  pos: 'W', spd: 96, sht: 96, pss: 92, chk: 62, hnd: 97 },
      { n: 4,  name: 'J. Beliveau', short: 'BELIVEAU', pos: 'C', spd: 87, sht: 94, pss: 95, chk: 86, hnd: 95 },
      { n: 19, name: 'L. Robinson', short: 'ROBINSON', pos: 'D', spd: 84, sht: 86, pss: 90, chk: 96, hnd: 85 },
    ],
    goalie: { n: 29, name: 'K. Dryden', short: 'DRYDEN', ref: 93, pos: 95, rec: 88 },
  },
  {
    id: 'BUF93', city: 'Buffalo', name: 'The Dominator', abbr: 'BUF',
    colors: { primary: '#003087', secondary: '#FFB81C', accent: '#FFFFFF', ice: '#4a70c9' },
    crest: 'bison',
    skaters: [
      { n: 16, name: 'P. LaFontaine', short: 'LAFONTAINE', pos: 'C', spd: 94, sht: 92, pss: 95, chk: 58, hnd: 96 },
      { n: 89, name: 'A. Mogilny',    short: 'MOGILNY',    pos: 'W', spd: 97, sht: 95, pss: 86, chk: 60, hnd: 95 },
      { n: 6,  name: 'P. Housley',    short: 'HOUSLEY',    pos: 'D', spd: 92, sht: 86, pss: 93, chk: 56, hnd: 92 },
    ],
    goalie: { n: 39, name: 'D. Hasek', short: 'HASEK', ref: 99, pos: 88, rec: 78 },
  },
  {
    id: 'VAN94', city: 'Vancouver', name: 'Flying Skate', abbr: 'VAN',
    colors: { primary: '#041C2C', secondary: '#C8102E', accent: '#F0B310', ice: '#3c5f7a' },
    crest: 'skate',
    skaters: [
      { n: 10, name: 'P. Bure',    short: 'BURE',    pos: 'W', spd: 99, sht: 95, pss: 82, chk: 52, hnd: 96 },
      { n: 19, name: 'M. Naslund', short: 'NASLUND', pos: 'W', spd: 90, sht: 93, pss: 90, chk: 62, hnd: 93 },
      { n: 16, name: 'T. Linden',  short: 'LINDEN',  pos: 'C', spd: 84, sht: 86, pss: 86, chk: 90, hnd: 86 },
    ],
    goalie: { n: 1, name: 'K. McLean', short: 'MCLEAN', ref: 88, pos: 85, rec: 79 },
  },
  {
    id: 'TOR93', city: 'Toronto', name: 'Blue & White', abbr: 'TOR',
    colors: { primary: '#00205B', secondary: '#FFFFFF', accent: '#7BAFD4', ice: '#5c86c9' },
    crest: 'leaf',
    skaters: [
      { n: 93, name: 'D. Gilmour', short: 'GILMOUR', pos: 'C', spd: 90, sht: 88, pss: 96, chk: 88, hnd: 95 },
      { n: 13, name: 'M. Sundin',  short: 'SUNDIN',  pos: 'C', spd: 88, sht: 93, pss: 90, chk: 88, hnd: 93 },
      { n: 21, name: 'B. Salming', short: 'SALMING', pos: 'D', spd: 86, sht: 86, pss: 90, chk: 90, hnd: 88 },
    ],
    goalie: { n: 29, name: 'F. Potvin', short: 'POTVIN', ref: 90, pos: 86, rec: 80 },
  },
];

/* One flat list; `era` drives the tabs on the team-select screen. */
TEAMS.forEach((t) => { t.era = 'modern'; });
LEGEND_TEAMS.forEach((t) => { t.era = 'legend'; TEAMS.push(t); });

/** Overall rating used for the team-select screen bars. */
function teamRating(t) {
  const s = t.skaters.reduce((a, p) => a + (p.spd + p.sht + p.pss + p.chk + p.hnd) / 5, 0) / 3;
  const g = (t.goalie.ref + t.goalie.pos + t.goalie.rec) / 3;
  return Math.round(s * 0.72 + g * 0.28);
}

function teamAttack(t) {
  return Math.round(t.skaters.reduce((a, p) => a + (p.sht * 0.5 + p.hnd * 0.25 + p.pss * 0.25), 0) / 3);
}
function teamDefense(t) {
  const g = (t.goalie.ref + t.goalie.pos) / 2;
  return Math.round(t.skaters.reduce((a, p) => a + p.chk, 0) / 3 * 0.45 + g * 0.55);
}
function teamSpeed(t) {
  return Math.round(t.skaters.reduce((a, p) => a + p.spd, 0) / 3);
}
