/*
 * prayer.js - offline prayer-time calculation (no network, no dependencies).
 * Astronomical method follows the widely used PrayTimes.org formulation.
 * JAKIM parameters: Fajr 20 deg, Isha 18 deg, Asr Shafi'i (shadow factor 1), Zohor +2 min.
 * Results are absolute instants (Date), so display in the device's local timezone.
 */
(function (root) {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var sin = function (d) { return Math.sin(d * D2R); };
  var cos = function (d) { return Math.cos(d * D2R); };
  var tan = function (d) { return Math.tan(d * D2R); };
  var asin = function (x) { return Math.asin(x) * R2D; };
  var acos = function (x) { return Math.acos(x) * R2D; };
  var atan2 = function (y, x) { return Math.atan2(y, x) * R2D; };
  var arccot = function (x) { return Math.atan(1 / x) * R2D; };
  var fixAngle = function (a) { return ((a % 360) + 360) % 360; };
  var fixHour = function (h) { return ((h % 24) + 24) % 24; };

  var METHODS = {
    /* offsetMin: minutes added after rounding. Zohor +2 reproduces the reference timetable
       (inferred from one observed data point; see README). */
    JAKIM: { name: 'Malaysia (JAKIM)', fajr: 20, isha: 18, asrFactor: 1, offsetMin: { dhuhr: 2 } }
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = fixHour(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
  }

  /* Raw times in "hours UTC" for the solar day whose local calendar date is y/m/d. */
  function rawTimes(y, m, d, lat, lng, method) {
    var jDate = julian(y, m, d) - lng / (15 * 24);
    var midDay = function (t) { return fixHour(12 - sunPosition(jDate + t).eqt); };
    var angleTime = function (angle, t, ccw) {
      var decl = sunPosition(jDate + t).decl;
      var n = -sin(angle) - sin(decl) * sin(lat);
      var x = n / (cos(decl) * cos(lat));
      if (x < -1 || x > 1) return NaN;       /* sun never reaches this angle */
      return midDay(t) + (ccw ? -1 : 1) * acos(x) / 15;
    };
    var asrTime = function (factor, t) {
      var decl = sunPosition(jDate + t).decl;
      return angleTime(-arccot(factor + tan(Math.abs(lat - decl))), t, false);
    };

    var t = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, maghrib: 18 / 24, isha: 18 / 24 };
    var out = {
      fajr: angleTime(method.fajr, t.fajr, true),
      sunrise: angleTime(0.833, t.sunrise, true),
      dhuhr: midDay(t.dhuhr),
      asr: asrTime(method.asrFactor, t.asr),
      maghrib: angleTime(0.833, t.maghrib, false),
      isha: angleTime(method.isha, t.isha, false)
    };
    var utcShift = -lng / 15;
    for (var k in out) out[k] += utcShift;
    return out;
  }

  var ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  /*
   * Times for the local calendar date y/m/d (month 1-12) at lat/lng.
   * Each time is rounded to the nearest minute, as published timetables are.
   * Returns null if any time cannot be computed (extreme latitudes).
   */
  function compute(y, m, d, lat, lng, methodKey) {
    var method = METHODS[methodKey || 'JAKIM'];
    var raw = rawTimes(y, m, d, lat, lng, method);
    var base = Date.UTC(y, m - 1, d);
    var out = {};
    for (var i = 0; i < ORDER.length; i++) {
      var h = raw[ORDER[i]];
      if (!isFinite(h)) return null;
      var off = (method.offsetMin && method.offsetMin[ORDER[i]]) || 0;
      out[ORDER[i]] = new Date((Math.round((base + h * 3600000) / 60000) + off) * 60000);
    }
    return out;
  }

  var api = { compute: compute, ORDER: ORDER, METHODS: METHODS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrayerCalc = api;
})(typeof self !== 'undefined' ? self : this);
