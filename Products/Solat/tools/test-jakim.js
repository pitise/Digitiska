// Unit tests for the pure JAKIM logic inside Solat.html (zone matching + parsing of JAKIM's answer).  node tools/test-jakim.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'Solat.html'), 'utf8');
const a = html.indexOf('/* Place names:'), b = html.indexOf('/*</jakim-pure>*/');
if (a < 0 || b < 0) throw new Error('markers not found');
const sb = { Math, Set, Object, String, Number, Array, Error, result: null }; vm.createContext(sb);
vm.runInContext(html.slice(a, b) + '\nresult={zoneFromAddress,zoneByName,zState,jkParse,ZONES,WHOLE};', sb);
const { zoneFromAddress: Z, zoneByName, jkParse, ZONES, WHOLE } = sb.result;
let bad = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (ok ? '' : '   got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want))); };

console.log('Zone table');
eq('58 zones, unique codes', [ZONES.length, new Set(ZONES.map(z => z[0])).size], [58, 58]);
eq('single-zone states resolve as a whole', Object.entries(WHOLE).sort(), [['Melaka', 'MLK01'], ['Perlis', 'PLS01'], ['Pulau Pinang', 'PNG01']]);

console.log('Position -> zone (Nominatim-style addresses)');
const cases = [
  ['Hulu Langat district', { county: 'Hulu Langat', state: 'Selangor' }, 'SGR01'],
  ['council as city is ignored', { suburb: 'Bandar Sri Permaisuri', city: 'Majlis Perbandaran Kajang', county: 'Hulu Langat', state: 'Selangor' }, 'SGR01'],
  ['Shah Alam (county Petaling)', { city: 'Shah Alam', county: 'Petaling', state: 'Selangor' }, 'SGR01'],
  ['Kuala Langat', { county: 'Kuala Langat', state: 'Selangor' }, 'SGR03'],
  ['Sabak Bernam', { county: 'Sabak Bernam', state: 'Selangor' }, 'SGR02'],
  ['Kuala Lumpur', { city: 'Kuala Lumpur', state: 'Wilayah Persekutuan Kuala Lumpur' }, 'WLY01'],
  ['Kuala Lumpur (state only)', { state: 'Kuala Lumpur' }, 'WLY01'],
  ['Putrajaya', { city: 'Putrajaya', state: 'Wilayah Persekutuan Putrajaya' }, 'WLY01'],
  ['Labuan', { city: 'Labuan', state: 'Wilayah Persekutuan Labuan' }, 'WLY02'],
  ['Johor Bahru', { county: 'Johor Bahru', state: 'Johor' }, 'JHR02'],
  ['Melaka, any district', { county: 'Melaka Tengah', state: 'Melaka' }, 'MLK01'],
  ['Malacca (English)', { city: 'Malacca City', state: 'Malacca' }, 'MLK01'],
  ['Penang, any place', { suburb: 'Bayan Lepas', state: 'Pulau Pinang' }, 'PNG01'],
  ['Penang (English)', { state: 'Penang' }, 'PNG01'],
  ['Ipoh (county Kinta not in list)', { city: 'Ipoh', county: 'Kinta', state: 'Perak' }, 'PRK02'],
  ['Kuantan', { county: 'Kuantan', state: 'Pahang' }, 'PHG02'],
  ['Kuching', { city: 'Kuching', state: 'Sarawak' }, 'SWK08'],
  ['Kota Kinabalu', { city: 'Kota Kinabalu', state: 'Sabah' }, 'SBH07'],
  ['Kota Setar', { county: 'Kota Setar', state: 'Kedah' }, 'KDH01'],
  ['Alor Setar (alias)', { city: 'Alor Setar', state: 'Kedah' }, 'KDH01'],
  ['Gua Musang (note in brackets ignored)', { county: 'Gua Musang', state: 'Kelantan' }, 'KTN03'],
  ['Kota Bharu', { county: 'Kota Bharu', state: 'Kelantan' }, 'KTN01'],
  ['Tawau (alias to Bandar Tawau)', { county: 'Tawau', state: 'Sabah' }, 'SBH04'],
  ['Sandakan (alias to Bandar Sandakan)', { county: 'Sandakan', state: 'Sabah' }, 'SBH01'],
  ['Perlis, any place', { suburb: 'Somewhere', state: 'Perlis' }, 'PLS01'],
  ['no state: unique district name still works', { county: 'Hulu Langat' }, 'SGR01'],
  ['REAL CASE "Bangi Lama": suburb only, no district field -> no zone from this lookup (the app then asks at district level)', { suburb: 'Bangi Lama', state: 'Selangor', country: 'Malaysia' }, null],
  ['district under the key "district"', { suburb: 'Bangi Lama', district: 'Hulu Langat', state: 'Selangor' }, 'SGR01'],
  ['district under an unusual key (matches any address value)', { village: 'X', quarter: 'Hulu Selangor', state: 'Selangor' }, 'SGR01'],
  ['district-level answer (zoom 8 shape)', { county: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' }, 'SGR01'],
  ['a road named after an area is NOT a match', { road: 'Jalan Gombak', state: 'Selangor' }, null],
  ['postcode/country values are never matched', { postcode: '43650', country: 'Malaysia', state: 'Selangor' }, null],
  ['district name found in the wrong state does not match', { county: 'Kuantan', state: 'Selangor' }, null],
  ['Singapore -> no JAKIM zone', { city: 'Singapore', state: 'Singapore' }, null],
  ['Kalimantan -> no JAKIM zone', { state: 'Kalimantan Barat' }, null],
  ['empty address -> null', {}, null],
  ['unknown district in a multi-zone state -> null, NOT a guess (Kajang is not a listed area)', { county: 'Kajang', state: 'Selangor' }, null],
  ['Kulai (not in the 2020 list) -> null, NOT a guess', { county: 'Kulai', state: 'Johor' }, null]
];
for (const [n, addr, want] of cases) eq(n, Z(addr), want);
eq('district picked from the list (state + name)', [zoneByName('Hulu Langat', 'Selangor'), zoneByName('Pasir Mas', 'Kelantan'), zoneByName('Grik', 'Perak'), zoneByName('Gerik', 'Perak')], ['SGR01', 'KTN01', 'PRK03', 'PRK03']);
eq('preset city names (no state)', ['Kuala Lumpur', 'Johor Bahru', 'George Town', 'Alor Setar', 'Kangar', 'Miri', 'Singapura', 'Jakarta', 'Makkah'].map(n => zoneByName(n, '')), ['WLY01', 'JHR02', 'PNG01', 'KDH01', 'PLS01', 'SWK02', null, null, null]);

console.log('JAKIM answer parser (rows copied from the real SGR01 data for Okt 2026)');
const real = { prayerTime: [
  { hijri: '1448-04-19', date: '01-Okt-2026', day: 'Thursday', imsak: '05:43:00', fajr: '05:53:00', syuruk: '06:59:00', dhuha: '07:24:00', dhuhr: '13:06:00', asr: '16:16:00', maghrib: '19:07:00', isha: '20:16:00' },
  { hijri: '1448-05-01', date: '12-Okt-2026', day: 'Monday', imsak: '05:41:00', fajr: '05:51:00', syuruk: '06:57:00', dhuha: '07:22:00', dhuhr: '13:03:00', asr: '16:17:00', maghrib: '19:03:00', isha: '20:12:00' }],
  status: 'OK!', serverTime: '2026-10-12 16:45:13', periodType: 'month', lang: 'ms_my', zone: 'SGR01', bearing: '291&#176; 7&#8242; 23&#8243;' };
eq('real rows -> minutes after midnight', jkParse(real, 'SGR01'), { '2026-10-01': [343, 353, 419, 786, 976, 1147, 1216], '2026-10-12': [341, 351, 417, 783, 977, 1143, 1212] });
const clone = o => JSON.parse(JSON.stringify(o));
const row = (date, extra) => Object.assign({ date, imsak: '05:00', fajr: '05:10', syuruk: '06:20', dhuhr: '13:00', asr: '16:10', maghrib: '19:00', isha: '20:10' }, extra);
eq('Malay and English month names (Mac, Mei, Ogo, Dis, Oct)', Object.keys(jkParse({ status: 'OK!', zone: 'SGR01', prayerTime: ['03-Mac-2026', '04-Mei-2026', '05-Ogo-2026', '06-Dis-2026', '07-Oct-2026'].map(d => row(d)) }, 'SGR01')), ['2026-03-03', '2026-05-04', '2026-08-05', '2026-12-06', '2026-10-07']);
for (const [n, mut] of [['status not OK', j => { j.status = 'ERROR' }], ['wrong zone returned', j => { j.zone = 'SGR02' }], ['no prayerTime array', j => { delete j.prayerTime }], ['not an object', j => null]]) {
  let threw = false; try { jkParse(mut(clone(real)) === null ? null : (mut(clone(real)), (() => { const j = clone(real); mut(j); return j; })()), 'SGR01'); } catch { threw = true; } eq('rejects: ' + n, threw, true);
}
let t2 = false; try { jkParse({ status: 'OK!', zone: 'SGR01', prayerTime: [row('01-Okt-2026', { fajr: '04:00' }), row('02-Okt-2026', { isha: 'abc' }), row('xx-Okt-2026'), row('03-Xxx-2026')] }, 'SGR01'); } catch { t2 = true; }
eq('every row unusable (out of order / not a time / bad date / unknown month) -> throws', t2, true);
eq('good rows kept, bad rows skipped', Object.keys(jkParse({ status: 'OK!', zone: 'SGR01', prayerTime: [row('01-Okt-2026'), row('02-Okt-2026', { fajr: '04:00' })] }, 'SGR01')), ['2026-10-01']);
eq('HH:MM without seconds accepted; zone code case-insensitive', Object.keys(jkParse({ status: 'ok', zone: 'sgr01', prayerTime: [row('01-Okt-2026')] }, 'SGR01')), ['2026-10-01']);
console.log(bad ? '\n' + bad + ' FAILED' : '\nALL PASSED'); process.exit(bad ? 1 : 0);
