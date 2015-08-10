// https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DetectRTC
var DetectRTC = {};

var screenCallback;

DetectRTC.screen = {
    chromeMediaSource: 'screen',
    getSourceId: function (callback) {
        screenCallback = callback;
        window.postMessage('get-sourceId', '*');
    },
    onMessageCallback: function (data) {
        // "cancel" button is clicked
        if (data == 'PermissionDeniedError') {
            DetectRTC.screen.chromeMediaSource = 'PermissionDeniedError';
            if (screenCallback) return screenCallback('PermissionDeniedError');
            else throw new Error('PermissionDeniedError');
        }

        // extension notified his presence
        if (data == 'rtcmulticonnection-extension-loaded') {
            DetectRTC.screen.chromeMediaSource = 'desktop';
        }

        // extension shared temp sourceId
        if (data.sourceId) {
            DetectRTC.screen.sourceId = data.sourceId;
            if (screenCallback) screenCallback(DetectRTC.screen.sourceId);
        }
    },
    getChromeExtensionStatus: function (callback) {
        // https://chrome.google.com/webstore/detail/screen-capturing-test/efgmfmhdfdjomdeogeoedbblfjanfdjj
        var extensionid = 'efgmfmhdfdjomdeogeoedbblfjanfdjj';

        var image = document.createElement('img');
        image.src = 'chrome-extension://' + extensionid + '/icon.png';
        image.onload = function () {
            DetectRTC.screen.chromeMediaSource = 'screen';
            window.postMessage('are-you-there', '*');
            setTimeout(function () {
                if (DetectRTC.screen.chromeMediaSource == 'screen') {
                    callback('installed-disabled');
                } else callback('installed-enabled');
            }, 2000);
        };
        image.onerror = function () {
            alert('Need "screen-capturing extension"')
            callback('not-installed');
        };
    }
};

window.addEventListener('message', function (event) {
    if (!event.data || !(typeof event.data == 'string' || event.data.sourceId || event.data.captureSourceId)) return;
    if (event.data.captureSourceId) captureSourceId();

    DetectRTC.screen.onMessageCallback(event.data);
});

function captureSourceId() {
    // check if desktop-capture extension installed.
    DetectRTC.screen.getChromeExtensionStatus(function (status) {
        if (status != 'installed-enabled') {
            window.parent.postMessage({
                chromeExtensionStatus: status
            }, '*');
            return;
        }

        DetectRTC.screen.getSourceId(function (sourceId) {
            window.parent.postMessage({
                chromeMediaSourceId: sourceId
            }, '*');
        });
    });
}
