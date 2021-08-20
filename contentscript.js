if (typeof chrome !== 'undefined') {var browser = chrome;}
let AutocardAnywhere = {
	loaded: false,
	forceLoad: false,
	// Utility functions
	levenshtein: function(a, b){
        if(a == b)return 0;
        if(!a.length || !b.length)return b.length || a.length;
        let len1 = a.length,
            len2 = b.length,
            I = 0,
            i = 0,
            d = [[0]],
            c, j, J;
        while(++i <= len2) d[0][i] = i;
        i = 0;
        while(++i <= len1) {
            J = j = 0;
            c = a[I];
            d[i] = [i];
            while(++j <= len2){
                d[i][j] = Math.min(d[I][j] + 1, d[i][J] + 1, d[I][J] + (c != b[J]));
                ++J;
            };
            ++I;
        };
        return d[len1][len2];
    },
	ajax: function(url, callback) {
		// Performs an ajax call in the manner accepted by each browser.
		if (AutocardAnywhereSettings.isBookmarklet) {
			let xmlhttp = new XMLHttpRequest();
			xmlhttp.onreadystatechange = function() {
				if (xmlhttp.readyState==4) {
				    callback(xmlhttp.response);
				} 
			} 
			xmlhttp.open("GET", url, true); 
			xmlhttp.send();
		}
		else if (AutocardAnywhereSettings.isSafari) {
			function getResponse(event) {
				if ((event.name != "getFileCallback") || (event.message.url != url)) {return}
				callback(event.message.data);
			}
			safari.self.addEventListener("message", getResponse, false);
			safari.self.tab.dispatchMessage("getFile", {'url': url});
		}
		else { // Chrome, Opera, Firefox or Edge
			function messageReceived(response) {
				if (response.url != url) {return}
				AutocardAnywhere.persistentPort.onMessage.removeListener(messageReceived);
				callback(response.data);
			}
			AutocardAnywhere.persistentPort.onMessage.addListener(messageReceived);
			AutocardAnywhere.persistentPort.postMessage({'type': 'file', 'url': url});
		}
	},
	format: function(s, card, dictionary) {
		function removeDiacritics(str) {
		    let lookupLetters = {
		        "ä": "a", "ö": "o", "ü": "u", "Ä": "A", "Ö": "O", "Ü": "U",
		        "á": "a", "à": "a", "â": "a", "é": "e", "è": "e", "ê": "e",
		        "ú": "u", "ù": "u", "û": "u", "ó": "o", "ò": "o", "ô": "o",
		        "Á": "A", "À": "A", "Â": "A", "É": "E", "È": "E", "Ê": "E",
		        "Ú": "U", "Ù": "U", "Û": "U", "Ó": "O", "Ò": "O", "Ô": "O",
		        "ß": "ss", "Æ": "Ae", "æ": "ae"
		    };

		    let result = '';
		    for(let i=0; i<str.length; i++) {
		        result += lookupLetters[str[i]] || str[i];
		    }
		    return result;
		}
		// Work-out which language the card should be displayed in.
		let language = AutocardAnywhere.popupLanguage;
		if (!language || language == '' || language == 'original') {
			language = card.language;
		}
		// Make specific replacements
		// Replace <game> with "magic" for mtg and card.game for other games 
		s = s.replace(/<game>/g, function(match, key) {
			return card.game == 'mtg' ? 'magic' : card.game;
		});
		// Use first two characters as folders for SCryfall images.
		s = s.replace(/<([^>]+):folders>/g, function(match, key) {
			id = card[key];
			return id.substr(0,1) + '/' + id.substr(1,1) + '/' + id;
		});
		// Make generic replacements - <key> becomes card[key]
		// <key>:simple becomes card[key] with diacritics removed.
		s = s.replace(/<([^>]+):simple:lowercase>/g, function(match, key) {
			return card[key] ? dictionary.simplify(removeDiacritics(card[key])).toLowerCase() : '';
		});
		s = s.replace(/<([^>]+):simple>/g, function(match, key) {
			return card[key] ? dictionary.simplify(removeDiacritics(card[key])) : '';
		});
		s = s.replace(/<([^>]+):hyphenated>/g, function(match, key) {
			return card[key] ? removeDiacritics(card[key]).replace(/[,']/g, '').replace(/ /g, '-') : '';
		});
		s = s.replace(/<([^>]+):plus>/g, function(match, key) {
			return card[key] ? removeDiacritics(card[key]).replace(/[,']/g, '').replace(/ /g, '+') : '';
		});
		s = s.replace(/<([^>]+)>/g, function(match, key) {
			return card[key] ? card[key] : '';
		});
		if (s.indexOf('?') == -1) {
			s = s  + '?';
		}
		else {
			s = s  + '&';
		}
		return s;
	},
	decodeHTMLEntities: function(text) {
	    let entities = [ ['apos', "'"], ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'] ];
	    for (let i in entities) {
	        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
	    }
	    return text;
	},
	createPricesElement: function(className, text) {
		let result = document.createElement("div");
		result.style.marginTop = '5px';
		result.style.fontSize = AutocardAnywhere.fontSize + 'px';
		result.style.lineHeight = AutocardAnywhere.lineHeight + 'px';
		result.style.fontFamily = AutocardAnywhereSettings.priceFont;
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
	replaceSelection: function(element) {
	    if (window.getSelection && window.getSelection().getRangeAt) {
	    	let range = window.getSelection().getRangeAt(0);
	        AutocardAnywhere.initialisePopups(element);
	        range.deleteContents();
	        range.insertNode(element);
	    }
	},
	getURL: function(filename) {
		if (AutocardAnywhereSettings.isBookmarklet) {
			return 'http://update.autocardanywhere.com/misc/Firefox/data/' + filename;
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

		$(node).find('a.autocardanywhere-link').each(function() {
			let target = $(this);
			let cards = new Array();

			if (target.data('popup')) return;
			//console.log(target);

			if (AutocardAnywhereSettings.isTouchInterface) {
				target.bind('click', function(event) {
		    		event.preventDefault();
		    		return false;
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

			// Create the tip for this link
			/*
			// Get the popup title
			let text = this.childNodes[0];
			// If the linked node just contains text, display it's nodeValue...
			if (text.nodeType == 3) {
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
			*/

			function getCardsElement(cards) {
				if (!cards) {return}
				let cardsElement = document.createElement("div");
				cardsElement.className = 'autocardanywhere-popup';
				cardsElement.style.backgroundColor = '#F5F6F7';

				// If there are multiple cards to display, use a carousel...
				let width = AutocardAnywhere.popupWidth;
				if (cards.length > 1) {
					cards.map(function(card) {
						if (card.rotate == 90 || card.rotate == 360) {
							width = AutocardAnywhere.popupHeight;
						}
					});
					cardsElement.className = 'autocardanywhere-popup swiper-wrapper';
					cardsElement.style.width = width + 'px';
				}
				// Get the dom element for each card
				cards.map(function(card) {
					//console.log(card);
					let dictionary = AutocardAnywhere.dictionaries[card.game + card.language];
					cardsElement.appendChild(dictionary.getCardElement(card, cards.length));
				});
				let result = document.createElement("div");
				result.className = 'swiper-container';
				result.appendChild(cardsElement);
				if (cards.length > 1) {
					let paginationElement = document.createElement("div");
					paginationElement.style.height = '50px';
					paginationElement.style.backgroundColor = '#00ff00';
					paginationElement.className = 'swiper-pagination';
					result.appendChild(paginationElement);
				}
				/*
				let ignore = document.createElement("a");
				ignore.href = 'https://www.google.com';
				ignore.appendChild(document.createTextNode('Ignore this card in future'));
				result.appendChild(ignore);
				*/
            	return result;
			}
			
			// Grab the tooltip content
			let popupContent = getCardsElement(cards);
			let content = $(popupContent);
			let swiper;

			// Initialise the tip
			tippy(this, {
				placement: 'right',
				allowHTML: true,
				interactive: true,
				hideOnClick: false,
				theme: 'light',
				animation: 'scale',
				content: popupContent,
				onShow() {
					// If there is a carousel in this tip, start it playing.
					if (swiper) swiper.autoplay.start();
				},
				onHide() {
					// If there is a carousel in this tip, stop it playing.
					if (swiper) swiper.autoplay.stop();
				},
				onTrigger() {
					// If this tooltip has already been rendered, do nothing
					if (target.data('popup')) return;

					let paginationNumbers = false;
					let extraInfoEnabled = false;
					// Run through each of the cards in this popup
					cards.map(function(card) {
						let dictionary = AutocardAnywhere.dictionaries[card.game + card.language];

						// Set the image source
						content.find("img[data-id='" + card.id + '-' + card.face + "']").each(function() {
							$(this).attr('src', AutocardAnywhere.format(dictionary.settings.imageURL, card, dictionary));
						});	

						// If any of the cards are from a dictionary with paginationNumbers turned-on, switch it on for the current carousel
						paginationNumbers = paginationNumbers || dictionary.settings.paginationNumbers;
						// Get the price of the card
						if (dictionary.settings.enablePrices) { // An element will only be returned if enablePrices is set on the dictionary
							if (content.find('.autocardanywhere-price').length == 0) {
								AutocardAnywhere.ajax('exchangeRate', function(exchangeRate) {
									// Get the card price from the location specified in the dictionary...
									AutocardAnywhere.ajax(
										AutocardAnywhere.format(dictionary.settings.priceURL, card, dictionary),
										function(response) {
											// Set the content of any matching price divs upon successful retrieval
											$('.autocardanywhere-prices-' + card.id).replaceWith(dictionary.parsePriceData(card, response, exchangeRate));
										}
									);
								});
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
								});

								// Get the extra info data from the configured source(s)
								dictionary.extraInfo.map(function(source) {
									AutocardAnywhere.ajax(
										// Get the source url and interpolate any card data required
										AutocardAnywhere.format(source.url, card), 
										function(response) {
											source.sections.map(function(section) {
												// Set the content of any matching divs upon successful retrieval
												content.find(dataDivClass + ' .autocardanywhere-' + section.name).empty().append(
													dictionary.parseExtraInfo(response, section, card)
												).addClass('autocardanywhere-loaded');
											});
										}
									);
								});
							}
						}
					});

					// If there's more than 1 card, setup a carousel to view them...
					if (cards.length > 1) {
						let paginationElement = content.find('.swiper-pagination');
						//console.log(paginationElement);
						swiper = new Swiper(popupContent, {
							loop: true,
							speed: 500,
							effect: 'coverflow', // 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip'
							autoplay: {
								delay: 2000,
								disableOnInteraction: false,
								pauseOnMouseEnter: true
							},
							pagination: {
								el: '.swiper-pagination',
								clickable: true
							}
						});
					}

					// If extra info is enabled, setup listeners to show/hide it on mouseover/out.
					if (extraInfoEnabled) {
						content.find('.autocardanywhere-loading').on('mouseover', function() {
							$(this).find('.autocardanywhere-data').show();
						});
						content.find('.autocardanywhere-loading').on('mouseout', function() {
							$(this).find('.autocardanywhere-data').hide();
						});
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

					target.data('popup', 1);
				}
			});

			/*
		    $(this).qtip({
		    	style: {
		    		'classes': 'qtip-tipped autocardanywhere-popup'
		    	},
		        content: {
		        	'title': text,
		            'text': getCardsElement(cards)
		        },
		        position: {
					target: 'mouse', // Use the mouse position as the position origin
					adjust: {
						mouse: false, // Don't adjust continuously when moving the mouse over the element, just use initial position
						x: 15, y: 0 // Offset it slightly from under the mouse
					},
			        'viewport': (AutocardAnywhereSettings.isFirefox ? $(document) : $(window)) // Stay within the viewport
			    },
			    show: {
			    	// Hide any other popups immediately when this one is shown.
			    	'solo': true,
			    	// Animate show
		            'effect': function() {
	                	let duration = AutocardAnywhere.popupShowDuration;
	                	switch (AutocardAnywhere.popupShowEffect) {
	                		case 'fadeIn': $(this).fadeIn(duration); break;
	                		case 'slideDown': $(this).slideDown(duration); break;
	                		case 'show': $(this).show(duration); break;
	                	}
		            },
		            event: (AutocardAnywhereSettings.isTouchInterface ? 'click' : 'mouseover')
		        },
	            hide: {
	            	// Fixed and delay allow the user to mouseover the popup
	                'fixed': true,
	                'delay': 300,
	                // Animate hide
	                'effect': function() {
	                	let duration = AutocardAnywhere.popupHideDuration;
	                	switch (AutocardAnywhere.popupHideEffect) {
	                		case 'fadeOut': $(this).fadeOut(duration); break;
	                		case 'slideUp': $(this).slideUp(duration); break;
	                		case 'hide': $(this).hide(duration); break;
		                }
		            },
		            event: (AutocardAnywhereSettings.isTouchInterface ? 'unfocus' : 'mouseout')
	            },
	            events: {
	            	// When the popup is rendered, pull-in any additional data via ajax and initialise the carousel...
		            render: function(event, api) {
			            // Grab the tooltip element from the API
			            let content = $(api.elements.content);					

						content.on('mouseover', function() {
				        	content.find(".owl-carousel").trigger('owl.stop');
				        });
				        content.on('mouseout', function() {
				        	content.find(".owl-carousel").trigger('owl.play', 2000);
				        });

				        let paginationNumbers = false;
			            // Run through each of the cards in this popup
			            cards.map(function(card) {
			            	let dictionary = AutocardAnywhere.dictionaries[card.game + card.language];

				            // Set the image source
				        	content.find("img[data-id='" + card.id + '-' + card.face + "']").each(function() {
				        		$(this).attr('src', AutocardAnywhere.format(dictionary.settings.imageURL, card, dictionary));
				        	});	

			            	// If any of the cards are from a dictionary with paginationNumbers turned-on, switch it on for the current carousel
			            	paginationNumbers = paginationNumbers || dictionary.settings.paginationNumbers;
			            	// Get the price of the card
			            	if (dictionary.settings.enablePrices) { // An element will only be returned if enablePrices is set on the dictionary
								if (content.find('.autocardanywhere-price').length == 0) {
									AutocardAnywhere.ajax('exchangeRate', function(exchangeRate) {
										// Get the card price from the location specified in the dictionary...
							            AutocardAnywhere.ajax(
							            	AutocardAnywhere.format(dictionary.settings.priceURL, card, dictionary),
							            	function(response) {
							            		// Set the content of any matching price divs upon successful retrieval
							            		$('.autocardanywhere-prices-' + card.id).replaceWith(dictionary.parsePriceData(card, response, exchangeRate));
							            	},
							            	true
							            );
						        	});
						        }
					        }

			            	// Get the online price of the card
			            	if (dictionary.settings.enableOnlinePrices) { // An element will only be returned if enablePrices is set on the dictionary
								if (content.find('.autocardanywhere-online-price').length == 0) {
									// Get the card price from the location specified in the dictionary...
						            AutocardAnywhere.ajax(
						            	AutocardAnywhere.format(dictionary.settings.onlinePriceURL, card, dictionary),
						            	function(response) {
						            		// Set the content of any matching price divs upon successful retrieval
						            		$('.autocardanywhere-online-prices-' + card.id).replaceWith(dictionary.parseOnlinePriceData(card, response));
						            	}
						            );
						        }
					        }

				        	// Fill-in the extra info data if extra info is enabled and any is configured for this game...
				        	if (AutocardAnywhere.enableExtraInfo && dictionary.extraInfo && (dictionary.extraInfo.length > 0)) {
				        		let dataDivClass = '.autocardanywhere-data-' + dictionary.game + dictionary.language + '-' + card.id;
					        	if (content.find(dataDivClass + '.autocardanywhere-loaded').length == 0) {
							        content.find('img, ' + dataDivClass).on('mouseover', function() {
							        	content.find(dataDivClass).show();
							        });
							        content.find('.autocardanywhere-loading').on('mouseout', function() {
							        	content.find(dataDivClass).hide();
							        });

							        content.find(dataDivClass + ' button').on('click', function() {
							        	let dataDiv = content.find(dataDivClass);
							        	dataDiv.find('.autocardanywhere-data-section').hide();
						        		dataDiv.find('.' + $(this).data('div')).fadeTo(500, 1);
						        	});

							        // Get the extra info data from the configured source(s)
									dictionary.extraInfo.map(function(source) {
										AutocardAnywhere.ajax(
											// Get the source url and interpolate any card data required
								        	AutocardAnywhere.format(source.url, card), 
								        	function(response) {
								        		source.sections.map(function(section) {
									        		// Set the content of any matching divs upon successful retrieval
									    			content.find(dataDivClass + ' .autocardanywhere-' + section.name).empty().append(
									    				dictionary.parseExtraInfo(response, section)
									    			).addClass('autocardanywhere-loaded');
												});
								        	},
								        	false
								        );
									});
							    }
							}
					    });

			            // Check if the image has loaded
						content.find('.autocardanywhere-loading img').on('load', function() {
							$(this).parent().removeClass('autocardanywhere-loading');
						})
						.on('error', function() {
							let parentDiv = $(this).parent();
							parentDiv.removeClass('autocardanywhere-loading');
							parentDiv.addClass('autocardanywhere-broken');
						})
						.each(function() {
							if(this.complete) {
								$(this).load();
							} else if(this.error) {
								$(this).error();
							}
						});

 						// If there's more than 1 card, setup a carousel to view them...
 						if (cards.length > 1) {
 							if (AutocardAnywhere.carouselEffect == 'slide') {delete AutocardAnywhere.carouselEffect;}
							content.find(".owl-carousel").owlCarousel({
								singleItem: true,
								transitionStyle: AutocardAnywhere.carouselEffect,
								mouseDrag: false,
								touchDrag: false,
								paginationNumbers: paginationNumbers,
								afterMove: function() {
									// Update the card link when the carousel changes
									let carouselItem = $(this.owl.owlItems[this.currentItem]).children().first();
									let cardUrl = carouselItem.data('url');
									api.elements.target.attr('href', cardUrl);
								}
							});
						}
			        },
			        show: function(event, api) {
			        	// Start the carousel playing if there is one
			        	if (AutocardAnywhere.carouselAutoPlay) {
			            	$(api.elements.content).find(".owl-carousel").trigger('owl.play', 2000);
			            }
			        },
		        	visible: function(event, api) {
		        		// Change pagination numbers to Roman numerals iff the carousel has numbers switched on and there are exactly 3 cards in the carousel
		        		if ($(api.elements.content).find('.owl-carousel').data('count') == '3') {
			        		$(api.elements.content).find('.owl-numbers').html(function(dummy, value) {
								let numeral = value;
									 if (numeral == '1') {numeral = 'I';}
				                else if (numeral == '2') {numeral = 'II';}
				                else if (numeral == '3') {numeral = 'III';}
				                return numeral;
							});
			        	}
			        },
			        hidden: function(event, api) {
			        	// Stop the carousel playing if there is one
			            $(api.elements.content).find(".owl-carousel").trigger('owl.stop');
			        }
			    }
		    }).bind('click', function(event){
		    	if (AutocardAnywhereSettings.isTouchInterface) {
		    		event.preventDefault();
		    		return false; 
		    	}
		    });
			*/
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
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/light-border.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/material.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/translucent.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/tippy/scale.css"));
        injectCSSFile(AutocardAnywhere.getURL("libs/swiper-bundle.min.css"));

		let popupCss     =  ".autocardanywhere-popup {background-color: #ffffff !important; z-index: 15001 !important;}";
		let imgLoadedCss =  ".autocardanywhere-popup .autocardanywhere-loading,.autocardanywhere-broken{background-color: black;background-position: center center;background-repeat: no-repeat;border-radius: 10px;}" +
							".autocardanywhere-popup .autocardanywhere-loading{background-image: url('" + AutocardAnywhere.getURL('img/loading.gif') + "');background-color: black;}" +
							".autocardanywhere-popup .autocardanywhere-broken{background-image: url('" + AutocardAnywhere.getURL('img/broken.png') + "');background-color: #be3730;}" +
							".autocardanywhere-popup .autocardanywhere-loading img{display: none;}" +
							".autocardanywhere-popup .autocardanywhere-broken img{display: none;}";
		let scrollBarCss = ".autocardanywhere-popup ::-webkit-scrollbar{width: 0.5em;}.autocardanywhere-popup ::-webkit-scrollbar-button{height:0px;}.autocardanywhere-popup ::-webkit-scrollbar-track-piece{background:#888;}.autocardanywhere-popup ::-webkit-scrollbar-thumb{background:#ccc;}​";

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
	    		if ((!/^(a|button|input|textarea|script|style)$/i.test(nodes[i].tagName)) &&
	    			(node.children('div.tippy-box').length === 0) &&
	    			(node.parents("div.tippy-box").length === 0) &&
	    			(!nodes[i].isContentEditable)
	    			) {
			    		// Linkify the new node and then add popups in it
					    if (AutocardAnywhere.replaceExistingLinks) {AutocardAnywhere.replaceLinks(nodes[i])}
					    node.linkify({use: AutocardAnywhere.pluginNames});
					    AutocardAnywhere.initialisePopups(nodes[i]);
				}
			}
	    });
	    // Restart the observer
	    AutocardAnywhere.observeDomChanges();
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
			AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings, AutocardAnywhere.settingsCallback);
		}
	},

	initialiseContextMenu: function() {
		if (AutocardAnywhereSettings.isTouchInterface) {
			// No context menu
		}
		else if (AutocardAnywhereSettings.isSafari) {
			// When the context menu is displayed, store the current selection.
			// This is so the background script can determine whether or not to display the menu item.
			document.addEventListener("contextmenu", function(event) {
				safari.self.tab.setContextMenuEventUserInfo(event, window.getSelection().toString() != '');
			}, false);

			// Respond to messages sent by the background script when the context menu item is clicked.
			safari.self.addEventListener("message", function(msg) {
				if (msg.name == 'contextmenuitemclick') {
					AutocardAnywhere.contextMenuClick();
				}
			}, false);
		}
		else { // Chrome, Opera, Firefox or Edge
			browser.runtime.onMessage.addListener(function(request) {
				if (request.name == 'contextmenuitemclick') { AutocardAnywhere.contextMenuClick(); }
			});
		}
	},
	
	settingsCallback: function(response) {
		let listType = response.listType;
		let thisSiteListed = false;
		let url = AutocardAnywhere.getCurrentUrl();
		if (response.listedSites) {
			// boardgamearena tables explicitly disabled to avoid issue with links. 
			let listedSites = response.listedSites + ";boardgamearena.com;";
			listedSites.split(";").map(function(site) {
				if ((site.length > 0) && (url.indexOf(site) != -1)) {
					thisSiteListed = true;
				}
			});
		}

		if (url == 'https://www.autocardanywhere.com/contact.php') {
			response.userAgent = navigator.userAgent;
			$('#settings').val(JSON.stringify(response, null, '  '));
		}
		
		// If we are clear to run on this website
		if ((listType != 'whitelist' && !thisSiteListed) || (listType == 'whitelist' && thisSiteListed) || AutocardAnywhere.forceLoad) {
			// Load settings
			AutocardAnywhere.popupLanguage = response.popupLanguage;
			AutocardAnywhere.popupWidth = response.popupWidth;
			AutocardAnywhere.popupHeight = response.popupHeight;
			AutocardAnywhere.fontSize = Math.max(Math.ceil(AutocardAnywhere.popupHeight / 24), 14);
			AutocardAnywhere.lineHeight = AutocardAnywhere.fontSize + 1;
			AutocardAnywhere.openInNewTab = response.newTab;
			AutocardAnywhere.enablePopups = response.enablePopups;
			AutocardAnywhere.enableExtraInfo = response.enableExtraInfo;
			AutocardAnywhere.caseSensitive = response.caseSensitive;

			AutocardAnywhere.popupShowEffect = response.popupShowEffect;
			AutocardAnywhere.popupShowDuration = response.popupShowDuration;
			AutocardAnywhere.popupHideEffect = response.popupHideEffect;
			AutocardAnywhere.popupHideDuration = response.popupHideDuration;
			AutocardAnywhere.carouselEffect = response.carouselEffect;
			AutocardAnywhere.carouselAutoPlay = response.carouselAutoPlay;

			AutocardAnywhere.replaceExistingLinks = response.replaceExistingLinks;

			AutocardAnywhereSettings.currencies.map(function(currency) {
				if (currency.value == response.currency) {
					AutocardAnywhere.currency = currency;
				}
			})
	
			AutocardAnywhere.ignoreList = {};
			if (response.ignoredCards !== undefined) {
				response.ignoredCards.split('|').map(function(ignoredCard) {
					AutocardAnywhere.ignoreList[ignoredCard.toLowerCase()] = 1;
				});
			}
			// Always ignore the card "Ow"
			AutocardAnywhere.ignoreList['ow'] = 1;
			
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
			for (dictionaryName in dictionariesHash) {
				let dictionary = dictionariesHash[dictionaryName];
				if (dictionary.default == 1) {
					dictionaries.push([dictionary.game, dictionary.language]);
				}
			}

			// Now load all dictionaries
			AutocardAnywhere.games.load(dictionaries, function(result) {
				AutocardAnywhere.dictionaries = result;

				let pluginFunctions = {};
				AutocardAnywhere.pluginNames = [];
				
				// Standard card sets
				dictionaries.map(function(dictionary) {
					let dictionaryName = dictionary[0] + dictionary[1];
					pluginFunctions[dictionaryName] = function(text) {
						return AutocardAnywhere.dictionaries[dictionaryName].run(text);
					};
					AutocardAnywhere.pluginNames.push(dictionaryName);
				});

				// Custom nickname list
				if (response.customNicknames && (response.customNicknames != '')) {
					if (response.customNicknames.indexOf(';') > -1) {
						response.customNicknames = response.customNicknames.replace(/;/g, '||').replace(/:/g, '|');
					}
					let customNicknames = {};
					let customNicknameRE = '(';
					response.customNicknames.split('||').map(function(x) {
						let nickname = x.split('|');
						if (nickname.length == 3) {
							if (AutocardAnywhere.dictionaries[nickname[0]]) {
								customNicknames[nickname[1].toLowerCase()] = {
									dictionary: nickname[0],
									nickname: nickname[1],
									fullname: nickname[2]
								};
								customNicknameRE += nickname[1] + '|';
							}
						}
					});

					if (customNicknameRE.length > 1) {
						customNicknameRE = customNicknameRE.slice(0,-1);
					}
					customNicknameRE += ')';

					if (customNicknameRE != '()') {
						customNicknameRE = "([^a-zA-Z_0-9-'])" + customNicknameRE + "(?=[^a-zA-Z_0-9-'])";
						pluginFunctions['custom'] = function(text) {
							return text.replace(new RegExp(customNicknameRE, "gi"), function(match, f, s) {
								let nickname = customNicknames[s.toLowerCase()];
								if (!nickname) {return match}
								let dictionary = AutocardAnywhere.dictionaries[nickname.dictionary];
								let card = dictionary.findCard(nickname.fullname);
								if ((!card) || (AutocardAnywhere.ignoreList[nickname.nickname.toLowerCase()]) || (AutocardAnywhere.ignoreList[nickname.fullname.toLowerCase()])) {return match}
								if (response.expandNicknames) {
									return f + dictionary.createLink(dictionary, card, nickname.fullname);
								}
								else {
									return f + dictionary.createLink(dictionary, card, nickname.nickname);
								}
							});
						};
						AutocardAnywhere.pluginNames.push('custom');
					}
				}

				// If we've just been loaded as a result of the user clicking the context menu item, run on the selected text
				if (AutocardAnywhere.forceLoad) {
					AutocardAnywhere.contextMenuClick();
				}
				// else run on the whole page
				else {
					// Replace existing card links
					if (AutocardAnywhere.replaceExistingLinks) {AutocardAnywhere.replaceLinks(document.body)}

					// Setup the linkify plugin, then run it
					$.extend($.fn.linkify.plugins, pluginFunctions);
					$('body').linkify({use: AutocardAnywhere.pluginNames});
					// Initialise card popups for the base document
					AutocardAnywhere.initialisePopups(document.body);

					// Setup the mutation observer to pickup any changes to the DOM
					if (typeof(MutationObserver) !== 'undefined') {
						AutocardAnywhere.domObserver = new MutationObserver(AutocardAnywhere.domChangeCallback);
						AutocardAnywhere.observeDomChanges();
					}
				}
			});
			AutocardAnywhere.loaded = true;
		}
		else { // disabled on this site
			if (!AutocardAnywhereSettings.isSafari) {browser.runtime.sendMessage({'name': 'disableIcon'})}
		}
	}
}

if (!AutocardAnywhereSettings.isBookmarklet) {
	AutocardAnywhereSettings.load(AutocardAnywhereSettings.prefix, AutocardAnywhereSettings.settings, AutocardAnywhere.settingsCallback);
	// Setup handler for context menu item click
	AutocardAnywhere.initialiseContextMenu();
}