// added for FF compatibility
const messageListener = chrome.extension.onMessage || chrome.runtime.onMessage;
messageListener.addListener(
    function(msg) {
        switch (msg.action) {
        case 'createmessage':
            let cev = new CustomEvent('SHHLACK:CREATEMSG', {
                bubbles: false,
                cancelable: true,
            });
            window.dispatchEvent(cev);
            break;
        case 'message':
            cev = new CustomEvent('SHHLACK:MSG', {
                detail: JSON.stringify({
                    content: msg.value,
                    title: msg.title,
                }),
                bubbles: false,
                cancelable: true,
            });
            window.dispatchEvent(cev);
            break;
        }
    }
);
function injectScript(scriptString) {
    try {
        const actualCode = '( ' + scriptString + ')();//# sourceURL=<INJECTOR>' + (scriptString.name || Math.random());
        const script = document.createElement('script');
        script.textContent = actualCode;
        (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    } catch (e) {
        console.error(e);
    }
}

injectScript(this.INJECTOR);
