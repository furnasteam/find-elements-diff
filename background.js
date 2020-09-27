import {CAPTURE_VISIBLE_TAB, EXECUTE_SCRIPT, INITIALIZE_SIDEBAR, SET_FIRST_IMAGE, SET_FIRST_IMAGE_SIDEBAR, SET_SECOND_IMAGE, SET_SECOND_IMAGE_SIDEBAR} from './models/actions';

window.firstImage = null;
window.secondImage = null;
window.firstElementDomain = null;
window.secondElementDomain = null;

browser.runtime.onMessage.addListener(async function (request, sender, sendResponse) {

  switch (request.chromeAction) {

    case SET_FIRST_IMAGE:
      window.firstImage = request.dataUrl;
      window.firstElementDomain = request.domain;
      browser.runtime.sendMessage({chromeAction: SET_FIRST_IMAGE_SIDEBAR, dataUrl: request.dataUrl, domain: request.domain});
      break;

    case SET_SECOND_IMAGE:
      window.secondImage = request.dataUrl;
      window.secondElementDomain = request.domain;
      browser.runtime.sendMessage({chromeAction: SET_SECOND_IMAGE_SIDEBAR, dataUrl: request.dataUrl, domain: request.domain});
      break;

    case EXECUTE_SCRIPT:
      const result = await browser.tabs.executeScript(request.tabId, {
        code: request.script
      });
      return result ? result[0] : result;

    case INITIALIZE_SIDEBAR:
      if (window.firstImage) {
        browser.runtime.sendMessage({chromeAction: SET_FIRST_IMAGE_SIDEBAR, dataUrl: window.firstImage, domain: window.firstElementDomain});
      }
      if (window.secondImage) {
        browser.runtime.sendMessage({chromeAction: SET_SECOND_IMAGE_SIDEBAR, dataUrl: window.secondImage, domain: window.secondElementDomain});
      }
      break;

    case CAPTURE_VISIBLE_TAB:
      return browser.tabs.captureVisibleTab(null, {format: "png"});

  }
});


