"use strict";

// Debug flag.
var IS_DEBUG = true;
var DEBUG_MESSAGE_PREFIX = "Debug log: ";

// Constants for names of items in storage.
var START_TIME = "start_time";
var END_TIME = "end_time";
var ROOT_SITE_ID = "id";
var CURRENT_URL = "current_url";
var CURRENT_URL_START = "current_url_start";
var ALL_LOG_KEY = "time_logs";
var SITE_INTERVAL_MAP_KEY = "site_to_interval";
var THRESHOLD_INTERVAL = (new Date(5000)).getTime() - (new Date()).getTime();
var ROOT_SITE_ENUM = "root_site_enum";
var INVERSE_ROOT_SITE_MAP = "root_site_id_to_name";
var ENUM_COUNTER = "root_site_enum_counter";
var ENUM_COUNTER_START = 0;

// Sites you want to induce latency in.
var BLACKLIST_KEY = "blacklist";

// Sites you don't want to track.
var WHITELIST_KEY = "whitelist";

var ALL_GOOD = "";
var ROOT_SITE_ID_STRING = "root site ID string";
var ROOT_SITE_STRING = "root site string";

var current_tab_info = {};
var storage_area = chrome.storage.local;

function doesNotExist(requested_target) {
    return "The requested " + requested_target + " does not exist.";
}

function formatErrorString(prefix, target_string) {
    return prefix + " of " + target_string;
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
        var root_site_string = "";
        var error_message = doesNotExist(formatErrorString(ROOT_SITE_STRING, root_site_id));

        if (items[INVERSE_ROOT_SITE_MAP].length > root_site_id) {
            root_site_string = items[INVERSE_ROOT_SITE_MAP][root_site_id];
            error_message = ALL_GOOD;
        }
        callback(root_site_string, error_message);
    });
}

function insertRootSite(root_site, callback) {
    storage_area.get([ROOT_SITE_ENUM, INVERSE_ROOT_SITE_MAP, ENUM_COUNTER, SITE_INTERVAL_MAP_KEY], function(items) {
        if (!(root_site in items[ROOT_SITE_ENUM])) {
            items[INVERSE_ROOT_SITE_MAP].push(root_site);
            items[ROOT_SITE_ENUM][root_site] = items[ENUM_COUNTER];
            items[SITE_INTERVAL_MAP_KEY].push([]);
            items[ENUM_COUNTER]++;

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
            items[ROOT_SITE_ENUM] = {};
            items[INVERSE_ROOT_SITE_MAP] = [];
            items[ENUM_COUNTER] = ENUM_COUNTER_START;
            items[SITE_INTERVAL_MAP_KEY] = [];
        }
        storage_area.set(items, function() {
            debugMessage("Initialized storage area for root site enums!");
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

function addToBlacklist(root_site) {
    storage_area.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        items[BLACKLIST_KEY].add(root_site);
    });
}

function removeFromBlacklist(root_site) {
    storage_area.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        items[BLACKLIST_KEY].delete(root_site);
    });
}

function checkIfBlacklisted(root_site, callback) {
    storage_area.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        callback(items[BLACKLIST_KEY].has(root_site));
    });
}

function createInterval(start_time, end_time) {
    return [start_time, end_time];
}

// Records a tracking interval for some site.
// TODO(johnnychang): Refactor this to be smaller.
function setSite(root_site, start_date, end_date) {
    console.log(start_date);
    console.log(end_date);
    var start_time = start_date.getTime();
    var end_time = end_date.getTime();
    debugMessage("Adding " + start_time + ", " + end_time + " to " + root_site + "!");

    if (end_time - start_time < THRESHOLD_INTERVAL) {
        debugMessage("Not adding to storage if under threshold of " + THRESHOLD_INTERVAL);
        return;
    }

    storage_area.get([ALL_LOG_KEY, SITE_INTERVAL_MAP_KEY], function(items) {
        if (!(ALL_LOG_KEY in items)) {
            items[ALL_LOG_KEY] = [];
        }
        convertRootSiteToId(root_site, function(root_site_id, error_message) {
            // Convert root_site string to ID and store the interval at the matching indices.
            if (root_site_id < 0) {
                debugMessage(error_message);
            } else {
                // TODO(johnnychang): Check if this is ever out of sync with the interned root_site ids.
                if (root_site_id < items[SITE_INTERVAL_MAP_KEY].length &&
                    typeof start_time !== "undefined" &&
                    typeof end_time !== "undefined") {
                    var interval = createInterval(start_time, end_time);
                    if (interval.length == 2) {
                        items[ALL_LOG_KEY].push(recordSiteInformation(root_site_id, start_time, end_time));
                        console.log(items[SITE_INTERVAL_MAP_KEY]);
                        console.log("Root site id: " + root_site_id);
                        console.log(interval);
                        items[SITE_INTERVAL_MAP_KEY][root_site_id].push(interval);
                    }
                }

                // Update storage.
                storage_area.set(items, function() {
                    debugMessage("Successfully set storage!");
                });
            }
        });
    });
}

// Locally records the start of tracking.
function startTracking(root_site, start_time) {
    debugMessage("Called startTracking on " + root_site + "!");
    current_tab_info[CURRENT_URL] = root_site;
    current_tab_info[CURRENT_URL_START] = start_time;
}

function finishTracking() {
    debugMessage("Called finish tracking!");

    if (CURRENT_URL_START in current_tab_info) {
        var current_time = new Date();
        if (typeof current_tab_info[CURRENT_URL_START] !== "undefined" &&
                current_tab_info[CURRENT_URL_START] instanceof Date) {
            setSite(current_tab_info[CURRENT_URL],
                    current_tab_info[CURRENT_URL_START],
                    current_time);
        }
    }
}

function debugMessage(msg) {
    if (IS_DEBUG && typeof msg === "string") {
        console.log(DEBUG_MESSAGE_PREFIX + msg);
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
    var root_site = parseUrlForRootSite(url_string);
    finishTracking();
    var start_time = new Date();
    insertRootSite(root_site, function() {
        startTracking(root_site, start_time);
    });
}

function checkForActiveTab() {
    chrome.tabs.query(createActiveQuery(), function(tab_array) {
        if (tab_array.length > 1) {
            debugMessage("Tab array length should not be greater than 1.");
            return;
        } else if (tab_array.length > 0) {
            var active_tab = tab_array[0];
            trackTime(active_tab.url);
        }
    });
}

function getActiveTab(tabId, changeInfo, tab) {
    checkForActiveTab();
}

function trackActiveChange(activeInfo) {
    checkForActiveTab();
}

function getCurrentState() {
    storage_area.get(null, function(items) {
        console.log(items);
    });
}

function getTotalTimeForSite(root_site) {
    debugMessage("Getting total time for site " + root_site);
    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        debugMessage("Storage area retrieved.");
        console.log(items);
        convertRootSiteToId(root_site, function(root_site_id, error_message) {
            console.log("Root site converted to ID " + root_site_id);
            // Convert root_site string to ID and store the interval at the matching indices.
            if (root_site_id < 0) {
                debugMessage(error_message);
            } else {
                if (root_site_id < items[SITE_INTERVAL_MAP_KEY].length) {
                    console.log("Root site ID");
                    console.log(root_site_id);
                    var sum = 0.;
                    for (var interval in items[SITE_INTERVAL_MAP_KEY][root_site_id]) {
                        console.log(interval);
                        sum += interval[1] - interval[0];
                    }
                    console.log("Sum: ");
                    console.log(sum);
                }
            }
        });
    });
}

initialize();

chrome.tabs.onUpdated.addListener(getActiveTab);
chrome.tabs.onCreated.addListener(getActiveTab);
chrome.tabs.onActivated.addListener(trackActiveChange);

alert("Loaded Yo Time!");
