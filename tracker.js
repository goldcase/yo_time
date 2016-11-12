/* jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr:50 */ /* global define */
'use strict';

/*
 * Tracker.js has the sole responsibility of tracking website usage.
 * TODO(johnnychang): Run jslint.
 */

// TODO(johnnychang): Refactor this to use ES6 classes.

// Debug flag.
var IS_DEBUG = true;
var IS_ERROR = true;

var DEBUG_LOG_PREFIX = 'Debug log: ';
var ERROR_LOG_PREFIX = 'Error: ';

// Constants for names of items in storage.
var START_TIME            = 'start_time';
var END_TIME              = 'end_time';
var ROOT_SITE_ID          = 'id';
var CURRENT_URL           = 'current_url';
var CURRENT_URL_START     = 'current_url_start';
var SITE_INTERVAL_MAP_KEY = 'site_to_interval';
var THRESHOLD_INTERVAL    = (new Date(5000)).getTime() - (new Date()).getTime();
var ROOT_SITE_ENUM        = 'root_site_enum';
var INVERSE_ROOT_SITE_MAP = 'root_site_id_to_name';
var ENUM_COUNTER          = 'root_site_enum_counter';
var ENUM_COUNTER_START    = 0;

var ALL_GOOD            = '';
var ROOT_SITE_ID_STRING = 'root site ID string';
var ROOT_SITE_STRING    = 'root site string';

var INTERVAL_START_IDX = 0;
var INTERVAL_END_IDX   = 1;

var current_tab_info = {};
var storage_area     = chrome.storage.local;

// Class constants.
var INTERVAL_UNFINISHED = "The interval is not currently finished with construction.";

class Interval {
    /*
     * Takes dates as parameters and converts date objects to milliseconds.
     */
    constructor(interval_start, interval_end) {
        if (!(interval_start instanceof Date && interval_end instanceof Date)) {
            errorLog("Error: Attempted to construct interval object with non-Date parameters.");
        }

        this.start = interval_start.getTime();
        this.end = interval_end.getTime();
    }

    isFinished() {
        // TODO(johnnychang): Make sure this conversion works, esp. for undefined.
        return !!this.end;
    }

    getLength(errorMessage) {
        var difference = -1;

        if (this.isFinished()) {
            difference = this.end - this.start;
        } else {
            errorMessage = "Unable to return a difference if the end is not set.";
        }

        return difference;
    }

    setEnd(interval_end) {
        this.end = interval_end;
    }
}

// TODO(johnnychang): Draw classes out into separate file.
// TODO(johnnychang): Only store interval start + time difference instead of start + end milliseconds?
// NB: Class declarations are not hoisted. Need to load class file first.
class TrackedWebsite {
    /*
     * Tracked websites track usage logs and perform queries on data.
     * Sample queries include max interval over a period of time and
     * average usage over a period of time.
     */
    constructor(id, name) {
        this.site_id = id;
        this.site_name = name;
        this.usage_intervals = [];
        this.max_interval = 0;
        this.min_interval = 0;
    }

    /*
     * Takes in an already-created Interval object.
     */
    addInterval(interval, errorMessage) {
        // Check that interval is finished being constructed.
        if (!interval.isFinished()) {
            errorMessage = INTERVAL_UNFINISHED;
        }

        this.usage_intervals.append(interval);
        var interval_length = interval.getLength();

        // Keep track of interval extrema added to the website.
        if (interval_length > this.max_interval) {
            this.max_interval = interval_length;
        } else if (interval_length < this.min_interval) {
            this.min_interval = interval_length;
        }
    }

    createExtremaObject(min_interval, max_interval) {
        return {
            "max": max_interval,
            "min": min_interval
        };
    }

    getExtremaBetween(start_time, end_time, errorMessage) {
        var zero_interval = new Interval(new Date(), new Date());
        var min_interval = zero_interval;
        var max_interval = zero_interval;
        if (this.usage_intervals.length === 0) {
            errorMessage = "There are no intervals currently available for this website.";
            return this.createExtremaObject(max_interval, min_interval);
        }

        if (!(start_time && end_time)) {
            return this.createExtremaObject(this.min_interval, this.max_interval);
        }

        if (!start_time) {
            // Initialize start_time with earliest start date.
            start_time = new Date(0);
        }

        if (!end_time) {
            // Initialize end_time with latest end_date.
            end_time = new Date();
        }

        for (var interval_idx in this.usage_intervals) {
            var candidate_interval = this.usage_intervals[interval_idx];
            var candidate_interval_length = candidate_interval.getLength();
            if (candidate_interval_length > max_interval.getLength()) {
                max_interval = candidate_interval;
            } else if (candidate_interval_length < min_interval.getLength()) {
                min_interval = candidate_interval;
            }
        }

        return this.createExtremaObject(min_interval, max_interval);
    }
}

/*
 * Abstracts away Chrome storage area management.
 * TODO(johnnychang): Think of a better name.
 * TODO(johnnychang): Remember to serialize/deserialize objects when retrieving
 * and updating from chrome storage.
 */
class WebsiteContainer {
    constructor(storage_area) {
        this.storage_area = storage_area;
    }

    addIntervalToWebsite(site_name, interval, errorMessage) {
        // Check if interval is done being constructed.
        if (!interval.isFinished()) {
            errorMessage = INTERVAL_UNFINISHED;
            return false;
        }

        this.getWebsite(site_name, function(tracked_website) {
            // Given a tracked website, add an interval to it and update the storage area.
            tracked_website.add_interval(interval);
            this.updateItems(site_name, tracked_website);
        });
    }

    getWebsite(site_name, callback) {
        storage_area.get(site_name, function(items) {
            var errorMessage = "";
            // If site is not already tracked, create an entry in the storage area dictionary.
            if (!(site_name in items)) {
                items[site_name] = "";
                errorMessage = "The current site, " + site_name + ", hasn't been tracked yet.";
                callback(null, errorMessage);
                return;
            }

            var stringified_tracked_website = items[site_name];
            var tracked_website = WebsiteContainer.deserializeTrackedWebsites(stringified_tracked_website);
            if (!(tracked_website instanceof TrackedWebsite)) {
                errorMessage = 'The website "' + site_name + '" was not deserialized properly.';
                callback(null, errorMessage);
                return;
            }

            callback(tracked_website, errorMessage);
        });
    }

    updateItems(key, value) {
        // Responsible for serialization, deserialization.
        var items = {};
        var serialized_value = "";
        if (typeof value !== "string") {
            serialized_value = WebsiteContainer.serialize(value);
        }
        items[key] = serialized_value;

        this.storage_area.set(items, function() {
            // TODO(johnnychang): Check that storage area can return some sort of success state.
            debugMessage("Attempted storage area update.");
        });
    }
}

/*
 * Performs analysis operations on tracked websites given a website container.
 */
class Analyzer {
    constructor(website_container) {
        this.website_container = website_container;
    }

    getExtremaBetween(start_time, end_time, site_name, callback) {
        this.website_container.getWebsite(site_name, function(tracked_website, errorMessage) {
            if (!errorMessage) {
                callback(null, errorMessage);
                return;
            }

            var extrema = tracked_website.getExtremaBetween(start_time, end_time);
            callback(extrema, errorMessage);
        });
    }

    getMaxBetween(start_time, end_time, site_name, callback) {
        this.getExtremaBetween(start_time, end_time, site_name, function(extrema, errorMessage) {
            if (!errorMessage) {
                callback(null, errorMessage);
                return;
            }
            callback(extrema.max, errorMessage);
        });
    }

    getMinBetween(start_time, end_time, site_name, callback) {
        this.getExtremaBetween(start_time, end_time, site_name, function(extrema, errorMessage) {
            if (!errorMessage) {
                callback(null, errorMessage);
                return;
            }
            callback(extrema.min, errorMessage);
        });
    }
}

function doesNotExist(requested_target) {
    return 'The requested ' + requested_target + ' does not exist.';
}

function formatErrorString(prefix, target_string) {
    return prefix + ' of ' + target_string;
}

// Assumes root site enum has already been initialized.
// Callback takes a function that looks like this:
// function callback(int root_site_id, string error_message) { ... }
// Error id: -1. Error message will be populated with the error message.
// TODO(johnnychang): Cache the root sites so we don't have to wait for this async call to finish.
function convertRootSiteToId(root_site, callback) {
    storage_area.get(ROOT_SITE_ENUM, function(items) {
        var root_site_id = -1;
        var error_message = doesNotExist(formatErrorString(ROOT_SITE_ID_STRING, root_site));

        if (root_site in items[ROOT_SITE_ENUM]) {
            root_site_id = items[ROOT_SITE_ENUM][root_site];
            error_message = ALL_GOOD;
        }

        callback(root_site_id, error_message);
    });
}

// Accepts an id and a callback. Callback must look like this:
// function callback(string root_site_string, string error_message) { ... }
function convertIdToRootSiteString(root_site_id, callback) {
    storage_area.get(INVERSE_ROOT_SITE_MAP, function(items) {
        var root_site_string = '';
        var error_message = doesNotExist(formatErrorString(ROOT_SITE_STRING, root_site_id));

        if (items[INVERSE_ROOT_SITE_MAP].length > root_site_id) {
            root_site_string = items[INVERSE_ROOT_SITE_MAP][root_site_id];
            error_message = ALL_GOOD;
        }
        callback(root_site_string, error_message);
    });
}

// Check if a root_site is already being tracked. If not, insert the root site
// into the enum and update the corresponding enum-value based data structures.
function insertRootSite(root_site, callback) {
    debugLog('Attempting to insert a root site into storage.');
    storage_area.get([ROOT_SITE_ENUM, INVERSE_ROOT_SITE_MAP, ENUM_COUNTER, SITE_INTERVAL_MAP_KEY], function(items) {
        if (!(root_site in items[ROOT_SITE_ENUM])) {
            debugLog('Pushing ' + root_site + ' onto our maps and enums. ' +
                'Printing Site interval map key:');

            items[INVERSE_ROOT_SITE_MAP].push(root_site);
            items[ROOT_SITE_ENUM][root_site] = items[ENUM_COUNTER];

            items[SITE_INTERVAL_MAP_KEY].push([]);
            console.log(items[SITE_INTERVAL_MAP_KEY]);
            items[ENUM_COUNTER]++;
            console.log('num items in site_interval_map: ' + items[SITE_INTERVAL_MAP_KEY].length + ' should match ' + items[ENUM_COUNTER]);

            storage_area.set(items, function() {
                callback();
            });
        } else {
            callback();
        }
    });
}

function initializeEnum() {
    storage_area.get([ROOT_SITE_ENUM, ENUM_COUNTER, INVERSE_ROOT_SITE_MAP, SITE_INTERVAL_MAP_KEY], function(items) {
        if (!(ROOT_SITE_ENUM in items)) {
            debugLog('Initializing root site enum, the counter, root site map, and site interval map key.');
            items[ROOT_SITE_ENUM] = {};
            items[INVERSE_ROOT_SITE_MAP] = [];
            items[ENUM_COUNTER] = ENUM_COUNTER_START;
            items[SITE_INTERVAL_MAP_KEY] = [];
        }
        storage_area.set(items, function() {
            debugLog('Initialized storage area for root site enums!');
        });
    });
}

function initialize() {
    initializeEnum();
}

function recordSiteInformation(root_site_id, start_time, end_time) {
    return {
        START_TIME: start_time,
        END_TIME: end_time,
        ROOT_SITE_ID: root_site_id
    };
}

function createInterval(start_time, end_time) {
    return [start_time, end_time];
}

// Records a tracking interval for some site.
// TODO(johnnychang): Refactor this to be smaller.
function setSite(root_site, start_date, end_date, callback) {
    debugLog('Called setSite.');
    console.log(start_date);
    console.log(end_date);
    var start_time = start_date.getTime();
    var end_time = end_date.getTime();
    debugLog('Adding ' + start_time + ', ' + end_time + ' to ' + root_site + '!');

    if (end_time - start_time < THRESHOLD_INTERVAL) {
        debugLog('Not adding to storage if under threshold of ' + THRESHOLD_INTERVAL);
        return;
    }

    storage_area.get([SITE_INTERVAL_MAP_KEY], function(items) {
        convertRootSiteToId(root_site, function(root_site_id, error_message) {
            // Convert root_site string to ID and store the interval at the matching indices.
            if (root_site_id < 0) {
                debugLog(error_message);
            } else {
                // TODO(johnnychang): Check if this is ever out of sync with the interned root_site ids.
                if (root_site_id < items[SITE_INTERVAL_MAP_KEY].length &&
                    typeof start_time !== 'undefined' &&
                    typeof end_time !== 'undefined') {
                    var interval = createInterval(start_time, end_time);
                    if (interval.length == 2) {
                        console.log(items[SITE_INTERVAL_MAP_KEY]);
                        console.log('Root site id: ' + root_site_id);
                        console.log(interval);
                        items[SITE_INTERVAL_MAP_KEY][root_site_id].push(interval);
                    }
                }

                // Update storage.
                storage_area.set(items, function() {
                    debugLog('Successfully set storage!');
                    callback();
                });
            }
        });
    });
}

// Locally records the start of tracking.
function startTracking(root_site, start_time) {
    debugLog('Called startTracking on ' + root_site + '!');
    current_tab_info[CURRENT_URL] = root_site;
    current_tab_info[CURRENT_URL_START] = start_time;
}

function clearCurrentTabInfo() {
    current_tab_info = {};
}

// Finishes tracking of the url stored in current_tab_info.
function finishTracking(callback) {
    debugLog('Called finishTracking!');

    console.log(current_tab_info);

    // Check that there is a URL defined in current_tab_info.
    if (CURRENT_URL_START in current_tab_info) {
        debugLog('URL defined; proceeding to record interval.');
        var current_time = new Date();
        if (typeof current_tab_info[CURRENT_URL_START] !== 'undefined' &&
                current_tab_info[CURRENT_URL_START] instanceof Date) {
            // Record interval for current site.
            setSite(current_tab_info[CURRENT_URL], current_tab_info[CURRENT_URL_START], current_time,
                function() {
                    clearCurrentTabInfo();
                    callback();
                });
        }
    } else {
        callback();
    }
}

function errorLog(msg) {
    if (IS_ERROR && typeof msg === 'string') {
        console.log(ERROR_LOG_PREFIX + msg);
    }
}

function debugLog(msg) {
    if (IS_DEBUG && typeof msg === 'string') {
        console.log(DEBUG_LOG_PREFIX + msg);
    }
}

function createActiveQuery() {
    return {
        active: true,
        currentWindow: true
    };
}

function parseUrlForRootSite(url_string) {
    // Bootstrapping URL parsing with Javascript's HTML Document functions.
    // Credits to StackOverflow.
    var url_parser = document.createElement('a');
    url_parser.href = url_string;
    return url_parser.hostname;
}

function trackTime(url_string) {
    finishTracking(function() {
        debugLog('Called trackTime callback. Attempting to reset startTracking.');
        var root_site = parseUrlForRootSite(url_string);
        debugLog('Root_site: ' + root_site);
        var start_time = new Date();
        insertRootSite(root_site, function() {
            startTracking(root_site, start_time);
        });
    });
}

function checkForActiveTab() {
    chrome.tabs.query(createActiveQuery(), function(tab_array) {
        if (tab_array.length > 1) {
            debugLog('Tab array length should not be greater than 1.');
            return;
        } else if (tab_array.length > 0) {
            var active_tab = tab_array[0];
            if (active_tab.status == 'complete') {
                trackTime(active_tab.url);
            }
        }
    });
}

function getActiveTab(tabId, changeInfo, tab) {
    if (typeof tab !== 'undefined' && tab.status == 'complete') {
        checkForActiveTab();
    }
}

function trackActiveChange(activeInfo) {
    checkForActiveTab();
}

function getCurrentState() {
    storage_area.get(null, function(items) {
        console.log(items);
    });
}

function clearStorageArea() {
    storage_area.clear(function() {
        debugLog('Cleared storage area!');
    });
}

initialize();

chrome.tabs.onUpdated.addListener(getActiveTab);
chrome.tabs.onCreated.addListener(getActiveTab);
chrome.tabs.onActivated.addListener(trackActiveChange);

alert('Loaded Yo Time!');
