if (typeof chrome !== 'undefined') {var browser = chrome;}
if (!AutocardAnywhereSettings.isEmbedded && document.getElementById('autocardanywhereinstalled')) {
	throw new Error('AutocardAnywhere is already installed on this website.');
}

let AutocardAnywhere = {
	loaded: false,
	forceLoad: false,
	insertionCount: 0,
	insertionLimit: 1000,
	ignoredStrings: [],
	sendMessage(message) {
		return new Promise((resolve, reject) => {
			browser.runtime.sendMessage(message, response => resolve(response));
		});
	},
	ajax: function(url) {
		return new Promise((resolve, reject) => {
			// Performs an ajax call in the manner accepted by each browser.
			if (AutocardAnywhereSettings.isEmbedded) {
				if (url == 'exchangeRate') {
					resolve({
						dollarExchangeRate: 1.0,
						euroExchangeRate: 1.0,
						exchangeRateLastUpdatedv4: new Date()
					});
				}
				else {
					let xmlhttp = new XMLHttpRequest();
					xmlhttp.onreadystatechange = function() {
						if (xmlhttp.readyState==4) {
							resolve(xmlhttp.response);
						} 
					} 
					xmlhttp.open("GET", url, true); 
					xmlhttp.send();
				}
			}
			else if (AutocardAnywhereSettings.isSafari) {
				function getResponse(event) {
					if ((event.name != "getFileCallback") || (event.message.url != url)) {return}
					resolve(event.message.data);
				}
				safari.self.addEventListener("message", getResponse, false);
				safari.self.tab.dispatchMessage("getFile", {'url': url});
			}
			else { // Chrome, Opera, Firefox or Edge
				/*
				function messageReceived(response) {
					if (response.url != url) {return}
					AutocardAnywhere.persistentPort.onMessage.removeListener(messageReceived);
					resolve(response.data);
				}
				AutocardAnywhere.persistentPort.onMessage.addListener(messageReceived);
				AutocardAnywhere.persistentPort.postMessage({'type': 'file', 'url': url});
				*/

				AutocardAnywhere.sendMessage({'name': 'getFile', 'url': url}).then((response) => {
					resolve(response.data);
				});
			}
		});
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
		let doc = AutocardAnywhere.parser.parseFromString(html, "text/html");
        html = doc.documentElement.textContent;

		// Replace newlines with html line breaks
		html = html.replace(/\n\n\n/g, "\n");
		html = html.replace(/\n\n/g, "\n");
		//return html.replace(/\n/g, '<br/>');
		return html.split("\n");
	},
	createPricesElement: function(className, text) {
		let result = document.createElement("div");
		result.style.marginTop = '5px';
		result.style.fontSize = AutocardAnywhere.fontSize + 'px';
		result.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
		//result.style.fontFamily = AutocardAnywhereSettings.font;
		//result.style.textAlign = 'center';
		//result.style.color = '#000000';
		//result.style.backgroundColor = '#ffffff';
		if (className) {
			result.className = className;
		}
		if (text) {
			result.style.paddingTop = '12px';
			result.appendChild(document.createTextNode(text));
		}
		return result;
	},
	sleep: function(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	},
	replaceSelection: function(element) {
	    if (window.getSelection && window.getSelection().getRangeAt) {
	    	let range = window.getSelection().getRangeAt(0);
			let newNode = $.parseHTML(element)[0];
	        AutocardAnywhere.initialisePopups(newNode);
	        range.deleteContents();
	        range.insertNode(newNode);
	    }
	},
	getURL: function(filename) {
		if (AutocardAnywhereSettings.isEmbedded) {
			return 'https://cdn.jsdelivr.net/gh/Obtuse-Goose/AutocardAnywhere@latest/' + filename;
		}
		else if (AutocardAnywhereSettings.isSafari) {
			return safari.extension.baseURI + filename;
		}
		else { // Chrome, Opera, Firefox or Edge
			return browser.runtime.getURL(filename);
		}
	},
	getCurrentUrl: function() {
		if (typeof(window) === 'undefined') {return ''}
		if (typeof(window.document) === 'undefined') {return ''}
		if (typeof(window.document.location) === 'undefined') {return ''}
		return window.document.location.href.toLowerCase();
	},
	saveSettings: function(settings) {
		// Saves settings in browser-specific way
		if (AutocardAnywhereSettings.isSafari) {
			safari.self.tab.dispatchMessage('saveSettings', {'prefix': AutocardAnywhereSettings.prefix, 'settings': settings});
		}
		else { // Chrome, Opera, Firefox or Edge
			AutocardAnywhere.sendMessage({'name': 'saveSettings', 'prefix': AutocardAnywhereSettings.prefix, 'settings': settings});
		}
	},
	// Main extension code
	initialisePopups: function(node) {
		// Searches node for any autocard anywhere links and adds a popup.
		if (!AutocardAnywhere.enablePopups) return;
		
		function escape(s) {
			if (!s) {return ''}
			if (typeof(s) != 'string') {s = String(s)}
			return s.replace(/&/, "&amp;");
		}
		
		function haveCardFromGame(cards, gameName) {
			for (let i in cards) {
				if (cards[i].game == gameName) {
					return true;
				}
			}
			return false;
		}

		$(node).find('a.' + AutocardAnywhereSettings.className).each(function() {
			let target = $(this);
			//if (target.data('popup')) return;
			let cards = new Array();

			if (AutocardAnywhere.isTouchInterface) {
				target.bind('click', function(event) {
					if (!target[0]._tippy.state.isShown) {
						event.preventDefault();
						return false;
					}
				});
			}

			if (target.data('fuzzy')) {
				// Do a fuzzy lookup by name in all dictionaries
				for (let i in AutocardAnywhere.dictionaries) {
					if (!haveCardFromGame(cards, AutocardAnywhere.dictionaries[i].game)) {
						let c = AutocardAnywhere.dictionaries[i].fuzzyLookup(escape(target.data('name')));
						if (c) {
		        			cards = cards.concat(c);
		        		}
		        	}
	        	}
			}
			else if (target.data('name')) {
				// If this link was created by the replace function, the "override" data property will have been set. 
				// If so, we need to override the ignoreDictionaryWords setting for this card.
				let override = target.data('override');
				// If linked by name, lookup that name in all dictionaries
				for (let i in AutocardAnywhere.dictionaries) {
					if (!haveCardFromGame(cards, AutocardAnywhere.dictionaries[i].game)) {
						let c = AutocardAnywhere.dictionaries[i].findCards(escape(target.data('name')), override);
						if (c) {
		        			cards = cards.concat(c);
		        		}
		        	}
	        	}
			}
			else {
				// Get the dictionary and card that this link was created from
				let dictionary = AutocardAnywhere.dictionaries[target.data('dictionary')];
				cards.push(dictionary.findCardById(target.data('multiverseid')));
			}

			if (cards.length === 0) return;

			// Create the tip for this link
			// Get the matched text
			let text = this.childNodes[0];
			// If the linked node just contains text, display it's nodeValue...
			if (text && text.nodeType == 3) {
				text = text.nodeValue.trim();
			}
			// ...else use jQuery to get the amalgamated text contents of all child nodes
			else {
				text = target.text();
			}
			// If we didn't find the linked text, use the matched card's name instead.
			if (text == '') {
				text = cards[0].match;
			}

			function getCardsElement(cards) {
				if (!cards) {return}
				
				let result = document.createElement("div");
				result.className = AutocardAnywhereSettings.className + ' swiper-container swiper-no-swiping';
				result.style.fontFamily = AutocardAnywhereSettings.font;

				let cardsElement = document.createElement("div");
				cardsElement.style.fontWeight = 'normal';

				// Get the dom element for each card
				cards.map(function(card) {
					let dictionary = AutocardAnywhere.dictionaries[card.game + card.language];
					cardsElement.appendChild(dictionary.getCardElement(card, cards.length));
				});
				result.appendChild(cardsElement);
				// If there are multiple cards to display, use a carousel...
				if (cards.length > 1) {
					let width = AutocardAnywhere.popupWidth;
					cards.map(function(card) {
						if (card.rotate == 90 || card.rotate == 360) {
							width = AutocardAnywhere.popupHeight;
						}
					});
					cardsElement.className = 'swiper-wrapper';
					cardsElement.style.width = width + 'px';

					let paginationElement = document.createElement("div");
					paginationElement.className = 'swiper-pagination';
					paginationElement.style.position = 'static';
					paginationElement.style.marginTop = '5px';
					paginationElement.style.width = AutocardAnywhere.popupWidth;
					result.appendChild(paginationElement);
				}
				
				if (AutocardAnywhere.enableIgnoreCardLink) {
					let ignore = document.createElement("a");
					//ignore.href = '#';
					ignore.style.marginTop = '2px';
					ignore.style.float = 'right';
					ignore.style.fontSize = '10px';
					ignore.style.textDecoration = 'none';
					ignore.style.color = '#243F7E';
					ignore.style.cursor = 'pointer';
					ignore.appendChild(document.createTextNode('Ignore this card in future'));
					$(ignore).on('click', function() {
						// Hide the current popup
						tippy.hideAll({duration: 0});
						// Remove the current link
						target.replaceWith(function() {
							return $(this).text();
						});
						// Add the card name to the ignored cards list
						AutocardAnywhere.ignoredCards += '|' + text;
						AutocardAnywhere.saveSettings({
							ignoredCards: AutocardAnywhere.ignoredCards
						});
					});
					result.appendChild(ignore);
				}
				
            	return result;
			}
			
			// Grab the tooltip content
			let popupContent = getCardsElement(cards);
			let content = $(popupContent);
			let swiper;

			// Initialise the tip
			tippy(this, {
				popperOptions: {
					modifiers: [{
						name: 'fixBodyTransform',
						enabled: true,
						phase: 'main',
						fn({ state }) {
							if (AutocardAnywhere.url.indexOf('dorcishlibrarian.net') == -1) return;
							let bodyRect = document.body.getBoundingClientRect();
							state.modifiersData.popperOffsets.x -= bodyRect.x + document.documentElement.scrollLeft;
							state.modifiersData.popperOffsets.y -= bodyRect.y + document.documentElement.scrollTop;
						}
					}]
				},
				placement: 'right',
				inlinePositioning: true,
				allowHTML: true,
				interactive: true,
				interactiveBorder: 30,
				//interactiveDebounce: 75,
				hideOnClick: false,
				theme: AutocardAnywhere.theme == 'dark' ? 'material' : 'light',
				animation: AutocardAnywhere.popupAnimation, // scale, perspective, shift-away, shift-toward
				duration: [AutocardAnywhere.popupShowDuration, AutocardAnywhere.popupHideDuration],
				inertia: true,
				appendTo: () => document.body,
				content: popupContent,
				zIndex: 999999,
				onShow() {
					// Hide all other tips
					tippy.hideAll({duration: 300});
					// If there is a carousel in this tip, start it playing.
					if (swiper && AutocardAnywhere.carouselAutoPlay) {
						swiper.autoplay.start();
					}
				},
				onHide() {
					// If there is a carousel in this tip, stop it playing.
					if (swiper && AutocardAnywhere.carouselAutoPlay) {
						swiper.autoplay.stop();
					}
				},
				onTrigger() {
					// If this tooltip has already been rendered, do nothing
					//if (target.data('popup')) return;
					if (!target.is('a.' + AutocardAnywhereSettings.className)) return;

					//let paginationNumbers = false;
					let extraInfoEnabled = false;
					let pricesEnabled = false;

					function checkIfLoadComplete() {
						if ((!extraInfoEnabled || content.find('.autocardanywhere-loaded').length > 0) &&
							(!pricesEnabled || content.find('.autocardanywhere-prices').length > 0)) {
								//target.data('popup', 1);
								//console.log('load complete');
								target.removeClass(AutocardAnywhereSettings.className);
							}
					}

					// Run through each of the cards in this popup
					cards.map(function(card) {
						let dictionary = AutocardAnywhere.dictionaries[card.game + card.language];

						// Set the image source
						content.find("img[data-id='" + card.id + '-' + card.face + "']").each(function() {
							$(this).attr('src', AutocardAnywhereSettings.format(dictionary.settings.imageURL, card, dictionary));
						});

						// If any of the cards are from a dictionary with paginationNumbers turned-on, switch it on for the current carousel
						//paginationNumbers = paginationNumbers || dictionary.settings.paginationNumbers;
						// Get the price of the card
						pricesEnabled = dictionary.settings.enableTcgPrices || dictionary.settings.enableCardmarketPrices || dictionary.settings.enableOnlinePrices;
						if (pricesEnabled) { // An element will only be returned if enablePrices is set on the dictionary
							if (content.find('.autocardanywhere-prices').length == 0) {
								AutocardAnywhere.ajax('exchangeRate').then(
									function(exchangeRate) {
										// Get the card price from the location specified in the dictionary...
										AutocardAnywhere.ajax(AutocardAnywhereSettings.format(dictionary.settings.priceURL, card, dictionary)).then(
											function(response) {
												// Set the content of any matching price divs upon successful retrieval
												$('.autocardanywhere-prices-' + card.id).replaceWith(dictionary.parsePriceData(card, response, exchangeRate));
												checkIfLoadComplete();
											}
										);
									}
								);
							}
						}

						// Fill-in the extra info data if extra info is enabled and any is configured for this game...
						extraInfoEnabled = AutocardAnywhere.enableExtraInfo && dictionary.extraInfo && (dictionary.extraInfo.length > 0);
						if (extraInfoEnabled) {
							let dataDivClass = '.autocardanywhere-data-' + dictionary.game + dictionary.language + '-' + card.id;
							if (content.find(dataDivClass + '.autocardanywhere-loaded').length == 0) {
								content.find(dataDivClass + ' button').on('click', function() {
									let dataDiv = content.find(dataDivClass);
									dataDiv.find('.autocardanywhere-data-section').hide();
									dataDiv.find('.' + $(this).data('div')).fadeTo(500, 1);
									return false;
								});

								// Get the extra info data from the configured source(s)
								dictionary.extraInfo.map(function(source) {
									// Get the source url and interpolate any card data required
									AutocardAnywhere.ajax(AutocardAnywhereSettings.format(source.url, card, dictionary)).then(
										function(response) {
											source.sections.map(function(section) {
												// Set the content of any matching divs upon successful retrieval
												content.find(dataDivClass + ' .autocardanywhere-' + section.name).empty().append(
													dictionary.parseExtraInfo(response, section, card)
												).addClass('autocardanywhere-loaded');
											});
											checkIfLoadComplete();
										}
									);
								});
							}
						}
					});

					// If there's more than 1 card, setup a carousel to view them...
					if (cards.length > 1) {
						let paginationElement = content.find('.swiper-pagination');
						swiper = new Swiper(popupContent, {
							//allowSlideNext: false,
							//allowSlidePrev: false,
							loop: true,
							speed: 500,
							effect: AutocardAnywhere.carouselAnimation, // 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip'
							autoplay: (AutocardAnywhere.carouselAutoPlay ? {
								delay: 2000,
								disableOnInteraction: false,
								pauseOnMouseEnter: true
							} : false),
							pagination : {
								el: paginationElement.length > 0 ? paginationElement[0] : '',
								clickable: true
							},
							on: {
								slideChangeTransitionEnd: function () {
									// Update the card link when the carousel changes
									let slide = content.find('.swiper-slide-active');
									if (slide.length == 1) {
										let cardUrl = $(slide[0]).data('url');
										target.attr('href', cardUrl);
									}
								}
							}
						});
					}

					// If extra info is enabled, setup listeners to show/hide it.
					if (extraInfoEnabled) {
						// On a touch interface, require an explicit tap to show/hide.
						let loadingDiv = content.find('.autocardanywhere-loading');
						if (!loadingDiv.data('extrainfolistenersadded')) {
							if (AutocardAnywhere.isTouchInterface) {
								let dataDiv = content.find('.autocardanywhere-data');
								loadingDiv.on('click', function() {
									if (dataDiv.is(":visible")) {
										dataDiv.hide();
									}
									else {
										dataDiv.show();
									}
								});
							}
							// On a non-touch interface, show and hide the extra info on mouseover/out.
							else {
								loadingDiv.on('mouseover', function() {
									$(this).find('.autocardanywhere-data').show();
								});
								loadingDiv.on('mouseout', function() {
									$(this).find('.autocardanywhere-data').hide();
								});
							}
							loadingDiv.data('extrainfolistenersadded', 1)
						}
					}

					// Check if the image has loaded
					content.find('.autocardanywhere-loading img').on('load', function() {
						let loadingDiv = $(this).parents('.autocardanywhere-loading');
						loadingDiv.removeClass('autocardanywhere-loading');
						//content.find('.autocardanywhere-loading').removeClass('autocardanywhere-loading');
					})
					.on('error', function() {
						let loadingDiv = $(this).parents('.autocardanywhere-loading');
						loadingDiv.removeClass('autocardanywhere-loading');
						loadingDiv.addClass('autocardanywhere-broken');
					})
					.each(function() {
						if (this.complete) {
							$(this).load();
						} 
						else if (this.error) {
							$(this).error();
						}
					});

					checkIfLoadComplete();
				}
			});
		});
	},
	
	injectCSS: function(bold, italic, underline, colour, icon, dashed) {
		function injectCSSFile(url) {
			let link = document.createElement("link");
			link.href = url;
			link.type = "text/css";
			link.rel = "stylesheet";
			document.getElementsByTagName("head")[0].appendChild(link);
		}
		function injectCSSText(css) {
			let style = document.createElement('style');
			style.type = 'text/css';
			if (style.styleSheet) {
				style.styleSheet.cssText = css;
			}
			else {
				style.appendChild(document.createTextNode(css));
			}
			document.getElementsByTagName('head')[0].appendChild(style);
		}

        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/light.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/material.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/scale.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/perspective.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/shift-away.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/shift-toward.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/swiper-bundle.min.css"));

		let popupCss     =  "." + AutocardAnywhereSettings.className + " {z-index: 15001 !important;}" +
							"." + AutocardAnywhereSettings.className + " .swiper-pagination-bullets .swiper-pagination-bullet {margin: 4px;}" +
							"div.tippy-box {max-width: none !important;}";
		let imgLoadedCss =  "." + AutocardAnywhereSettings.className + " .autocardanywhere-loading,.autocardanywhere-broken{background-color: black;background-position: center center;background-repeat: no-repeat;border-radius: 10px;}" +
							"." + AutocardAnywhereSettings.className + " .autocardanywhere-loading{background-image: url('" + AutocardAnywhere.getURL('img/loading.gif') + "');background-color: black;}" +
							"." + AutocardAnywhereSettings.className + " .autocardanywhere-broken{background-image: url('" + AutocardAnywhere.getURL('img/broken.png') + "');background-color: #be3730;}" +
							"." + AutocardAnywhereSettings.className + " .autocardanywhere-loading img{display: none;}" +
							"." + AutocardAnywhereSettings.className + " .autocardanywhere-broken img{display: none;}";
		let scrollBarCss = "." + AutocardAnywhereSettings.className + " ::-webkit-scrollbar{width: 0.5em;}." + AutocardAnywhereSettings.className + " ::-webkit-scrollbar-button{height:0px;}." + AutocardAnywhereSettings.className + " ::-webkit-scrollbar-track-piece{background:#888;}." + AutocardAnywhereSettings.className + " ::-webkit-scrollbar-thumb{background:#ccc;}​";

		let fontWeight = bold ? 'bold' : 'normal';
		let fontStyle = italic ? 'italic' : 'none';
		let textDecoration = underline ? 'underline' : 'none';
		let bottomBorder = dashed ? 'border-bottom:1px dashed;' : '';
		let iconStyle = icon ? 'padding-right:14px; background-position:center right; background-repeat:no-repeat; background-image:url(data:image/gif;base64,R0lGODlhCwALAPcAAB9rwSJswiVvwzN4x0iGzFyT0mKX03im2n2p24ev3oqy35e74rzT7dPi89bk9Njl9OHr9+Xu+Ovy+fL2+////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAACwALAAAISAApCBxIUGCAAQgTDggggcKAggIJNHwIUaJDiBQUTLiIUSBFgQwaEPxIoUGCBxQQUBBQoMACgQ8OQHjooGaEgRAMBMCIYCGAgAA7);' : '';

		let fontColour = '';
		if (colour != 'inherit') {
			fontColour = 'color:' + colour + ' !important;'
		}

		injectCSSText(popupCss + imgLoadedCss +
					  '.crystal-catalog-helper-list .autocardanywhere-link{display:block !important;}' +
					  '.autocardanywhere-link{display:inline !important;' + fontColour + 'font-weight:normal;font-style:none;text-decoration: ' + textDecoration + ' !important; ' + iconStyle + bottomBorder + '}' +
					  '.autocardanywhere-link.autocardanywhere-emphasised{font-weight: ' + fontWeight + ' !important;font-style: ' + fontStyle + ' !important;}' + scrollBarCss);
	},
	
	replaceLinks: function(node) {
		function createCardLink(cardName, linkText, href) {
			// Need to look in each mtg dictionary until we find the specified card name
			for (let i in AutocardAnywhere.dictionaries) {
        		let card = AutocardAnywhere.dictionaries[i].findCard(cardName, true);
        		if (card) {
        			return AutocardAnywhere.dictionaries[i].createLinkElement(AutocardAnywhere.dictionaries[i], card, linkText, href);
        		}
        	}
        	return;
		}
		function createCardLinkById(cardID, linkText, href) {
			// Need to look in each mtg dictionary until we find the specified ID
			for (let i in AutocardAnywhere.dictionaries) {
        		let card = AutocardAnywhere.dictionaries[i].findCardById(cardID);
        		if (card) {
        			return AutocardAnywhere.dictionaries[i].createLinkElement(AutocardAnywhere.dictionaries[i], card, linkText, href, cardID);
        		}
        	}
        	return;
		}

		function replaceLink() {
			// Split out the get parameters from the link href
			let href = $(this).attr('href');
			href.match(/\?(.+)$/);
            let params = RegExp.$1;
            params = params.split("&");
            let queryStringList = {};
            for (let i=0;i<params.length;i++) {
                let tmp = params[i].split("=");
                queryStringList[tmp[0].toLowerCase()] = decodeURIComponent(tmp[1]);
            }

            href.match(/\/([^\/]*)$/);
            let filename = RegExp.$1;
            
            let cardID = queryStringList['multiverseid'];
            if (cardID) {
				let cardElement = createCardLinkById(cardID, $(this).contents().text());
                return cardElement ? cardElement : $(this).clone(); // Couldn't find the card, so return the link unchanged
            }
            else {
            	cardName = queryStringList['singlesearch'] || queryStringList['q'] || queryStringList['card'] || queryStringList['cardname'] || queryStringList['name'] || filename;

                if (cardName) {
	                cardName = cardName.replace(/\[/g, '');
					cardName = cardName.replace(/\]/g, '');
					cardName = cardName.replace(/\+/g, ' ');
					cardName = cardName.replace(/"/g, '');
	                if ((cardName[0] == '!') || (cardName[0] == ' ')) {
	                	cardName = cardName.substr(1, cardName.length);
                	}

                	//$(this).removeClass().addClass('autocardanywhere-link');
					//$(this).removeAttr('mouseover').removeAttr('mousemove').removeAttr('data-image-url').data({'dictionary': 'mtgen', 'name': cardName});

                	let content = $(this).contents().html() ? $(this).contents().html() : $(this).contents().text();
                	if (content && (content.replace(/\s/g, '') != '')) {
	                	let cardElement = createCardLink(cardName, content);
	                	return cardElement ? cardElement : $(this).clone(); // Couldn't find the card, so return the link unchanged
	                }
	                else {
	                	return $(this).clone(); // Couldn't find the link content, so return the link unchanged
	                }
				}
				else { // Couldn't find the card, so return the link unchanged
					return $(this).clone();
				}
            }
		}

		let url = AutocardAnywhere.getCurrentUrl();
		// === Cases where we add popup and replace link
		// If we are on the wizards site
		if (url.match(/wizards\.com/)) {
			$(node).find('a.autocard-link[href*="gatherer.wizards.com/Pages/"],a.autoCard[href*="/Pages/Card/Details.aspx"],a[href*="gatherer.wizards.com/Handlers/Image.ashx"],a[href*="www.wizards.com/magic/autocard.asp"],a[href*="magiccards.info/query"],a[href*="magiccards.info/autocard.php"],a[href*="ViewCard.aspx"],a[href*="http://www.mtg-forum.de/db/magiccard.php"]').replaceWith(replaceLink);
		}
		else { // On another site
			// Wizards                                Wizards                                             Wizards                                       magiccards.info                  magiccards.info                         Unknown                  mtg-forum.de
			$(node).find('a[href*="gatherer.wizards.com/Pages/"],a[href*="gatherer.wizards.com/Handlers/Image.ashx"],a[href*="www.wizards.com/magic/autocard.asp"],a[href*="magiccards.info/query"],a[href*="magiccards.info/autocard.php"],a[href*="ViewCard.aspx"],a[href*="http://www.mtg-forum.de/db/magiccard.php"]').replaceWith(replaceLink);
		}

		// === Cases where we just remove the link and then rely on linkify to re-link the text
		// tappedout
		$(node).find('a.card-link[href*="/mtg-card/"]').replaceWith(function() {
			$('.image-box').removeClass().hide();
			return $(this).contents().text();
		});
		// mtgo traders
		$(node).find('a[href*="http://www.mtgotraders.com/store/"]').replaceWith(function() {
			let link = $(this).attr('href');
			// If it's a card link, rather than a set page etc
			if (link.match(/http:\/\/www.mtgotraders.com\/store\/\w\w\w_/)) {
				return $(this).contents().text();
			}
			else { // Not a card link, so return the link unchanged
				return $(this).clone();
			}
		}); 
		// Unknown
		$(node).find('a[href*="javascript:cardinfo("]').replaceWith(function() {
			return $(this).contents().text();
		});
		// mtgprice
		if (document.location.href.toLowerCase().indexOf('mtgprice.com') > -1) {
			$(node).find('a[href*="/sets/"]').replaceWith(function() {
				return $(this).contents().text();
			});
		}

		// === Cases where we add popup but leave link
		// Blackborder
		$(node).find('a[href*="http://www.blackborder.com/cgi-bin/shopping/ex_prodshow.cgi"],a[href*="http://www.blackborder.com/cgi-bin/prices/ex_prodshow.cgi"]').each(function() {
			if ($(this).find('img').length == 0) {
				$(this).removeClass().addClass('autocardanywhere-link');
				$(this).data({'dictionary': 'mtgen', 'name': $(this).text()});
			}
		});
		// Channel Fireball
		$(node).find('a[href*="http://store.channelfireball.com/catalog/lookup?catalog_id="]')
			.removeClass('crystal-catalog-helper-single').removeClass('crystal-catalog-helper-grid-item').addClass('autocardanywhere-link').data('dictionary', 'mtgen');
		// StarCityGames
		$(node).find('a[href*="sales.starcitygames.com/cardsearch.php"]').each(function() {
			$(this).removeClass().addClass('autocardanywhere-link').data({'dictionary': 'mtgen', 'name': $(this).text()});
		});
		$(node).find('a[href*="atives.com"]').replaceWith(function() {
			return '';
		});
		// MTGSalvation
		$(node).find('a.card-link').replaceWith(function() {
			// Generate a new link, but with the href from the existing one.
			let cardElement = createCardLink($(this).text(), $(this).text(), $(this).attr('href'));
			return cardElement ? cardElement : $(this).clone(); // Couldn't find the card, so return the link unchanged
		});
		// MTG Goldfish
		$(node).find('a[data-trigger="hover"]').replaceWith(function() {
			// Generate a new link, but with the href from the existing one.
			let cardElement = createCardLink($(this).text(), $(this).text(), $(this).attr('href'));
			return cardElement ? cardElement : $(this).clone(); // Couldn't find the card, so return the link unchanged
		});
		// Custom link
		$(node).find('a.autocardanywhere-link').replaceWith(function() {
			// Link to the card specified in the href attribute with the text from inside the element
			let cardElement = createCardLink($(this).attr('href'), $(this).text());
			return cardElement ? cardElement : $(this).clone(); // Couldn't find the card, so return the link unchanged
		});
	},

	observeDomChanges: function() {
		if (AutocardAnywhere.domObserver) {
			// Setup a listener to react to changes in the dom
			AutocardAnywhere.domObserver.observe(document.body, {
			    // Childlist = observe additions or deletions of child nodes. The callback just has to ignore the deletions.
			    'childList': true, 
			    // By default it just observes direct children - this makes it do grandchildren, great-grandchildren etc.
			    'subtree': true
			});
		}
	},

	unobserveDomChanges: function() {
		if (AutocardAnywhere.domObserver) {
			AutocardAnywhere.domObserver.disconnect();
		}
	},
	
	domChangeCallback: function(mutations) {
		// Respond to a dom change
		// Stop observing so as to avoid picking-up on the popup node being inserted
		AutocardAnywhere.unobserveDomChanges();
	    mutations.map(function(mutation) {
	    	// Only interested in nodes being added.
		    let nodes = mutation.addedNodes;
		    for (let i=0; i<nodes.length; i++) {
	    		let node = $(nodes[i]);
	    		// Check the new node is not a script, a stylesheet, a textarea, an input or part of an AutocardAnywhere popup...
	    		if ((!/^(a|button|input|textarea|style|script|noscript)$/i.test(nodes[i].tagName)) &&
					(!nodes[i].isContentEditable) &&
	    			(node.children('div.tippy-box').length === 0) &&
	    			(node.parents("div.tippy-box").length === 0) &&
					//(!node.is("span.autocardanywhere")) &&
					(node.parents(".autocardanywhere-ignored").length === 0) &&
					(!node.is(".autocardanywhere-ignored")) &&
	    			(node.children('span.autocardanywhere').length === 0)
	    			) {
			    		// Linkify the new node and then add popups in it.
						// Replace any existing card links in the new node.
					    if (AutocardAnywhere.replaceExistingLinks) {AutocardAnywhere.replaceLinks(nodes[i])}

						// Traverse the new node.						
						node.each((index, child) =>{
							AutocardAnywhere.insertionCount++;
							if (AutocardAnywhere.insertionCount < AutocardAnywhere.insertionLimit) {
								AutocardAnywhere.traverse(child.parentNode);
							}
						});
				}
			}
	    });
	    // Restart the observer
		if (AutocardAnywhere.insertionCount < AutocardAnywhere.insertionLimit) {
			AutocardAnywhere.observeDomChanges();
		}
	},

	backgroundRunner: async function(text) {
		// Pause slightly between messages
		await AutocardAnywhere.sleep(10);
		return AutocardAnywhere.sendMessage({name: 'parse', data: text}).then((response) => response.data);
	},

	foregroundRunner: function(text) {
		// Run all enabled dictionaries
		Object.keys(AutocardAnywhere.dictionaries).map( (key) => {
			// Run the current dictionary.
			let dictionary = AutocardAnywhere.dictionaries[key];
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
				if (typeof(s) !== 'string') return match;
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

		return text;
	},

	// Function to traverse the DOM to find any text nodes.
	traverse: function(node) {
		//console.log(node);
		if (!node) return;
		let children = node.childNodes;
		if (!children) return;
		for (let i=0; i<children.length; i++) {
			let n = children[i];
			if (!n) continue;
			if (n.nodeType == 1  &&  !/^(a|button|input|textarea|style|script|noscript)$/i.test(n.tagName) && !n.isContentEditable && !n.classList.contains("autocardanywhere-ignored")) {
				AutocardAnywhere.traverse(n);
			}
			else if (n.nodeType == 3) {
				let html = n.nodeValue;
				if (html.length>2 && /[A-Za-z]/.test(html) && !AutocardAnywhere.ignoredStrings[html]) {
					//console.log(html);
					if (AutocardAnywhere.isM1) {
						//console.log('m1');
						AutocardAnywhere.backgroundRunner(html).then((newHtml) => {
							if (newHtml == html) {
								AutocardAnywhere.ignoredStrings[html] = 1;
								return;
							}

							let newNode = $('<span>' + newHtml + '</span>');
							//AutocardAnywhere.initialisePopups(newNode);
							//n.after(newNode.get(0));
							newNode.insertAfter(n);
							n.remove();
							
							// Delay for a short time before initialising to fix a race condition bug on Reddit.
							setTimeout(function() {
								AutocardAnywhere.initialisePopups(newNode);
							}, 10);
						});
					}
					else {
						//console.log('not m1');
						let newHtml = AutocardAnywhere.foregroundRunner(html);
						if (newHtml == html) {
							AutocardAnywhere.ignoredStrings[html] = 1;
							continue;
						}

						let newNode = $('<span>' + newHtml + '</span>');
						//AutocardAnywhere.initialisePopups(newNode);
						//n.after(newNode.get(0));
						newNode.insertAfter(n);
						n.remove();

						// Delay for a short time before initialising to fix a race condition bug on Reddit.
						setTimeout(function() {
							AutocardAnywhere.initialisePopups(newNode);
						}, 10);
					}
					
				}
			}
		}
	},

	contextMenuClick: function() {
		if (AutocardAnywhere.loaded) {
			let selectedText = window.getSelection().toString();
			for (let i in AutocardAnywhere.dictionaries) {
				let cards = AutocardAnywhere.dictionaries[i].fuzzyLookup(selectedText.trim());

				if (cards.length > 0 && cards[0]) {
					AutocardAnywhere.replaceSelection(AutocardAnywhere.dictionaries[i].createLinkElement(AutocardAnywhere.dictionaries[i], cards[0], selectedText, null, null, true));
					break;
				}
			}
		}
		else {
			AutocardAnywhere.forceLoad = true;
			AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings).then(AutocardAnywhere.settingsCallback);
		}
	},

	initialiseContextMenu: function() {
		function processMessage(message, sender, sendResponse) {
			if (message.name == 'contextmenuitemclick') {
				if (!AutocardAnywhere.isTouchInterface) { // No context menu on touch interfaces
					AutocardAnywhere.contextMenuClick();
				}
				sendResponse({message: "ack"});
			}
			else if (message.name == 'enableSite') {
				// Reload the extension
				//AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings, AutocardAnywhere.settingsCallback);
				alert("AutocardAnywhere is now enabled on this site.\nLinks will be added to the current page when you next reload.");
				sendResponse({message: "ack"});
			}
			else if (message.name == 'disableSite') {
				// Remove all links added by AutocardAnywhere
				$(document.body).find('a.autocardanywhere-link').replaceWith(function() {
					return $(this).text();
				});
				sendResponse({message: "ack"});
			}
			else if (message.name == 'checkifrunningembedded') {
				sendResponse({status: 'false'});
			}
		}

		if (AutocardAnywhereSettings.isSafari) {
			// When the context menu is displayed, store the current selection.
			// This is so the background script can determine whether or not to display the menu item.
			document.addEventListener("contextmenu", function(event) {
				safari.self.tab.setContextMenuEventUserInfo(event, window.getSelection().toString() != '');
			}, false);

			// Respond to messages sent by the background script when the context menu item is clicked.
			safari.self.addEventListener("message", processMessage, false);
		}
		else { // Chrome, Opera, Firefox or Edge
			browser.runtime.onMessage.addListener(processMessage);
		}
	},
	
	settingsCallback: function(response) {
		if (!AutocardAnywhereSettings.isEmbedded && document.getElementById('autocardanywhereinstalled')) {
			throw new Error('AutocardAnywhere is already installed on this website.');
		}

		if (!response) {
			console.error('Load settings failed');
			return;
		}
		
		AutocardAnywhere.isTouchInterface = ('ontouchstart' in window);
		let listType = response.listType;
		let thisSiteListed = false;
		AutocardAnywhere.url = AutocardAnywhere.getCurrentUrl();
		if (response.listedSites) {
			// boardgamearena tables explicitly disabled to avoid issue with links. 
			let listedSites = response.listedSites;
			if (listType != 'whitelist') listedSites += ";boardgamearena.com;wizards.com;docs.google.com/spreadsheets;";
			listedSites.split(";").map(function(site) {
				if ((site.length > 0) && (AutocardAnywhere.url.indexOf(site) != -1)) {
					thisSiteListed = true;
				}
			});
		}

		if (AutocardAnywhere.url == 'https://www.autocardanywhere.com/contact.php') {
			response.userAgent = navigator.userAgent;
			$('#settings').val(JSON.stringify(response, null, '  '));
		}
		
		// Check we are clear to run on this website
		if (((listType != 'whitelist' && thisSiteListed) || (listType == 'whitelist' && !thisSiteListed)) && !AutocardAnywhere.forceLoad) {
			// disabled on this site
			//if (!AutocardAnywhereSettings.isSafari) {AutocardAnywhere.sendMessage({'name': 'disableIcon'})}
			return;
		}
		
		if (!AutocardAnywhere.isM1) {
			// Ignore and unignore lists
			AutocardAnywhere.ignoredCards = response.ignoredCards;
			AutocardAnywhere.ignoreList = {};
			if (response.ignoredCards !== undefined) {
				response.ignoredCards.split('|').map(function(ignoredCard) {
					AutocardAnywhere.ignoreList[ignoredCard.toLowerCase()] = 1;
				});
			}
			AutocardAnywhere.unignoreList = {};
			if (response.unignoredCards !== undefined) {
				response.unignoredCards.split('|').map(function(unignoredCard) {
					AutocardAnywhere.unignoreList[unignoredCard.toLowerCase()] = 1;
				});
			}
			// Always ignore the card "Ow"
			AutocardAnywhere.ignoreList['ow'] = 1;
		}

		// Load settings
		AutocardAnywhere.popupLanguage = response.popupLanguage;
		AutocardAnywhere.popupWidth = response.popupWidth;
		AutocardAnywhere.popupHeight = response.popupHeight;
		AutocardAnywhere.fontSize = Math.max(Math.ceil(AutocardAnywhere.popupHeight / 24), 14);
		AutocardAnywhere.lineHeight = AutocardAnywhere.fontSize + 1;
		AutocardAnywhere.openInNewTab = response.newTab;
		AutocardAnywhere.enablePopups = response.enablePopups;
		AutocardAnywhere.enableIgnoreCardLink = response.enableIgnoreCardLink;
		AutocardAnywhere.enableExtraInfo = response.enableExtraInfo;
		AutocardAnywhere.caseSensitive = response.caseSensitive;

		AutocardAnywhere.popupAnimation = response.popupAnimation;
		AutocardAnywhere.popupShowDuration = response.popupShowDuration;
		AutocardAnywhere.popupHideEffect = response.popupHideEffect;
		AutocardAnywhere.popupHideDuration = response.popupHideDuration;
		AutocardAnywhere.carouselAnimation = response.carouselAnimation;
		AutocardAnywhere.carouselAutoPlay = response.carouselAutoPlay;
		AutocardAnywhere.theme = response.theme;

		AutocardAnywhere.replaceExistingLinks = response.replaceExistingLinks;
		AutocardAnywhere.fuzzyLookup = response.fuzzyLookup;

		AutocardAnywhereSettings.currencies.map(function(currency) {
			if (currency.value == response.currency) {
				AutocardAnywhere.currency = currency;
			}
		});			
		
		// Generate css based on what link styles the user has set, and inject it into the page
		AutocardAnywhere.injectCSS(
			response.linkStyleBold, 
			response.linkStyleItalic, 
			response.linkStyleUnderline, 
			(response.linkStyleFontColourInherit ? 'inherit' : response.linkStyleFontColour), 
			response.showIcon, 
			response.linkStyleDashed
		);
		
		// Build an array of dictionaries that are switched on
		let dictionaries = [];
		let dictionariesHash = {};

		AutocardAnywhereSettings.dictionaries.map(function(dictionary) {
			dictionariesHash[dictionary.game + dictionary.language] = dictionary;
		});

		// First load all the dictionaries specified in the user's settings
		response.linkLanguages.split(';').map(function(x) {
			let linkLanguage = x.split(':');
			if (linkLanguage.length == 3) {
				let game = linkLanguage[0];
				let language = linkLanguage[1];
				if (linkLanguage[2] == '1') {
					dictionaries.push([game, language]);
				}
				delete dictionariesHash[game + language];
			}
		});

		// Then check that we don't have any extra dictionaries specified in settings.js that don't appear in the user's settings.
		// This would happen if the dictionary in question has been added to the extension since the last time the user saved settings.
		if (!AutocardAnywhereSettings.isEmbedded) {
			for (dictionaryName in dictionariesHash) {
				let dictionary = dictionariesHash[dictionaryName];
				if (dictionary.default == 1) {
					dictionaries.push([dictionary.game, dictionary.language]);
				}
			}
		}
		
		// Now load all dictionaries
		AutocardAnywhere.games.load(dictionaries).then((result) => {
			AutocardAnywhere.dictionaries = result;

			// If we've just been loaded as a result of the user clicking the context menu item, run on the selected text
			if (AutocardAnywhere.forceLoad) {
				AutocardAnywhere.contextMenuClick();
			}
			// else run on the whole page
			else {
				// Replace existing card links
				if (AutocardAnywhere.replaceExistingLinks) {AutocardAnywhere.replaceLinks(document.body)}
				AutocardAnywhere.initialisePopups(document.body);

				// Traverse the DOM looking for text nodes to linkify
				$('body').each((index, node) => {
					AutocardAnywhere.traverse(node);
				})
				// Setup the mutation observer to pickup any changes to the DOM
				if (typeof(MutationObserver) !== 'undefined') {
					AutocardAnywhere.domObserver = new MutationObserver(AutocardAnywhere.domChangeCallback);
					AutocardAnywhere.observeDomChanges();
				}
			}
		});

		
		// Nicknames
		if (response.customNicknames && (response.customNicknames != '')) {
			if (response.customNicknames.indexOf(';') > -1) {
				response.customNicknames = response.customNicknames.replace(/;/g, '||').replace(/:/g, '|');
			}
			AutocardAnywhere.customNicknames = {};
			AutocardAnywhere.customNicknameRE = '(';
			response.customNicknames.split('||').map(function(x) {
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

		AutocardAnywhere.loaded = true;
	}
}

if (!AutocardAnywhereSettings.isEmbedded) {
	function connect() {
		//console.log('(re)connecting...');
		AutocardAnywhere.persistentPort = chrome.runtime.connect({name: 'autocardanywhere'});
		AutocardAnywhere.persistentPort.onDisconnect.addListener(connect);
		/*
		AutocardAnywhere.persistentPort.onMessage.addListener(msg => {
			console.log('received', msg, 'from bg');
		});
		*/
		//AutocardAnywhere.persistentPort.postMessage({'data': 'ping'});
	}
	connect();

	var w = document.createElement("canvas").getContext("webgl");
	var d = w.getExtension('WEBGL_debug_renderer_info');
	var g = d && w.getParameter(d.UNMASKED_RENDERER_WEBGL) || "";
	AutocardAnywhere.isM1 = g.match(/Apple/) && !g.match(/Apple GPU/);


	AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings).then(AutocardAnywhere.settingsCallback);
	// Setup handler for context menu item click
	AutocardAnywhere.initialiseContextMenu();
}