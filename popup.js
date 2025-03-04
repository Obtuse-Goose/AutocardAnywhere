if (typeof chrome !== 'undefined') {var browser = chrome;}
let prefix = 'autocardAnywhere';
let isSafari = (navigator.userAgent.toLowerCase().indexOf('safari') > -1 && navigator.userAgent.toLowerCase().indexOf('chrome') == -1);
let listedSites = '';
let isWhiteList = false;

function setListedSites(siteList) {
	// Save setting
	browser.runtime.sendMessage({'name': 'saveSettings', 'prefix': prefix, 'settings': {'listedSites': siteList}});
}

function getSettingsURL() {
	if (isSafari) {
		return safari.extension.baseURI + 'options.html';
	}
	else { // Chrome, Opera, Firefox or Edge
		return browser.runtime.getURL('options.html');
	}
}

function isListed(host) {
	let listed = false;
	let listedSitesList = listedSites.split(";");
	listedSitesList.map(function(item) {
		if (item == host) {
			listed = true;
		}
	});
	return listed;
}

function getCurrentHost(callback) {
	if (isSafari) {
		callback(parseUri(safari.application.activeBrowserWindow.activeTab.url).host.toLowerCase());
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
			let tab = tabs[0];
			chrome.tabs.sendMessage(tab.id, {name: 'checkifrunningembedded'}).then(() => {
				// If no an embedded version is installed on the website, 
				// then enable the checkbox and hide the note to the user explaining that the extension is disabled.
				// The default state of these is for when an embedded version is detected.
				let label = document.getElementById('embedded-detected-label');
				let checkbox = document.getElementById('site-enabled-checkbox');
				label.style.display = 'none';
				checkbox.disabled = false;
			});
			// Check the current site isn't already on the list
			callback(parseUri(tab.url).host.toLowerCase());
	    });
	}
}

function addHostToList() {
	getCurrentHost(function(host) {
		let listedSitesList = listedSites.split(";");
		listedSitesList.push(host);
		listedSitesList = listedSitesList.join(";");
		// Remove any blank entries and save
		setListedSites(listedSitesList.replace(/;+/g, ';').replace(/^;/, '').replace(/;$/, ''));
	});
}

function removeHostFromList() {
	getCurrentHost(function(host) {
		let listedSitesList = listedSites.split(";");
		listedSitesList = listedSitesList.filter(function(item) {
			return (item != host);
		}).join(";");
		// Remove any blank entries and save
		setListedSites(listedSitesList.replace(/;+/g, ';').replace(/^;/, '').replace(/;$/, ''));
	});
}

function setIcon(enabled) {
	if (enabled) {
		document.getElementById('logo').src="Icon-48.png";
	}
	else {
		document.getElementById('logo').src="Icon-48-grey.png";
	}
}

function sendMessage(message) {
	browser.tabs.query({currentWindow: true, active: true}, function (tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, {name: message});
	});
}

function enableChange() {
	if (document.getElementById('site-enabled-checkbox').checked) {
		setIcon(true);
		if (isWhiteList) {
			addHostToList();
		}
		else {
			removeHostFromList();
		}
		sendMessage('enableSite');
	}
	else {
		setIcon(false);
		if (isWhiteList) {
			removeHostFromList();
		}
		else {
			addHostToList();
		}
		sendMessage('disableSite');
	}
}

function settingsClick() {
	if (isSafari) {
		safari.application.activeBrowserWindow.openTab().url = getSettingsURL();
		// Close the popup
    	safari.extension.popovers[0].hide();
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.tabs.create({
			url: getSettingsURL()
		});
		// Close the popup
    	//self.destroy();
	}
}

//==============================================================================
// Event listeners
function onShow() {
	// Setup event handlers
	document.getElementById('site-enabled-checkbox').addEventListener('change', enableChange);
	document.getElementById('options-btn').addEventListener('click', settingsClick);
	
	// Load settings
	browser.runtime.sendMessage({'name': 'loadSettings', 'prefix': prefix, 'settings': [
		{'name': 'listType', 'type': 'string', 'default': 'blacklist'},
		{'name': 'listedSites', 'type': 'string', 'default': 'deckbox.org'},
		{'name': 'theme', 'type': 'string', 'default': 'light'}
	]}, loadSettings);
}

function loadSettings(settings) {
	let checkbox = document.getElementById('site-enabled-checkbox');

	if (settings.theme == 'dark') {
		let body = document.body;
		body.setAttribute('style','background-color:#505355; color:white;');
	}
	listedSites = settings.listedSites || '';
	isWhiteList = (settings.listType == 'whitelist');

	getCurrentHost(function(host) {
		let listed = isListed(host);
		let isEnabled = ((!isWhiteList && !listed) || (isWhiteList && listed))
		checkbox.checked = isEnabled;
		setIcon(isEnabled);
	});
}

// Load blacklist/whitelist
if (isSafari) {
	// Setup on show event handler
	safari.application.addEventListener("popover", onShow, true);
}
else { // Chrome, Opera, Firefox or Edge
	onShow();
}