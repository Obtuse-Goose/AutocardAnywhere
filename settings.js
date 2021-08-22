if (typeof chrome !== 'undefined') {var browser = chrome;}
AutocardAnywhereGuid = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});
};
AutocardAnywhereSettings = {
	// Define some global constants
	isFirefox: (navigator.userAgent.toLowerCase().indexOf('firefox') > -1),
	isChrome: (navigator.userAgent.toLowerCase().indexOf('chrome') > -1),
	isSafari: (navigator.userAgent.toLowerCase().indexOf('safari') > -1 && navigator.userAgent.toLowerCase().indexOf('chrome') == -1),
	isOpera: (navigator.userAgent.toLowerCase().indexOf('opr') > -1),
	isEdge: (navigator.userAgent.toLowerCase().indexOf('edge') > -1),
	isBookmarklet: (typeof(AutocardAnywhereLoader) !== 'undefined'),
	isTouchInterface: false,//('ontouchstart' in window),
	priceFont: "'Gill Sans','Gill Sans MT',Calibri,Arial,sans-serif",
	extraInfoFont: "'Gill Sans','Gill Sans MT',Calibri,Arial,sans-serif",
	partnerString: 'partner=AUTOANY&affiliate_id=autocard&utm_campaign=affiliate&utm_source=autocard&utm_medium=card',
	prefix: 'autocardAnywhere',
	maxLevenshteinFactor: 1,
	themes: {
		light: {
			tcg: '#864CF0',
			cardmarket: '#243F7E',
			cardhoarder: '#3C3C3C',
			foil: '#CCA18D',
			mouseover: '#EAEAEB'
		},
		dark: {
			tcg: '#DAC9FA',
			cardmarket: '#BDC5D8',
			cardhoarder: '#C4C4C4',
			foil: '#FFCAB1',
			mouseover: '#171717'
		}
	},
	dictionaries: [
		{'game': 'mtg', 'language': 'de', 'default': 0},
		{'game': 'mtg', 'language': 'fr', 'default': 0},
		{'game': 'mtg', 'language': 'it', 'default': 0},
		{'game': 'mtg', 'language': 'pt', 'default': 0},
		{'game': 'mtg', 'language': 'es', 'default': 0},
		{'game': 'mtg', 'language': 'en', 'default': 1},
		{'game': 'mtg', 'language': 'ru', 'default': 0},
		{'game': 'mtg', 'language': 'jp', 'default': 0},
		{'game': 'mtg', 'language': 'hans', 'default': 0},
		{'game': 'mtg', 'language': 'hant', 'default': 0},
		{'game': 'mtg', 'language': 'ko', 'default': 0},
		{'game': 'agot', 'language': 'en', 'default': 0},
		{'game': 'cardfightvanguard', 'language': 'en', 'default': 0},
		{'game': 'chronicle', 'language': 'en', 'default': 0},
		{'game': 'codex', 'language': 'en', 'default': 0},
		{'game': 'dicemasters', 'language': 'en', 'default': 0},
		{'game': 'dominion', 'language': 'en', 'default': 0},
		{'game': 'doomtown', 'language': 'en', 'default': 0},
		{'game': 'dbz', 'language': 'en', 'default': 0},
		{'game': 'duelyst', 'language': 'en', 'default': 0},
		{'game': 'elderscrolls', 'language': 'en', 'default': 0},
		{'game': 'eternal', 'language': 'en', 'default': 0},
		{'game': 'faeria', 'language': 'en', 'default': 0},
		{'game': 'forceofwill', 'language': 'en', 'default': 0},
		{'game': 'gwent', 'language': 'en', 'default': 0},
		{'game': 'hearthstone', 'language': 'en', 'default': 0},
		{'game': 'hex', 'language': 'en', 'default': 0},
		{'game': 'l5r', 'language': 'en', 'default': 0},
		{'game': 'lotr', 'language': 'en', 'default': 0},
		{'game': 'mylittlepony', 'language': 'en', 'default': 0},
		{'game': 'netrunner', 'language': 'en', 'default': 0},
		{'game': 'pokemon', 'language': 'en', 'default': 0},
		{'game': 'scrolls', 'language': 'en', 'default': 0},
		{'game': 'solforge', 'language': 'en', 'default': 0},
		{'game': 'starrealms', 'language': 'en', 'default': 0},
		{'game': 'warframe', 'language': 'en', 'default': 0},
		{'game': 'wow', 'language': 'en', 'default': 0},
		{'game': 'xwing', 'language': 'en', 'default': 0},
		{'game': 'yugioh', 'language': 'en', 'default': 0}
	],
	bookmarkletDictionaries: [
		{'game': 'mtg', 'language': 'en', 'default': 1}
	],
	settings: [
		{'name': 'linkLanguages', 'type': 'string', 'default': ''},
		{'name': 'popupLanguage', 'type': 'string', 'default': 'original'},
		{'name': 'caseSensitive', 'type': 'boolean', 'default': false},
		{'name': 'enablePopups', 'type': 'boolean', 'default': true},
		{'name': 'enableExtraInfo', 'type': 'boolean', 'default': true},
		{'name': 'popupWidth', 'type': 'integer', 'default': '200'},
		{'name': 'popupHeight', 'type': 'integer', 'default': '285'},
		{'name': 'replaceExistingLinks', 'type': 'boolean', 'default': true},
		{'name': 'newTab', 'type': 'boolean', 'default': true},
		{'name': 'linkStyleBold', 'type': 'boolean', 'default': false},
		{'name': 'linkStyleItalic', 'type': 'boolean', 'default': false},
		{'name': 'linkStyleUnderline', 'type': 'boolean', 'default': false},
		{'name': 'linkStyleFontColourInherit', 'type': 'boolean', 'default': false},
		{'name': 'linkStyleFontColour', 'type': 'string', 'default': '#9F004B'},
		{'name': 'linkStyleDashed', 'type': 'boolean', 'default': false},
		{'name': 'showIcon', 'type': 'boolean', 'default': false},
		{'name': 'listType', 'type': 'string', 'default': 'blacklist'},
		{'name': 'listedSites', 'type': 'string', 'default': 'deckbox.org'},
		{'name': 'ignoredCards', 'type': 'string', 'default': 'Bad Ass|Bant|Black Market|Break Open|Bring Back|Brought Back|Brute Force|Cockatrice|Deal Damage|Face to Face|First Pick|Guest List|Grixis|Jund|Lifelink|Little Girl|Look At Me|Mana Screw|Mirror Match|Naya|Pirate Ship|Second Chance|Special Offer|Stop That|The Circle|The Deck|The Fallen|The Lady|Time Out'},
		{'name': 'unignoredCards', 'type': 'string', 'default': ''},
		{'name': 'popupShowEffect', 'type': 'string', 'default': 'fadeIn'},
		{'name': 'popupShowDuration', 'type': 'integer', 'default': 500},
		{'name': 'popupHideEffect', 'type': 'string', 'default': 'slideUp'},
		{'name': 'popupHideDuration', 'type': 'integer', 'default': 200},
		{'name': 'carouselEffect', 'type': 'string', 'default': 'backSlide'},
		{'name': 'carouselAutoPlay', 'type': 'boolean', 'default': true},
		{'name': 'setupShown', 'type': 'boolean', 'default': false},
		{'name': 'priceSetupShown', 'type': 'boolean', 'default': false},
		{'name': 'customNicknames', 'type': 'string', 'default': "mtgen|Bob|Dark Confidant||mtgen|bolt|Lightning Bolt||mtgen|BoP|Birds of Paradise||mtgen|CoB|City of Brass||mtgen|FoW|Force of Will||mtgen|Goyf|Tarmogoyf||mtgen|O Ring|Oblivion Ring||mtgen|StP|Swords to Plowshares||mtgen|Tim|Prodigal Sorcerer||mtgen|Gary|Gray Merchant of Asphodel||mtgen|Sad Robot|Solemn Simulacrum||mtgen|Skittles|Skithiryx, the Blight Dragon||mtgen|BBE|Bloodbraid Elf||mtgen|Belcher|Goblin Charbelcher||mtgen|Delver|Delver of Secrets||mtgen|Finkel|Shadowmage Infiltrator||mtgen|FoF|Fact or Fiction||mtgen|GGT|Golgari Grave-Troll||mtgen|JTMS|Jace, the Mind Sculptor||mtgen|WoG|Wrath of God||mtgen|I can't even|Void Winnower||mtgen|I literally can't even|Void Winnower||mylittleponyen|RPSS|Rock, Paper, Scissors, Shoot!||mylittleponyen|RTO|Rarity, Truly Outrageous||netrunneren|Beckman|Rachel Beckman||netrunneren|CyCourt|Cybernetics Court||netrunneren|DLR|Data Leak Reversal||netrunneren|Dino|Dinosaurus||netrunneren|Déjà Vu|Deja Vu||netrunneren|E3|E3 Feedback Implants||netrunneren|FAO|Forged Activation Orders||netrunneren|Femme|Femme Fatale||netrunneren|Jackson|Jackson Howard||netrunneren|Josh B|Joshua B.||netrunneren|NEH|Near Earth Hub||netrunneren|NRE|Net-Ready Eyes||netrunneren|Personal Touch|The Personal Touch||netrunneren|QT|Quality Time||netrunneren|SMC|Self-modifying Code||netrunneren|SOT|Same Old Thing||hearthstoneen|Patron|Grim Patron||hearthstoneen|Al'Akir|Al'Akir the Windlord||hearthstoneen|BGH|Big Game Hunter||hearthstoneen|Bolvar|Bollet Fordragon||hearthstoneen|Chugga|Showchugger||hearthstoneen|Ragnaros|Ragnaros the Firelord||hearthstoneen|Antonidas|Archmage Antonidas||hearthstoneen|Thalnos|Bloodmage Thalnos||hearthstoneen|Cairne|Cairne Bloodhoof||hearthstoneen|FoK|Fan of Knives||hearthstoneen|Gormok|Gormok The Impaler||hearthstoneen|Jaraxxus|Lord Jaraxxus||hearthstoneen|Justicar|Justicar Trueheart||hearthstoneen|Sylvanas|Sylvanas Windrunner||hearthstoneen|Troggzor|Troggzor the Earthinator||hearthstoneen|UTH|Unleash the Hounds||xwingen|PTL|Push the Limit||xwingen|ATC|Advanced Targeting Computer||xwingen|HLC|Heavy Laser Cannon||xwingen|TLT|Twin Laser Turret||xwingen|ABT|Autoblaster Turret||xwingen|K4|K4 Security Droid||xwingen|Fel|Soontir Fel||codexen|Vandy|Vandy Anadrose||codexen|Orpal|Orpal Gloor||codexen|Garth|Garth Torken||codexen|Bigby|Bigby Hayes||codexen|Onimaru|General Onimaru||codexen|Quince|Sirus Quince||codexen|Midori|Master Midori||codexen|Calamandra|Calamandra Moss||codexen|Argagarg|Argagarg Garg||codexen|Troq|Troq Bashar||codexen|River|River Montoya||codexen|Prynn|Prynn Pasternaak||codexen|Geiger|Max Geiger||codexen|Vir|Vir Garbarean||codexen|Zane|Captain Zane||codexen|Drakk|Drakk Ramhorn||codexen|Jaina|Jaina Stormborne||codexen|Grave|Grave Stormborne||codexen|Setsuki|Setsuki Hiruki||codexen|Rook|Garus Rook||faeriaen|Thulgar|Baron Thulgar||eternalen|Jekk|Jekk, the Bounty Hunter||eternalen|Marisen|Marisen, the Eldest||yugiohen|econ|Enemy Controller||yugiohen|bewd|Blue-Eyes White Dragon||yugiohen|beud|Blue-Eyes Ultimate Dragon||yugiohen|rebd|Red-Eyes Black Dragon||yugiohen|dm|Dark Magician||yugiohen|dmg|Dark Magician Girl||yugiohen|windstorm|Windstorm of Etaqua||"},
		{'name': 'expandNicknames', 'type': 'boolean', 'default': false},
		{'name': 'currency', 'type': 'string', 'default': 'USD'},
		{'name': 'lastDataUpdate', 'type': 'string', 'default': ''},
		{'name': 'theme', 'type': 'string', 'default': 'light'}
	],
	currencies: [
		{'name': 'AUD', 'value': 'AUD', 'description': 'Australian Dollar', 'locale': 'en'},
		{'name': 'BRL', 'value': 'BRL', 'description': 'Brazilian Real', 'locale': ['pt', 'en']},
		{'name': 'BGN', 'value': 'BGN', 'description': 'Bulgarian Lev', 'locale': ['bg', 'en']},
		{'name': 'CAD', 'value': 'CAD', 'description': 'Canadian Dollar', 'locale': 'en'},
		{'name': 'CNY', 'value': 'CNY', 'description': 'Chinese Yuan Renminbi', 'locale': ['zh', 'en']},
		{'name': 'HRK', 'value': 'HRK', 'description': 'Croatian Kuna', 'locale': 'hr', 'symbol': 'kn', 'suffix': 1},
		{'name': 'CZK', 'value': 'CZK', 'description': 'Czech Koruna', 'locale': ['cs', 'en']},
		{'name': 'DKK', 'value': 'DKK', 'description': 'Danish Krone', 'locale': ['da', 'en']},
		{'name': 'EUR', 'value': 'EUR', 'description': 'Euro', 'locale': ['fr', 'de', 'en']},
		{'name': 'GBP1', 'value': 'GBP', 'description': 'GB Pound Sterling', 'locale': 'en'},
		{'name': 'HKD', 'value': 'HKD', 'description': 'Hong Kong Dollar', 'locale': ['zh-hk', 'zh', 'en']},
		{'name': 'HUF', 'value': 'HUF', 'description': 'Hungarian Forint', 'locale': ['hu', 'en']},
		{'name': 'INR', 'value': 'INR', 'description': 'Indian Rupee', 'locale': ['en', 'en']},
		{'name': 'IDR', 'value': 'IDR', 'description': 'Indonesian Rupiah', 'locale': ['id', 'en']},
		{'name': 'ILS', 'value': 'ILS', 'description': 'Israeli Shekel', 'locale': ['he', 'en']},
		{'name': 'JPY', 'value': 'JPY', 'description': 'Japanese Yen', 'locale': ['ja', 'en']},
		{'name': 'KRW1', 'value': 'KRW', 'description': 'Korean Won', 'locale': ['ko', 'en']},
		{'name': 'MYR', 'value': 'MYR', 'description': 'Malaysian Ringgit', 'locale': ['ms-my', 'ms', 'en']},
		{'name': 'MXN', 'value': 'MXN', 'description': 'Mexican Peso', 'locale': ['es-mx', 'es', 'en']},
		{'name': 'NZD', 'value': 'NZD', 'description': 'New Zealand Dollar', 'locale': ['en', 'en']},
		{'name': 'NOK', 'value': 'NOK', 'description': 'Norwegian Krone', 'locale': 'no', 'symbol': 'kr', 'suffix': 1},
		{'name': 'PHP', 'value': 'PHP', 'description': 'Philippine Peso', 'locale': 'ph', 'symbol': '₱'},
		{'name': 'PLN', 'value': 'PLN', 'description': 'Polish Zloty', 'locale': ['pl', 'en']},
		{'name': 'RON', 'value': 'RON', 'description': 'Romanian Lei', 'locale': 'ro', 'symbol': 'lei', 'suffix': 1},
		{'name': 'RUB', 'value': 'RUB', 'description': 'Russian Ruble', 'locale': ['ru', 'en']},
		{'name': 'SGD', 'value': 'SGD', 'description': 'Singapore Dollar', 'locale': ['zh-sg', 'zh', 'en']},
		{'name': 'ZAR', 'value': 'ZAR', 'description': 'South African Rand', 'locale': 'af', 'symbol': 'R'},
		{'name': 'KRW2', 'value': 'KRW', 'description': 'South Korean Won', 'locale': ['ko', 'en']},
		{'name': 'SEK', 'value': 'SEK', 'description': 'Swedish Krona', 'locale': ['sv', 'en']},
		{'name': 'CHF', 'value': 'CHF', 'description': 'Swiss Franc', 'locale': ['de', 'en']},
		{'name': 'THB', 'value': 'THB', 'description': 'Thai Baht', 'locale': 'th', 'symbol': '฿', 'suffix': 1},
		{'name': 'TRY', 'value': 'TRY', 'description': 'Turkish Lira', 'locale': ['tr', 'en']},
		{'name': 'GBP2', 'value': 'GBP', 'description': 'United Kingdom Pound Sterling', 'locale': 'en'},
		{'name': 'USD', 'value': 'USD', 'description': 'United States Dollar', 'locale': 'en'}
	],
	load: function(prefix, settings, callback) {
		if (AutocardAnywhereSettings.isBookmarklet) { // Running as bookmarklet
			AutocardAnywhereSettings.dictionaries = AutocardAnywhereSettings.bookmarkletDictionaries;
			let response = {};
			settings.map(function(setting) {
				if (setting.name == 'linkLanguages') {
					response[setting.name] = 'mtg:en:1;';
				}
				else if (setting.name == 'enableExtraInfo' || setting.name == 'enablePrices') {
					response[setting.name] = false;
				}
				else {
					response[setting.name] = setting.default;
				}
			});
			callback(response);
		}
		else if (AutocardAnywhereSettings.isSafari) {
			let messageID = AutocardAnywhereGuid();
			function getResponse(event) {
				if (event.name === messageID) {
					callback(event.message);
				}
			}
			safari.self.addEventListener("message", getResponse, false);
			safari.self.tab.dispatchMessage('loadSettings', {'id': messageID, 'prefix': prefix, 'settings': settings});
		}
		else { // Chrome, Opera, Firefox or Edge
			browser.runtime.sendMessage({'name': 'loadSettings', 'prefix': prefix, 'settings': settings}, callback);
		}
	},
	parser: new DOMParser(),
	stripHtml: function(html) {
		// Removes all html tags from a string.
		if ((!html) || (typeof(html) !== 'string')) {
			return html;
		}
		// Add a linefeed between blocks of text
		html = html.replace(/<\/p>/g, "\n");
		html = html.replace(/<li>/g, "\n");
		// Remove all other tags
		let doc = this.parser.parseFromString(html, "text/html");
        html = doc.documentElement.textContent;

		// Replace newlines with html line breaks
		html = html.replace(/\n\n\n/g, "\n");
		html = html.replace(/\n\n/g, "\n");
		//return html.replace(/\n/g, '<br/>');
		return html.split("\n");
	},
	getVersionNumber: function() {
		if (AutocardAnywhereSettings.isSafari) {
			return safari.extension.displayVersion;
		}
		else if (!AutocardAnywhereSettings.isBookmarklet) { // Chrome, Opera, Firefox or Edge
			return browser.runtime.getManifest().version;
		}
		return '';
	}
}