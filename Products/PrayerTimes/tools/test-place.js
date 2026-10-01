// Unit test for place-name selection.  node tools/test-place.js
const { placeName, PLACES } = require('../place.js');
let bad = 0;
const eq = (name, got, want) => { const ok = got === want; if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (ok ? '' : '   got "' + got + '", want "' + want + '"')); };
const A = address => ({ address });

eq('council as city is skipped, district wins (the reported bug)',
  placeName(A({ suburb: 'Bandar Sri Permaisuri', city: 'Majlis Perbandaran Kajang', county: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' })), 'Hulu Langat, Malaysia');
eq('"Daerah" prefix stripped', placeName(A({ county: 'Daerah Hulu Langat', country: 'Malaysia' })), 'Hulu Langat, Malaysia');
eq('state_district used when no county', placeName(A({ state_district: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' })), 'Hulu Langat, Malaysia');
eq('English council name skipped', placeName(A({ city: 'Kajang Municipal Council', suburb: 'Semenyih', country: 'Malaysia' })), 'Semenyih, Malaysia');
eq('Dewan Bandaraya skipped, falls to suburb', placeName(A({ suburb: 'Cheras', city: 'Dewan Bandaraya Kuala Lumpur', country: 'Malaysia' })), 'Cheras, Malaysia');
eq('Majlis Daerah as county skipped', placeName(A({ county: 'Majlis Daerah Hulu Langat', town: 'Kajang', country: 'Malaysia' })), 'Kajang, Malaysia');
eq('a real place that merely contains "Bandar" is kept', placeName(A({ town: 'Bandar Baru Bangi', country: 'Malaysia' })), 'Bandar Baru Bangi, Malaysia');
eq('only council names -> empty (caller keeps coordinates)', placeName(A({ city: 'Majlis Perbandaran Kajang' })), '');
eq('no address -> empty', placeName({}), '');
eq('null -> empty', placeName(null), '');
eq('no country -> place only', placeName(A({ county: 'Hulu Langat' })), 'Hulu Langat');
const ids = PLACES.map(p => p.id);
eq('place ids are unique', new Set(ids).size, ids.length);
eq('all places inside Malaysia bounding box', PLACES.every(p => p.lat > 0.8 && p.lat < 7.5 && p.lng > 99.5 && p.lng < 119.5), true);
console.log(bad ? '\n' + bad + ' FAILED' : '\nALL PASSED'); process.exit(bad ? 1 : 0);
