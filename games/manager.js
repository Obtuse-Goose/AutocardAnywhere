if (typeof(AutocardAnywhere) == 'undefined') {
	AutocardAnywhere = {};
}

AutocardAnywhere.games = {
	load: function(games, callback) {
		let result = {};
	    games.map(function(game) {
	    	let name = game[0];
	    	let language = game[1];

	    	AutocardAnywhere.games[name][language].load(function(dictionary) {
	    		function messageCallback(response) {
	    			dictionary.test = new RegExp(response.test, "gi");
	    			dictionary.cardNames = response.cardNames;
	    			dictionary.cardData = response.cardData;
	    			result[name + language] = dictionary;

		    		// Once all the dictionaries are loaded, call the callback
		    		if (Object.keys(result).length == games.length) {
			    		callback(result);
			    	}
				};

				if (AutocardAnywhereSettings.isBookmarklet) { // Running as bookmarklet
					messageCallback({
						'cardData': [],
						'test': AutocardAnywhereLoader[name + language].test,
						'cardNames': AutocardAnywhereLoader[name + language].cardNames
					});
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
		    	}
	    	});
	    });
	    
	}
};