"use strict";

var DEBUG_MESSAGE_PREFIX = "Debug log: ";
var is_debug = true;
var current_tab_info = {};
var ALL_LOG_KEY = "time_logs";
var SITE_INTERVAL_MAP_KEY = "site_to_interval";
var BLACKLIST_KEY = "blacklist";
var THRESHOLD_INTERVAL = new Date(5000);

function recordSiteInformation(root_site, start_time, end_time) {
    return {
        "start_time": start_time,
        "end_time": end_time,
        "root_site": root_site
    };
}

function addToBlacklist(root_site) {
    chrome.storage.local.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        items[BLACKLIST_KEY].add(root_site);
    });
}

function removeFromBlacklist(root_site) {
    chrome.storage.local.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        items[BLACKLIST_KEY].delete(root_site);
    });
}

function checkIfBlacklisted(root_site, callback) {
    chrome.storage.local.get(BLACKLIST_KEY, function(items) {
        if (!(BLACKLIST_KEY in items)) {
            items[BLACKLIST_KEY] = new Set();
        }
        callback(items[BLACKLIST_KEY].has(root_site));
    });
}

function setSite(root_site, start_time, end_time) {
    debugMessage("Adding " + start_time + ", " + end_time + " to " + root_site + "!");

    if (end_time - start_time < THRESHOLD_INTERVAL) {
        debugMessage("Not adding to storage if under threshold of " + THRESHOLD_INTERVAL);
        return;
    }

    chrome.storage.local.get([ALL_LOG_KEY, SITE_INTERVAL_MAP_KEY], function(items) {
        if (!(ALL_LOG_KEY in items)) {
            items[ALL_LOG_KEY] = [];
        }
        items[ALL_LOG_KEY].push(recordSiteInformation(root_site, start_time, end_time));

        if (!(SITE_INTERVAL_MAP_KEY in items)) {
            items[SITE_INTERVAL_MAP_KEY] = {};
        }

        if (!(root_site in items[SITE_INTERVAL_MAP_KEY])) {
            items[SITE_INTERVAL_MAP_KEY][root_site] = [];
        }

        items[SITE_INTERVAL_MAP_KEY][root_site].push([start_time, end_time]);

        chrome.storage.local.set(items, function() {
            debugMessage("Successfully set storage!");
            chrome.storage.local.get(null, function(items) {
                console.log("Current state of items:");
                console.log(items);
            });
        });
    });
}

function startTracking(root_site, start_time) {
    debugMessage("Called startTracking on " + root_site + "!");
    current_tab_info["current_url"] = root_site;
    current_tab_info["url_start_time"] = start_time;
}

function finishTracking() {
    debugMessage("Called finish tracking!");

    if ("url_start_time" in current_tab_info) {
        var current_time = new Date();
        setSite(current_tab_info["current_url"], current_tab_info["url_start_time"], current_time);
    }
}

function debugMessage(msg) {
    if (is_debug && typeof msg === "string") {
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
    startTracking(root_site, start_time);
}

function checkForActiveTab() {
    chrome.tabs.query(createActiveQuery(), function(tab_array) {
        console.log(tab_array);
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

chrome.tabs.onUpdated.addListener(getActiveTab);
chrome.tabs.onActivated.addListener(trackActiveChange);

alert("Loaded Yo Time!");
