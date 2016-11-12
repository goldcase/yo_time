/*
 * Analytics.js takes care of aggregation of tracker data.
 */

/*
 * Top level features:
 * - Get day-by-day activity for a website.
 * - Query by time period.
 * - Query statistics for a website (max time spent one period on this website, max day time spend, avg)
 * - Query statistics across all websites (most visited, most time spent, avg time spend, total browsing time)
 */

function convertTimeToSeconds(time) {
    return time / 1000;
}

function getLogForSiteId(site_id, callback) {
    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        callback(items[SITE_INTERVAL_MAP_KEY][site_id]);
    });
}

function getLogForSiteString(site_string, callback) {
    convertRootSiteToId(site_string, function(site_id, error_message) {
        if (id < 0) {
            debugLog(error_message);
        } else {
            getLogForSiteId(site_id, callback);
        }
    });
}

/*
function getMaxTimePeriod(intervals, callback) {
    var longest_time = 0;
    var longest_start = (new Date()).getTime();
    var longest_end = (new Date()).getTime();

    var shortest_time = 0;
    var shortest_start = (new Date()).getTime();
    var shortest_end = (new Date()).getTime();

    for (var interval_idx in intervals) {
        var target_interval = intervals[interval_idx];
        var candidate_difference = target_interval[INTERVAL_END_IDX] - target_interval[INTERVAL_START_IDX];
        if (candidate_difference > longest_time) {
            longest_time = candidate_difference;
            best_start = target_interval[INTERVAL_START_IDX];
            best_end = target_interval[INTERVAL_END_IDX];
        } else if (candidate
    }
}
*/

function getTotalTime() {
    debugLog('Called getTotalTime()');

    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        var interval_map = items[SITE_INTERVAL_MAP_KEY];
        var sum = 0.;
        for (var root_site_idx in interval_map) {
            var site_intervals = interval_map[root_site_idx];
            var site_sum = 0.;
            for (var interval_idx in site_intervals) {
                var target_interval = site_intervals[interval_idx];
                site_sum += target_interval[INTERVAL_END_IDX] - target_interval[INTERVAL_START_IDX];
            }
            debugLog('The total amount of time tracked for site ' + root_site_idx + ' is ' + convertTimeToSeconds(site_sum) + ' seconds.');
            sum += site_sum;
        }
        debugLog('The total amount of time tracked by Yo is ' + convertTimeToSeconds(sum) + ' seconds.');
    });
}

function getTotalTimeForSite(root_site) {
    debugLog('Getting total time for site ' + root_site);
    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        debugLog('Storage area retrieved.');
        console.log(items);
        convertRootSiteToId(root_site, function(root_site_id, error_message) {
            console.log('Root site converted to ID ' + root_site_id);
            // Convert root_site string to ID and store the interval at the matching indices.
            if (root_site_id < 0) {
                debugLog(error_message);
            } else if (root_site_id < items[SITE_INTERVAL_MAP_KEY].length) {
                // Sum up the total time interval at the target root site.
                var sum = 0.;
                debugLog('Printing intervals.');
                var intervals = items[SITE_INTERVAL_MAP_KEY][root_site_id];
                for (var interval_idx in intervals) {
                    var interval = intervals[interval_idx];
                    console.log(interval);
                    sum += interval[1] - interval[0];
                }
                debugLog('The total amount of time tracked for site ' + root_site + ' is ' + convertTimeToSeconds(sum) + ' seconds.');
            } else {
                debugLog('Root site ID is out of bounds of items[SITE_INTERVAL_MAP_KEY]. Error.');
            }
        });
    });
}
