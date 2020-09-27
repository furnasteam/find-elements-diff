import {CAPTURE_VISIBLE_TAB, EXECUTE_SCRIPT, INITIALIZE_SIDEBAR, SET_FIRST_IMAGE, SET_FIRST_IMAGE_SIDEBAR, SET_SECOND_IMAGE, SET_SECOND_IMAGE_SIDEBAR} from './models/actions';
import {
  callApi,
  callApiWithSelectedElement,
  compareScreenShotsAndDownloadApi,
  compareScreenShotsAndShowApi,
  consoleLogApi,
  cropAndSaveFirstElementScreenShotApi,
  cropAndSaveSecondElementScreenShotApi,
  isElementInViewPortApi,
  makeFixedElementsInvisibleApi,
  makeFixedElementsVisibleApi,
  saveFirstImageFromFileApi,
  saveSecondImageFromFileApi,
  scrollOneScreenDownApi,
  scrollTopApi, SELECTED_ELEMENT_ATTRIBUTE
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


let firstImage, secondImage, firstElementDomain, secondElementDomain;

async function callContentApi(apiName, apiFormatter = callApi, ...params) {
  await browser.devtools.inspectedWindow.eval(`$0.setAttribute('${SELECTED_ELEMENT_ATTRIBUTE}', '${SELECTED_ELEMENT_ATTRIBUTE}')`);
  return browser.runtime.sendMessage({
    chromeAction: EXECUTE_SCRIPT,
    tabId: browser.devtools.inspectedWindow.tabId,
    script: apiFormatter(apiName, ...params)
  });
}

function sleep500() {
  return new Promise(resolve => {
    setTimeout(function () {
      resolve();
    }, 500);
  })
}

function captureVisibleTab() {
  return browser.runtime.sendMessage({
    chromeAction: CAPTURE_VISIBLE_TAB
  });
}

const ContentScript = {
  scrollTop: () => callContentApi(scrollTopApi),
  makeFixedElementsInvisible: () => callContentApi(makeFixedElementsInvisibleApi),
  makeFixedElementsVisible: () => callContentApi(makeFixedElementsVisibleApi),
  scrollOneScreenDown: () => callContentApi(scrollOneScreenDownApi),
  compareScreenShotsAndDownload: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndDownloadApi, callApi, firstElementScreenShot, secondElementScreenShot),
  compareScreenShotsAndShow: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndShowApi, callApi, firstElementScreenShot, secondElementScreenShot),
  isElementInViewPort: () => callContentApi(isElementInViewPortApi, callApiWithSelectedElement),
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
  screenShots.push(await captureVisibleTab());
  await ContentScript.makeFixedElementsInvisible();
  let reachedBottom = false;
  do {
    reachedBottom = await ContentScript.scrollOneScreenDown();
    await sleep500();
    screenShots.push(await captureVisibleTab());
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
    const elementIsInViewPort = await ContentScript.isElementInViewPort();
    const screenShots = elementIsInViewPort ? [await captureVisibleTab()] : await collectFullPageScreenShots();
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
  document.getElementById(RESULT_ID).classList.add('result-text_active');
}

function updateSidebarPage() {
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
  browser.runtime.sendMessage({
    chromeAction: INITIALIZE_SIDEBAR
  });
});

browser.runtime.onMessage.addListener(request => {
  switch (request.chromeAction) {
    case SET_FIRST_IMAGE_SIDEBAR:
      firstImage = request.dataUrl;
      firstElementDomain = request.domain;
      break;
    case SET_SECOND_IMAGE_SIDEBAR:
      secondImage = request.dataUrl;
      secondElementDomain = request.domain;
      break;
  }
  updateSidebarPage();
});