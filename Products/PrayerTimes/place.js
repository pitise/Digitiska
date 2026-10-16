/*
 * place.js - turns a Nominatim reverse-geocode result into a short place name,
 * and holds the built-in places for manual selection when GPS is unavailable.
 * Local government bodies (Majlis Perbandaran..., Dewan Bandaraya..., "... City Council")
 * are never used as the place name; the district name (e.g. Hulu Langat) is preferred.
 */
(function (root) {
  'use strict';

  var COUNCIL = /\bcouncil\b|^(majlis|dewan bandaraya|perbadanan)\b|\b(bandaraya|perbandaran)\b/i;
  /* Most specific wanted last: district first, then smaller areas, then the state. */
  var ORDER = ['county', 'state_district', 'suburb', 'city_district', 'village', 'town', 'city', 'municipality', 'state'];

  function clean(name) {
    return String(name || '').replace(/^(daerah|mukim)\s+/i, '').replace(/\s+(district|daerah)$/i, '').trim();
  }

  function placeName(data) {
    var a = data && data.address;
    if (!a) return '';
    var place = '';
    for (var i = 0; i < ORDER.length && !place; i++) {
      var v = clean(a[ORDER[i]]);
      if (v && !COUNCIL.test(v)) place = v;
    }
    if (!place) return '';
    return a.country && a.country !== place ? place + ', ' + a.country : place;
  }

  /* Approximate city-centre coordinates (about +/-5 km). Enough for prayer times: 0.1 deg of longitude is ~24 s. */
  var PLACES = [
    { id: 'kl',   name: 'Kuala Lumpur',    lat: 3.139, lng: 101.687 },
    { id: 'hl',   name: 'Hulu Langat',     lat: 3.100, lng: 101.800 },
    { id: 'kjg',  name: 'Kajang',          lat: 2.993, lng: 101.787 },
    { id: 'sa',   name: 'Shah Alam',       lat: 3.073, lng: 101.518 },
    { id: 'pj',   name: 'Petaling Jaya',   lat: 3.107, lng: 101.607 },
    { id: 'kl2',  name: 'Klang',           lat: 3.044, lng: 101.445 },
    { id: 'pjy',  name: 'Putrajaya',       lat: 2.926, lng: 101.696 },
    { id: 'srb',  name: 'Seremban',        lat: 2.726, lng: 101.942 },
    { id: 'mlk',  name: 'Melaka',          lat: 2.196, lng: 102.250 },
    { id: 'jb',   name: 'Johor Bahru',     lat: 1.493, lng: 103.741 },
    { id: 'kt',   name: 'Kuantan',         lat: 3.808, lng: 103.326 },
    { id: 'kter', name: 'Kuala Terengganu', lat: 5.330, lng: 103.137 },
    { id: 'kb',   name: 'Kota Bharu',      lat: 6.125, lng: 102.238 },
    { id: 'ipoh', name: 'Ipoh',            lat: 4.598, lng: 101.090 },
    { id: 'gt',   name: 'George Town',     lat: 5.414, lng: 100.329 },
    { id: 'as',   name: 'Alor Setar',      lat: 6.125, lng: 100.368 },
    { id: 'kgr',  name: 'Kangar',          lat: 6.441, lng: 100.199 },
    { id: 'kk',   name: 'Kota Kinabalu',   lat: 5.980, lng: 116.073 },
    { id: 'sdk',  name: 'Sandakan',        lat: 5.840, lng: 118.117 },
    { id: 'kch',  name: 'Kuching',         lat: 1.553, lng: 110.359 },
    { id: 'miri', name: 'Miri',            lat: 4.399, lng: 113.991 },
    { id: 'lbn',  name: 'Labuan',          lat: 5.283, lng: 115.231 }
  ];

  /*
   * Reads an internet-address (IP) location response. Accepts the common shapes:
   *   { success, latitude, longitude, city, region, country }   or   { lat, lon|lng, city, country_name|country }
   * Returns { lat, lng, name } or null if the data is missing, failed, or out of range.
   */
  function parseIpLocation(data) {
    if (!data || data.success === false || data.error) return null;
    var lat = Number(data.latitude != null ? data.latitude : data.lat);
    var lng = Number(data.longitude != null ? data.longitude : (data.lon != null ? data.lon : data.lng));
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    if (lat === 0 && lng === 0) return null;
    var city = String(data.city || data.region || '').trim();
    if (COUNCIL.test(city)) city = '';
    var country = String(data.country_name || data.country || '').trim();
    var name = [city, country].filter(Boolean).join(', ') || lat.toFixed(2) + '°, ' + lng.toFixed(2) + '°';
    return { lat: lat, lng: lng, name: name };
  }

  var api = { placeName: placeName, parseIpLocation: parseIpLocation, PLACES: PLACES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlaceInfo = api;
})(typeof self !== 'undefined' ? self : this);
