function Dictionary(config) {
	this.game = config.game;
	this.description = config.description;
	this.settings = config.settings;
	this.extraInfo = config.extraInfo;
}

Dictionary.prototype.load = function(callback) {
	let dictionary = this;
	AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix + dictionary.game + dictionary.language, dictionary.settings, function(data) {
		dictionary.settings = data;
		callback(dictionary);
	});
}
// Utility functions
Dictionary.prototype.simplify = function(s) {
	return s;
};
Dictionary.prototype.parseHtml = function(html) {
	return html;
};
// Lookup functions
Dictionary.prototype.findCardLink = function(cardname, overrideIgnoreDictionaryWords) {
	let dictionary = this;

	function simpleTitleCase(str) {
		if (!dictionary.settings.emphasiseText) return str;
		// This has to exactly match what the equivalent funcion in util.php is doing.
		// Capitalise the first letter of the string
		str = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
		// Capitalise anything that follows a space, full stop, hyphen, slash, ampersand, speech mark or bracket.
		str = str.replace(/([\s\.\-\/&"\(\)])([a-z])/g, function(match, character, letter) {
			return character + letter.toUpperCase();
		});
		return str;
	};

	let lookup = simpleTitleCase(cardname).replace(/’/g,"'").replace(/"/g, '`').replace(/&amp;/g, '&');
	let link = this.cardNames[lookup];
	//if (!link) link = this.cardNames[cardname];
	if (!link) {return}
	let result = {};
	result.match = link[0] || lookup;

	if (AutocardAnywhere.caseSensitive && (result.match != cardname)) {return}

	result.cardIDs = link[1];
	result.isDict = (link[2] == 1);
	// Ignore dictionary words check is done here so that if a card is in 2 card lists 
	// and 1 has "ignore dictionary" on and the other doesn't, only the desired 1 gets 
	// added to the carousel.
	// Check that we've not been asked to override the setting 
	// and that the ignore dictionary words setting is set
	// and that the card name is a dictionary word 
	// and that the card name isn't on the "always link" override list.
	if (!overrideIgnoreDictionaryWords && dictionary.settings.ignoreDictionaryWords && result.isDict  && !AutocardAnywhere.unignoreList[cardname.toLowerCase()]) {return}
	return result;
};
Dictionary.prototype.findCardById = function(cardID, match, isDict) {
	let cardData = this.cardData[cardID];
	if (!cardData) {return}
	return {
		'game': this.game,
		'language': this.language,
		'name': match.replace(/"/g, '`'),
		'match': match,
		'id': cardID,
		'en': cardData[0],
		'set': cardData[1],
		'img': cardData[2],
		'isDict': isDict || 0
	};
};
Dictionary.prototype.findCard = function(cardname, overrideIgnoreDictionaryWords) {
	// Gets the first card that is linked from cardname...
	let link = this.findCardLink(cardname, overrideIgnoreDictionaryWords);
	if (!link) {return}
	let card = this.findCardById(link.cardIDs[0], link.match, link.isDict);
	if (!card) {return}
	card.linkCount = link.cardIDs.length;
	card.override = overrideIgnoreDictionaryWords;
	return card;
};
Dictionary.prototype.findCards = function(cardname, overrideIgnoreDictionaryWords) {
	// Gets all cards that are linked from cardname...
	let link = this.findCardLink(cardname, overrideIgnoreDictionaryWords);
	if (!link) {return}
	let cards = [];
	link.cardIDs.map(function(cardID) {
		let card = this.findCardById(cardID, link.match, link.isDict);
		if (card) {
			card.override = overrideIgnoreDictionaryWords;
			//console.log(card);
			if (card.rotate == 180) { // If it's a flip card
				// Add an extra copy the original way up
				let b={};
				for (i in card) {
					b[i]=card[i];
				}
				b.rotate = 0;
				cards.push(b);
			}
			cards.push(card);
			if (card.dfc == 1) { // If it's a double-faced card
				// Add an extra copy for the back face
				let b={};
				for (i in card) {
					b[i]=card[i];
				}
				b.face = 'back';
				cards.push(b);
			}
		}
	}, this);
	return cards;
};
Dictionary.prototype.fuzzyLookup = function(cardname) {
	cardname = cardname.toLowerCase();
	let cards = [];
	for (let name in this.cardNames) {
		if (AutocardAnywhere.levenshtein(cardname, name.toLowerCase()) <= AutocardAnywhereSettings.maxLevenshteinFactor) {
			cards.push(this.findCard(name, true));
		}
	}
	return cards;
};
// Functions called when linkifying the page
Dictionary.prototype.createLinkElement = function(dictionary, card, linkText, href, cardID, isFuzzy) {
	let anchor = document.createElement("a");
	anchor.href = href ? href : AutocardAnywhere.appendPartnerString(AutocardAnywhere.format(dictionary.settings.linkTarget, card, dictionary));
	anchor.className = 'autocardanywhere-link';
	if (dictionary.settings.emphasiseText) { anchor.className += ' autocardanywhere-emphasised'; }
	anchor.dataset.dictionary = this.game + this.language;
	if (cardID) {
		anchor.dataset.multiverseid = cardID;
	}
	else {
		anchor.dataset.name = card.match;
	}
	if (AutocardAnywhere.openInNewTab) { anchor.target = '_blank'; }
	if (isFuzzy) { anchor.dataset.fuzzy = '1'; }
	if (card.override) { anchor.dataset.override = '1'; }
	if (linkText) {
		anchor.appendChild(document.createTextNode(linkText));
	}
	else {
		anchor.appendChild(document.createTextNode((dictionary.settings.expandLegendNames && card.linkCount==1) ? card.name : card.match));
	}

	let result = document.createElement('span');
	result.appendChild(anchor);
	return result;
};
Dictionary.prototype.createLink = function(dictionary, card, linkText, href, cardID, isFuzzy) {
	return AutocardAnywhere.decodeHTMLEntities(this.createLinkElement(dictionary, card, linkText, href, cardID, isFuzzy).innerHTML);
};
Dictionary.prototype.run = function(text) {
	let dictionary = this;
	text = ' ' + text.replace(/\u00a0/g, " ") + ' ';
	text = text.replace(dictionary.test, function (match, f, s, suffix, t) {
		if (AutocardAnywhere.ignoreList[s.toLowerCase()]) {return match}
		
		// Get the first card in the array
		let card = dictionary.findCard(s, ((f == '[') && (t == ']')));
		// If no card was found, or we don't want to link this card then return the text unchanged
		if ((!card) || (AutocardAnywhere.ignoreList[card.name.toLowerCase()])) {return match}
		
		return f + dictionary.createLink(dictionary, card);
	});
	text = text.substr(1, text.length-2);
	return text;
};
// Functions related to the popup
Dictionary.prototype.getCardElement = function(card, linkCount) {
	let dictionary = this;
	let linkHref = AutocardAnywhere.format(dictionary.settings.linkTarget, card, dictionary) + AutocardAnywhereSettings.partnerString;

	let result = document.createElement("div");
	result.className = 'autocardanywhere-card swiper-slide';
	result.dataset.url = linkHref;

	let cardDiv = document.createElement("div");
	cardDiv.className = 'autocardanywhere-loading';
	cardDiv.style.height = AutocardAnywhere.popupHeight + 'px';
	cardDiv.style.width = AutocardAnywhere.popupWidth + 'px';
	let cardImg = document.createElement("img");
	cardImg.style.height = AutocardAnywhere.popupHeight + 'px';
	cardImg.style.width = AutocardAnywhere.popupWidth + 'px';
	cardImg.dataset.id = card.id + '-' + card.face;
	//cardImg.style.mixBlendMode = 'multiply';

	if (card.ratio == 'square') {
		cardDiv.style.width = AutocardAnywhere.popupHeight + 'px';
		cardImg.style.width = AutocardAnywhere.popupHeight + 'px';
	}

	let overlayWidth = AutocardAnywhere.popupWidth;
	let overlayHeight = AutocardAnywhere.popupHeight;

	// If we have rotation set at 360 and are using Scryfall as the image target, then change rotation to 90.
	if ((card.rotate == 360) && (dictionary.settings.imageURL.indexOf('api.scryfall.com') > -1)) {
		card.rotate = 90;
	}

	// Rotation 90 - split cards
	if (card.rotate == 90) {
		let left = (AutocardAnywhere.popupHeight - AutocardAnywhere.popupWidth) / 2;
		//if (linkCount == 1) {
			//left += 10;
		//}
		let top = (AutocardAnywhere.popupWidth - AutocardAnywhere.popupHeight) / 2;

		cardDiv.style.marginRight = '5px';
		cardDiv.style.height = AutocardAnywhere.popupWidth + 'px';
		cardDiv.style.width = AutocardAnywhere.popupHeight + 'px';

		cardImg.style.transform = "rotate(90deg)";
		cardImg.style.webkitTransform = "rotate(90deg)";
		cardImg.style.position = 'absolute';
		cardImg.style.left = left + 'px';
		cardImg.style.top = top + 'px';

		overlayWidth = AutocardAnywhere.popupHeight;
		overlayHeight = AutocardAnywhere.popupWidth;
	}
	// Rotation 180 - flip cards
	else if (card.rotate == 180) {
		cardImg.style.transform = "rotate(180deg)";
		cardImg.style.webkitTransform = "rotate(180deg)";
	}
	// Rotation 360 - Plane or Phenomenon
	else if (card.rotate == 360) {
		cardDiv.style.marginRight = '5px';
		cardDiv.style.height = AutocardAnywhere.popupWidth + 'px';
		cardDiv.style.width = AutocardAnywhere.popupHeight + 'px';

		cardImg.style.height = AutocardAnywhere.popupWidth + 'px';
		cardImg.style.width = AutocardAnywhere.popupHeight + 'px';

		overlayWidth = AutocardAnywhere.popupHeight;
		overlayHeight = AutocardAnywhere.popupWidth;
	}
	cardDiv.appendChild(cardImg);

	// If the extra info setting is enabled and this game type has extra info sources defined
	let extraInfoDiv = '';
	if (AutocardAnywhere.enableExtraInfo && dictionary.extraInfo && (dictionary.extraInfo.length > 0)) {
		let extraInfoDiv = document.createElement("div");
		let textBoxHeight = overlayHeight - 43;

		let sectionCount = 0;
		dictionary.extraInfo.map(function(source) {
			sectionCount += source.sections.length;
		});

		let buttonWidth = Math.round(96 / sectionCount);

		extraInfoDiv.className = 'autocardanywhere-data autocardanywhere-data-' + dictionary.game + dictionary.language + '-' + card.id;
		extraInfoDiv.style.display = 'none';
		extraInfoDiv.style.position = 'absolute';
		extraInfoDiv.style.width = overlayWidth + 'px';
		extraInfoDiv.style.height = overlayHeight + 'px';
		extraInfoDiv.style.setProperty('background-color', '#000000', 'important');
		extraInfoDiv.style.color = '#ffffff';
		extraInfoDiv.style.opacity = 0.85;
		extraInfoDiv.style.borderRadius = '10px';
		extraInfoDiv.style.fontSize = AutocardAnywhere.fontSize + 'px';
		//extraInfoDiv.style.fontFamily = AutocardAnywhereSettings.font;
		extraInfoDiv.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
		extraInfoDiv.style.left = '0px';
		extraInfoDiv.style.top = '0px';

		let buttonDiv = document.createElement("div");
		buttonDiv.style.marginLeft = '3px';
		buttonDiv.style.marginTop = '5px';
		buttonDiv.style.width = (overlayWidth-6) + 'px';

		dictionary.extraInfo.map(function(source) {
			source.sections.map(function(section) {
				let sourceButton = document.createElement("button");
				sourceButton.dataset.div = 'autocardanywhere-' + section.name;
				sourceButton.style.marginLeft = '1px';
				sourceButton.style.marginRight = '1px';
				sourceButton.style.background = 'transparent';
				sourceButton.style.borderRadius = '3px';
				sourceButton.style.border = '3px solid #4A6594';
				sourceButton.style.color = '#ffffff';
				//sourceButton.style.fontFamily = AutocardAnywhereSettings.font;
				sourceButton.style.fontSize = AutocardAnywhere.fontSize + 'px';
				sourceButton.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
				sourceButton.style.float = 'left';
				sourceButton.style.width = buttonWidth + '%';
				sourceButton.style.textTransform = 'none';
				sourceButton.style.wordWrap = 'normal';
				sourceButton.appendChild(document.createTextNode(section.description));
				buttonDiv.appendChild(sourceButton);
			});
		});
		extraInfoDiv.appendChild(buttonDiv);

		let hidden = false;
		dictionary.extraInfo.map(function(source) {
			source.sections.map(function(section) {
				let infoDiv = document.createElement("div");
				infoDiv.className = 'autocardanywhere-data-section autocardanywhere-' + section.name;
				infoDiv.style.color = '#ffffff';
				//infoDiv.style.fontFamily = AutocardAnywhereSettings.font;
				infoDiv.style.fontSize = AutocardAnywhere.fontSize + 'px';
				infoDiv.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
				infoDiv.style.float = 'left';
				infoDiv.style.textTransform = 'none';
				infoDiv.style.height = textBoxHeight + 'px';
				infoDiv.style.overflow = 'auto';
				infoDiv.style.setProperty('padding', '5px', 'important');
				if (!dictionary.settings.defaultSection)  { 
					if (hidden) infoDiv.style.display = 'none';
				}
				else if (section.name != dictionary.settings.defaultSection) {
					infoDiv.style.display = 'none';
				}
				extraInfoDiv.appendChild(infoDiv);
				hidden = true;
			});
		});

		cardDiv.appendChild(extraInfoDiv);
	}	
	
	result.appendChild(cardDiv);

	function createOuterPriceDiv() {
		let result = document.createElement("div");
		result.style.textDecoration = 'none';
		result.style.fontWeight = 400;
		//result.style.height = '36px';
		return result;
	}

	if (dictionary.settings.tcgPlayerURL || dictionary.settings.cardmarketURL) {
		let outerDiv = createOuterPriceDiv();
		let pricesDiv = AutocardAnywhere.createPricesElement('autocardanywhere-prices-' + card.id);
		let colours = AutocardAnywhereSettings.themes[AutocardAnywhere.theme];

		if (dictionary.settings.tcgPlayerURL && dictionary.settings.enableTcgPrices !== false) {
			let tcgplayerLink = AutocardAnywhere.appendPartnerString(AutocardAnywhere.format(dictionary.settings.tcgPlayerURL, card, dictionary));
			pricesDiv.appendChild(dictionary.createPriceElement(tcgplayerLink, 'TCGplayer', 0, colours['tcg']));
		}
		if (dictionary.settings.cardmarketURL && dictionary.settings.enableCardmarketPrices !== false) {
			let cardmarketLink = AutocardAnywhere.appendPartnerString(AutocardAnywhere.format(dictionary.settings.cardmarketURL, card, dictionary));
			pricesDiv.appendChild(dictionary.createPriceElement(cardmarketLink, 'Cardmarket', 0, colours['cardmarket']));
		}

		if (dictionary.settings.enableTcgPrices || dictionary.settings.enableCardmarketPrices || dictionary.settings.enableOnlinePrices) {
			pricesDiv.style.height = '100px';
		}

		outerDiv.appendChild(pricesDiv);
		result.appendChild(outerDiv);
	}


	return result;
};
Dictionary.prototype.formatCurrency = function(value) {
	let result = value.toLocaleString(AutocardAnywhere.currency.locale, {style: 'currency', currency: AutocardAnywhere.currency.value});
	if (AutocardAnywhere.currency.symbol) {
		result = result.replace(/[^\d\.]/g, '');
		if (AutocardAnywhere.currency.suffix && AutocardAnywhere.currency.suffix == 1) {
			result = result + ' ' + AutocardAnywhere.currency.symbol;
		}
		else { // Prefix
			result = AutocardAnywhere.currency.symbol + result;
		}
	}
	return result;
};
Dictionary.prototype.createPriceElement = function(href, text, price, colour) {
	let dictionary = this;
	let result = document.createElement("a");
	result.href = href;
	if (AutocardAnywhere.openInNewTab) { result.target = "_blank"; }

	let priceDiv = document.createElement("div");
	let left = document.createElement("div");
	let right = document.createElement("div");
	left.style.float = 'left';
	right.style.float = 'left';
	left.style.width = '70%';
	right.style.width = '30%';
	left.appendChild(document.createTextNode('Buy at ' + text));
	// If the price is in tix, just insert it.
	if (typeof(price) === 'string' && price.indexOf('tix') > -1) {
		right.appendChild(document.createTextNode(price));
	}
	// Else if the price isn't zero, insert it with currency symbol.
	else if (price > 0) {
		right.appendChild(document.createTextNode(dictionary.formatCurrency(price)));
	}
	priceDiv.appendChild(left);
	priceDiv.appendChild(right);
	//priceDiv.style.setProperty('background-color', colour, 'important');
	priceDiv.style.height = '20px';
	priceDiv.style.marginTop = '2px';
	priceDiv.style.fontSize = AutocardAnywhere.fontSize + 'px';
	priceDiv.style.lineHeight = '20px';
	priceDiv.style.overflow = 'hidden';
	priceDiv.style.whiteSpace = 'nowrap';
	priceDiv.style.boxSizing = 'content-box';
	//priceDiv.style.textAlign = 'center';
	//priceDiv.style.color = '#414DD3';
	//priceDiv.style.color = '#000000';
	priceDiv.style.color = colour;
	//priceDiv.style.fontWeight = 'normal';
	//priceDiv.style.float = 'left';
	//priceDiv.style.width = (Math.floor(100 / count)) + '%';
	priceDiv.style.paddingLeft = '4px';
	//priceDiv.style.borderRadius = count == 1 ? '10px' : (position == 'left' ? '10px 0 0 10px' : (position == 'right' ? '0 10px 10px 0' : ''));
	priceDiv.style.borderColor = colour;
	priceDiv.style.borderWidth = '1px';
	priceDiv.style.borderStyle = 'solid';
	//priceDiv.style.fontFamily = AutocardAnywhereSettings.priceFont;
	
	$(priceDiv).on('mouseover', function() {
		this.style.backgroundColor = AutocardAnywhereSettings.themes[AutocardAnywhere.theme]['mouseover'];
		//this.style.color = '#000000';
	});
	$(priceDiv).on('mouseout', function() {
		this.style.backgroundColor = 'inherit';
		//this.style.color = 'inherit';
	});

	result.appendChild(priceDiv);
	return result;
};
/*
Dictionary.prototype.createPriceElement = function(href, text1, text2, colour, position, count) {
	let result = document.createElement("a");
	result.href = href;
	if (AutocardAnywhere.openInNewTab) { result.target = "_blank"; }

	let priceDiv = document.createElement("div");
	priceDiv.appendChild(document.createTextNode(text1));
	priceDiv.appendChild(document.createElement('br'));
	priceDiv.appendChild(document.createTextNode(text2));
	priceDiv.style.setProperty('background-color', colour, 'important');
	priceDiv.style.marginTop = '5px';
	priceDiv.style.fontSize = AutocardAnywhere.fontSize + 'px';
	priceDiv.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
	priceDiv.style.textAlign = 'center';
	priceDiv.style.color = '#414DD3';
	priceDiv.style.fontWeight = 'normal';
	priceDiv.style.float = 'left';
	priceDiv.style.width = (Math.floor(100 / count)) + '%';
	priceDiv.style.padding = '5px 0 5px 0';
	priceDiv.style.borderRadius = count == 1 ? '10px' : (position == 'left' ? '10px 0 0 10px' : (position == 'right' ? '0 10px 10px 0' : ''));
	priceDiv.style.fontFamily = AutocardAnywhereSettings.font;
	priceDiv.addEventListener('mouseover', function() {
		this.style.textDecoration="underline";
	});
	priceDiv.addEventListener('mouseout', function() {
		this.style.textDecoration="none";
	});

	result.appendChild(priceDiv);
	return result;
};
*/
Dictionary.prototype.parsePriceData = function(card, response, currencyExchangeRate) {
	let dictionary = this;
	let xmlDoc = $.parseXML(response);
	let dollarExchangeRate = currencyExchangeRate.dollarExchangeRate;
	let priceLinkHref = AutocardAnywhere.appendPartnerString(AutocardAnywhere.format(dictionary.settings.tcgPlayerURL, card, dictionary));
	let pricesDiv = AutocardAnywhere.createPricesElement('autocardanywhere-prices');
	let colours = AutocardAnywhereSettings.themes[AutocardAnywhere.theme];

	if (xmlDoc && xmlDoc.getElementsByTagName("lowprice")[0]) {
		let lowPrice = dollarExchangeRate * AutocardAnywhereSettings.stripHtml(xmlDoc.getElementsByTagName("lowprice")[0].childNodes[0].nodeValue);
		pricesDiv.appendChild(dictionary.createPriceElement(priceLinkHref, 'TCGplayer', lowPrice, colours['tcg']));

		//let avgPrice = dollarExchangeRate * AutocardAnywhereSettings.stripHtml(xmlDoc.getElementsByTagName("avgprice")[0].childNodes[0].nodeValue);
		//pricesDiv.appendChild(dictionary.createPriceElement(priceLinkHref, 'Median', avgPrice, colours['tcg']));

		//let hiPrice  = dollarExchangeRate * AutocardAnywhereSettings.stripHtml(xmlDoc.getElementsByTagName("hiprice")[0].childNodes[0].nodeValue);

		let enableFoil = xmlDoc.getElementsByTagName("foilavgprice")[0] && xmlDoc.getElementsByTagName("foilavgprice")[0].childNodes[0].nodeValue != '0';
		if (enableFoil) { 
			let foilPrice = dollarExchangeRate * AutocardAnywhereSettings.stripHtml(xmlDoc.getElementsByTagName("foilavgprice")[0].childNodes[0].nodeValue);
			pricesDiv.appendChild(dictionary.createPriceElement(priceLinkHref, 'Foil', foilPrice, colours['foil'])); 
		}
	}
	
	if (dictionary.settings.cardmarketURL) {
		let cardmarketLink = AutocardAnywhere.appendPartnerString(AutocardAnywhere.format(dictionary.settings.cardmarketURL, card, dictionary));
		pricesDiv.appendChild(dictionary.createPriceElement(cardmarketLink, 'Cardmarket', 0, colours['cardmarket']));
	}

	return pricesDiv;
};
Dictionary.prototype.parseExtraInfo = function(content, section, card) {
	// Parses the returned content using the specified regexp
	let insetting = false;
	let insetElement;

	function appendStrings(element, strings) {
		for (let i in strings) {
			let string = strings[i];
			if (string == '[inset]') {
				insetElement = document.createElement("div");
				insetElement.style.setProperty('padding-left', '10px', 'important');
				insetting = true;
			}
			else if (string == '[endinset]' && insetting) {
				element.appendChild(insetElement);
				insetting = false;
			}
			else if (insetting) {
				insetElement.appendChild(document.createTextNode(string));
				if (string.substr(-1) != ':') {
					insetElement.appendChild(document.createElement("br"));
				}
			}
			else {
				element.appendChild(document.createTextNode(string));
			}
		}
	}

	// Parses the returned content using the specified regexp
	let result = document.createElement("div");
	let width = AutocardAnywhere.popupWidth - 20;
	result.style.setProperty('width', width + 'px');
	
	if (!content) {
		result.appendChild(document.createTextNode('Failed to retrieve data'));
		return result;
	}
	let re = new RegExp(section.re, "g");
	let match = re.exec(content);
	while (match != null) {
		let strings = AutocardAnywhereSettings.stripHtml(this.parseHtml(match[1]));
		appendStrings(result, strings);
		if (match[2]) {
			let s = match[2];
			let lastString = strings[strings.length-1];
			if (!insetting) { s = (lastString.substr(-1) != ':' ? ':' : '&nbsp;') + s; }
			strings = AutocardAnywhereSettings.stripHtml(this.parseHtml(s)); 
			appendStrings(result, strings);
		}
		result.appendChild(document.createElement("br"));
		match = re.exec(content);
	}

	return result;
};