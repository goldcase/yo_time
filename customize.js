// Sites you want to induce latency in.
var BLACKLIST_KEY = 'blacklist';

// Sites you don't want to track.
var WHITELIST_KEY = 'whitelist';

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
