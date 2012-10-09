var inFullscreen = false;
var mainCanvas = null;
var fullscreenCanvas = null;
var showAsMinimal = false;
var keyZones = [
	["right", [39]],
	["left", [37]],
	["up", [38]],
	["down", [40]],
	["a", [88, 74]],
	["b", [90, 81, 89]],
	["select", [16]],
	["start", [13]]
];
function windowingInitialize() {
	cout("windowingInitialize() called.", 0);
	//Hide some windows:
	mainCanvas = document.getElementById("mainCanvas");
	fullscreenCanvas = document.getElementById("fullscreen");
	try {
		//Hook the GUI controls.
		registerGUIEvents();
	}
	catch (error) {
		cout("Fatal windowing error: \"" + error.message + "\" file:" + error.fileName + " line: " + error.lineNumber, 2);
	}
	//Update the settings to the emulator's default:
	$("#enable_sound").attr('checked', settings[0]);
	$("#enable_gbc_bios").attr('checked', settings[1]);
	$("#disable_colors").attr('checked', settings[2]);
	$("#rom_only_override").attr('checked', settings[9]);
	$("#mbc_enable_override").attr('checked', settings[10]);
	$("#enable_colorization").attr('checked', settings[4]);
	$("#do_minimal").attr('checked', showAsMinimal);
	$("#software_resizing").attr('checked', settings[12]);
	$("#typed_arrays_disallow").attr('checked', settings[5]);
	$("#gb_boot_rom_utilized").attr('checked', settings[11]);
	$("#resize_smoothing").attr('checked', settings[13]);
}
function registerGUIEvents() {
	cout("In registerGUIEvents() : Registering GUI Events.", -1);
	$("#terminal_clear_button").click(clear_terminal);
	$("#local_storage_list_refresh_button").click(refreshStorageListing);
	$("#input_select_close_button").click(function () { $("#input_select").hide() });
	$("#instructions_close_button").click(function () { $("#instructions").hide() });
	$("#local_storage_popup_close_button").click(function () { $("#local_storage_popup").hide() });
	$("#local_storage_list_close_button").click(function () { $("#local_storage_listing").hide() });
	$("#save_importer_close_button").click(function () { $("#save_importer").hide() });
	$("#freeze_list_close_button").click(function () { $("#freeze_listing").hide() });
	$("#local_storage_list_menu").click(function () { refreshStorageListing(); $("#local_storage_listing").show(); });
	$("#freeze_list_menu").click(function () { refreshFreezeListing(); $("#freeze_listing").show(); });
	$("#view_importer").click(function () { $("#save_importer").show() });
	$(document).on("keydown", keyDown);
	$(document).on("keyup",  function (event) {
		if (event.keyCode == 27) {
			//Fullscreen on/off
			fullscreenPlayer();
		}
		else {
			//Control keys / other
			keyUp(event);
		}
	});
	addEvent("MozOrientation", window, GameBoyGyroSignalHandler);
	addEvent("deviceorientation", window, GameBoyGyroSignalHandler);
	//new popupMenu(document.getElementById("GameBoy_file_menu"), document.getElementById("GameBoy_file_popup"));
	$("#data_uri_clicker").click(function () {
		var datauri = prompt("Please input the ROM image's Base 64 Encoded Text:", "");
		if (datauri != null && datauri.length > 0) {
			try {
				cout(Math.floor(datauri.length * 3 / 4) + " bytes of data submitted by form (text length of " + datauri.length + ").", 0);
				initPlayer();
				start(mainCanvas, base64_decode(datauri));
			}
			catch (error) {
				alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
			}
		}
	});
	$("#external_file_clicker").click(function () {
		var address = prompt("Please input the ROM image's URL:", "");
		if (address != null && address.length > 0) {
			try {
				new Ajax({
					URL:"res/proxy.php",
					GET:["url=" + escape(address)],
					Accept:"TEXT",
					Cached:true,
					Fail:function (error_message) {
						cout("Failed to load the ROM file through XmlHttpRequest.\r\nReason: " + error_message, 2);
					},
					Complete:function () {
						try {
							var romStream = base64_decode(arguments[1]);
							cout(romStream.length + " bytes of base64 decoded data retrieved by XHR (text length of " + arguments[1].length + ").", 0);
							initPlayer();
							start(mainCanvas, romStream);
						}
						catch (error) {
							alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
						}
					}
				});
			}
			catch (error) {
				alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
			}
		}
	});
	$("#set_volume").click(function () {
		if (GameBoyEmulatorInitialized()) {
			var volume = prompt("Set the volume here:", "1.0");
			if (volume != null && volume.length > 0) {
				settings[3] = Math.min(Math.max(parseFloat(volume), 0), 1);
				gameboy.changeVolume();
			}
		}
	});
	$("#set_speed").click(function () {
		if (GameBoyEmulatorInitialized()) {
			var speed = prompt("Set the emulator speed here:", "1.0");
			if (speed != null && speed.length > 0) {
				gameboy.setSpeed(Math.max(parseFloat(speed), 0.001));
			}
		}
	});
	$("#internal_file_clicker").click(function () {
		var file_opener = document.getElementById("local_file_open");
		$("#input_select").show();
		file_opener.click();
	});
	$("#input_select").on("blur", function () {
		$("#input_select").hide();
	});
	$("#local_file_open").on("change", function () {
		$("#input_select").hide();
		if (typeof this.files != "undefined") {
			try {
				if (this.files.length >= 1) {
					cout("Reading the local file \"" + this.files[0].name + "\"", 0);
					try {
						//Gecko 1.9.2+ (Standard Method)
						var binaryHandle = new FileReader();
						binaryHandle.onload = function () {
							if (this.readyState == 2) {
								cout("file loaded.", 0);
								try {
									initPlayer();
									start(mainCanvas, this.result);
								}
								catch (error) {
									alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
								}
							}
							else {
								cout("loading file, please wait...", 0);
							}
						}
						binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
					}
					catch (error) {
						cout("Browser does not support the FileReader object, falling back to the non-standard File object access,", 2);
						//Gecko 1.9.0, 1.9.1 (Non-Standard Method)
						var romImageString = this.files[this.files.length - 1].getAsBinary();
						try {
							initPlayer();
							start(mainCanvas, romImageString);
						}
						catch (error) {
							alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
						}
						
					}
				}
				else {
					cout("Incorrect number of files selected for local loading.", 1);
				}
			}
			catch (error) {
				cout("Could not load in a locally stored ROM file.", 2);
			}
		}
		else {
			cout("could not find the handle on the file to open.", 2);
		}
	});
	$("#save_open").on("change", function () {
		$("#save_importer").hide();
		if (typeof this.files != "undefined") {
			try {
				if (this.files.length >= 1) {
					cout("Reading the local file \"" + this.files[0].name + "\" for importing.", 0);
					try {
						//Gecko 1.9.2+ (Standard Method)
						var binaryHandle = new FileReader();
						binaryHandle.onload = function () {
							if (this.readyState == 2) {
								cout("file imported.", 0);
								try {
									import_save(this.result);
									refreshStorageListing();
								}
								catch (error) {
									alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
								}
							}
							else {
								cout("importing file, please wait...", 0);
							}
						}
						binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
					}
					catch (error) {
						cout("Browser does not support the FileReader object, falling back to the non-standard File object access,", 2);
						//Gecko 1.9.0, 1.9.1 (Non-Standard Method)
						var romImageString = this.files[this.files.length - 1].getAsBinary();
						try {
							import_save(romImageString);
							refreshStorageListing();
						}
						catch (error) {
							alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
						}
						
					}
				}
				else {
					cout("Incorrect number of files selected for local loading.", 1);
				}
			}
			catch (error) {
				cout("Could not load in a locally stored ROM file.", 2);
			}
		}
		else {
			cout("could not find the handle on the file to open.", 2);
		}
	});
	$("#restart_cpu_clicker").click(function () {
		if (GameBoyEmulatorInitialized()) {
			try {
				if (!gameboy.fromSaveState) {
					initPlayer();
					start(mainCanvas, gameboy.getROMImage());
				}
				else {
					initPlayer();
					openState(gameboy.savedStateFileName, mainCanvas);
				}
			}
			catch (error) {
				alert(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
			}
		}
		else {
			cout("Could not restart, as a previous emulation session could not be found.", 1);
		}
	});
	$("#run_cpu_clicker").click(function () { run(); });
	$("#kill_cpu_clicker").click(function () { pause(); });
	$("#save_state_clicker").click(function () { save(); });
	$("#save_SRAM_state_clicker").click(function () { saveSRAM(); });
	$("#enable_sound").click(function () {
		settings[0] = document.getElementById("enable_sound").checked;
		if (GameBoyEmulatorInitialized()) {
			gameboy.initSound();
		}
	});
	$("#disable_colors").click(function () {
		settings[2] = document.getElementById("disable_colors").checked;
	});
	$("#rom_only_override").click(function () {
		settings[9] = document.getElementById("rom_only_override").checked;
	});
	$("#mbc_enable_override").click(function () {
		settings[10] = document.getElementById("mbc_enable_override").checked;
	});
	$("#enable_gbc_bios").click(function () {
		settings[1] = document.getElementById("enable_gbc_bios").checked;
	});
	$("#enable_colorization").click(function () {
		settings[4] = document.getElementById("enable_colorization").checked;
	});
	$("#do_minimal").click(function () {
		showAsMinimal = document.getElementById("do_minimal").checked;
		fullscreenCanvas.className = (showAsMinimal) ? "minimum" : "maximum";
	});
	$("#software_resizing").click(function () {
		settings[12] = document.getElementById("software_resizing").checked;
		if (GameBoyEmulatorInitialized()) {
			gameboy.initLCD();
		}
	});
	$("#typed_arrays_disallow").click(function () {
		settings[5] = document.getElementById("typed_arrays_disallow").checked;
	});
	$("#gb_boot_rom_utilized").click(function () {
		settings[11] = document.getElementById("gb_boot_rom_utilized").checked;
	});
	$("#resize_smoothing").click(function () {
		settings[13] = document.getElementById("resize_smoothing").checked;
		if (GameBoyEmulatorInitialized()) {
			gameboy.initLCD();
		}
	});
	$("#view_fullscreen").click(fullscreenPlayer);
	//new popupMenu(document.getElementById("GameBoy_view_menu"), document.getElementById("GameBoy_view_popup"));
	$("#view_instructions").click(function () { $("instructions").show() });
	$("#gfx").on("mouseup", initNewCanvasSize);
	$(window).on("resize", initNewCanvasSize);
	$(window).on("unload", function () { autoSave(); });
}
function keyDown(event) {
	var keyCode = event.keyCode;
	var keyMapLength = keyZones.length;
	for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
		var keyCheck = keyZones[keyMapIndex];
		var keysMapped = keyCheck[1];
		var keysTotal = keysMapped.length;
		for (var index = 0; index < keysTotal; ++index) {
			if (keysMapped[index] == keyCode) {
				GameBoyKeyDown(keyCheck[0]);
				try {
					event.preventDefault();
				}
				catch (error) { }
			}
		}
	}
}
function keyUp(event) {
	var keyCode = event.keyCode;
	var keyMapLength = keyZones.length;
	for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
		var keyCheck = keyZones[keyMapIndex];
		var keysMapped = keyCheck[1];
		var keysTotal = keysMapped.length;
		for (var index = 0; index < keysTotal; ++index) {
			if (keysMapped[index] == keyCode) {
				GameBoyKeyUp(keyCheck[0]);
				try {
					event.preventDefault();
				}
				catch (error) { }
			}
		}
	}
}
function initPlayer() {
	document.getElementById("title").style.display = "none";
	document.getElementById("port_title").style.display = "none";
	document.getElementById("fullscreenContainer").style.display = "none";
}
function fullscreenPlayer() {
	if (GameBoyEmulatorInitialized()) {
		if (!inFullscreen) {
			gameboy.canvas = fullscreenCanvas;
			fullscreenCanvas.className = (showAsMinimal) ? "minimum" : "maximum";
			document.getElementById("fullscreenContainer").style.display = "block";
			$("#GameBoy").hide();
		}
		else {
			gameboy.canvas = mainCanvas;
			document.getElementById("fullscreenContainer").style.display = "none";
			$("#GameBoy").show();
		}
		gameboy.initLCD();
		inFullscreen = !inFullscreen;
	}
	else {
		cout("Cannot go into fullscreen mode.", 2);
	}
}
function runFreeze(keyName) {
	try {
		initPlayer();
		openState(keyName, mainCanvas);
		$("#freeze_listing").hide();
	}
	catch (error) {
		cout("A problem with attempting to open the selected save state occurred.", 2);
	}
}
//Wrapper for localStorage getItem, so that data can be retrieved in various types.
function findValue(key) {
	try {
		if (window.localStorage.getItem(key) != null) {
			return JSON.parse(window.localStorage.getItem(key));
		}
	}
	catch (error) {
		//An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
		if (window.globalStorage[location.hostname].getItem(key) != null) {
			return JSON.parse(window.globalStorage[location.hostname].getItem(key));
		}
	}
	return null;
}
//Wrapper for localStorage setItem, so that data can be set in various types.
function setValue(key, value) {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	}
	catch (error) {
		//An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
		window.globalStorage[location.hostname].setItem(key, JSON.stringify(value));
	}
}
//Wrapper for localStorage removeItem, so that data can be set in various types.
function deleteValue(key) {
	try {
		window.localStorage.removeItem(key);
	}
	catch (error) {
		//An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
		window.globalStorage[location.hostname].removeItem(key);
	}
}
function outputLocalStorageLink(keyName, dataFound, downloadName) {
	return generateDownloadLink("data:application/octet-stream;base64," + dataFound, keyName, downloadName);
}
function refreshFreezeListing() {
	var storageListMasterDivSub = document.getElementById("freezeListingMasterContainerSub");
	var storageListMasterDiv = document.getElementById("freezeListingMasterContainer");
	storageListMasterDiv.removeChild(storageListMasterDivSub);
	storageListMasterDivSub = document.createElement("div");
	storageListMasterDivSub.id = "freezeListingMasterContainerSub";
	var keys = getLocalStorageKeys();
	while (keys.length > 0) {
		key = keys.shift();
		if (key.substring(0, 7) == "FREEZE_") {
			storageListMasterDivSub.appendChild(outputFreezeStateRequestLink(key));
		}
	}
	storageListMasterDiv.appendChild(storageListMasterDivSub);
}
function outputFreezeStateRequestLink(keyName) {
	var linkNode = generateLink("javascript:runFreeze(\"" + keyName + "\")", keyName);
	var storageContainerDiv = document.createElement("div");
	storageContainerDiv.className = "storageListingContainer";
	storageContainerDiv.appendChild(linkNode)
	return storageContainerDiv;
}
function refreshStorageListing() {
	var storageListMasterDivSub = document.getElementById("storageListingMasterContainerSub");
	var storageListMasterDiv = document.getElementById("storageListingMasterContainer");
	storageListMasterDiv.removeChild(storageListMasterDivSub);
	storageListMasterDivSub = document.createElement("div");
	storageListMasterDivSub.id = "storageListingMasterContainerSub";
	var keys = getLocalStorageKeys();
	var blobPairs = [];
	for (var index = 0; index < keys.length; ++index) {
		blobPairs[index] = getBlobPreEncoded(keys[index]);
		storageListMasterDivSub.appendChild(outputLocalStorageRequestLink(keys[index]));
	}
	storageListMasterDiv.appendChild(storageListMasterDivSub);
	var linkToManipulate = document.getElementById("download_local_storage_dba");
	linkToManipulate.href = "data:application/octet-stream;base64," + base64(generateMultiBlob(blobPairs));
	linkToManipulate.download = "gameboy_color_saves.export";
}
function getBlobPreEncoded(keyName) {
	if (keyName.substring(0, 9) == "B64_SRAM_") {
		return [keyName.substring(4), base64_decode(findValue(keyName))];
	}
	else if (keyName.substring(0, 5) == "SRAM_") {
		return [keyName, convertToBinary(findValue(keyName))];
	}
	else {
		return [keyName, JSON.stringify(findValue(keyName))];
	}
}
function outputLocalStorageRequestLink(keyName) {
	var linkNode = generateLink("javascript:popupStorageDialog(\"" + keyName + "\")", keyName);
	var storageContainerDiv = document.createElement("div");
	storageContainerDiv.className = "storageListingContainer";
	storageContainerDiv.appendChild(linkNode)
	return storageContainerDiv;
}
function popupStorageDialog(keyName) {
	var subContainer = document.getElementById("storagePopupMasterContainer");
	var parentContainer = document.getElementById("storagePopupMasterParent");
	parentContainer.removeChild(subContainer);
	subContainer = document.createElement("div");
	subContainer.id = "storagePopupMasterContainer";
	parentContainer.appendChild(subContainer);
	var downloadDiv = document.createElement("div");
	downloadDiv.id = "storagePopupDownload";
	if (keyName.substring(0, 9) == "B64_SRAM_") {
		var downloadDiv2 = document.createElement("div");
		downloadDiv2.id = "storagePopupDownloadRAW";
		downloadDiv2.appendChild(outputLocalStorageLink("Download RAW save data.", findValue(keyName), keyName));
		subContainer.appendChild(downloadDiv2);
		downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName.substring(4), base64_decode(findValue(keyName)))), keyName));
	}
	else if (keyName.substring(0, 5) == "SRAM_") {
		var downloadDiv2 = document.createElement("div");
		downloadDiv2.id = "storagePopupDownloadRAW";
		downloadDiv2.appendChild(outputLocalStorageLink("Download RAW save data.", base64(convertToBinary(findValue(keyName))), keyName));
		subContainer.appendChild(downloadDiv2);
		downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName, convertToBinary(findValue(keyName)))), keyName));
	}
	else {
		downloadDiv.appendChild(outputLocalStorageLink("Download in import compatible format.", base64(generateBlob(keyName, JSON.stringify(findValue(keyName)))), keyName));
	}
	var deleteLink = generateLink("javascript:deleteStorageSlot(\"" + keyName + "\")", "Delete data item from HTML5 local storage.");
	deleteLink.id = "storagePopupDelete";
	subContainer.appendChild(downloadDiv);
	subContainer.appendChild(deleteLink);
	$("#local_storage_popup").show();
}
function convertToBinary(jsArray) {
	var length = jsArray.length;
	var binString = "";
	for (var indexBin = 0; indexBin < length; indexBin++) {
		binString += String.fromCharCode(jsArray[indexBin]);
	}
	return binString;
}
function deleteStorageSlot(keyName) {
	deleteValue(keyName);
	$("#local_storage_popup").hide();
	refreshStorageListing();
}
function generateLink(address, textData) {
	var link = document.createElement("a");
	link.href = address;
	link.appendChild(document.createTextNode(textData));
	return link;
}
function generateDownloadLink(address, textData, keyName) {
	var link = generateLink(address, textData);
	link.download = keyName + ".sav";
	return link;
}
function checkStorageLength() {
	try {
		return window.localStorage.length;
	}
	catch (error) {
		//An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
		return window.globalStorage[location.hostname].length;
	}
}
function getLocalStorageKeys() {
	var storageLength = checkStorageLength();
	var keysFound = [];
	var index = 0;
	var nextKey = null;
	while (index < storageLength) {
		nextKey = findKey(index++);
		if (nextKey !== null && nextKey.length > 0) {
			if (nextKey.substring(0, 5) == "SRAM_" || nextKey.substring(0, 9) == "B64_SRAM_" || nextKey.substring(0, 7) == "FREEZE_" || nextKey.substring(0, 4) == "RTC_") {
				keysFound.push(nextKey);
			}
		}
		else {
			break;
		}
	}
	return keysFound;
}
function findKey(keyNum) {
	try {
		return window.localStorage.key(keyNum);
	}
	catch (error) {
		//An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
		return window.globalStorage[location.hostname].key(keyNum);
	}
	return null;
}
//Some wrappers and extensions for non-DOM3 browsers:
function isDescendantOf(ParentElement, toCheck) {
	if (!ParentElement || !toCheck) {
		return false;
	}
	//Verify an object as either a direct or indirect child to another object.
	function traverseTree(domElement) {
		while (domElement != null) {
			if (domElement.nodeType == 1) {
				if (isSameNode(domElement, toCheck)) {
					return true;
				}
				if (hasChildNodes(domElement)) {
					if (traverseTree(domElement.firstChild)) {
						return true;
					}
				}
			}
			domElement = domElement.nextSibling;
		}
		return false;
	}
	return traverseTree(ParentElement.firstChild);
}
function hasChildNodes(oElement) {
	return (typeof oElement.hasChildNodes == "function") ? oElement.hasChildNodes() : ((oElement.firstChild != null) ? true : false);
}
function isSameNode(oCheck1, oCheck2) {
	return (typeof oCheck1.isSameNode == "function") ? oCheck1.isSameNode(oCheck2) : (oCheck1 === oCheck2);
}
function pageXCoord(event) {
	if (typeof event.pageX == "undefined") {
		return event.clientX + document.documentElement.scrollLeft;
	}
	return event.pageX;
}
function pageYCoord(event) {
	if (typeof event.pageY == "undefined") {
		return event.clientY + document.documentElement.scrollTop;
	}
	return event.pageY;
}
function mouseLeaveVerify(oElement, event) {
	//Hook target element with onmouseout and use this function to verify onmouseleave.
	return isDescendantOf(oElement, (typeof event.target != "undefined") ? event.target : event.srcElement) && !isDescendantOf(oElement, (typeof event.relatedTarget != "undefined") ? event.relatedTarget : event.toElement);
}
function mouseEnterVerify(oElement, event) {
	//Hook target element with onmouseover and use this function to verify onmouseenter.
	return !isDescendantOf(oElement, (typeof event.target != "undefined") ? event.target : event.srcElement) && isDescendantOf(oElement, (typeof event.relatedTarget != "undefined") ? event.relatedTarget : event.fromElement);
}
function addEvent(sEvent, oElement, fListener) {
	try {	
		oElement.addEventListener(sEvent, fListener, false);
		cout("In addEvent() : Standard addEventListener() called to add a(n) \"" + sEvent + "\" event.", -1);
	}
	catch (error) {
		oElement.attachEvent("on" + sEvent, fListener);	//Pity for IE.
		cout("In addEvent() : Nonstandard attachEvent() called to add an \"on" + sEvent + "\" event.", -1);
	}
}
function removeEvent(sEvent, oElement, fListener) {
	try {	
		oElement.removeEventListener(sEvent, fListener, false);
		cout("In removeEvent() : Standard removeEventListener() called to remove a(n) \"" + sEvent + "\" event.", -1);
	}
	catch (error) {
		oElement.detachEvent("on" + sEvent, fListener);	//Pity for IE.
		cout("In removeEvent() : Nonstandard detachEvent() called to remove an \"on" + sEvent + "\" event.", -1);
	}
}
