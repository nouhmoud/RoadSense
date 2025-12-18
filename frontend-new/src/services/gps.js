import EXIF from 'exif-js';

/**
 * Extracts GPS coordinates from an image file.
 * @param {File} file - The image file object.
 * @returns {Promise<{lat: number, lng: number} | null>} - The coordinates or null if not found.
 */
export const extractGpsFromImage = (file) => {
    return new Promise((resolve, reject) => {
        EXIF.getData(file, function () {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lng = EXIF.getTag(this, "GPSLongitude");
            const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

            if (lat && latRef && lng && lngRef) {
                const latitude = convertDMSToDD(lat, latRef);
                const longitude = convertDMSToDD(lng, lngRef);
                resolve({ lat: latitude, lng: longitude });
            } else {
                resolve(null);
            }
        });
    });
};

/**
 * Converts DMS (Degrees, Minutes, Seconds) to Decimal Degrees.
 * @param {Array} dms - Array [degrees, minutes, seconds].
 * @param {string} ref - Reference direction (N, S, E, W).
 * @returns {number} - Decimal degrees.
 */
function convertDMSToDD(dms, ref) {
    let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
    if (ref === "S" || ref === "W") {
        dd = dd * -1;
    }
    return dd;
}
