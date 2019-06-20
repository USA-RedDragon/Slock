(function(global) {
    const sshlackInjector = null; // @@SHHLACK_PLACEHOLDER@@;

    if (global
    && global.navigator
    && global.navigator.userAgent.toLowerCase().indexOf('electron') === -1) {
        global.INJECTOR = sshlackInjector;
    } else {
        sshlackInjector();
    }
})(typeof global !== 'undefined' ? global : window);
// # sourceURL=<ENSLACKER>
