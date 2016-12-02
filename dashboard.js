var site_input_elem = "website-name";
var start_date_input_elem = "start-date";
var end_date_input_elem = "end-date";

var max_elem_id = "max-time";
var max_elem = document.getElementById(max_elem_id);
var min_elem_id = "min-time";
var min_elem = document.getElementById(min_elem_id);
var avg_elem_id = "avg-time";
var avg_elem = document.getElementById(avg_elem_id);
var site_elem_class = "site-name";
var site_elems = document.getElementsByClassName(site_elem_class);

function getSite() {
    return document.getElementById(site_input_elem).value;
}

function getStartTime() {
    return document.getElementById(start_date_input_elem).value;
}

function getEndTime() {
    return document.getElementById(end_date_input_elem).value;
}

function convertDateStringToTime(date_string, errorMessage) {
    var split_date = date_string.split("-");
    if (split_date.length == 3) {
        return (new Date(split_date[0], split_date[1], split_date[2])).getTime();
    } else {
        errorMessage = "Invalid user input date string; unable to parse.";
        return null;
    }
}

function checkResponse(response, elem, callback, errback) {
    debugLog("Called checkResponse.");

    if (!response["success"]) {
        errback(elem, response["error_message"]);
    } else {
        callback(elem, response["result"]);
    }
}

function fillInElem(elem, text) {
    var value = text;
    if (text.hasOwnProperty("start")) {
        value = text["end"] - text["start"];
    }
    console.log(text);
    debugLog("Calling fill in elem.");
    elem.innerHTML = "" + value;
}

function clearElem(elem, errorMessage) {
    debugLog("Clear elem.");
    elem.innerHTML = "";
    errorLog(errorMessage);

    elem.innerHTML = errorMessage;
}

function checkResponseAndFillIn(elem) {
    debugLog("Called checkResponseAndFillIn.");
    return function(response) {
        debugLog("Called returned function from checkResponseandFillIn");
        console.log("response:");
        console.log(response);
        checkResponse(response, elem, fillInElem, clearElem);
        return true;
    };
}

function refreshStatistics() {
    var site = getSite();
    for (var i = 0; i < site_elems.length; i++) {
        site_elems[i].innerHTML = site;
    }

    var errorMessage = "";
    var start_time = (new Date(0)).getTime() || convertDateStringToTime(getStartTime(), errorMessage);
    var end_time = (new Date()).getTime() || convertDateStringToTime(getEndTime(), errorMessage);

    if (!!errorMessage) {
        errorLog(errorMessage);
        max_elem.innerHTML = "ERROR";
        return;
    }

    chrome.runtime.sendMessage(createAnalyticsRequest(site, MAX_OP, start_time, end_time), checkResponseAndFillIn(max_elem));
    chrome.runtime.sendMessage(createAnalyticsRequest(site, MIN_OP, start_time, end_time), checkResponseAndFillIn(min_elem));
    chrome.runtime.sendMessage(createAnalyticsRequest(site, AVG_OP, start_time, end_time), checkResponseAndFillIn(avg_elem));
}

function createAnalyticsRequest(site_name, operation, start_time, end_time) {
    var ret = {};
    ret[SITE_PROPERTY] = site_name;
    ret[OP_PROPERTY] = operation;
    ret[START_TIME_PROPERTY] = start_time;
    ret[END_TIME_PROPERTY] = end_time;

    return ret;
}

document.getElementById("submit-form").addEventListener("click", refreshStatistics);

