/*PATCHED BY Minded Security to add encryption features. See shhlack
REMOVE ME TO BOTTOM TO RECREATE ORIGINAL 
FILE /usr/lib/slack/resources/app.asar.unpacked/src/static/ssb-interop.js
*/
(function(global) {
  var sshlackInjector = @@SHHLACK_PLACEHOLDER@@;

  if (global 
    && global.navigator
    && global.navigator.userAgent.toLowerCase().indexOf('electron') === -1) {
    global.INJECTOR = sshlackInjector;
  } else {
    sshlackInjector();
  }
})(typeof global !== 'undefined' ? global : window);