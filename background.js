if (typeof chrome !== 'undefined') {var browser = chrome;}
let dictionaries = [];

function getItem(key) {
	/*
	const getStorageData = Key =>
	new Promise((resolve, reject) =>
		chrome.storage.sync.get(Key, result =>
		chrome.runtime.lastError
			? reject(Error(chrome.runtime.lastError.message))
			: resolve(result)
		)
	)

	const { data } = await getStorageData(key);
	console.log(data);
*/
	return window.localStorage.getItem(key);
}

function setItem(key, value) {
	window.localStorage.removeItem(key);
	window.localStorage.setItem(key, value);
	/*
	let data = {};
	data[key] = value;
	chrome.storage.sync.set(data);
	*/
}

function loadSettings(prefix, settings, callback) {
	// Load specified settings
	let result = {};
	result.versionNumber = AutocardAnywhereSettings.getVersionNumber();

	/*
	let requestedSettings = [];
	settings.map(function(setting) {
		requestedSettings.push(prefix + setting.name);
	});

	chrome.storage.sync.get(requestedSettings, function(data) {
		console.log(data);
	});
	*/

	settings.map(function(setting) {
		if (setting.resetToDefault) {
			result[setting.name] = setting.default;
			setItem(prefix + setting.name, setting.default);
		}
		else if (setting.type == 'boolean') {
			let value = getItem(prefix + setting.name);
			if (value == 'true') {
				result[setting.name] = true;
			}
			else if (value == 'false') {
				result[setting.name] = false;
			}
			else {
				result[setting.name] = setting.default;
			}
		}
		else if (setting.type == 'integer') {
			let value = getItem(prefix + setting.name);
			if(/^\d+$/.test(value)) {
			   result[setting.name] = parseInt(value);
			}
			else {
				result[setting.name] = setting.default;
			}
		}
		else if (setting.type == 'float') {
			let value = getItem(prefix + setting.name);
			if(/^\d*\.?\d+$/.test(value)) {
				result[setting.name] = parseFloat(value);
			}
			else {
				result[setting.name] = setting.default;
			}
		}
		else {
			let value = getItem(prefix + setting.name) || setting.default;

			// Rewrite defunct link targets
			if (setting.name == 'linkTarget') {
				if (value == 'http://store.tcgplayer.com/magic/product/show?ProductName=<name:simple>') {
					value = 'https://store.tcgplayer.com/magic/product/show?ProductName=<name:simple>';
				}
				else if (value == 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=<id>') {
					value = 'https://gatherer.wizards.com/Pages/Search/Default.aspx?name=+[<name:simple>]';
				}
			}
			result[setting.name] = value;
		}
	});
	callback(result);
}

function saveSettings(prefix, settings, updateLastSaved) {
	for (let key in settings) {
		setItem(prefix + key, settings[key]);
	}
	if (updateLastSaved) {
		setItem(AutocardAnywhereSettings.prefix + 'SettingsLastSaved', new Date());
	}
}

function getURL(filename) {
	if (AutocardAnywhereSettings.isSafari) {
		return safari.extension.baseURI + filename;
	}
	else { // Chrome, Opera, Firefox or Edge
		return browser.runtime.getURL(filename);
	}
}

function openURL(url) {
	// Opens a new tab in the browser at url
	if (AutocardAnywhereSettings.isSafari) {
		window.open(url, '_blank');
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.tabs.create({'url': url});
	}
}

function getExchangeRate(callback) {
	loadSettings(AutocardAnywhereSettings.prefix, [
		{'name': 'currency', 'type': 'string', 'default': 'USD'},
		{'name': 'dollarExchangeRate', 'type': 'float', 'default': 1.0},
		{'name': 'euroExchangeRate', 'type': 'float', 'default': 1.0},
		{'name': 'exchangeRateLastUpdatedv4', 'type': 'string', 'default': ''}
	], function(currencyInfo) {

		let now = new Date();
		let lastUpdate = new Date(currencyInfo.exchangeRateLastUpdatedv4);
		let updateInterval = 86400000; // 1 day = 24 * 60 * 60 * 1000 ms = 86400000
		updateRequired = ((now - lastUpdate) > updateInterval);

		if (currencyInfo.exchangeRateLastUpdatedv4 != '' && !updateRequired) {
			callback(currencyInfo);
		}

		// Update is required
		getFile('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd/' + currencyInfo.currency.toLowerCase() + '.json', function(data) {
			data = JSON.parse(data);
			let dollarExchangeRate = data[currencyInfo.currency.toLowerCase()];
			if (dollarExchangeRate) {

				getFile('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eur/' + currencyInfo.currency.toLowerCase() + '.json', function(data) {
					data = JSON.parse(data);
					let euroExchangeRate = data[currencyInfo.currency.toLowerCase()];
					if (euroExchangeRate) {
						let exchangeRate = {
							dollarExchangeRate: dollarExchangeRate,
							euroExchangeRate: euroExchangeRate,
							exchangeRateLastUpdatedv4: now
						};
						saveSettings(AutocardAnywhereSettings.prefix, exchangeRate, true);
						callback(exchangeRate);
					}
				});
			}
		});
	});
}

function getFile(url, callback) {
	if (url == 'exchangeRate') {
		getExchangeRate(callback);
		return;
	}

	let xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		    callback(xmlhttp.response);
		} 
	} 
	xmlhttp.open("GET", url, true); 
	xmlhttp.send();
}

function headFile(url, callback) {
	let xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		    callback(xmlhttp.getAllResponseHeaders());
		} 
	} 
	xmlhttp.open("HEAD", url, true); 
	xmlhttp.send();
}

function checkForUpdates(requestPrefix, gameName, gameLanguage) {
	// See if it has been more than a day since we last checked for updates.
	loadSettings(requestPrefix + gameName + gameLanguage, [{'name': 'LastDataUpdate'}], function(updateInfo) {
		let lastUpdate = updateInfo.LastDataUpdate ? new Date(updateInfo.LastDataUpdate) : new Date('1970-01-01 00:00');
		let updateRequired = false;
		let updateInterval = 86400000; // 1 day = 24 * 60 * 60 * 1000 ms = 86,400,000
		let now = new Date();
		updateRequired = ((now - lastUpdate) > updateInterval);
		if (!updateRequired) return;
		
		//console.log('Updating data for: ' + gameName + gameLanguage);
		// Check if there are updated files available. If so, download them and store in localstorage.
		let baseUrl = 'https://cdn.jsdelivr.net/gh/Obtuse-Goose/AutocardAnywhere@latest/games/';
		let gameDataUrl = baseUrl + gameName + '/' + gameName + '-data.json';
		let languageDataUrl = baseUrl + gameName + '/' + gameLanguage + '-data.json';
		
		//headFile(gameDataUrl, function(response) {
		//	let lastModified = new Date(response.match(/last\-modified\: (.*)/)[1]);
			//console.log(lastModified);
		//	if (lastModified > lastUpdate) {
				getFile(gameDataUrl, function(response) {
					//setItem(requestPrefix + gameName, response);
					//delete dictionaries[gameName + gameLanguage];
					let item = {};
					item[gameName] = response;
					browser.storage.local.set(item, function() {
						delete dictionaries[gameName + gameLanguage];
					});
				});
		//	}
		//});
		
		//headFile(languageDataUrl, function(response) {
		//	let lastModified = new Date(response.match(/last\-modified\: (.*)/)[1]);
			//console.log(lastModified);
		//	if (lastModified > lastUpdate) {
				getFile(languageDataUrl, function(response) {
					//setItem(requestPrefix + gameName + gameLanguage, response);
					//delete dictionaries[gameName + gameLanguage];
					let item = {};
					item[gameName + gameLanguage] = response;
					browser.storage.local.set(item, function() {
						delete dictionaries[gameName + gameLanguage];
					});
				});
		//	}
		//});
		
		saveSettings(requestPrefix + gameName + gameLanguage, {'LastDataUpdate': now}, false);
		saveSettings(requestPrefix, {'lastDataUpdate': now}, false);
	});
}

function stats(requestPrefix, settings, forceFullUpdate) {
	/*
	let defaultPrefix = AutocardAnywhereSettings.prefix;
	let browser = (AutocardAnywhereSettings.isSafari ? 's' : AutocardAnywhereSettings.isOpera ? 'o' : AutocardAnywhereSettings.isChrome ? 'c' : AutocardAnywhereSettings.isFirefox ? 'f' : AutocardAnywhereSettings.isEdge ? 'e' :'u');
	let dictionary = requestPrefix.substr(defaultPrefix.length);
	if (dictionary == '' || dictionary.substr(0,3) == 'mtg') {
		let info = loadSettings(defaultPrefix, [{'name': 'ID'}, {'name': 'SettingsLastSaved'}]);
		let updateInfo = loadSettings(requestPrefix, [{'name': 'LastUpdate'}]);
		let updateRequired = false;
		let fullUpdateRequired = false;
		let now = new Date();
		if (info.ID && updateInfo.LastUpdate) {
			let lastUpdate = new Date(updateInfo.LastUpdate);
			let updateInterval = 604800000; // 7 days = 7 * 24 * 60 * 60 * 1000 ms = 604800000
			updateRequired = ((now - lastUpdate) > updateInterval);
			if (info.SettingsLastSaved && (new Date(info.SettingsLastSaved) > lastUpdate)) {
				fullUpdateRequired = true;
			}
		}
		else {
			updateRequired = true;
			fullUpdateRequired = true;
		}

		if (updateRequired || forceFullUpdate) {
			let params = '?ID=' + info.ID;
			if (fullUpdateRequired || forceFullUpdate) {
				params += '&browser=' + browser;
				params += '&dictionary=' + dictionary;
				params += '&' + Object.keys(settings).map(function(prop) {return [prop, settings[prop]].map(encodeURIComponent).join("=");}).join("&");
			}
			else {
				params += '&versionNumber=' + settings.versionNumber;
			}

			getFile('http://stats.autocardanywhere.com/' + params, function(response) {
				if (response && response != '') {
					response = JSON.parse(response);
					if (response) {
						if (response.ID) {
							saveSettings(defaultPrefix, {ID: response.ID}, false);
							saveSettings(requestPrefix, {'LastUpdate': now}, false);
						}
						if (response.redirect && dictionary == '') {
							openURL(response.redirect);
						}
						if (response.forceFullUpdate && !forceFullUpdate) {
							stats(requestPrefix, settings, true);
						}
					}
				}
			});
		}
	}
	*/
}

function getDictionary(port, request) {
	let gameName = request.game;
	let gameLanguage = request.language;

	checkForUpdates(AutocardAnywhereSettings.prefix, gameName, gameLanguage);

	browser.storage.local.get([gameName, gameName+gameLanguage], function(storageResponse) {
		if (dictionaries[gameName + gameLanguage]) {
			console.log('found data in memory');
			
			port.postMessage({
				'game': gameName,
				'language': gameLanguage,
				'gameData': dictionaries[gameName + gameLanguage].gameData,
				'languageData': dictionaries[gameName + gameLanguage].languageData
			});
		}
		
		else if (storageResponse[gameName] && storageResponse[gameName + gameLanguage]) {
			console.log('found data in localstorage');
			
			dictionaries[gameName + gameLanguage] = {
				'gameData': storageResponse[gameName],
				'languageData': storageResponse[gameName + gameLanguage]
			};
			port.postMessage({
				'game': gameName,
				'language': gameLanguage,
				'gameData': storageResponse[gameName],
				'languageData': storageResponse[gameName + gameLanguage]
			});
		}
		
		else {
			console.log('found data on disk');
			getFile(getURL("games/" + gameName + "/" + gameName + "-data.json"), function(response) {
				let gameData = response;
				getFile(getURL("games/" + gameName + "/" + gameLanguage + "-data.json"), function(response) {
					let languageData = response;
					dictionaries[gameName + gameLanguage] = {
						'gameData': gameData,
						'languageData': languageData
					};
					port.postMessage({
						'game': request.game,
						'language': request.language,
						'gameData': gameData,
						'languageData': languageData
					});
				});
			});
		}
	});
}

// Handle persistent connections - for getting files on Chrome
function onConnect(port) {
	if (port.name != 'autocardanywhere') return;

	port.onMessage.addListener(function(request) {
		if (request.type == "dictionary") { // Requested a dictionary by name
			getDictionary(port, request);
		}
		else if (request.type == "file") { // Requested a file by url
			getFile(request.url, function(response) {
				port.postMessage({'url': request.url, 'data': response});
			});
		}
	});
}

// Handle simple requests
function onRequest(request, sender, sendResponse) {
	if (request.name == "loadSettings") {
		if (AutocardAnywhereSettings.isSafari) {
			loadSettings(request.message.prefix, request.message.settings, function(settings) {
				request.target.page.dispatchMessage(request.message.id, settings);
				//stats(request.message.prefix, settings);
			});
		}
		else { // Chrome, Opera, Firefox or Edge
			loadSettings(request.prefix, request.settings, function(settings) {
				sendResponse(settings);
				//stats(request.prefix, settings);
			});
		}
	}
	else if (request.name == "saveSettings") {
		if (AutocardAnywhereSettings.isSafari) {
			saveSettings(request.message.prefix, request.message.settings, true);
		}
		else { // Chrome, Opera, Firefox or Edge
			saveSettings(request.prefix, request.settings, true);
		}
	}
	else if (request.name == "getFile") { // Safari only
		getFile(request.message.url, function(response) {
			request.target.page.dispatchMessage('getFileCallback', {'url': request.message.url, 'data': response});
		});
	}
	else if (request.name == "getDictionary") { // Safari only
		let gameName = request.message.game;
		let gameLanguage = request.message.language;
		if (!dictionaries[gameName + gameLanguage]) {
			getFile(getURL("games/" + gameName + "/" + gameName + "-data.json"), function(response) {
				let game = JSON.parse(response);
				getFile(getURL("games/" + gameName + "/" + gameLanguage + "-data.json"), function(response) {
					let language = JSON.parse(response);
					dictionaries[gameName + gameLanguage] = {
						'cardData': game.cardData,
						'test': language.test,
						'cardNames': language.cardNames
					};
					request.target.page.dispatchMessage(request.message.id, dictionaries[gameName + gameLanguage]);
				});
			});
			return true;
		}
		else {
			request.target.page.dispatchMessage(request.message.id, dictionaries[gameName + gameLanguage]);
		}
	}
	else if (request.name == "disableIcon") {
		browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
			browser.browserAction.setIcon({
				'path': 'Icon-24-grey.png',
				'tabId': tabs[0].id
			});
	    });
	}
};

//let settings = loadSettings(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings);

// Listen for the content script to send a message to the background page.
if (AutocardAnywhereSettings.isSafari) {
	safari.application.addEventListener("message", onRequest, false);

	// When the context menu is displayed, add an item to it if there is text selected (stored as boolean in event.userInfo)
	safari.application.addEventListener("contextmenu", function(event) {
		if (event.userInfo) {
			event.contextMenu.appendContextMenuItem("contextmenuitemclick", "AutocardAnywhere Lookup");
		}
	}, false);
	// When the context menu item is clicked, send a message to the injected script.
	safari.application.addEventListener("command", function(event) {
		if (event.command === "contextmenuitemclick") {
			safari.application.activeBrowserWindow.activeTab.page.dispatchMessage("contextmenuitemclick");
		}
	}, false);
	
	loadSettings(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings, function(settings) {
		if (settings.setupShown != 'true') {
			openURL(safari.extension.baseURI + 'options.html');
			setItem(AutocardAnywhereSettings.prefix + 'priceSetupShown', true);
		}
	});
}
else { // Chrome, Opera, Firefox or Edge
	// Simple messages
	browser.runtime.onMessage.addListener(onRequest);
	// Persistent connections
	browser.runtime.onConnect.addListener(onConnect);

	// Add the context menu item
	browser.contextMenus.removeAll(function() {
		browser.contextMenus.create({
			id: 'autocardanywherecontextmenuitem',
			title: 'AutocardAnywhere Lookup',
			contexts: ["selection"],
			onclick: function(info, tab) {
				browser.tabs.sendMessage(tab.id, {'name': 'contextmenuitemclick'});
			}
		});
	});

	// On first install open the options page
	browser.runtime.onInstalled.addListener(function(details) {
		if (details.reason == 'install') {
			openURL(browser.runtime.getURL('options.html'));
			//setItem(AutocardAnywhereSettings.prefix + 'priceSetupShown', true);
		}
	});
}