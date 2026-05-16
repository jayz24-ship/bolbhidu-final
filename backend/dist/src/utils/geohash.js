// Minimal geohash placeholder for optional geo rooms
export function simpleGeoHash(lat, lng, precision = 5) {
    const n = (x) => Math.round((x + 180) * 1000);
    return `${n(lat)}:${n(lng)}`.slice(0, precision + 1);
}
//# sourceMappingURL=geohash.js.map