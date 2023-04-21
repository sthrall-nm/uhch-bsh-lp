'use strict';

var base = module.superModule;
/**
 * Tests if device is desktop or not
 * @returns {boolean}  true if it is desktop
 */
base.isDesktopDevice = function isDesktopDevice() {
    var userAgent = request.getHttpUserAgent();
    if (userAgent && (/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(userAgent))) {
        return false;
    }
    return true;
};

/**
 * If there is an api key creates the url to include the google maps api else returns null
 * @param {string} apiKey - the api key or null
 * @returns {string|Null} return the api
 */
base.getGoogleMapsApi = function getGoogleMapsApi(apiKey) {
    var googleMapsApi;
    if (apiKey) {
        googleMapsApi = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&callback=initMap&v=weekly';
    } else {
        googleMapsApi = null;
    }

    return googleMapsApi;
};

/**
 * Set cookie
 * @param {string} cookieId - cookieId
 * @param {Object} cookieValue - cookieValue
 */
base.setCookie = function setCookie(cookieId, cookieValue) {
    var Cookie = require('dw/web/Cookie');
    var cookieObj = new Cookie(cookieId, cookieValue);
    cookieObj.setPath('/');
    cookieObj.setSecure(true);
    response.addHttpCookie(cookieObj);
};

module.exports = base;
