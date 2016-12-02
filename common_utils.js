// Debug flag.
var IS_DEBUG = true;
var IS_ERROR = true;

var DEBUG_LOG_PREFIX = 'DEBUG: ';
var ERROR_LOG_PREFIX = 'ERROR: ';

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
