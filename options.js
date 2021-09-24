if (typeof chrome !== 'undefined') {var browser = chrome;}
let cp;
let oldValue;
let dictionaries = [];
let lastNickname = 'mtgen';

function addNickname(nickname) {
	if (nickname[0] == '') {
		nickname[0] = lastNickname;
	}
	else {
		lastNickname = nickname[0];
	}
	let d = document.createElement('div');
	$(d).addClass('customNickname');
	let dictionaryCombobox = document.createElement('select');
	$(dictionaryCombobox).addClass('dictionary').on('change', function() {
		lastNickname = $(this).val();
		saveSettings({})}
	);
	dictionaries.map(function(dictionary) {
		let game = dictionary[0];
		let language = dictionary[1];
		let option = document.createElement('option');
		if (AutocardAnywhere.games[game] && AutocardAnywhere.games[game][language]) {
			option.text = AutocardAnywhere.games[game][language].description;
		}
		option.value = game+language;
		option.selected = (game+language == nickname[0]);
		dictionaryCombobox.add(option);
	});
	$(d).append(dictionaryCombobox);

	let nicknameTextbox = document.createElement('input');
	$(nicknameTextbox).addClass('nickname').on('keyup', function() {saveSettings({})}).val(nickname[1]);
	$(d).append(nicknameTextbox);

	let fullnameTextbox = document.createElement('input');
	$(fullnameTextbox).addClass('fullname').on('keyup', function() {saveSettings({})}).val(nickname[2]);
	$(d).append(fullnameTextbox);

	let removeButton = document.createElement('button');
	$(removeButton).text('Remove').on('click', function() {
		$(this).parent('.customNickname').remove();
		saveSettings({});
	});
	$(d).append(removeButton);

	$(d).appendTo($("#custom-nicknames-div"));
}

function loadNicknamesFromString(s) {
	if (!s) {return;}
	if (s.indexOf(';') > -1) {
		s = s.replace(/;/g, '||').replace(/:/g, '|');
	}
	s.split('||').map(function(x) {
		let nickname = x.split('|');
		if (nickname.length == 3) {
			addNickname(nickname);
		}
	});
}

function nicknamesToString() {
	let customNicknames = '';
	$('.customNickname').each(function() {
		let dictionary = $(this).find('.dictionary').val();
		let nickname = $(this).find('.nickname').val();
		let fullname = $(this).find('.fullname').val();

		if ((dictionary != '') && (nickname != '') && (fullname != '')) {
			customNicknames += dictionary + '|' + nickname + '|' + fullname + '||';
		}
	});
	if (customNicknames == '') {
		customNicknames = '||';
	}
	return customNicknames;
}

function loadSettings(response) {
	// Dark mode
	if (response.theme == 'dark') {
		$('[name="darkmode"]').prop('checked', true);
		switchTheme('dark');
	}

	// Card sets page
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
			let enabled = (linkLanguage[2] == '1');
			dictionaries.push([game, language, enabled]);
			delete dictionariesHash[game + language];
		}
	});

	// Then check that we don't have any extra dictionaries specified in settings.js that don't appear in the user's settings.
	// This would happen if the dictionary in question has been added to the extension since the last time the user saved settings.
	for (dictionaryName in dictionariesHash) {
		let dictionary = dictionariesHash[dictionaryName];
		dictionaries.push([dictionary.game, dictionary.language, (dictionary.default == 1)]);
	}

	// Now we have a list of all dictionaries, generate the options page for them
	let languagesHtml = '';
	dictionaries.map(function(dictionary) {
		let game = dictionary[0];
		let language = dictionary[1];
		if (!AutocardAnywhere.games[game] || !AutocardAnywhere.games[game][language]) {
			return;
		}

		let languageElement = document.createElement("li");
		languageElement.className = 'ui-state-default';
		languageElement.id = game + language;
		languageElement.dataset.game = game;
		languageElement.dataset.language = language;

		let languageSpan = document.createElement("span");
		languageSpan.className = 'ui-icon ui-icon-arrowthick-2-n-s';

		let languageInput = document.createElement("input");
		languageInput.type = 'checkbox';
		languageInput.id = 'language-checkbox-' + game + '-' + language;
		languageInput.checked = dictionary[2];

		let languageLabel = document.createElement("label");
		languageLabel.htmlFor = 'language-checkbox-' + game + '-' + language;
		languageLabel.appendChild(document.createTextNode(AutocardAnywhere.games[game][language].description));

		let languageButtonDiv = document.createElement("div");
		languageButtonDiv.className = 'dictionarySettings';
		let languageButton = document.createElement("button");
		languageButton.appendChild(document.createTextNode('Settings'));
		languageButtonDiv.appendChild(languageButton);

		let languageDiv = document.createElement("div");
		languageDiv.appendChild(languageSpan);
		languageDiv.appendChild(languageInput);
		languageDiv.appendChild(languageLabel);
		languageDiv.appendChild(languageButtonDiv);

		languageElement.appendChild(languageDiv);
		$("#sortable").append(languageElement);
	});

	// Links page
	if (response.linkStyleFontColour.substr(0,1) != '#') {
		response.linkStyleFontColour = '#' + response.linkStyleFontColour;
	}
	$("#colour-textbox").val(response.linkStyleFontColour);
	$("#bold-checkbox").prop('checked', response.linkStyleBold);
	$("#italic-checkbox").prop('checked', response.linkStyleItalic);
	$("#underline-checkbox").prop('checked', response.linkStyleUnderline);
	$("#dashed-checkbox").prop('checked', response.linkStyleDashed);
	$("#icon-checkbox").prop('checked', response.showIcon);
	$("#new-tab-checkbox").prop('checked', response.newTab);
	$("#replace-existing-links-checkbox").prop('checked', response.replaceExistingLinks);
	$("#fuzzy-lookup-checkbox").prop('checked', response.fuzzyLookup);

	// Popups page
	$("#enable-popups-checkbox").prop('checked', response.enablePopups);
	$("#enable-ignore-card-checkbox").prop('checked', response.enableIgnoreCardLink);
	$("#popup-language-radio-"+response.popupLanguage).prop('checked', true);
	$("#enable-extra-info-checkbox").prop('checked', response.enableExtraInfo);
	$("#resizable").width(response.popupWidth);
	$("#resizable").height(response.popupHeight);
	$("#resizable").resizable({aspectRatio: true, minWidth: 179, maxWidth: 400, stop: popupImageSizeChanged});
	
	$("#popup-show-radio-"+response.popupAnimation).prop('checked', true);
	$("#popup-show-duration-slider").slider({
		value:response.popupShowDuration,
		min:0,
		max:1000,
		step:50,
		slide: function(event, ui) {
			$("#popup-show-duration").text(ui.value);
			saveSettings({});
		}
	});
	$("#popup-show-duration").text(response.popupShowDuration);

	//$("#popup-hide-radio-"+response.popupHideEffect).prop('checked', true);
	$("#popup-hide-duration-slider").slider({
		value:response.popupHideDuration,
		min:0,
		max:1000,
		step:50,
		slide: function(event, ui) {
			$("#popup-hide-duration").text(ui.value);
			saveSettings({});
		}
	});
	$("#popup-hide-duration").text(response.popupHideDuration);

	$("#popup-carousel-radio-"+response.carouselAnimation).prop('checked', true);
	$("#carousel-autoplay-checkbox").prop('checked', response.carouselAutoPlay);

	// Prices page
	document.getElementById("tabs-6").appendChild(
		getSettingElement({
			'name': 'currency',
			'description': 'Currency:',
			'controlType': 'radio',
			'options': AutocardAnywhereSettings.currencies
		}, response)
	);

	// Custom nicknames page
	$("#expand-nicknames-checkbox").prop('checked', response.expandNicknames);

	loadNicknamesFromString(response.customNicknames);
	$('#add-custom-nickname-button').on('click', function() {
		addNickname(['', '', '']);
	});
	$('#export-nicknames-button').on('click', function() {
		$('#dialogs').append('<div id="dialog" title="Export Nicknames List"><textarea rows="10" cols="49" id="import">' + nicknamesToString() + '</textarea></div>');
		$("#dialog").dialog({
			//height: 300,
			width: 500,
			modal: true,
			show: true,
			hide: true,
			buttons: {
				Close: function() {
					$(this).dialog("destroy");
					$("#dialog").remove();
				}
			}
		});
	});
	$('#import-nicknames-button').on('click', function() {
		$('#dialogs').append('<div id="dialog" title="Import Nicknames List"><label>Paste exported list here</label>&nbsp;<input id="import"></input></div>');
		$("#dialog").dialog({
			//height: 300,
			width: 500,
			modal: true,
			show: true,
			hide: true,
			buttons: {
				Save: function() {
					loadNicknamesFromString($('#import').val());
					saveSettings({});
					$(this).dialog("destroy");
					$("#dialog").remove();
				},
				Cancel: function() {
					$(this).dialog("destroy");
					$("#dialog").remove();
				}
			}
		});
	});

	// Ignored cards page
	let ignored = response.ignoredCards.replace(/\|/g,'\n');
	$("#ignored-cards-textbox").val(ignored);
	let unignored = response.unignoredCards.replace(/\|/g,'\n');
	$("#unignored-cards-textbox").val(unignored);
	$("#case-sensitive-checkbox").prop('checked', response.caseSensitive);

	// Sites page
	if (response.listType == 'whitelist') {
		$("#list-type-radio2").prop('checked', true);
	}
	else {
		$("#list-type-radio1").prop('checked', true);
	}
	let listedSites = response.listedSites.replace(/;/g,'\n');
	$("#listed-sites-textbox").val(listedSites);

	// About page
	$('#versionNumber').text(response.versionNumber);
	if (response.lastDataUpdate == '') response.lastDataUpdate = 'Unknown'; 
	$('#lastUpdate').text(new Date(response.lastDataUpdate).toLocaleDateString());
	if (response.dataVersion == '') response.dataVersion = 'Unknown'; 
	$('#dataVersion').text(response.dataVersion);
	$('#currentYear').text(new Date().getFullYear());
	
	// Initialise jQueryUI controls
	$("#sortable").sortable({
		update: function() {saveSettings({})}
	});
    $("#sortable").disableSelection();
	$("#tabs").tabs();
	$("#resizable").css("background-image", "url(" + getURL("img/" + Math.floor((Math.random()*8)+1) + ".png") + ")");

    // Initialise colour picker
	if (response.linkStyleFontColourInherit) {
		$("#colour-inherit-checkbox").prop('checked', true);
		$('#colour-picker').hide();
	}

    // Setup settings button event handlers
	$(".dictionarySettings button").click(function() {
		let game = $(this).parents('li').data('game');
		let lang = $(this).parents('li').data('language');
		let settings = AutocardAnywhere.games[game].settings || [];
		settings = settings.concat(AutocardAnywhere.games[game][lang].settings || []);
		loadCardlistSettings(settings, game, lang);
	});

	// Setup other event handlers
    $(':input').on('change', function() {saveSettings({})});
	$('#enable-popups-checkbox').on('change', enablePopupsChanged);
	$('#listed-sites-textbox').on('keyup', function() {saveSettings({})});
	$('#ignored-cards-textbox').on('keyup', function() {saveSettings({})});
	$('#unignored-cards-textbox').on('keyup', function() {saveSettings({})});
	$("#colour-textbox").on('keydown', colourTextBoxKeyDown);
	$("#colour-textbox").on('keyup', colourTextBoxKeyUp);
	$('#colour-inherit-checkbox').on('change', colourInheritChange);
	//$('#google-share-button').on('click', showGoogleDialog);

	enablePopupsChanged();

	// Set preview style
	$("#link-preview").css('color', $("#colour-textbox").val());
	$("#link-preview").css('font-weight', $("#bold-checkbox").prop('checked') ? 'bold' : 'normal');
	$("#link-preview").css('font-style', $("#italic-checkbox").prop('checked') ? 'italic' : 'normal');
	$("#link-preview").css('text-decoration', $("#underline-checkbox").prop('checked') ? 'underline' : 'none');
	$("#link-preview").css('border-bottom', $("#dashed-checkbox").prop('checked') ? '1px dashed' : 'none');
	$("#icon-checkbox").prop('checked') ? $("#link-preview").addClass('icon') : $("#link-preview").removeClass('icon');

	if (response.setupShown) {
		$('#settings').show();
	}
	else {
		$('#overlay').on('click', function() {
			$('#overlay').hide();
			$('#settings').show();//fadeTo(500,1);
			save({
				'setupShown': true
			});
		});
		$('#overlay').show();
	}
};

function save(settings) {
	// Saves settings in browser-specific way
	if (AutocardAnywhereSettings.isSafari) {
		safari.self.tab.dispatchMessage('saveSettings', {'prefix': AutocardAnywhereSettings.prefix, 'settings': settings});
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.runtime.sendMessage({'name': 'saveSettings', 'prefix': AutocardAnywhereSettings.prefix, 'settings': settings});
	}
};

function saveSettings(settings) {
	// Dark mode
	if ($("#darkmode").prop('checked')) {
		settings.theme = 'dark';
	}
	else {
		settings.theme = 'light';
	}

	// Set preview style
	$("#link-preview").css('color', $("#colour-textbox").val());
	$("#link-preview").css('font-weight', $("#bold-checkbox").prop('checked') ? 'bold' : 'normal');
	$("#link-preview").css('font-style', $("#italic-checkbox").prop('checked') ? 'italic' : 'normal');
	$("#link-preview").css('text-decoration', $("#underline-checkbox").prop('checked') ? 'underline' : 'none');
	$("#link-preview").css('border-bottom', $("#dashed-checkbox").prop('checked') ? '1px dashed' : 'none');
	$("#icon-checkbox").prop('checked') ? $("#link-preview").addClass('icon') : $("#link-preview").removeClass('icon');

	if (typeof(settings) == 'undefined') {settings = {}}

	// Card sets page
	let dictionaries = '';
	$("#sortable").sortable("toArray").map(function(item) {
		let li = $('#'+item);
		let game = li.data('game');
		let language = li.data('language');
		let enabled = li.find('input:checkbox').prop('checked') ? 1 : 0;
		dictionaries += game + ':' + language + ':' + enabled + ';';
	});
	settings.linkLanguages = dictionaries;

	// Links page
	settings.linkStyleFontColourInherit = $("#colour-inherit-checkbox").prop('checked');
	settings.linkStyleFontColour = $("#colour-textbox").val();
	settings.linkStyleBold = $("#bold-checkbox").prop('checked');
	settings.linkStyleItalic = $("#italic-checkbox").prop('checked');
	settings.linkStyleUnderline = $("#underline-checkbox").prop('checked');
	settings.linkStyleDashed = $("#dashed-checkbox").prop('checked');
	settings.showIcon = $("#icon-checkbox").prop('checked');
	settings.newTab = $("#new-tab-checkbox").prop('checked');
	settings.replaceExistingLinks = $("#replace-existing-links-checkbox").prop('checked');
	settings.fuzzyLookup = $("#fuzzy-lookup-checkbox").prop('checked');

	// Popups page
	settings.enablePopups = $("#enable-popups-checkbox").prop('checked');
	settings.enableIgnoreCardLink = $("#enable-ignore-card-checkbox").prop('checked');
	settings.popupLanguage = $('input[name=popup-language-radio]:checked').val();
	settings.enableExtraInfo = $("#enable-extra-info-checkbox").prop('checked');
	settings.popupWidth = Math.round($("#resizable").width());
	settings.popupHeight = Math.round($("#resizable").height());
	settings.popupAnimation = $('input[name=popup-show-radio]:checked').val();
	settings.popupShowDuration = $("#popup-show-duration").text();
	//settings.popupHideEffect = $('input[name=popup-hide-radio]:checked').val();
	settings.popupHideDuration = $("#popup-hide-duration").text();
	settings.carouselAnimation = $('input[name=popup-carousel-radio]:checked').val();
	settings.carouselAutoPlay = $("#carousel-autoplay-checkbox").prop('checked');

	// Prices page
	settings.currency = $('input[name=currency-radio]:checked').val();
	settings.exchangeRateLastUpdatedv4 = '';

	// Custom nicknames page
	settings.expandNicknames = $("#expand-nicknames-checkbox").prop('checked');
	settings.customNicknames = nicknamesToString();

	// Ignored cards page
	settings.ignoredCards = $("#ignored-cards-textbox").val().replace(/\n/g,'|');
	settings.unignoredCards = $("#unignored-cards-textbox").val().replace(/\n/g,'|');
	settings.caseSensitive = $("#case-sensitive-checkbox").prop('checked');

	// Sites page
	if ($("#list-type-radio2").prop('checked')) {
		settings.listType = 'whitelist';
	}
	else {
		settings.listType = 'blacklist';
	}
	settings.listedSites = $("#listed-sites-textbox").val().toLowerCase().replace(/\n/g,';');
	
	save(settings);
};

function enablePopupsChanged() {
	let checked = $('#enable-popups-checkbox').prop('checked');
	$('#enable-ignore-card-checkbox').attr('disabled', !checked);
	$('[name="popup-language-radio"]').attr('disabled', !checked);
	$('#enable-extra-info-checkbox').attr('disabled', !checked);
	if (checked) {
		$("#resizable").resizable("enable");
	}
	else {
		$("#resizable").resizable("disable");
	}
	$('[name="popup-show-radio"]').attr('disabled', !checked);
	$('[name="popup-carousel-radio"]').attr('disabled', !checked);
	$('#carousel-autoplay-checkbox').attr('disabled', !checked);
};

function popupImageSizeChanged() {
	$("#resizable").height(Math.round($("#resizable").height()));
	$("#resizable").width(Math.round($("#resizable").width()));
	saveSettings({});
};

function colourTextBoxKeyDown(event) {
	oldValue = $("#colour-textbox").val();
}

function colourTextBoxKeyUp(event) {
	let s = $("#colour-textbox").val();
	s = s.replace(/[^a-f\d#]/ig, '');
	s = s.replace(/(?:[^\^])#/ig, '');
	s = s.substr(0,7);
	$("#colour-textbox").val(s);
}

function colourInheritChange() {
	if ($('#colour-inherit-checkbox').prop('checked')) {
		$('#colour-picker').fadeOut(500);
	}
	else {
		$('#colour-picker').fadeIn(500);
	}
    saveSettings({});
}

function allClick() {
	// When all is selected/deselected, disable/enable the other checkboxes
	$('.' + $(this).data('setting')).prop('disabled', $(this).prop('checked'));
};

function getSettingElement(setting, values) {
	let result = document.createElement("div");

	if (setting.controlType == 'radio') {
		result.appendChild(document.createTextNode(setting.description));
		result.appendChild(document.createElement("br"));
		let settingList = document.createElement("ul");

		let customSelected = true;
		setting.options.map(function(option) {
			let item = document.createElement("li");
			let isChecked = false;
			if (option.value == values[setting.name]) {
				customSelected = false;
				isChecked = true;
			}
			if ((option.name == 'Custom') && customSelected) {
				isChecked = true;
			}

			let inputElement = document.createElement("input");
			inputElement.type = 'radio';
			inputElement.id = setting.name + option.name;
			inputElement.name = setting.name + '-radio';
			inputElement.value = option.value;
			inputElement.checked = isChecked;

			let labelElement = document.createElement("label");
			labelElement.htmlFor = setting.name + option.name;
			labelElement.appendChild(document.createTextNode(option.description));

			item.appendChild(inputElement);
			item.appendChild(labelElement);

			if (option.name == 'Custom') {
				let customInputElement = document.createElement("input");
				customInputElement.type = 'text';
				customInputElement.id = setting.name + option.name + 'Textbox';
				customInputElement.value = values[setting.name];
				customInputElement.style.width = '330px';
				customInputElement.style.marginLeft = '10px';
				item.appendChild(customInputElement);
			}

			settingList.appendChild(item);
		});
		result.appendChild(settingList);
	}
	else if (setting.controlType == 'checkbox') {
		let settingInput = document.createElement("input");
		settingInput.type = 'checkbox';
		settingInput.id = setting.name + '-checkbox';
		settingInput.checked = values[setting.name];

		let settingLabel = document.createElement("label");
		settingLabel.htmlFor = setting.name + '-checkbox';
		settingLabel.appendChild(document.createTextNode(setting.description));

		result.appendChild(settingInput);
		result.appendChild(settingLabel);
		result.appendChild(document.createElement("br"));
	}
	else if (setting.controlType == 'text') {
		let settingInput = document.createElement("input");
		settingInput.type = 'text';
		settingInput.id = setting.name + '-textbox';

		let settingLabel = document.createElement("label");
		settingLabel.htmlFor = setting.name + '-textbox';
		settingLabel.appendChild(document.createTextNode(setting.description));

		result.appendChild(settingLabel);
		result.appendChild(settingInput);
		result.appendChild(document.createElement("br"));
	}
	/*
	else if (setting.controlType == 'bitmask') {
		html += setting.description + '<br/><ul>';

		let allChecked = false;
		setting.mask.map(function(bit) {
			if (bit.type == 'all') {
				allChecked = (values[setting.name] & bit.value);
			}
		});
		setting.mask.map(function(bit) {
			let isChecked = (values[setting.name] & bit.value) ? 'CHECKED' : '';
			if (bit.type == 'all') {
				html += '<li><input type="checkbox" class="all" data-setting="' + setting.name + '" id="' + setting.name + bit.value + '-checkbox" ' + isChecked + '><label for="' + setting.name + bit.value + '-checkbox">' + bit.description + '</li>';
			}
			else {
				let isDisabled = allChecked ? 'DISABLED' : '';
				html += '<li><input type="checkbox" class="' + setting.name + '" id="' + setting.name + bit.value + '-checkbox" ' + isChecked + ' ' + isDisabled + '><label for="' + setting.name + bit.value + '-checkbox">' + bit.description + '</li>';
			}
		});

		html += '</ul>';
	}
	*/
	return result;
}

function showDialog(settings, values, game, language) {
	let dialogElement = document.createElement("div");
	dialogElement.id = 'dialog';
	dialogElement.title = $('#' + game + language).find('label').text() + ' settings';
	//let html = '<div id="dialog" title="' + $('#' + game + language).find('label').text() + ' settings" >';
	settings.map(function(setting) {
		dialogElement.appendChild(getSettingElement(setting, values));
	});
	
	$('#dialogs').append(dialogElement);
	$('.all').on("click", allClick);
	$("#dialog").dialog({
		//height: 300,
		width: 500,
		modal: true,
		show: true,
		hide: true,
		buttons: {
			Save: function() {
				let toSave = {};
				settings.map(function(setting) {
					let val;
					if (setting.controlType == 'radio') {
						let textboxID = $('input[name="' + setting.name + '-radio"]:checked').attr('id') + 'Textbox';
						let textbox = $('#' + textboxID);
						if (textbox.length == 1) {
							val = textbox.val();
						}
						else {
							val = $('input[name="' + setting.name + '-radio"]:checked').val();
						}
					}
					else if (setting.controlType == 'checkbox') {
						val = $('#' + setting.name + '-checkbox').prop('checked');
					}
					else if (setting.controlType == 'text') {
						val = $('#' + setting.name + '-textbox').val();
					}
					else if (setting.controlType == 'bitmask') {
						val = 0;
						setting.mask.map(function(bit) {
							if ($('#' + setting.name + bit.value + '-checkbox').prop('checked')) {
								val += bit.value;
							}
						});
					}
					if (typeof(val) != 'undefined') {
						toSave[game + language + setting.name] = val;
					}
				});
				saveSettings(toSave);
				$(this).dialog("destroy");
				$("#dialog").remove();
			},
			Cancel: function() {
				$(this).dialog("destroy");
				$("#dialog").remove();
			}
		}
	});
};

/*
function showGoogleDialog() {
	window.open(
		"https://plus.google.com/share?url=https://browser.google.com/webstore/detail/eobkhgkgoejnjaiofdmphhkemmomfabg", 
		'', 
		'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=500,width=400'
	);
	return false;
}
*/

function loadCardlistSettings(settings, game, language) {
	if (AutocardAnywhereSettings.isSafari) {
		let messageID = AutocardAnywhereGuid();
		function getResponse(event) {
			if (event.name === messageID) {
				showDialog(settings, event.message, game, language);
			}
		}
		safari.self.addEventListener("message", getResponse, false);
		safari.self.tab.dispatchMessage('loadSettings', {'id': messageID, 'prefix': AutocardAnywhereSettings.prefix + game + language, 'settings': settings});
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.runtime.sendMessage({'name': 'loadSettings', 'prefix': AutocardAnywhereSettings.prefix + game + language, 'settings': settings}, function(response) {
			showDialog(settings, response, game, language);
		});
	}
};

function getURL(filename) {
	if (AutocardAnywhereSettings.isSafari) {
		return safari.extension.baseURI + filename;
	}
	else { // Chrome, Opera, Firefox or Edge
		return browser.runtime.getURL(filename);
	}
};

function switchTheme(newTheme) {
	// Selecting all the required classes from HTML to change 
	let body = $(document.body);
	let box = $('.box');
	let ball = $('.ball');
	let stylesheet = $('#theme-css');

	// Conditions to apply when dark mode is enabled
	if (newTheme == 'dark') {
		stylesheet.attr('href', 'libs/dark/jquery-ui.min.css');
		box.attr('style','background-color:white;');
		ball.attr('style','transform:translatex(100%);');
		body.attr('style','background-color:#505355; color:white;');
	}

	// Conditions to apply when light mode is enabled
	else if (newTheme == 'light') {
		stylesheet.attr('href', 'libs/light/jquery-ui.min.css');
		box.attr('style','background-color:#505355; color:white;');
		ball.attr('style','transform:translatex(0%);');
		body.attr('style','background-color:white; color:#505355;');
	}
}

$(function() {
	// Load settings
	if (AutocardAnywhereSettings.isSafari) {
		let messageID = AutocardAnywhereGuid();
		function getResponse(event) {
			if (event.name === messageID) {
				loadSettings(event.message);
			}
		}
		safari.self.addEventListener("message", getResponse, false);
		safari.self.tab.dispatchMessage('loadSettings', {'id': messageID, 'prefix': AutocardAnywhereSettings.prefix, 'settings': AutocardAnywhereSettings.settings});
	}
	else { // Chrome, Opera, Firefox or Edge
		browser.runtime.sendMessage({'name': 'loadSettings', 'prefix': AutocardAnywhereSettings.prefix, 'settings': AutocardAnywhereSettings.settings}, loadSettings);
	}

	// Initialise dark mode switch
	// Adding an eventListener function to change color everytime var check is changed.(checked & unchecked)
	$('#darkmode').on('change', function() {
		if (this.checked == true) {
			switchTheme('dark');
		}
		else {
			switchTheme('light');
		}
		// Save the new setting
		saveSettings({});
	});
});