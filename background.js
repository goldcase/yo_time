"use strict";

var DEBUG_MESSAGE_PREFIX = "Debug log: ";
var is_debug = true;
var time_tracker_table = {};
var current_tab_info = {};

function set_site(root_site, interval) {
    debug_message("Adding " + interval + " to " + root_site + "!");

    if (root_site in time_tracker_table) {
        time_tracker_table[root_site] += interval;
    } else {
        time_tracker_table[root_site] = interval;
    }
}

function startTracking(root_site, start_time) {
    debug_message("Called startTracking on " + root_site + "!");
    current_tab_info["current_url"] = root_site;
    current_tab_info["url_start_time"] = start_time;
}

function finishTracking() {
    debug_message("Called finish tracking!");

    if ("url_start_time" in current_tab_info) {
        var current_time = new Date();
        var elapsed_time = current_time - current_tab_info["url_start_time"];
        set_site(current_tab_info["current_url"], elapsed_time);
    }
}

function debug_message(msg) {
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
            debug_message("Tab array length should not be greater than 1.");
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
