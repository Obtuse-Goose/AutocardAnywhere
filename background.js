if (typeof chrome !== 'undefined') {var browser = chrome;}
//let dictionaries = [];
//let enabledDictionaries = [];

try {
	if (typeof importScripts != 'undefined') importScripts(
		'settings.js', 
		"games/dictionary.js", 
		"games/games.js"
	);
}
catch (e) {
	console.error(e);
}


function getItem(key) {
	//return window.localStorage.getItem(key);
	return;
}

function setItem(key, value) {
	//window.localStorage.removeItem(key);
	//window.localStorage.setItem(key, value);
	let data = {};
	data[key] = value;
	browser.storage.sync.set(data);
}

function isDefined(value) {
	if (typeof value === 'undefined') return false;
	if (value === null) return false;
	return true;
}

function loadSettings(prefix, settings) {
	return new Promise((resolve, reject) => {
		// Load specified settings
		let result = {};
		result.versionNumber = AutocardAnywhereSettings.getVersionNumber();

		let requestedSettings = [];
		settings.map(function(setting) {
			requestedSettings.push(prefix + setting.name);
		});

		browser.storage.sync.get(requestedSettings, function(data) {
			settings.map(function(setting) {
				let value = isDefined(data[prefix + setting.name]) ? data[prefix + setting.name] : getItem(prefix + setting.name);
				if (setting.resetToDefault) {
					result[setting.name] = setting.default;
					setItem(prefix + setting.name, setting.default);
				}
				else if (setting.type == 'boolean') {
					if (value == true) {
						result[setting.name] = true;
					}
					else if (value == false) {
						result[setting.name] = false;
					}
					else {
						result[setting.name] = setting.default;
					}
				}
				else if (setting.type == 'integer') {
					if(/^\d+$/.test(value)) {
					result[setting.name] = parseInt(value);
					}
					else {
						result[setting.name] = setting.default;
					}
				}
				else if (setting.type == 'float') {
					if(/^\d*\.?\d+$/.test(value)) {
						result[setting.name] = parseFloat(value);
					}
					else {
						result[setting.name] = setting.default;
					}
				}
				else {
					//let value = data[prefix + setting.name] || getItem(prefix + setting.name) || setting.default;
					value = isDefined(value) ? value : setting.default;
		
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

			// This next line is a temporary addition to allow a transition to using the storage API without losing user settings.
			// To be removed once there's been enough time for everyone to upgrade.
			//saveSettings(prefix, result, false);

			resolve(result);
		});
	});
}

function saveSettings(prefix, settings, updateLastSaved) {
	let data = {};
	for (let key in settings) {
		//setItem(prefix + key, settings[key]);
		data[prefix + key] = settings[key];
	}
	if (updateLastSaved) {
		//setItem(AutocardAnywhereSettings.prefix + 'SettingsLastSaved', new Date());
		data[AutocardAnywhereSettings.prefix + 'SettingsLastSaved'] = new Date();
	}
	browser.storage.sync.set(data);
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

function getExchangeRate() {
	return new Promise((resolve, reject) => {
		loadSettings(AutocardAnywhereSettings.prefix, [
			{'name': 'currency', 'type': 'string', 'default': 'USD'},
			{'name': 'dollarExchangeRate', 'type': 'float', 'default': 1.0},
			{'name': 'euroExchangeRate', 'type': 'float', 'default': 1.0},
			{'name': 'exchangeRateLastUpdatedv4', 'type': 'string', 'default': ''}
		]).then(function(currencyInfo) {

			let now = new Date();
			let lastUpdate = new Date(currencyInfo.exchangeRateLastUpdatedv4);
			let updateInterval = 86400000; // 1 day = 24 * 60 * 60 * 1000 ms = 86400000
			updateRequired = ((now - lastUpdate) > updateInterval);

			if (currencyInfo.exchangeRateLastUpdatedv4 != '' && !updateRequired) {
				resolve(currencyInfo);
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
							resolve(exchangeRate);
						}
					});
				}
			});
		});
	});
}

function getFile(url, callback) {
	if (url == 'exchangeRate') {
		getExchangeRate().then(callback);
	}
	else {
		fetch(url)
			.then(response => response.text())
			.then(callback);
	}
}

/*
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
*/

function checkForUpdates(requestPrefix, gameName, gameLanguage) {
	// See if it has been more than a day since we last checked for updates.
	loadSettings(requestPrefix + gameName + gameLanguage, [{'name': 'LastDataUpdate'}], function(updateInfo) {
		let lastUpdate = new Date('1970-01-01 00:00');
		let timestamp = Date.parse(updateInfo.LastDataUpdate);
		if (isNaN(timestamp) == false) {
			lastUpdate = new Date(timestamp);
		}

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
					let decoded = JSON.parse(response);
					if (decoded.version) {
						saveSettings(requestPrefix, {'dataVersion': decoded.version}, false);
					}
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
		
		saveSettings(requestPrefix + gameName + gameLanguage, {'LastDataUpdate': now.toString()}, false);
		saveSettings(requestPrefix, {'lastDataUpdate': now.toString()}, false);
	});
}

/*
function stats(requestPrefix, settings, forceFullUpdate) {
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
}
*/

/*
function getDictionaryFromDisk(dictionary) {
	//console.log(request);
	return new Promise((resolve, reject) => {
		//let dictionary = AutocardAnywhere.games[request.game][request.language];
		//console.log(dictionary);

		getFile(getURL("games/" + dictionary.game + "/" + dictionary.game + "-data.json"), function(response) {
			let gameData = JSON.parse(response);
			getFile(getURL("games/" + dictionary.game + "/" + dictionary.language + "-data.json"), function(response) {
				let languageData = JSON.parse(response);
				//let decoded = JSON.parse(languageData);
				//console.log(dictionary.game + dictionary.language + ' - found data on disk, version ' + decoded.version);
				console.log(dictionary.game + dictionary.language + ' - found data on disk');

				dictionary.test = languageData.test;
				dictionary.cardNames = languageData.cardNames;
				dictionary.cardData = gameData.cardData;

				resolve(dictionary);
			});
		});
	});
}
*/

function getDictionary(dictionary) {
	return new Promise((resolve, reject) => {
		let gameName = dictionary.game;
		let gameLanguage = dictionary.language;

		//let dictionaries = [];

		checkForUpdates(AutocardAnywhereSettings.prefix, gameName, gameLanguage);

		browser.storage.local.get([gameName, gameName+gameLanguage], function(storageResponse) {
			/*
			if (dictionaries[gameName + gameLanguage]) {
				console.log(gameName + gameLanguage + ' - found data in memory');
				
				resolve(dictionaries[gameName + gameLanguage]);
			}
			else 
			*/
			if (storageResponse[gameName] && storageResponse[gameName + gameLanguage]) {
				console.log(gameName + gameLanguage + ' - found data in storage.local');
				//let decoded = JSON.parse(storageResponse[gameName + gameLanguage]);
				//console.log(gameName + gameLanguage + ' - found data in storage.local, version ' + decoded.version);
				/*
				dictionaries[gameName + gameLanguage] = {
					'game': gameName,
					'language': gameLanguage,
					'gameData': storageResponse[gameName],
					'languageData': storageResponse[gameName + gameLanguage]
				};
				*/
				resolve({
					'game': gameName,
					'language': gameLanguage,
					'gameData': storageResponse[gameName],
					'languageData': storageResponse[gameName + gameLanguage]
				});
			}
			else {
				getFile(getURL("games/" + gameName + "/" + gameName + "-data.json"), function(response) {
					let gameData = response;
					getFile(getURL("games/" + gameName + "/" + gameLanguage + "-data.json"), function(response) {
						let languageData = response;
						//let decoded = JSON.parse(languageData);
						//console.log(gameName + gameLanguage + ' - found data on disk, version ' + decoded.version);
						console.log(gameName + gameLanguage + ' - found data on disk');
				
						/*
						dictionaries[gameName + gameLanguage] = {
							'game': gameName,
							'language': gameLanguage,
							'gameData': gameData,
							'languageData': languageData
						};
						*/
						resolve({
							'game': gameName,
							'language': gameLanguage,
							'gameData': gameData,
							'languageData': languageData
						});
					});
				});
			}
		});
	});
}


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function load() {
	return new Promise(async (resolve, reject) => {
		while (AutocardAnywhere.loading) {
			await sleep(100);
		}
		if (AutocardAnywhere.loaded) {
			//console.log('already loaded');
			resolve(AutocardAnywhere.dictionaries);
			return;
		}
		AutocardAnywhere.loaded = 0;
		AutocardAnywhere.loading = 1;
		console.log('AutocardAnywhere loading');

		AutocardAnywhere.dictionaries = {};
		let dictionaries = [];

		loadSettings(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings).then(async function(settings) {
			AutocardAnywhere.openInNewTab = settings.newTab;
			AutocardAnywhere.fuzzyLookup = settings.fuzzyLookup;
			// Ignore and unignore lists
			AutocardAnywhere.ignoredCards = settings.ignoredCards;
			AutocardAnywhere.ignoreList = {};
			if (settings.ignoredCards !== undefined) {
				settings.ignoredCards.split('|').map(function(ignoredCard) {
					AutocardAnywhere.ignoreList[ignoredCard.toLowerCase()] = 1;
				});
			}
			AutocardAnywhere.unignoreList = {};
			if (settings.unignoredCards !== undefined) {
				settings.unignoredCards.split('|').map(function(unignoredCard) {
					AutocardAnywhere.unignoreList[unignoredCard.toLowerCase()] = 1;
				});
			}
			// Always ignore the card "Ow"
			AutocardAnywhere.ignoreList['ow'] = 1;
			
			// Enabled card sets
			let dictionariesHash = {};
			AutocardAnywhereSettings.dictionaries.map(function(dictionary) {
				dictionariesHash[dictionary.game + dictionary.language] = dictionary;
			});

			// First load all the dictionaries specified in the user's settings
			settings.linkLanguages.split(';').map(function(x) {
				let linkLanguage = x.split(':');
				if (linkLanguage.length == 3) {
					let game = linkLanguage[0];
					let language = linkLanguage[1];
					if (linkLanguage[2] == '1') {
						dictionaries.push({game: game, language: language});
					}
					delete dictionariesHash[game + language];
				}
			});

			// Then check that we don't have any extra dictionaries specified in settings.js that don't appear in the user's settings.
			// This would happen if the dictionary in question has been added to the extension since the last time the user saved settings.
			for (dictionaryName in dictionariesHash) {
				let dictionary = dictionariesHash[dictionaryName];
				if (dictionary.default == 1) {
					dictionaries.push({game: dictionary.game, language: dictionary.language});
				}
			}

			for (let i=0; i<dictionaries.length; i++) {
				//let data = await getDictionaryFromDisk(dictionaries[i]).then( (data) => data);
				let data = await getDictionary(dictionaries[i]).then( (data) => data);
				//data.gameData = JSON.parse(data.gameData);
				data.languageData = JSON.parse(data.languageData);
				let dictionary = AutocardAnywhere.games[dictionaries[i].game][dictionaries[i].language];
				
				dictionary.test = new RegExp(data.languageData.test, "gi");
				dictionary.cardNames = data.languageData.cardNames;
				dictionary.cardData = JSON.parse(data.gameData).cardData;
				dictionary.settings = await loadSettings(AutocardAnywhereSettings.prefix + dictionary.game + dictionary.language, AutocardAnywhere.games[dictionary.game][dictionary.language].options).then( (settings) => settings);

				//console.log(dictionary);

				// Run it to force compilation
				/*
				console.log('compiling regex');
				let text = "Pyromancer Ascension";
				text = dictionary.run(text);
				console.log(text);
				*/
				

				//AutocardAnywhere.dictionaries.push(dictionary);
				AutocardAnywhere.dictionaries[dictionary.game + dictionary.language] = dictionary;
			}
			
			// Nicknames
			if (settings.customNicknames && (settings.customNicknames != '')) {
				if (settings.customNicknames.indexOf(';') > -1) {
					settings.customNicknames = settings.customNicknames.replace(/;/g, '||').replace(/:/g, '|');
				}
				AutocardAnywhere.customNicknames = {};
				AutocardAnywhere.customNicknameRE = '(';
				settings.customNicknames.split('||').map(function(x) {
					let nickname = x.split('|');
					if (nickname.length == 3) {
						AutocardAnywhere.customNicknames[nickname[1].toLowerCase()] = {
							dictionary: nickname[0],
							nickname: nickname[1],
							fullname: nickname[2]
						};
						AutocardAnywhere.customNicknameRE += nickname[1] + '|';
					}
				});

				if (AutocardAnywhere.customNicknameRE.length > 1) {
					AutocardAnywhere.customNicknameRE = AutocardAnywhere.customNicknameRE.slice(0,-1);
				}
				AutocardAnywhere.customNicknameRE += ')';
			}

			AutocardAnywhere.loaded = 1;
			AutocardAnywhere.loading = 0;
			resolve(AutocardAnywhere.dictionaries);
		});
	});
}

function parse(text, sendResponse) {
	//console.log(text);
	load().then( (dictionaries => {
		// Run all enabled dictionaries
		Object.keys(dictionaries).map( (key) => {
			// Run the current dictionary.
			let dictionary = dictionaries[key];
			text = dictionary.run(text);

			// Card names enclosed in [[]]
			if (AutocardAnywhere.fuzzyLookup) {
				text = text.replace(new RegExp(/\[\[(.*?)\]\]/, "gi"), function(match, name) {
					// Do a fuzzy lookup by name
					let cards = dictionary.fuzzyLookup(name);
					if (cards.length > 0) {
						return dictionary.createLink(dictionary, cards[0], name, null, null, true);
					}
					return match;
				});
			}
		});

		// Nicknames
		if (AutocardAnywhere.customNicknameRE != '()') {
			text = text.replace(new RegExp("([^a-zA-Z_0-9-'])" + AutocardAnywhere.customNicknameRE + "(?=[^a-zA-Z_0-9-'])", "gi"), function(match, f, s) {
				let nickname = AutocardAnywhere.customNicknames[s.toLowerCase()];
				if (!nickname) return match;
				if (!AutocardAnywhere.dictionaries[nickname.dictionary]) return match;
				let dictionary = AutocardAnywhere.dictionaries[nickname.dictionary];
				let card = dictionary.findCard(nickname.fullname);
				if ((!card) || (AutocardAnywhere.ignoreList[nickname.nickname.toLowerCase()]) || (AutocardAnywhere.ignoreList[nickname.fullname.toLowerCase()])) {return match}
				if (AutocardAnywhereSettings.settings.expandNicknames) {
					return f + dictionary.createLink(dictionary, card, nickname.fullname);
				}
				else {
					return f + dictionary.createLink(dictionary, card, nickname.nickname);
				}
			});
		}

		// Sometimes a dictionary might link text within an earlier link...
		// Run until there are no double AA links found.
		let replacementMade = true;
		while (replacementMade) {
			replacementMade = false;
			text = text.replace(/(<span class="autocardanywhere"><a[^<]*)<span class="autocardanywhere"><a[^>]*>([^<]*)<\/a><\/span>(.*<\/a><\/span>)/, function(match, f, s, t) {
				replacementMade = true;
				return f+s+t;
			});
		}
		//console.log(text);
		
		//console.log(text);
		sendResponse({data: text});
	}));
}



// Handle persistent connections - keep background alive so that we don't need to reload the regexps on every page.
function onMessage(msg, port) {
	//console.log('received', msg, 'from', port.sender);
	port.postMessage({'data': 'pong'});
}
function forceReconnect(port) {
	deleteTimer(port);
	port.disconnect();
}
function deleteTimer(port) {
	if (port._timer) {
		clearTimeout(port._timer);
		delete port._timer;
	}
}

function onConnect(port) {
	if (port.name != 'autocardanywhere') return;

	port.onMessage.addListener(onMessage);
	port.onDisconnect.addListener(deleteTimer);
	port._timer = setTimeout(forceReconnect, 250e3, port);
	/*
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
	*/

	return true;
}


// Handle simple requests
function onRequest(request, sender, sendResponse) {
	if (request.name == "loadSettings") {
		if (AutocardAnywhereSettings.isSafari) {
			loadSettings(request.message.prefix, request.message.settings).then(function(settings) {
				request.target.page.dispatchMessage(request.message.id, settings);
			});
		}
		else { // Chrome, Opera, Firefox or Edge
			loadSettings(request.prefix, request.settings).then(sendResponse);
		}
	}
	else if (request.name == "saveSettings") {
		if (AutocardAnywhereSettings.isSafari) {
			saveSettings(request.message.prefix, request.message.settings, true);
			console.log('unloading');
			AutocardAnywhere.loaded = false;
		}
		else { // Chrome, Opera, Firefox or Edge
			saveSettings(request.prefix, request.settings, true);
			console.log('unloading');
			AutocardAnywhere.loaded = false;
		}
	}
	else if (request.name == "getFile") {
		if (AutocardAnywhereSettings.isSafari) {
			getFile(request.message.url, function(response) {
				request.target.page.dispatchMessage('getFileCallback', {'url': request.message.url, 'data': response});
			});
		}
		else { // Chrome, Opera, Firefox or Edge
			getFile(request.url, (response) => {
				sendResponse({'url': request.url, 'data': response});
			});
		}
	}
	else if (request.name == "getDictionary") {
		//console.log(AutocardAnywhere.dictionaries);
		if (AutocardAnywhereSettings.isSafari) {
			let gameName = request.message.game;
			let gameLanguage = request.message.language;
			if (!dictionaries[gameName + gameLanguage]) {
				getFile(getURL("games/" + gameName + "/" + gameName + "-data.json"), function(response) {
					let game = JSON.parse(response);
					getFile(getURL("games/" + gameName + "/" + gameLanguage + "-data.json"), function(response) {
						let language = JSON.parse(response);
						dictionaries[gameName + gameLanguage] = {
							'cardData': game.cardData,
							'test': '',//language.test,
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
		else { // Chrome, Opera, Firefox or Edge
			getDictionary(request).then(sendResponse);
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
	else if (request.name == "parse") {
		parse(request.data, sendResponse);
	}

	return true;
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
	
	loadSettings(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings).then(function(settings) {
		if (!settings.setupShown) {
			openURL(safari.extension.baseURI + 'options.html');
			//setItem(AutocardAnywhereSettings.prefix + 'priceSetupShown', true);
		}
	});
}
else { // Chrome, Opera, Firefox or Edge
	// Simple messages
	browser.runtime.onMessage.addListener(onRequest);
	// Persistent connections
	browser.runtime.onConnect.addListener(onConnect);

	// Add the context menu item
	browser.contextMenus.removeAll(() => {
		let id = 'autocardanywherecontextmenuitem'
		let menuItem = browser.contextMenus.create({
			id: id,
			title: 'AutocardAnywhere Lookup',
			contexts: ["selection"]
		});
		browser.contextMenus.onClicked.addListener(function(info, tab) {
			if (info.menuItemId != id) return;
			browser.tabs.sendMessage(tab.id, {'name': 'contextmenuitemclick'});
		});
	});

	// On first install open the options page
	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason == 'install') {
			openURL(browser.runtime.getURL('options.html'));
			//setItem(AutocardAnywhereSettings.prefix + 'priceSetupShown', true);
		}
	});

	load().then(() => {
		//console.log('loaded');
	});
}