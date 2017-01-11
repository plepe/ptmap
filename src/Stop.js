/**
 * A link to a stop of a route 
 * @typedef {Object} Stop.Link
 * @property {string} role OSM role of the stop inside the Route
 * @property {string} stopId Stop ID, e.g. 'n1234'
 * @property {number} stopIndex nth stop (starting with 0)
 * @property {OSMObject|false|null} stop OSM stop object. false, when not loaded yet. null, when not existant.
 * @property {string} routeId Route ID, e.g. 'r910886'
 * @property {OSMObject} route OSM route object.
 * @property {StopArea} stopArea Stop Area where this stop has been added to.
 * @property {number|null} stopIndexOnWay nth node of the way
 * @property {number|null} stopLocationOnWay location of the stop along the way (km)
 */

/**
 * A stop
 * @constructor
 */
function Stop () {
}
