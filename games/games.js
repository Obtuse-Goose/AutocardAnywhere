//import { Dictionary } from './games/dictionary.js';
if (typeof(AutocardAnywhere) == 'undefined') {AutocardAnywhere = {};}
//if (typeof(AutocardAnywhere.games) == 'undefined') {AutocardAnywhere.games = {};}
AutocardAnywhere.games = {
	load: function(games) {
		return new Promise((resolve, reject) => {
			let result = {};
			games.map(function(game) {
				let name = game[0];
				let language = game[1];

				AutocardAnywhere.games[name][language].load().then(function(dictionary) {
					function messageCallback(response) {
						dictionary.test = new RegExp(response.test, "gi");
						dictionary.cardNames = response.cardNames;
						dictionary.cardData = response.cardData;
						result[name + language] = dictionary;

						// Once all the dictionaries are loaded, resolve the promise
						if (Object.keys(result).length == games.length) {
							resolve(result);
						}
					};

					if (AutocardAnywhereSettings.isEmbedded) { // Running embedded in a web page
						AutocardAnywhere.ajax(AutocardAnywhere.getURL("games/" + name + "/" + name + "-data.json")).then((response) => {
							//console.log(gameData);
							let gameData = JSON.parse(response);
							AutocardAnywhere.ajax(AutocardAnywhere.getURL("games/" + name + "/" + language + "-data.json")).then((response) => {
								//console.log(languageData);
								let languageData = JSON.parse(response);

								messageCallback({
									'cardData': gameData.cardData,
									'test': languageData.test,
									'cardNames': languageData.cardNames
								});
							});
						});
						/*
						messageCallback({
							'cardData': [],
							'test': AutocardAnywhereLoader[name + language].test,
							'cardNames': AutocardAnywhereLoader[name + language].cardNames
						});
						*/
					}
					else if (AutocardAnywhereSettings.isSafari) {
						let messageID = AutocardAnywhereGuid();
						function getResponse(event) {
							if (event.name === messageID) {
								messageCallback(event.message);
							}
						}
						safari.self.addEventListener("message", getResponse, false);
						safari.self.tab.dispatchMessage('getDictionary', {'id': messageID, 'game': name, 'language': language});
					}
					else  { // Chrome, Opera, Firefox or Edge
						/*
						if (!AutocardAnywhere.persistentPort) {
							AutocardAnywhere.persistentPort = chrome.runtime.connect({name: "autocardanywhere"});
						}
						function messageReceived(response) {
							if (response.game == name && response.language == language) {
								AutocardAnywhere.persistentPort.onMessage.removeListener(messageReceived);
								let gameData = JSON.parse(response.gameData);
								let languageData = JSON.parse(response.languageData);

								messageCallback({
									'cardData': gameData.cardData,
									'test': languageData.test,
									'cardNames': languageData.cardNames
								});
							}
						}
						
						AutocardAnywhere.persistentPort.onMessage.addListener(messageReceived);
						AutocardAnywhere.persistentPort.postMessage({'type': 'dictionary', 'game': name, 'language': language});
						*/

						AutocardAnywhere.sendMessage({'name': 'getDictionary', 'game': name, 'language': language}).then((response) => {
							let gameData = JSON.parse(response.gameData);
							let languageData = JSON.parse(response.languageData);

							messageCallback({
								'cardData': gameData.cardData,
								'test': languageData.test,
								'cardNames': languageData.cardNames
							});
						});
					}
				});
			});
		});
	}
};
//==============================================================================
// A Game of Thrones
//==============================================================================
function AgotDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

AgotDictionary.prototype = new Dictionary({
	game: 'agot',
	description: 'A Game of Thrones 2nd Edition',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.cardgamedb.com/index.php/agameofthrones2ndedition/a-game-of-thrones-2nd-edition-cards/<link>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://lcg-cdn.fantasyflightgames.com/got2nd/<img>'
		}
	]
}); 

// Override parent functions
AgotDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'link': cardData[1],
		'rotate': cardData[2],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.agot = {};
// English
AutocardAnywhere.games.agot.en = new AgotDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Cardfight!!Vanguard
//==============================================================================
function CardfightVanguardDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

CardfightVanguardDictionary.prototype = new Dictionary({
	game: 'cardfightvanguard',
	description: 'Cardfight!!Vanguard',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/cardfight-vanguard/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': '<img>'
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/cardfight-vanguard/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/Vanguard/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'info',
			'controlType': 'radio',
			'options': [
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'text', description: 'Text', value: 'text'},
				{name: 'flavour', description: 'Flavour', value: 'flavour'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'http://cardfight.wikia.com/wiki/<name>',
			'sections': [
				{
					'name': 'info',
					'description': 'Info',
					're': '<td> <b>(Unit Type|Grade / Skill|Power|Critical|Nation|Clan|Race|Trigger|Illust)</b> </td><td>([^^]*?)</td>'
				},
				{
					'name': 'text',
					'description': 'Text',
					're': '<th> Card Effect[^<]*?</th></tr>([^^]*?)</tr>'
				},
				{
					'name': 'flavour',
					'description': 'Flavour',
					're': '<th> Card Flavor[^<]*?</th></tr>([^^]*?)</tr>'
				}
			]
		}
	]
});

// Override parent functions
CardfightVanguardDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '_');
};
CardfightVanguardDictionary.prototype.parseHtml = function(html) {
	return html.replace(/<br \/>/g, "\n\n");
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.cardfightvanguard = {};
// English
AutocardAnywhere.games.cardfightvanguard.en = new CardfightVanguardDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Chronicle
//==============================================================================
function ChronicleDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

ChronicleDictionary.prototype = new Dictionary({
	game: 'chronicle',
	description: 'Chronicle: RuneScape Legends',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://chronicle.gamepedia.com/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://hydra-media.cursecdn.com/chronicle.gamepedia.com/<img>'
		}
	]
}); 

// Override parent functions
ChronicleDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.chronicle = {};
// English
AutocardAnywhere.games.chronicle.en = new ChronicleDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Codex
//==============================================================================
function CodexDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

CodexDictionary.prototype = new Dictionary({
	game: 'codex',
	description: 'Codex: Card-Time Strategy',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://www.codexcarddb.com/card/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://codexcards-assets.surge.sh/images/renamed/<name:simple>.jpg'
		}
	]
}); 

// Override parent functions
CodexDictionary.prototype.simplify = function(s) {
	return s.replace(/[\s]/g, '_').replace(/[,\-'!:]/g, '').toLowerCase();
};
CodexDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.codex = {};
// English
AutocardAnywhere.games.codex.en = new CodexDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Dragon Ball Z
//==============================================================================
function DbzDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

DbzDictionary.prototype = new Dictionary({
	game: 'dbz',
	description: 'Dragon Ball Z TCG',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://dbztoptier.com/index.php/database.html?cmd=showcard&id=<cardID>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://dbztoptier.com/images/carddatabase/<img>'
		}
	]
}); 

// Override parent functions
DbzDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'cardID': cardData[0],
		'img': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.dbz = {};
// English
AutocardAnywhere.games.dbz.en = new DbzDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Dicemasters
//==============================================================================
function DicemastersDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

DicemastersDictionary.prototype = new Dictionary({
	game: 'dicemasters',
	description: 'Dice Masters',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://dicemastersdb.com/<link>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://dicemastersdb.com/<img>'
		}
	]
}); 

// Override parent functions
DicemastersDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'link': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.dicemasters = {};
// English
AutocardAnywhere.games.dicemasters.en = new DicemastersDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Dominion
//==============================================================================
function DominionDictionary(config) {
	this .description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

DominionDictionary.prototype = new Dictionary({
	game: 'dominion',
	description: 'Dominion',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'type': 'string',
			'default': 'http://wiki.dominionstrategy.com/index.php/<name:simple>'
		},
		{
			'name': 'imageURL',
			'type': 'string',
			'default': 'https://autocardanywhere.com/dominion/<name:simple>.jpg'
		}
	],
	extraInfo: []
});

// Override parent functions
DominionDictionary.prototype.simplify = function(s) {
	return s.replace(/[\s]/g, '_').replace(/'/g, '%27');
};
DominionDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match,
		'match': match,
		'id': match.replace(/ /g, ''),
		'img': cardData[0],
		'rotate': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.dominion = {};
// English
AutocardAnywhere.games.dominion.en = new DominionDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': false,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Doomtown
//==============================================================================
function DoomtownDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

DoomtownDictionary.prototype = new Dictionary({
	game: 'doomtown',
	description: 'Doomtown: Reloaded',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://dtdb.co/en/card/<dtdbId>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://dtdb.co/web/bundles/dtdbcards/images/cards/en/<dtdbId>.jpg'
		}
	]
}); 

// Override parent functions
DoomtownDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'dtdbId': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.doomtown = {};
// English
AutocardAnywhere.games.doomtown.en = new DoomtownDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Duelyst
//==============================================================================
function DuelystDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

DuelystDictionary.prototype = new Dictionary({
	game: 'duelyst',
	description: 'Duelyst',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://duelyst.gamepedia.com/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://hydra-media.cursecdn.com/duelyst.gamepedia.com/<img>'
		}
	]
}); 

// Override parent functions
DuelystDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.duelyst = {};
// English
AutocardAnywhere.games.duelyst.en = new DuelystDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Elder Scrolls
//==============================================================================
function ElderScrollsDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

ElderScrollsDictionary.prototype = new Dictionary({
	game: 'elderscrolls',
	description: 'Elder Scrolls: Legends',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://elderscrolls.wikia.com/wiki/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://vignette.wikia.nocookie.net/elderscrolls/images/<img>'
		}
	]
}); 

// Override parent functions
ElderScrollsDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.elderscrolls = {};
// English
AutocardAnywhere.games.elderscrolls.en = new ElderScrollsDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Eternal
//==============================================================================
function EternalDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

EternalDictionary.prototype = new Dictionary({
	game: 'eternal',
	description: 'Eternal',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.numotgaming.com/cards/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://www.numotgaming.com/cards/images/cards/<name:simple>.png'
		}
	]
}); 

// Override parent functions
EternalDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20');
};
EternalDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		//'link': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.eternal = {};
// English
AutocardAnywhere.games.eternal.en = new EternalDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Flesh and Blood
//==============================================================================
function FabDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

FabDictionary.prototype = new Dictionary({
	game: 'fab',
	description: 'Flesh and Blood',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://www.tcgplayer.com/search/flesh-and-blood-tcg/product?q=<id>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://fabdb2.imgix.net/cards/printings/<img>.png'
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://www.tcgplayer.com/search/flesh-and-blood-tcg/product?q=<id>'
		},
		{
			'name': 'extraInfoBorderRadius',
			'type': 'integer',
			'default': 16
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'text',
			'controlType': 'radio',
			'options': [
				{name: 'text', description: 'Card Text', value: 'text'},
				{name: 'flavour', description: 'Flavour', value: 'flavour'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://api.fabdb.net/cards/<id>',
			'sections': [
				{
					'name': 'text',
					'description': 'Card Text'
				},
				{
					'name': 'flavour',
					'description': 'Flavour'
				}
			]
		}
	]
});

// Override parent functions
FabDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20');
};

FabDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'img': cardID,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'id': cardData[0],
		'isDict': isDict || 0
	};
};

FabDictionary.prototype.parseExtraInfo = function(content, section, card) {

	function addLine(div, text, indented, capitalised) {
		if (!text) return;

		let line = document.createElement("div");
		line.appendChild(document.createTextNode(text));
		if (indented) {
			line.style.setProperty('padding-left', '10px');
		}
		if (capitalised) {
			line.style.setProperty('text-transform', 'capitalize');
		}
		div.appendChild(line);
	}

	let overlayWidth = card.rotate == 90 ? AutocardAnywhere.popupHeight - 20 : AutocardAnywhere.popupWidth - 20;

	// Parses the returned content for the specified section
	let data = JSON.parse(content);
	let result = document.createElement("div");
	result.style.setProperty('width', overlayWidth + 'px');

	if (section.name == 'text') {
		if (data.text) {
			let lines = data.text.replace(/\*/g, '').split("\n");
			lines.map(function(line) {
				addLine(result, line);
			});
		}
	}
	else if (section.name == 'flavour') {
		if (data.flavour) {
			let lines = data.flavour.split("\n");
			lines.map(function(line) {
				addLine(result, line);
			});
		}
	}

	return result;
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.fab = {};
// English
AutocardAnywhere.games.fab.en = new FabDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Faeria
//==============================================================================
function FaeriaDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

FaeriaDictionary.prototype = new Dictionary({
	game: 'faeria',
	description: 'Faeria',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://faeriaguide.com/img/Faeria_Cards/CardExport/medium/<id>.png'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://raw.githubusercontent.com/faeria-org/Faeria_Cards/master/CardExport/English/720-<id>.png'
		}
	]
}); 

// Override parent functions
FaeriaDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardData[0],
		'id': cardData[0],
		'isDict': isDict || 0,
		'ratio': 'square'
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.faeria = {};
// English
AutocardAnywhere.games.faeria.en = new FaeriaDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Force of Will
//==============================================================================
function ForceOfWillDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

ForceOfWillDictionary.prototype = new Dictionary({
	game: 'forceofwill',
	description: 'Force of Will',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://db.fowtcg.us/index.php?p=card&code=<code>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://db.fowtcg.us/cards/<img>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/FoW/Products/Search?searchString=<name:simple>'
		},
	]
}); 

// Override parent functions
ForceOfWillDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'code': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.forceofwill = {};
// English
AutocardAnywhere.games.forceofwill.en = new ForceOfWillDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Gwent
//==============================================================================
function GwentDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

GwentDictionary.prototype = new Dictionary({
	game: 'gwent',
	description: 'Gwent',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://www.gwentdb.com/cards/<url>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://media-seawolf.cursecdn.com/avatars/thumbnails/<img>'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'cardtext',
			'controlType': 'radio',
			'options': [
				{name: 'cardtext', description: 'Card Text', value: 'cardtext'},
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'flavourtext', description: 'Flavour', value: 'flavourtext'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://www.gwentdb.com/cards/<url>',
			'sections': [
				{
					'name': 'cardtext',
					'description': 'Text',
					're': '<div class="card-abilities"[^>]*>([^^]*?)</div>'
				},
				{
					'name': 'info',
					'description': 'Info',
					're': '<small>(Type|Faction|Power|Rarity|Row):</small>([^^]*?)</div>'
				},
				{
					'name': 'flavourtext',
					'description': 'Flavour',
					're': "<div class='sw-card-flavor-text '>([^^]*?)</div>"
				}
			]
		}
	]
}); 

// Override parent functions
GwentDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'url': cardData[0],
		'img': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.gwent = {};
// English
AutocardAnywhere.games.gwent.en = new GwentDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Hearthstone
//==============================================================================
function HearthstoneDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

HearthstoneDictionary.prototype = new Dictionary({
	game: 'hearthstone',
	description: 'Hearthstone',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'type': 'string',
			'resetToDefault': true,
			'default': 'https://www.hearthstonetopdecks.com/cards/<name:simple:lowercase>',
		},
		{
			'name': 'imageURL',
			'type': 'string',
			'resetToDefault': true,
			'default': '<img>'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'info',
			'controlType': 'radio',
			'options': [
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'cardtext', description: 'Text', value: 'cardtext'},
				{name: 'flavourtext', description: 'Flavour', value: 'flavourtext'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://www.hearthstonetopdecks.com/cards/<name:simple:lowercase>',
			'sections': [
				{
					'name': 'info',
					'description': 'Info',
					're': '<li><strong>([^^]*?)</strong>([^^]*?)</li>'
				},
				{
					'name': 'cardtext',
					'description': 'Text',
					're': '<h3>Card Text</h3>([^^]*?)<h3>'
				},
				{
					'name': 'flavourtext',
					'description': 'Flavour',
					're': '<h3>Flavor Text</h3>([^^]*?)</div>'
				}
			]
		}
	]
}); 

// Override parent functions
HearthstoneDictionary.prototype.simplify = function(s) {
	return s.replace(/\s/g, '-');
};
HearthstoneDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match,
		'match': match,
		'en': cardID,
		'id' : cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.hearthstone = {};
// English
AutocardAnywhere.games.hearthstone.en = new HearthstoneDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Hex
//==============================================================================
function HexDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

HexDictionary.prototype = new Dictionary({
	game: 'hex',
	description: 'Hex',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://hex.tcgbrowser.com/#!/cards/cardid=<tcgbrowserid>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://storage.hex.tcgbrowser.com/big/<img>.jpg'
		}
	]
}); 

// Override parent functions
HexDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'tcgbrowserid': cardData[0],
		'img': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.hex = {};
// English
AutocardAnywhere.games.hex.en = new HexDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Legend of the Five Rings
//==============================================================================
function L5rDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

L5rDictionary.prototype = new Dictionary({
	game: 'l5r',
	description: 'Legend of the Five Rings',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://imperialassembly.com/oracle/#cardid=<id>,#hashid=1fc816f7545c2bd39f6cc7737803644c,#cardcount=20'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://imperialassembly.com/oracle/showimage?prefix=printing&cardid=<id>&nestid=1&class=details&tagid=34&.jpg'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'text',
			'controlType': 'radio',
			'options': [
				{name: 'text', description: 'Text', value: 'text'},
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'flavour', description: 'Flavour', value: 'flavour'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'http://imperialassembly.com/oracle/docard?cardid=<id>',
			'sections': [
				{
					'name': 'text',
					'description': 'Text',
					're': '<td[^>]*><div[^>]*>Text</div><div[^>]*>[^<]*</div></td>\s*<td[^>]*><div[^>]*>([^^]*?)</div>'
				},
				{
					'name': 'info',
					'description': 'Info',
					're': '<td[^>]*><div[^>]*>(Set|Keywords|Artist|Card Type|Rarity|Legality)</div><div[^>]*>[^<]*</div></td>\s*<td[^>]*><div[^>]*>([^^]*?</div>)'
				},
				{
					'name': 'flavour',
					'description': 'Flavour',
					're': '<td[^>]*><div[^>]*>Flavor&nbsp;Text</div><div[^>]*>[^<]*</div></td>\s*<td[^>]*><div[^>]*>([^^]*?)</div>'
				}
			]
		}
	]
}); 

// Override parent functions
L5rDictionary.prototype.parseHtml = function(html) {
	// Replace img tags with their alt attribute
	return html.replace(/<\/div>/g, "\n");
};
L5rDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'en': cardID,
		'id': cardID,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.l5r = {};
// English
AutocardAnywhere.games.l5r.en = new L5rDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Lorcana
//==============================================================================
function LorcanaDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

LorcanaDictionary.prototype = new Dictionary({
	game: 'lorcana',
	description: 'Lorcana',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/lorcana/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://lorcana-api.com/images/<img>'
		}
	]
}); 

// Override parent functions
LorcanaDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'rotate': cardData[1] || 0,
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.lorcana = {};
// English
AutocardAnywhere.games.lorcana.en = new LorcanaDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Lord of the Rings
//==============================================================================
function LotrDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

LotrDictionary.prototype = new Dictionary({
	game: 'lotr',
	description: 'Lord of the Rings LCG',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.cardgamedb.com/index.php/lotr/lord-of-the-rings-card-spoiler/_/<link>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://www.cardgamedb.com/forums/uploads/lotr/<img>'
		}
	]
}); 

// Override parent functions
LotrDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'link': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.lotr = {};
// English
AutocardAnywhere.games.lotr.en = new LotrDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Magic the Gathering
//==============================================================================
function MtgDictionary(config) {
	this.game = 'mtg';
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

MtgDictionary.prototype = new Dictionary({
	//game: 'mtg',
	description: 'Magic: The Gathering',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/magic/product/show?ProductName=<name:simple>',
			'controlType': 'radio',
			'options': [
				{name: 'TCGPlayer', description: 'TCGplayer', value: 'https://store.tcgplayer.com/magic/product/show?ProductName=<name:simple>'},
				{name: 'Cardmarket', description: 'Cardmarket', value: 'https://www.cardmarket.com/en/Magic/Products/Search?searchString=<name:simple>'},
				{name: 'Cardhoarder', description: 'Cardhoarder', value: 'https://www.cardhoarder.com/cards?data[search]=<name:simple>'},
				{name: 'Scryfall', description: 'Scryfall', value: 'https://scryfall.com/search?q=%21%22<name:simple>%22'},
				{name: 'Gatherer', description: 'Gatherer', value: 'https://gatherer.wizards.com/Pages/Search/Default.aspx?name=+[<name:simple>]'},
				{name: 'LigaMagic', description: 'Liga Magic', value: 'http://www.ligamagic.com.br/?view=cartas/card&card=<name:simple>'},
				{name: 'TappedOut', description: 'Tapped Out', value: 'http://tappedout.net/mtg-card/<name:hyphenated>/'},
				{name: 'Custom', description: 'Custom:', value: ''}
			]
		},
		{
			'name': 'priceURL',
			'type': 'string',
			'resetToDefault': true,
			//'default': 'https://partner.tcgplayer.com/x3/phl.asmx/p?pk=AUTOANY&s=&p=<name:simple>'
			'default': 'https://api.scryfall.com/cards/named?exact=<name:simple>'
		},
		{
			'name': 'imageURL',
			'type': 'string',
			'resetToDefault': true,
			//'default': 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=<id>'
			'default': 'https://c1.scryfall.com/file/scryfall-cards/png/<face>/<id:folders>.png'
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/magic/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/Magic/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'cardhoarderURL',
			'type': 'string',
			'default': 'https://www.cardhoarder.com/cards?data[search]=<name:simple>'
		},
		{
			'name': 'enableTcgPrices',
			'description': 'Display TCGplayer card prices',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'enableCardmarketPrices',
			'description': 'Display Cardmarket card prices',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'enableFoilPrices',
			'description': 'Display foil card prices',
			'type': 'boolean',
			'default': false,
			'controlType': 'checkbox'
		},
		{
			'name': 'enableOnlinePrices',
			'description': 'Display online card prices',
			'type': 'boolean',
			'default': false,
			'controlType': 'checkbox'
		},
		{
			'name': 'extraInfoBorderRadius',
			'type': 'integer',
			'default': 16
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'oracletext',
			'controlType': 'radio',
			'options': [
				{name: 'oracletext', description: 'Oracle Text', value: 'oracletext'},
				{name: 'legality', description: 'Format', value: 'legality'},
				{name: 'sets', description: 'Set', value: 'sets'}
			]
		},
		{
			'name': 'legality',
			//'description': 'Only link cards which are legal in:',
			'type': 'bitmask',
			'default': 8191,
			'resetToDefault': true,
			//'controlType': 'bitmask',
			'mask': [
				{type: 'all', description: 'All (including cards not legal in any format)', value: 4096},
				{description: 'Standard', value: 1},
				{description: 'Modern', value: 2},
				{description: 'Extended', value: 4},
				{description: 'Legacy', value: 8},
				{description: 'Vintage', value: 16},
				{description: 'Freeform', value: 32},
				{description: 'Prismatic', value: 64},
				{description: 'Tribal Wars Legacy', value: 128},
				{description: 'Tribal Wars Standard', value: 256},
				{description: 'Classic', value: 512},
				{description: 'Singleton 100', value: 1024},
				{description: 'Commander', value: 2048}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://api.scryfall.com/cards/search?order=released&q=!\"<name>\"&unique=prints',
			'sections': [{
				'name': 'oracletext',
				'description': 'Oracle'
			},
			{
				'name': 'legality',
				'description': 'Format'
			},{
				'name': 'sets',
				'description': 'Set'
			}]
		}
	]
});

// Override parent functions
MtgDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20');
};
MtgDictionary.prototype.parseExtraInfo = function(content, section, card) {

	function addLine(div, text, indented, capitalised) {
		if (!text) return;
		text = text.replace(/[{}]/g, '');

		let line = document.createElement("div");
		line.appendChild(document.createTextNode(text));
		if (indented) {
			line.style.setProperty('padding-left', '10px');
		}
		if (capitalised) {
			line.style.setProperty('text-transform', 'capitalize');
		}
		div.appendChild(line);
	}

	function addLegality(div, title, legality) {
		if (!title) return;
		legality = legality.replace('_', ' ');
		if (title == 'oldschool') return;
		title = title
			.replace('historicbrawl', 'historic brawl')
			.replace('paupercommander', 'Pauper Commander')
			.replace('duel', 'Duel Commander');

		let line = document.createElement("div");
		let left = document.createElement("div");
		let right = document.createElement("div");
		left.style.float = 'left';
		right.style.float = 'left';
		left.style.width = '67%';
		right.style.width = '33%';
		if (legality.toLowerCase() == 'legal') {
			right.style.color = '#43AE43';
		}
		else if (legality.toLowerCase() == 'restricted') {
			right.style.color = '#1A6DF2';
		}
		 // Use same colour for banned as not legal
		else if (legality.toLowerCase() == 'banned' || legality.toLowerCase() == 'not legal') {
			right.style.color = '#999999';
		}
		left.appendChild(document.createTextNode(title));
		right.appendChild(document.createTextNode(legality));
		line.appendChild(left);
		line.appendChild(right);
		line.style.setProperty('text-transform', 'capitalize');
		div.appendChild(line);
	}

	function processCard(card) {
		
		if (card.mana_cost) {
			addLine(result, 'Mana Cost: ' + card.mana_cost);
		}
		if (card.type_line) {
			addLine(result, 'Type: ' + card.type_line);
		}
		if (card.oracle_text) {
			addLine(result, 'Card Text:');
			let lines = card.oracle_text.split("\n");
			lines.map(function(line) {
				addLine(result, line, true);
			});
		}
		if (card.power) {
			addLine(result, 'Power/Toughness: ' + card.power + '/' + card.toughness);
		}
		if (card.loyalty) {
			addLine(result, 'Loyalty: ' + card.loyalty);
		}
	}

	let overlayWidth = card.rotate == 90 ? AutocardAnywhere.popupHeight - 20 : AutocardAnywhere.popupWidth - 20;

	// Parses the returned content for the specified section
	let list = JSON.parse(content);
	let result = document.createElement("div");
	result.style.setProperty('width', overlayWidth + 'px');

	let sets = [];
	for (let i in list.data) {
		let card = list.data[i];
		if (section.name == 'oracletext') {
			if (card.card_faces && card.card_faces.length > 0) {
				for (let j in card.card_faces) {
					processCard(card.card_faces[j]);
					if (j < (card.card_faces.length - 1)) {
						let spacer = document.createElement("hr");
						result.appendChild(spacer);
					}
				}
			}
			else {
				processCard(card);
			}
			break;
		}
		else if (section.name == 'legality') {
			$.each(card.legalities, function(legality) {
				addLegality(result, legality, card.legalities[legality]);
			});
			break;
		}
		else if (section.name == 'sets') {
			sets.push(card.set_name);
		}
	}
	// Sort the set list alphabetically
	sets.sort();
	// Remove any duplicates
	sets = [...new Set(sets)];
	sets.map(function(set) {
		addLine(result, set);
	});

	return result;
};
MtgDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {
		/*
		if (AutocardAnywhereSettings.isBookmarklet) {
			return {
				'game': this.game,
				'language': this.language,
				'name': match,
				'match': match,
				'en': cardID,
				'isDict': isDict || 0
			}
		}
		else {
		*/
			return;
		//}
	}
	// If the card is not legal in a selected format
	//if ((this.settings.legality & (cardData[11]+4096)) == 0) {return}
	let card = {
		'game': this.game,
		'language': this.language,
		'name': cardData[0],
		'match': match || cardData[0],
		'en': cardData[1],
		'de': cardData[2],
		'fr': cardData[3],
		'it': cardData[4],
		'pt': cardData[5],
		'es': cardData[6],
		'ru': cardData[7],
		'jp': cardData[8],
		'hans': cardData[9],
		'hant': cardData[10],
		'ko': cardData[11],
		//'legality': cardData[11],
		//'isLegend': (cardData[12] == 1),
		'rotate': cardData[12] || 0,
		'dfc': cardData[13] || 0,
		'isDict': isDict || 0,
		'face': 'front'
	};
	card.id = card[this.language] ? card[this.language] : card.en;
	return card;
};
MtgDictionary.prototype.parsePriceData = function(card, response, currencyExchangeRate) {
	//console.log('got price data for ' + card.name);
	let dictionary = this;
	let data = JSON.parse(response);
	let dollarExchangeRate = currencyExchangeRate.dollarExchangeRate;
	let euroExchangeRate = currencyExchangeRate.euroExchangeRate;
	let tcgplayerLink = AutocardAnywhereSettings.appendPartnerString(AutocardAnywhereSettings.format(dictionary.settings.tcgPlayerURL, card, dictionary));
	let cardmarketLink = AutocardAnywhereSettings.appendPartnerString(AutocardAnywhereSettings.format(dictionary.settings.cardmarketURL, card, dictionary));
	let cardhoarderLink = AutocardAnywhereSettings.appendPartnerString(AutocardAnywhereSettings.format(dictionary.settings.cardhoarderURL, card, dictionary));
	
	let pricesDiv = AutocardAnywhere.createPricesElement('autocardanywhere-prices');
	let colours = AutocardAnywhereSettings.themes[AutocardAnywhere.theme];

	if (data.prices) {
		if (dictionary.settings.enableTcgPrices) {
			let tcgPrice = dollarExchangeRate * data.prices.usd;
			pricesDiv.appendChild(dictionary.createPriceElement(tcgplayerLink, 'TCG player', tcgPrice, colours['tcg']));
			if (dictionary.settings.enableFoilPrices && data.prices.usd_foil) {
				let tcgFoilPrice = dollarExchangeRate * data.prices.usd_foil;
				pricesDiv.appendChild(dictionary.createPriceElement(tcgplayerLink, 'TCG player Foil', tcgFoilPrice, colours['foil']));
			}
		}
		if (dictionary.settings.enableCardmarketPrices) {
			let cardmarketPrice = euroExchangeRate * data.prices.eur;
			pricesDiv.appendChild(dictionary.createPriceElement(cardmarketLink, 'Cardmarket', cardmarketPrice, colours['cardmarket']));
			if (dictionary.settings.enableFoilPrices && data.prices.eur_foil) {
				let cardmarketFoilPrice = euroExchangeRate * data.prices.eur_foil;
				pricesDiv.appendChild(dictionary.createPriceElement(cardmarketLink, 'Cardmarket Foil', cardmarketFoilPrice, colours['foil']));
			}
		}
		if (dictionary.settings.enableOnlinePrices && data.prices.tix) {
			let mtgoPrice = data.prices.tix;
			pricesDiv.appendChild(dictionary.createPriceElement(cardhoarderLink, 'Cardhoarder', mtgoPrice > 0 ? mtgoPrice + ' tix' : '' , colours['cardhoarder']));
		}
	}

	return pricesDiv;
};
//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.mtg = {};
// English
AutocardAnywhere.games.mtg.en = new MtgDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'expandLegendNames',
			'description': 'Replace alternate card names (e.g.: Replace "Teferi" with "Teferi, Mage of Zhalfir")',
			'type': 'boolean',
			'default': false,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// German
AutocardAnywhere.games.mtg.de = new MtgDictionary({
	description: 'Deutsch',
	language: 'de',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// French
AutocardAnywhere.games.mtg.fr = new MtgDictionary({
	description: 'Français',
	language: 'fr',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// Italian
AutocardAnywhere.games.mtg.it = new MtgDictionary({
	description: 'Italiano',
	language: 'it',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// Portuguese
AutocardAnywhere.games.mtg.pt = new MtgDictionary({
	description: 'Português',
	language: 'pt',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// Spanish
AutocardAnywhere.games.mtg.es = new MtgDictionary({
	description: 'Español',
	language: 'es',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});
// Russian
AutocardAnywhere.games.mtg.ru = new MtgDictionary({
	description: 'Русский язык',
	language: 'ru',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': false
		}
	]
});
// Japanese
AutocardAnywhere.games.mtg.jp = new MtgDictionary({
	description: '日本語',
	language: 'jp',
	settings: [
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': false
		}
	]
});
// Simplified Chinese
AutocardAnywhere.games.mtg.hans = new MtgDictionary({
	description: '简体中文',
	language: 'hans',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': false
		}
	]
});
// Traditional Chinese
AutocardAnywhere.games.mtg.hant = new MtgDictionary({
	description: '繁體中文',
	language: 'hant',
	settings: [
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': false
		}
	]
});
// Korean
AutocardAnywhere.games.mtg.ko = new MtgDictionary({
	description: '한국어',
	language: 'ko',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': false
		}
	]
});

//==============================================================================
// My Little Pony
//==============================================================================
function MyLittlePonyDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

MyLittlePonyDictionary.prototype = new Dictionary({
	game: 'mylittlepony',
	description: 'My Little Pony CCG',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://mlpccg.wikia.com/wiki/<name>_(<set>)'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': '<img>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/MyLittlePony/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'text',
			'controlType': 'radio',
			'options': [
				{name: 'text', description: 'Text', value: 'text'},
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'flavour', description: 'Flavour', value: 'flavour'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'http://mlpccg.wikia.com/wiki/<name>_(<set>)',
			'sections': [
				{
					'name': 'text',
					'description': 'Text',
					're': '<tr>[^^]*?<th scope="col" colspan="2" style="[^"]*"> Game Text[^^]*?<\/th><\/tr>[^^]*?<tr>[^^]*?<td scope="col" colspan="2" style="[^"]*">([^^]*?)<\/td><\/tr>'
				},
				{
					'name': 'info',
					'description': 'Info',
					're': '<tr>[^^]*?<th scope="col" style="[^"]*">([^<]*)</th><td scope="col" style="[^"]*">([^<]*)</td></tr>'
				},
				{
					'name': 'flavour',
					'description': 'Flavour',
					're': '<tr>[^^]*?<th scope="col" colspan="2" style="[^"]*"> Flavor Text[^^]*?<\/th><\/tr>[^^]*?<tr>[^^]*?<td scope="col" colspan="2" style="[^"]*">([^^]*?)<\/td><\/tr>'
				}
			]
		}
	]
}); 

// Override parent functions
MyLittlePonyDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '_');
};
MyLittlePonyDictionary.prototype.parseHtml = function(html) {
	return html.replace(/\n\n/g, '\n');
};
MyLittlePonyDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'set': cardData[1],
		'rotate': cardData[2],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.mylittlepony = {};
// English
AutocardAnywhere.games.mylittlepony.en = new MyLittlePonyDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Netrunner
//==============================================================================
function NetrunnerDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

NetrunnerDictionary.prototype = new Dictionary({
	game: 'netrunner',
	description: 'Netrunner',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://netrunnerdb.com/find/?q=<name:simple>',
			'controlType': 'radio',
			'options': [
				{name: 'netrunnerdb', description: 'Netrunner DB', value: 'https://netrunnerdb.com/en/card/<en>'},
				{name: 'Custom', description: 'Custom:', value: ''}
			]
		},
		{
			'name': 'imageURL',
			'type': 'string',
			'resetToDefault': true,
			'default': 'https://card-images.netrunnerdb.com/v1/large/<en>.jpg'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'cardtext',
			'controlType': 'radio',
			'options': [
				{name: 'cardtext', description: 'Text', value: 'cardtext'},
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'flavourtext', description: 'Flavour', value: 'flavourtext'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://netrunnerdb.com/api/2.0/public/card/<en>',
			'sections': [
				{
					'name': 'cardtext',
					'description': 'Text',
					're': '"text":"([^"]*)"'
				},
				{
					'name': 'flavourtext',
					'description': 'Flavour',
					're': '"flavor":"([^^]*?)",'
				}
			]
		}
	]
});

// Override parent functions
NetrunnerDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '+');
};
NetrunnerDictionary.prototype.parseHtml = function(html) {
	//html = html.replace(/<span class="icon icon-([^"]*)"><\/span>/g, "$1");
	html = html.replace(/\\"/g, '');
	return html.replace(/\\n/g, "\n");
};
NetrunnerDictionary.prototype.findCardById = function(cardID, match, isDict) {

	function pad(num, size) {
		num = num.toString();
		while (num.length < size) num = "0" + num;
		return num;
	}

	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match,
		'match': match,
		'en': pad(cardID, 5),
		'id': cardID,
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.netrunner = {};
// English
AutocardAnywhere.games.netrunner.en = new NetrunnerDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Pokémon
//==============================================================================
function PokemonDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

PokemonDictionary.prototype = new Dictionary({
	game: 'pokemon',
	description: 'Pokémon',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://images.pokemontcg.io/<img>_hires.png'
		},
		{
			'name': 'priceURL',
			'type': 'string',
			'resetToDefault': true,
			'default': 'https://partner.tcgplayer.com/x3/pkphl.asmx/p?pk=AUTOANY&s=<set>&p=<name:simple>'
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'enableTcgPrices',
			'description': 'Display card prices (provided by TCGplayer)',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'info',
			'controlType': 'radio',
			'options': [
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'flavourtext', description: 'Flavour', value: 'flavourtext'},
				{name: 'attacks', description: 'Attacks', value: 'attacks'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://api.pokemontcg.io/v2/cards/<id>',
			'sections': [
				{
					'name': 'info',
					'description': 'Info'
				},
				{
					'name': 'flavourtext',
					'description': 'Flavour'
				},
				{
					'name': 'attacks',
					'description': 'Attacks'
				}
			]
		}
	]
}); 

// Override parent functions
PokemonDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20').toLowerCase();
};
/*
PokemonDictionary.prototype.parseHtml = function(html) {
	html = html.replace(/<\/span><p>/g, "\n");
	return html.replace(/<br \/>/g, "\n");
};
*/
PokemonDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match,
		'match': match,
		'id': cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};
PokemonDictionary.prototype.parseExtraInfo = function(content, section, card) {
	function addLine(div, text, indented, capitalised) {
		if (!text) return;

		let line = document.createElement("div");
		line.appendChild(document.createTextNode(text));
		if (indented) {
			line.style.setProperty('padding-left', '10px');
		}
		if (capitalised) {
			line.style.setProperty('text-transform', 'capitalize');
		}
		div.appendChild(line);
	}

	function processCard(card) {
		let type = '';
		if (card.supertype) {
			type += card.supertype + ' ';
		}
		if (card.subtypes) {
			type += card.subtypes.join(', ');
		}
		addLine(result, type);
		if (card.level) {
			addLine(result, 'Level: ' + card.level);
		}
		if (card.hp) {
			addLine(result, 'HP: ' + card.hp);
		}
		if (card.evolvesFrom) {
			addLine(result, 'Evolves from ' + card.evolvesFrom);
		}
		if (card.evolvesTo) {
			addLine(result, 'Evolves into ' + card.evolvesTo);
		}
		if (card.rarity) {
			addLine(result, 'Rarity: ' + card.rarity);
		}
	}

	let overlayWidth = card.rotate == 90 ? AutocardAnywhere.popupHeight - 20 : AutocardAnywhere.popupWidth - 20;

	// Parses the returned content for the specified section
	let list = JSON.parse(content);
	let result = document.createElement("div");
	result.style.setProperty('width', overlayWidth + 'px');

	let data = list.data;
	if (section.name == 'info') {
		processCard(data);
	}
	else if (section.name == 'flavourText') {
		if (data.flavorText) {
			addLine(result, data.flavorText);
		}
	}
	else if (section.name == 'attacks') {
		if (data.attacks) {
			data.attacks.map(function(attack) {
				addLine(result, attack['name']);
				addLine(result, attack['text'], true);
			});
		}
	}

	return result;
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.pokemon = {};
// English
AutocardAnywhere.games.pokemon.en = new PokemonDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Scrolls
//==============================================================================
function ScrollsDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

ScrollsDictionary.prototype = new Dictionary({
	game: 'scrolls',
	description: 'Scrolls',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.scrollsguide.com/wiki/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://www.scrollsguide.com/wiki/images/<img>'
		}
	]
}); 

// Override parent functions
ScrollsDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.scrolls = {};
// English
AutocardAnywhere.games.scrolls.en = new ScrollsDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Solforge
//==============================================================================
function SolforgeDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

SolforgeDictionary.prototype = new Dictionary({
	game: 'solforge',
	description: 'Solforge',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://cards.solforgegame.com/?text=true&level=<level>&term=<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://sites.cdn.stoneblade.com/cardart/levels-low/<en>.png'
		},
		{
			'name': 'paginationNumbers',
			'type': 'boolean',
			'default': true
		}
	],
	extraInfo: [
		{
			'url': 'http://cards.solforgegame.com/?text=true&level=<level>&term=<name:simple>',
			'sections': [
				{
					'name': 'info',
					'description': 'Card Text',
					're': '<div class="cardtext">([^^]*?)<\/div>'
				}
			]
		}
	]
}); 

// Override parent functions
SolforgeDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20').toLowerCase();
};
SolforgeDictionary.prototype.parseHtml = function(html) {
	return html.replace(/\n/g, "").replace(/<br \/>/g, "\n");
};
SolforgeDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardData[0],
		'id': cardID,
		'level': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.solforge = {};
// English
AutocardAnywhere.games.solforge.en = new SolforgeDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Sorcery
//==============================================================================
function SorceryDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

SorceryDictionary.prototype = new Dictionary({
	game: 'sorcery',
	description: 'Sorcery: Contested Realm',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://curiosa.io/cards/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://d27a44hjr9gen3.cloudfront.net/<set>/<name:simple>.png'
		}
	]
}); 

// Override parent functions
SorceryDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '_').toLowerCase();
};
SorceryDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'set': cardData[0],
		'rotate': cardData[1] || 0,
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.sorcery = {};
// English
AutocardAnywhere.games.sorcery.en = new SorceryDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Star Realms
//==============================================================================
function StarrealmsDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

StarrealmsDictionary.prototype = new Dictionary({
	game: 'starrealms',
	description: 'Star Realms',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.starrealms.com/wp-content/uploads/<img>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://www.starrealms.com/wp-content/uploads/<img>'
		}
	]
}); 

// Override parent functions
StarrealmsDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'rotate': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.starrealms = {};
// English
AutocardAnywhere.games.starrealms.en = new StarrealmsDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Warframe
//==============================================================================
function WarframeDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

WarframeDictionary.prototype = new Dictionary({
	game: 'warframe',
	description: 'Warframe Mods',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://warframe.wikia.com/wiki/<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': '<img>'
		}
	]
}); 

// Override parent functions
WarframeDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'link': cardData[1],
		'isDict': isDict || 0
	};
};
// Utility functions
Dictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '_');
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.warframe = {};
// English
AutocardAnywhere.games.warframe.en = new WarframeDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': false,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// World of Warcraft TCG
//==============================================================================
function WowDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

WowDictionary.prototype = new Dictionary({
	game: 'wow',
	description: 'World of Warcraft TCG',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://www.wowcards.info/scans/<set>/en/<en><img>.jpg'
		},
		{
			'name': 'priceURL',
			'type': 'string',
			'resetToDefault': true,
			'default': 'https://partner.tcgplayer.com/x3/wowtcgphl.asmx/p?pk=AUTOANY&s=<set>&p=<name:simple>'
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/WoW/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'enableTcgPrices',
			'description': 'Display card prices (provided by TCGplayer)',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'text',
			'controlType': 'radio',
			'options': [
				{name: 'text', description: 'Text', value: 'text'},
				{name: 'legality', description: 'Legality', value: 'legality'},
				{name: 'editions', description: 'Editions', value: 'editions'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'http://www.wowcards.info/card/<set>/en/<en>/<name:simple>',
			'sections': [
				{
					'name': 'text',
					'description': 'Text',
					're': '(<p class="cardfront">[^^]*?</p>[^^]*?<p class="cardback">[^^]*?</p>|<p class="cardfront">[^^]*?</p>)'
				},
				{
					'name': 'legality',
					'description': 'Legality',
					're': '<strong>Tournament Legality:</strong>[^^]*?<li>([^^]*?)</ul>'
				},
				{
					'name': 'editions',
					'description': 'Editions',
					're': '<strong>Editions:</strong>[^^]*?<strong>([^^]*?)</div>'
				}
			]
		}
	]
}); 

// Override parent functions
WowDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20').replace(/:(?=[^\/])/g, '').toLowerCase();
};
WowDictionary.prototype.parseHtml = function(html) {
	// Replace img tags with their alt attribute
	html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '$1');
	return html.replace(/<p class="cardfront">/g, "Front:").replace(/<p class="cardback">/g, "Back:").replace(/<li>/g, "").replace(/<\/p>/g, "");
};
WowDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardData[0],
		'id': cardID,
		'set': cardData[1],
		'isDoubleFaced': cardData[2],
		'img': '_' + this.simplify(match),
		'isDict': isDict || 0
	};
};
WowDictionary.prototype.findCards = function(cardname, overrideIgnoreDictionaryWords) {
	// Gets all cards that are linked from cardname...
	let link = this.findCardLink(cardname, overrideIgnoreDictionaryWords);
	if (!link) {return}
	let cards = [];
	link.cardIDs.map(function(cardID) {
		let card = this.findCardById(cardID, link.match, link.isDict);
		if (card) {
			cards.push(card);
			if (card.isDoubleFaced) { // If it's a double-faced card
				// Add an extra copy for the card back
				let b={};
				for (i in card) {
					b[i]=card[i];
				}
				b.img = '-back';
				cards.push(b);
			}
		}
	}, this);
	return cards;
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.wow = {};
// English
AutocardAnywhere.games.wow.en = new WowDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// X-Wing Miniatures
//==============================================================================
function XwingDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

XwingDictionary.prototype = new Dictionary({
	game: 'xwing',
	description: 'X-Wing Miniatures',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'http://www.afewmaneuvers.com/<link>/'
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'http://www.mediafire.com/convkey/<img>'
		}
	]
}); 

// Override parent functions
XwingDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'en': cardID,
		'id': cardID,
		'img': cardData[0],
		'link': cardData[1],
		'isDict': isDict || 0
	};
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.xwing = {};
// English
AutocardAnywhere.games.xwing.en = new XwingDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});

//==============================================================================
// Yugioh
//==============================================================================
function YugiohDictionary(config) {
	this.description = this.description + ' - ' + config.description;
	this.language = config.language;
	this.options = this.settings.concat(config.settings);
};

YugiohDictionary.prototype = new Dictionary({
	game: 'yugioh',
	description: 'Yu-Gi-Oh!',
	// Settings and initialisation
	settings: [
		{
			'name': 'linkTarget',
			'description': 'Link target:',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>',
			'controlType': 'radio',
			'options': [
				{name: 'TCGPlayer', description: 'TCGplayer', value: 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'},
				{name: 'YGOPRODECK', description: 'YGOPRODECK', value: 'https://ygoprodeck.com/card/?search=<id>'},
				{name: 'YuGiOh Wiki', description: 'YuGiOh Wiki', value: 'https://yugipedia.com/wiki/<name:simple>'},
				{name: 'Custom', description: 'Custom:', value: ''}
			]
		},
		{
			'name': 'imageURL',
			'description': 'Image source:',
			'type': 'string',
			'default': 'https://images.ygoprodeck.com/images/cards/<id>.jpg'
		},
		{
			'name': 'priceURL',
			'type': 'string',
			'resetToDefault': true,
			'default': 'https://partner.tcgplayer.com/x3/ygophl.asmx/p?pk=AUTOANY&s=&p=<name>&n='
		},
		{
			'name': 'tcgPlayerURL',
			'type': 'string',
			'default': 'https://store.tcgplayer.com/<game>/product/show?ProductName=<name:simple>'
		},
		{
			'name': 'cardmarketURL',
			'type': 'string',
			'default': 'https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=<name:simple>'
		},
		{
			'name': 'enableTcgPrices',
			'description': 'Display card prices (provided by TCGplayer)',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'defaultSection',
			'description': 'Default info section:',
			'type': 'string',
			'default': 'text',
			'controlType': 'radio',
			'options': [
				{name: 'text', description: 'Text', value: 'text'},
				{name: 'info', description: 'Info', value: 'info'},
				{name: 'sets', description: 'Set', value: 'sets'}
			]
		}
	],
	extraInfo: [
		{
			'url': 'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=<name:simple>',
			'sections': [
				{
					'name': 'text',
					'description': 'Text'
				},
				{
					'name': 'info',
					'description': 'Info'
				},
				{
					'name': 'sets',
					'description': 'Set'
				}
			]
		}
	]
});

// Override parent functions
YugiohDictionary.prototype.simplify = function(s) {
	return s.replace(/ /g, '%20');
};
/*
YugiohDictionary.prototype.parseHtml = function(html) {
	// Replace img tags with their alt attribute
	html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '$1');
	return html.replace(/<p class="cardfront">/g, "Front:").replace(/<p class="cardback">/g, "Back:").replace(/<li>/g, "").replace(/<\/p>/g, "");
};
*/
YugiohDictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'id': cardID,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'isDict': isDict || 0
	};
};
YugiohDictionary.prototype.parseExtraInfo = function(content, section, card) {

	function addLine(div, text, indented, capitalised) {
		if (!text) return;

		let line = document.createElement("div");
		line.appendChild(document.createTextNode(text));
		if (indented) {
			line.style.setProperty('padding-left', '10px');
		}
		if (capitalised) {
			line.style.setProperty('text-transform', 'capitalize');
		}
		div.appendChild(line);
	}

	function processCard(card) {
		if (card.level) {
			addLine(result, 'Level: ' + card.level);
		}
		if (card.race) {
			addLine(result, 'Race: ' + card.race);
		}
		if (card.type) {
			addLine(result, 'Type: ' + card.type);
		}
		if (card.archetype) {
			addLine(result, 'Archetype: ' + card.archetype);
		}
		if (card.atk) {
			addLine(result, 'ATK/' + card.atk + ' DEF/' + card.def);
		}
	}

	let overlayWidth = card.rotate == 90 ? AutocardAnywhere.popupHeight - 20 : AutocardAnywhere.popupWidth - 20;

	// Parses the returned content for the specified section
	let list = JSON.parse(content);
	let result = document.createElement("div");
	result.style.setProperty('width', overlayWidth + 'px');

	for (let i in list.data) {
		let card = list.data[i];
		if (section.name == 'text') {
			if (card.desc) {
				addLine(result, 'Card Text:');
				let lines = card.desc.split("\n");
				lines.map(function(line) {
					addLine(result, line, true);
				});
			}
			break;
		}
		else if (section.name == 'info') {
			processCard(card);
			break;
		}
		else if (section.name == 'sets') {
			let sets = [];
			for (let j in card.card_sets) {
				sets.push(card.card_sets[j].set_name);
			}

			// Sort the set list alphabetically
			sets.sort();
			// Remove any duplicates
			sets = [...new Set(sets)];
			sets.map(function(set) {
				addLine(result, set);
			});
		}
	}

	return result;
};

//==============================================================================
// Individual language(s)
//==============================================================================
AutocardAnywhere.games.yugioh = {};
// English
AutocardAnywhere.games.yugioh.en = new YugiohDictionary({
	description: 'English',
	language: 'en',
	settings: [
		{
			'name': 'ignoreDictionaryWords',
			'description': 'Ignore Dictionary Words',
			'type': 'boolean',
			'default': true,
			'controlType': 'checkbox'
		},
		{
			'name': 'emphasiseText',
			'type': 'boolean',
			'default': true
		}
	]
});