import {REQUEST_DATA, SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';
import {
  callApi,
  callApiWithSelectedElement,
  compareScreenShotsAndDownloadApi,
  compareScreenShotsAndShowApi,
  consoleLogApi,
  cropAndSaveFirstElementScreenShotApi,
  cropAndSaveSecondElementScreenShotApi,
  isElementInViewPortApi, isElementPartiallyInViewPortApi,
  makeFixedElementsInvisibleApi,
  makeFixedElementsVisibleApi, saveFirstImageFromFileApi, saveSecondImageFromFileApi,
  scrollOneScreenDownApi,
  scrollTopApi, tryToScrollToElementApi
} from './models/contentScriptApi';


const FIRST_ELEMENT_CONTAINER_ID = 'first-element-container';
const SECOND_ELEMENT_CONTAINER_ID = 'second-element-container';

const FIRST_ELEMENT_ADDRESS_ID = 'first-element-address';
const SECOND_ELEMENT_ADDRESS_ID = 'second-element-address';

const FIRST_ELEMENT_SELECT_ID = 'first-element';
const SECOND_ELEMENT_SELECT_ID = 'second-element';
const COMPARE_AND_DOWNLOAD_ID = 'compare-and-download';
const COMPARE_AND_SHOW_ID = 'compare-and-show';

const FIRST_IMAGE_FILE_INPUT_ID = 'first-image-file';
const SECOND_IMAGE_FILE_INPUT_ID = 'second-image-file';

const RESULT_ID = 'result';


let {firstImage, secondImage, firstElementDomain, secondElementDomain} = {}

chrome.runtime.sendMessage({chromeAction: REQUEST_DATA});

function callContentApi(apiName, apiFormatter = callApi, ...params) {
  return new Promise(resolve => {
    chrome.devtools.inspectedWindow.eval(apiFormatter(apiName, ...params),
      {useContentScriptContext: true}, function (result) {
        resolve(result);
      });
  })
}

function sleep500() {
  return new Promise(resolve => {
    setTimeout(function () {
      resolve();
    }, 500);
  })
}

function captureVisibleTab() {
  return new Promise(resolve => {
    chrome.tabs.captureVisibleTab(null, {format: "png"}, function (dataUrl) {
      resolve(dataUrl);
    });
  })
}

const ContentScript = {
  scrollTop: () => callContentApi(scrollTopApi),
  makeFixedElementsInvisible: () => callContentApi(makeFixedElementsInvisibleApi),
  makeFixedElementsVisible: () => callContentApi(makeFixedElementsVisibleApi),
  scrollOneScreenDown: () => callContentApi(scrollOneScreenDownApi),
  compareScreenShotsAndDownload: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndDownloadApi, callApi, firstElementScreenShot, secondElementScreenShot),
  compareScreenShotsAndShow: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndShowApi, callApi, firstElementScreenShot, secondElementScreenShot),
  isElementInViewPort: () => callContentApi(isElementInViewPortApi, callApiWithSelectedElement),
  isElementPartiallyInViewPort: () => callContentApi(isElementPartiallyInViewPortApi, callApiWithSelectedElement),
  tryToScrollToElement: () => callContentApi(tryToScrollToElementApi, callApiWithSelectedElement),
  cropAndSaveFirstElementScreenShot: (screenShots) => callContentApi(cropAndSaveFirstElementScreenShotApi, callApiWithSelectedElement, screenShots),
  cropAndSaveSecondElementScreenShot: (screenShots) => callContentApi(cropAndSaveSecondElementScreenShotApi, callApiWithSelectedElement, screenShots),
  saveFirstImageFromFile: (imageFromFile) => callContentApi(saveFirstImageFromFileApi, callApi, imageFromFile),
  saveSecondImageFromFile: (imageFromFile) => callContentApi(saveSecondImageFromFileApi, callApi, imageFromFile),
  consoleLog: (...params) => callContentApi(consoleLogApi, callApi, ...params)
}

async function collectFullPageScreenShots() {
  const screenShots = [];
  await ContentScript.scrollTop();
  await sleep500();
  let capturingStarted = await ContentScript.isElementPartiallyInViewPort();
  ContentScript.consoleLog('capturingStarted', capturingStarted);
  if (capturingStarted) {
    screenShots.push(await captureVisibleTab());
  }
  await ContentScript.makeFixedElementsInvisible();
  let reachedBottom = false;
  do {
    reachedBottom = await ContentScript.scrollOneScreenDown();
    await sleep500();
    const isElementPartiallyInViewPort = await ContentScript.isElementPartiallyInViewPort();
    ContentScript.consoleLog('isElementPartiallyInViewPort', isElementPartiallyInViewPort);
    if (isElementPartiallyInViewPort) {
      screenShots.push(await captureVisibleTab());
      capturingStarted = true;
    } else if (capturingStarted) {
      break;
    }
  } while (!reachedBottom);
  await ContentScript.makeFixedElementsVisible();
  return screenShots;
}

function addListenerOnClick(elementId, callback) {
  document.getElementById(elementId).addEventListener('click', callback);
}

function addListenerOnChange(elementId, callback) {
  document.getElementById(elementId).addEventListener('change', callback);
}

function handleSelectElementClick(cropAndSaveFunction) {
  return async function () {
    let elementIsInViewPort = await ContentScript.isElementInViewPort();
    let screenShots = [];
    if (elementIsInViewPort) {
      screenShots.push(await captureVisibleTab())
    } else if (await ContentScript.tryToScrollToElement()) {
      await sleep500();
      elementIsInViewPort = await ContentScript.isElementInViewPort();
      if (elementIsInViewPort) {
        screenShots.push(await captureVisibleTab())
      } else {
        screenShots = await collectFullPageScreenShots();
      }
    } else {
      screenShots = await collectFullPageScreenShots();
    }
    cropAndSaveFunction(screenShots);
  }
}

function handleCompareElementsAndDownloadClick() {
  ContentScript.compareScreenShotsAndDownload(firstImage, secondImage)
}

function handleCompareElementsAndShowClick() {
  ContentScript.compareScreenShotsAndShow(firstImage, secondImage)
}

function readFileFromFileInput(fileInput) {
  return new Promise(resolve => {
    var file = fileInput.files[0];
    var reader = new FileReader();

    reader.onloadend = function () {
      resolve(reader.result);
    }
    reader.readAsDataURL(file);
  });
}

async function handleFirstImageUpload(event) {
  const dataUrl = await readFileFromFileInput(event.target);
  ContentScript.saveFirstImageFromFile(dataUrl);
}

async function handleSecondImageUpload(event) {
  const dataUrl = await readFileFromFileInput(event.target);
  ContentScript.saveSecondImageFromFile(dataUrl);
}

function addListeners() {
  addListenerOnClick(FIRST_ELEMENT_SELECT_ID, handleSelectElementClick(ContentScript.cropAndSaveFirstElementScreenShot));
  addListenerOnClick(SECOND_ELEMENT_SELECT_ID, handleSelectElementClick(ContentScript.cropAndSaveSecondElementScreenShot));
  addListenerOnClick(COMPARE_AND_DOWNLOAD_ID, handleCompareElementsAndDownloadClick);
  addListenerOnClick(COMPARE_AND_SHOW_ID, handleCompareElementsAndShowClick);
  addListenerOnChange(FIRST_IMAGE_FILE_INPUT_ID, handleFirstImageUpload);
  addListenerOnChange(SECOND_IMAGE_FILE_INPUT_ID, handleSecondImageUpload);
}

function activateResult() {
  ContentScript.consoleLog('document.getElementById(RESULT_ID)', document.getElementById(RESULT_ID))
  document.getElementById(RESULT_ID).classList.add('result-text_active');
}

function updateSidebarPage() {
  ContentScript.consoleLog('firstImage', firstImage)
  ContentScript.consoleLog('secondImage', secondImage)
  if (firstImage) {
    renderElementPreview(FIRST_ELEMENT_CONTAINER_ID, firstImage, firstElementDomain);
  }
  if (secondImage) {
    renderElementPreview(SECOND_ELEMENT_CONTAINER_ID, secondImage, secondElementDomain);
  }
  if (firstImage && secondImage) {
    activateResult();
  }
}

function renderElementPreview(containerId, imageDataUrl, domain) {
  document.getElementById(containerId).innerHTML = `
      <img src="${imageDataUrl}" class="element-img">`;
  document.getElementById(containerId).classList.add('card-preview-box_active');
  let pageAddressElement = null;
  switch (containerId) {
    case FIRST_ELEMENT_CONTAINER_ID:
      pageAddressElement = document.getElementById(FIRST_ELEMENT_ADDRESS_ID);
      break;
    case SECOND_ELEMENT_CONTAINER_ID:
      pageAddressElement = document.getElementById(SECOND_ELEMENT_ADDRESS_ID);
      break;
  }
  pageAddressElement.innerHTML = domain;
  pageAddressElement.classList.add('card-address_active');
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', () => {
  addListeners();
  updateSidebarPage();
});

chrome.runtime.onMessage.addListener(request => {
  switch (request.chromeAction) {
    case SET_FIRST_IMAGE:
      firstImage = request.dataUrl;
      firstElementDomain = request.domain;
      break;
    case SET_SECOND_IMAGE:
      secondImage = request.dataUrl;
      secondElementDomain = request.domain;
      break;
  }
  updateSidebarPage();
});
