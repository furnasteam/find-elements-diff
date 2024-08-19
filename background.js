import {REQUEST_DATA, SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';

let firstImage = null;
let secondImage = null;
let firstElementDomain = null;
let secondElementDomain = null;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.chromeAction){
    case SET_FIRST_IMAGE:
      firstImage = request.dataUrl;
      firstElementDomain = request.domain;
      break;
    case SET_SECOND_IMAGE:
      secondImage = request.dataUrl;
      secondElementDomain = request.domain;
      break;
    case REQUEST_DATA:
      chrome.runtime.sendMessage({chromeAction: SET_FIRST_IMAGE, dataUrl: firstImage, domain: firstElementDomain});
      chrome.runtime.sendMessage({chromeAction: SET_SECOND_IMAGE, dataUrl: secondImage, domain: secondElementDomain});
      break;
  }
});

