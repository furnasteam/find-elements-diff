import {SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';

window.firstImage = null;
window.secondImage = null;
window.firstElementDomain = null;
window.secondElementDomain = null;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.chromeAction === SET_FIRST_IMAGE) {
    window.firstImage = request.dataUrl;
    window.firstElementDomain = request.domain;
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.chromeAction === SET_SECOND_IMAGE) {
    window.secondImage = request.dataUrl;
    window.secondElementDomain = request.domain;
  }
});
