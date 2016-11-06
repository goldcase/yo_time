/*
 * Analytics.js takes care of aggregation of tracker data.
 */
function convertTimeToSeconds(time) {
    return time / 1000;
}

function getTotalTime() {
    debugMessage('Called getTotalTime()');

    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        var interval_map = items[SITE_INTERVAL_MAP_KEY];
        var sum = 0.;
        for (var root_site_idx in interval_map) {
            var site_intervals = interval_map[root_site_idx];
            var site_sum = 0.;
            for (var interval_idx in site_intervals) {
                var target_interval = site_intervals[interval_idx];
                site_sum += target_interval[1] - target_interval[0];
            }
            debugMessage('The total amount of time tracked for site ' + root_site_idx + ' is ' + convertTimeToSeconds(site_sum) + ' seconds.');
            sum += site_sum;
        }
        debugMessage('The total amount of time tracked by Yo is ' + convertTimeToSeconds(sum) + ' seconds.');
    });
}

function getTotalTimeForSite(root_site) {
    debugMessage('Getting total time for site ' + root_site);
    storage_area.get(SITE_INTERVAL_MAP_KEY, function(items) {
        debugMessage('Storage area retrieved.');
        console.log(items);
        convertRootSiteToId(root_site, function(root_site_id, error_message) {
            console.log('Root site converted to ID ' + root_site_id);
            // Convert root_site string to ID and store the interval at the matching indices.
            if (root_site_id < 0) {
                debugMessage(error_message);
            } else if (root_site_id < items[SITE_INTERVAL_MAP_KEY].length) {
                // Sum up the total time interval at the target root site.
                var sum = 0.;
                debugMessage('Printing intervals.');
                var intervals = items[SITE_INTERVAL_MAP_KEY][root_site_id];
                for (var interval_idx in intervals) {
                    var interval = intervals[interval_idx];
                    console.log(interval);
                    sum += interval[1] - interval[0];
                }
                debugMessage('The total amount of time tracked for site ' + root_site + ' is ' + convertTimeToSeconds(sum) + ' seconds.');
            } else {
                debugMessage('Root site ID is out of bounds of items[SITE_INTERVAL_MAP_KEY]. Error.');
            }
        });
    });
}
