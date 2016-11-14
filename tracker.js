/* jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr:50, esversion: 6 */ /* global define */
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

var ALL_GOOD = '';
var ROOT_SITE_ID_STRING = 'root site ID string';
var ROOT_SITE_STRING = 'root site string';

var INTERVAL_START_IDX = 0;
var INTERVAL_END_IDX = 1;

var current_tab_info = {};
var storage_area = chrome.storage.local;

// Class constants.
var INTERVAL_UNFINISHED = 'The interval is not currently finished with construction.';

var website_container = null;
var analyzer = null;

class Interval {
    /*
     * Takes dates as parameters and converts date objects to milliseconds.
     */
    constructor(interval_start, interval_end) {
        if (!(interval_start instanceof Date && interval_end instanceof Date)) {
            errorLog('Error: Attempted to construct interval object with non-Date parameters.');
        }

        this.start = !!interval_start && interval_start instanceof Date ? interval_start.getTime() : (new Date()).getTime();
        this.end = !!interval_end && interval_end instanceof Date ? interval_end.getTime() : interval_end;
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
            errorMessage = 'Unable to return a difference if the end is not set.';
        }

        return difference;
    }

    setStart(interval_start) {
        this.start = interval_start.constructor.name === 'Date' ? interval_start.getTime() : interval_start;
    }

    setEnd(interval_end) {
        this.end = interval_end.constructor.name === 'Date' ? interval_end.getTime() : interval_end;
    }
};

var THRESHOLD_INTERVAL_LENGTH = (new Interval(new Date(0), new Date(20))).getLength();

// TODO(johnnychang): Draw classes out into separate file.
// TODO(johnnychang): Only store interval start + time difference instead of start + end milliseconds?
// NB: Class declarations are not hoisted. Need to load class file first.
class TrackedWebsite {
    /*
     * Tracked websites track usage logs and perform queries on data.
     * Sample queries include max interval over a period of time and
     * average usage over a period of time.
     */
    constructor(name) {
        this.site_name = name;
        this.usage_intervals = [];
    }

    /*
     * Takes in an already-created Interval object.
     */
    addInterval(interval, errorMessage, callback) {
        debugLog('Adding interval to current tracked website: ' + this.site_name);

        // Check that interval is finished being constructed.
        if (!interval.isFinished()) {
            errorLog('Interval appears unfinished.');
            errorMessage = INTERVAL_UNFINISHED;
            return;
        }

        console.log(this.usage_intervals);
        debugLog('Interval length before push: ' + this.usage_intervals.length);
        this.usage_intervals.push(interval);
        debugLog('Interval length after push: ' + this.usage_intervals.length);
        console.log('Pushed interval onto THIS usage interval list.');
        console.log(interval);
        console.log(this);
        callback();
    }

    getAverageBetween(start_time, end_time, errorMessage) {
        var interval_sum = 0;
        var average_interval_length = 0;

        if (this.usage_intervals.length === 0) {
            errorMessage = 'There are no intervals currently available for this website.';
            return average_interval_length;
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
            interval_sum += candidate_interval_length;
        }
        average_interval_length = interval_sum / this.usage_intervals.length;

        return average_interval_length;
    }

    createExtremaObject(min_interval, max_interval) {
        return {
            'max': max_interval,
            'min': min_interval
        };
    }

    getExtremaBetween(start_time, end_time, errorMessage) {
        var zero_interval = new Interval(new Date(), new Date());
        var max_interval_limit = new Interval(new Date(0), new Date());
        var min_interval = max_interval_limit;
        var max_interval = zero_interval;

        if (this.usage_intervals.length === 0) {
            errorMessage = 'There are no intervals currently available for this website.';
            return this.createExtremaObject(min_interval, max_interval);
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

    serialize() {
        debugLog('Called serialize on:');
        console.log(this);
        var serialized_value = JSON.stringify(this);
        debugLog('Serialized_value: ' + serialized_value);
        return serialized_value;
    }

    static deserialize(candidate_tracked_website) {
        debugLog('Deserializing: ' + candidate_tracked_website);
        var parsed_candidate = JSON.parse(candidate_tracked_website);
        console.log(parsed_candidate);
        if (!('site_name' in parsed_candidate)) {
            errorLog('Site name not found in parse target for a TrackedWebsite object.');
        }
        var tracked_website = new TrackedWebsite(parsed_candidate['site_name']);
        for (var candidate_property in parsed_candidate) {
            if (candidate_property === 'usage_intervals') {
                var target_values = parsed_candidate[candidate_property];
                for (var interval_idx in target_values) {
                    // TODO(johnnychang): Check that the candidate parsed object is properly formed.
                    var start_time = target_values[interval_idx]['start'];
                    var end_time = target_values[interval_idx]['end'];
                    var target_interval = new Interval(start_time, end_time);

                    debugLog(target_interval.getLength());

                    // TODO(johnnychang): Handle error message here.
                    tracked_website.addInterval(target_interval, '', function() {
                        debugLog('Added interval to unpickled TrackedWebsite.');
                    });
                }
            }
        }
        return tracked_website;
    }
};

/*
 * Abstracts away Chrome storage area management.
 * TODO(johnnychang): Think of a better name.
 */
class WebsiteContainer {
    constructor(storage_area) {
        this.storage_area = storage_area;
    }

    addIntervalToWebsite(site_name, interval, errorMessage, callback) {
        debugLog('WebsiteContainer adding interval.');

        // Check if interval is done being constructed.
        if (!interval.isFinished()) {
            errorMessage = INTERVAL_UNFINISHED;
            callback();
            return;
        }

        var that = this;
        this.getWebsite(site_name, function(tracked_website) {
            var addIntervalAndUpdate = function(target_site, callback) {
                debugLog('Attempted to add interval.');
                // Given a tracked website, add an interval to it and update the storage area.
                target_site.addInterval(interval, errorMessage, function() {
                    that.updateItems(site_name, target_site, callback);
                    console.log(target_site);
                    callback();
                });
            };

            if (!tracked_website) {
                that.addWebsite(site_name, function(target_site) {
                    addIntervalAndUpdate(target_site, callback);
                });
            } else {
                addIntervalAndUpdate(tracked_website, function() {
                    debugLog('Added interval and updated items.');
                });
            }
        });
    }

    addWebsite(site_name, callback) {
        debugLog('Called addWebsite on ' + site_name);
        var that = this;
        // TODO(johnnychang): Check chrome.runtime.lastError for all get calls.
        this.storage_area.get(null, function(items) {
            if (site_name in items) {
                return;
            }
            var tracked_website = new TrackedWebsite(site_name);
            that.updateItems(site_name, tracked_website, function() {
                debugLog('Attempted to update items.');
                callback(tracked_website);
            });
        });
    }

    getWebsite(site_name, callback) {
        debugLog('Called getWebsite on ' + site_name);
        storage_area.get(site_name, function(items) {
            var errorMessage = '';
            // If site is not already tracked, create an entry in the storage area dictionary.
            if (!(site_name in items)) {
                items[site_name] = '';
                errorMessage = 'The current site, ' + site_name + ", hasn't been tracked yet.";
                callback(null, errorMessage);
                return;
            }

            var stringified_tracked_website = items[site_name];
            var tracked_website = TrackedWebsite.deserialize(stringified_tracked_website);
            callback(tracked_website, errorMessage);
        });
    }

    updateItems(site_name, tracked_website, callback) {
        debugLog('Called updateItems on site_name');
        // Responsible for serialization, deserialization.
        var items = {};
        var serialized_value = '';
        serialized_value = tracked_website.serialize();
        items[site_name] = serialized_value;

        this.storage_area.set(items, function() {
            // TODO(johnnychang): Check that storage area can return some sort of success state.
            debugLog('Attempted storage area update.');
            callback();
        });
    }
};

/*
 * Performs analysis operations on tracked websites given a website container.
 */
class Analyzer {
    constructor(website_container) {
        this.website_container = website_container;
    }

    getTrackedWebsite(site_name, callback) {
        debugLog('Called getTrackedWebsite.');

        this.website_container.getWebsite(site_name, function(tracked_website, errorMessage) {
            if (!!errorMessage) {
                callback(null, errorMessage);
                return;
            }

            callback(tracked_website, errorMessage);
        });
    }

    getExtremaBetween(start_time, end_time, site_name, callback) {
        debugLog('Called getExtremaBetween.');

        this.getTrackedWebsite(site_name, function(tracked_website, errorMessage) {
            if (!!errorMessage) {
                callback(null, errorMessage);
                return;
            }

            var extrema = tracked_website.getExtremaBetween(start_time, end_time);
            callback(extrema, errorMessage);
        });
    }

    getMaxBetween(start_time, end_time, site_name, callback) {
        debugLog('Called getMaxBetween.');

        this.getExtremaBetween(start_time, end_time, site_name, function(extrema, errorMessage) {
            if (!!errorMessage) {
                callback(null, errorMessage);
                return;
            }
            callback(extrema.max, errorMessage);
        });
    }

    getMinBetween(start_time, end_time, site_name, callback) {
        this.getExtremaBetween(start_time, end_time, site_name, function(extrema, errorMessage) {
            if (!!errorMessage) {
                callback(null, errorMessage);
                return;
            }
            callback(extrema.min, errorMessage);
        });
    }

    getAverageBetween(start_time, end_time, site_name, callback) {
        this.getTrackedWebsite(site_name, function(tracked_website, errorMessage) {
            console.log('Tracked website:');
            console.log(tracked_website);
            if (!tracked_website) {
                callback(null, errorMessage);
                return;
            }

            var average_interval_length = tracked_website.getAverageBetween(start_time, end_time);
            callback(average_interval_length, errorMessage);
        });
    }
};

var current_interval = new Interval(null, null);
var current_site_name = '';

function resetTrackingVariables() {
    current_interval = new Interval(null, null);
    current_site_name = '';
}

// Locally records the start of tracking.
function startTracking(root_site) {
    debugLog('Called startTracking on ' + root_site + '!');
    current_interval = new Interval(new Date(), null);
    current_site_name = root_site;
}

// Finishes tracking of the url stored in current_tab_info.
function finishTracking(current_site, site_interval, errorMessage, callback) {
    debugLog('Called finishTracking! on ' + current_site);
    console.log('Current site interval: ' + site_interval);

    if (!current_site) {
        debugLog('Empty site.');
        errorMessage = 'Empty site.';
        callback();
        return;
    }

    if (site_interval.getLength() < THRESHOLD_INTERVAL_LENGTH) {
        debugLog('Below threshold.');
        errorMessage = "Current interval length hasn't crossed our threshold.";
        callback();
        return;
    }

    debugLog('Proceeding to add current interval to website.');
    // Record interval for current site.
    website_container.addIntervalToWebsite(current_site, site_interval, errorMessage, callback);
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
    debugLog('Tracking time for ' + url_string);
    // Calls finishTracking on current site with current interval.
    var errorMessage = '';
    var last_site = current_site_name;
    current_site_name = parseUrlForRootSite(url_string);
    debugLog('Last site: ' + last_site + ', current_site: ' + current_site_name);
    current_interval.setEnd(new Date());

    finishTracking(last_site, current_interval, errorMessage, function() {
        if (!!errorMessage) {
            errorLog(errorMessage);
        }
    });
}

function checkForActiveTab(errorMessage) {
    debugLog('called checkForActiveTab.');

    chrome.tabs.query(createActiveQuery(), function(tab_array) {
        if (tab_array.length > 1) {
            errorMessage = 'Tab array length should not be greater than 1.';
        } else if (tab_array.length == 1) {
            var active_tab = tab_array[0];
            if (active_tab.status == 'complete') {
                trackTime(active_tab.url);
                /*
            } else {
                setTimeout(function() {
                    checkForActiveTab(errorMessage);
                }, 250);
                */
            }
        } else {
            errorMessage = 'Tab array length is incorrect.';
        }
    });
}

function getActiveTab(tabId, changeInfo, tab) {
    debugLog('Called getActiveTab.');
    console.log(changeInfo);
    if (typeof tab !== 'undefined' && tab.status == 'complete' && typeof tab.url !== 'undefined') {
        var errorMessage = '';
        checkForActiveTab(errorMessage);
        errorLog(errorMessage);
    }
}

function trackActiveChange(activeInfo) {
    debugLog('Called trackActiveChange.');
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

function debugLog(debug_message) {
    if (typeof debug_message === 'string') {
        console.log(DEBUG_LOG_PREFIX + debug_message);
    }
}

function errorLog(error_message) {
    if (typeof debug_message === 'string') {
        console.log(ERROR_LOG_PREFIX + error_message);
    }
}

function initialize() {
    website_container = new WebsiteContainer(storage_area);
    analyzer = new Analyzer(website_container);
}

initialize();

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    debugLog('Received update event.');
    getActiveTab(tabId, changeInfo, tab);
});

chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {
    debugLog('Received created event.');
    getActiveTab(tabId, changeInfo, tab);
});
chrome.tabs.onActivated.addListener(trackActiveChange);

alert('Loaded Yo Time!');
