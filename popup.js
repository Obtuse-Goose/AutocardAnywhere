if (typeof chrome !== 'undefined') {var browser = chrome;}
let prefix = 'autocardAnywhere';
let isSafari = (navigator.userAgent.toLowerCase().indexOf('safari') > -1 && navigator.userAgent.toLowerCase().indexOf('chrome') == -1);
let listedSites = '';
let isWhiteList = false;

function setListedSites(s) {
	if (isSafari) {
		safari.extension.globalPage.contentWindow.localStorage.autocardAnywherelistedSites = s;
	}
	else {  // Chrome, Opera, Firefox or Edge
		window.localStorage.autocardAnywherelistedSites = s;
	}
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
			// Check the current site isn't already on the list
			callback(parseUri(tabs[0].url).host.toLowerCase());
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

function enableChange() {
	if (document.getElementById('site-enabled-checkbox').checked) {
		setIcon(true);
		if (isWhiteList) {
			addHostToList();
		}
		else {
			removeHostFromList();
		}
	}
	else {
		setIcon(false);
		if (isWhiteList) {
			removeHostFromList();
		}
		else {
			addHostToList();
		}
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

/*
function showGoogleDialog() {
	window.open(
		"https://plus.google.com/share?url=https://browser.google.com/webstore/detail/eobkhgkgoejnjaiofdmphhkemmomfabg", 
		'', 
		'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=550,width=400'
	);
	return false;
}
*/

//==============================================================================
// Event listeners
function onShow() {
	document.getElementById('site-enabled-checkbox').addEventListener('change', enableChange);
	document.getElementById('options-btn').addEventListener('click', settingsClick);
	//document.getElementById('google-share-button').addEventListener('click', showGoogleDialog);
	getCurrentHost(function(host) {
		// Load settings
		if (isSafari) { // Chrome
			listedSites = safari.extension.globalPage.contentWindow.localStorage.autocardAnywherelistedSites || '';
			isWhiteList = (safari.extension.globalPage.contentWindow.localStorage.autocardAnywherelistType == 'whitelist');
		}
		else { // Chrome, Opera, Firefox or Edge
			listedSites = window.localStorage.autocardAnywherelistedSites || '';
			isWhiteList = (window.localStorage.autocardAnywherelistType == 'whitelist');
		}
		let listed = isListed(host);
		let isEnabled = ((!isWhiteList && !listed) || (isWhiteList && listed))
		document.getElementById('site-enabled-checkbox').checked = isEnabled;
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