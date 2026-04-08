// to create documentation execute: jsdoc -r .\ -d .\Documentation


/**
 * This module 
 *    - handles the communication with the server
 *    - updates the GUI elements when necessary
 *    - handles events of the GUI elements
 */


// call the initialization function after the web page has been loaded
document.addEventListener('DOMContentLoaded', function(event) {
	initialize();
} );	


var itemUUID_atURL  = "";

var GMT_of_last_fetched_Data = ""; // Remembers when the data was fetched. Works in cooperation with a thread-function which checks periodically for new data. Format: "Y-m-d H:i:s". Example: "2023-10-25 11:03:42"
var FetchNewData_Interval_seconds = 120; //
var FetchNewData_IntrevalID = null; // this is the interval id of the thread-function
var theFetchedNewData = null; // stores the latest new data in json format

var AvailableTrenchesCombo;
var TheMainProgressBar;

/**
  * This is the first function called upon website loading.
  * It initializes various objects, properties, event listeners and fetches data from the server
  */
function initialize() {
	//
	/*
	$(document).ready(function() {
		$('.js-example-basic-multiple').select2();
	});
	*/
	// init several properties
	AvailableTrenchesCombo = document.getElementById("AvailableTrenchesCombo");
	AvailablePlansCombo = document.getElementById("AvailablePlansCombo");
	TheMainProgressBar = document.getElementById("MainProgressBar");
	if( Utils.Am_I_running_on_mobile_device() ) {
		AvailableTrenchesCombo.style.minWidth = "120px";
		AvailableTrenchesCombo.style.maxWidth = "120px";
		AvailablePlansCombo.style.minWidth = "120px";
		AvailablePlansCombo.style.maxWidth = "120px";
		document.getElementsByClassName("multiselect-dropdown")[0].style.border = "solid 3px red";
		document.getElementsByClassName("multiselect-dropdown")[0].style.backgroundColor = "purple";
	}
	
	// init objects
	map = new Map( "canvas" );
	
	// read url parameters if any - useful for directly accessing an item
	var url_object = new URL( window.location.href );
	itemUUID_atURL   = url_object.searchParams.get("id");
	if( itemUUID_atURL   == null ) itemUUID_atURL   = "";
	
	itemCategoriesCombo = document.getElementById("itemCategoriesCombo");
	itemCategoriesPanel = document.getElementById("itemCategoriesPanel");
	itemsList_ul = document.getElementById("itemsList_ul");		

	// add event listeners for item handling
	document.getElementById("itemsList_ul").addEventListener('click',this.ItemList_ClickHandler,false);
	document.getElementById("itemCategoriesCombo").addEventListener('change',this.itemCategoriesCombo_ChangeHandler,false);
	document.getElementById("itemCategoriesPanel").addEventListener('change',this.itemCategoriesPanel_ChangeHandler,false);
	document.getElementById("itemsSearchText").addEventListener('keyup',this.itemsSearchText_KeypressHandler,false);
	// add event listeners for combos
	AvailableTrenchesCombo.addEventListener('change',this.AvailableTrenchesCombo_ChangeHandler,false); 
	AvailablePlansCombo.addEventListener('change',this.AvailablePlansCombo_ChangeHandler,false);
	// add event listeners for buttons 
	document.getElementById("item_search_button").addEventListener('click',this.ItemSearchButton_ClickHandler,false);
	document.getElementById("InfoBar").addEventListener('click',this.InfoBar_ClickHandler,false);
	document.getElementById("ToggleCategoriesPanelButton").addEventListener('click',this.ToggleCategoriesPanelButton_ClickHandler,false);
	// add event listeners for window
	window.addEventListener("resize", this.WindowResizeHandler );
	//////// Fetch uername ////////
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "WhoAmI" },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during username retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}		
	}).done(function( msg ) {
		TheUsername = msg;
		TheUsername = TheUsername.replaceAll(" ", "");
		TheUsername = TheUsername.replaceAll("\n", "");
		TheUsername = TheUsername.replaceAll("\t", "");
		if( msg.length > 0 ) {
			document.getElementById("user_info_name").textContent = TheUsername;
		} else {
			document.getElementById("user_info_name").textContent = "Guest";
		}
		// init the system which informs when there are new data to be fetched from the server
		if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) {
			document.getElementById("new_data_button_img").style.visibility = "hidden";
		} else {
			FetchNewData_IntrevalID = setInterval(Fetch_NewData_for_currentTrench, FetchNewData_Interval_seconds*1000);
		}
		// provide administrative menus to the admin user
		if( TheUsername.toLowerCase().localeCompare("admin") == 0 ) {
			alert("Please change the admin's password in case you have not done so yet, for security reasons.\nAdminisrative functionality can be found by clicking at the user name at the top right.");
		} else {
			document.getElementById("usermenu_adduser").remove();
			document.getElementById("usermenu_userrights").remove();
			document.getElementById("usermenu_importdata").remove();
			document.getElementById("usermenu_importimages").remove();
		}
	});
	
	//////// Fetch AccessLevels ////////
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GetAccessLevels" },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during access rights retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		TheAccessLevels = msg.trim();
		// remove spaces and add commas at the beginning and end of the string if necessary
		if( TheAccessLevels.length > 0 ) {
			TheAccessLevels = TheAccessLevels.replaceAll( ' ', '' );
			TheAccessLevels = TheAccessLevels.replaceAll( '\t', '' );
			TheAccessLevels = TheAccessLevels.replaceAll( '\n', '' );
			if( TheAccessLevels.charAt(0)  != ',' ) TheAccessLevels = "," + TheAccessLevels;
			if( TheAccessLevels.charAt(TheAccessLevels.length-1) != ',' ) TheAccessLevels = TheAccessLevels + ",";
		}
		// hide unautorized GUI elements
		if( TheAccessLevels.toLowerCase().includes(",all,") == false ) {
			const collection = document.getElementsByClassName("visible-to-admin-only");
			for (let i = 0; i < collection.length; i++) {
			  collection[i].style.display = "None";
			}
		}
		if( TheAccessLevels.length <= 2 ) {
			const collection = document.getElementsByClassName("visible-to-users-only");
			for (let i = 0; i < collection.length; i++) {
			  collection[i].style.display = "None";
			}
		}
		
		// hide coordinate-related buttons for non authorized users
		if( TheAccessLevels.toLowerCase().indexOf(",admin,")<0 && TheAccessLevels.toLowerCase().indexOf(",coordinates,")<0) {
			document.getElementById("layers_button").style.display = "None"; 
			document.getElementById("alter_a_coordinate_button").style.display = "None"; 
		}

	});
	
	//////// Fetch the ReferenceLinks ////////
	var Compress = true;
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GetReferenceLinks", Arg1: Compress.toString() },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during reference links retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		if( Compress ) {
			var strData  = atob(msg);
			var charData = strData.split('').map(function(x){return x.charCodeAt(0);}); // Convert binary string to character-number array
			var binData  = new Uint8Array(charData); // Turn number array into byte-array
			var data     = pako.inflate(binData); // uncompress using pako
			var strData = new TextDecoder("utf-8").decode(data);  // Convert gunzipped byteArray back to ascii string: //THIS WORKS FOR SMALL STRINGS: var strData  = String.fromCharCode.apply(null, new Uint16Array(data)); 
			ReferenceLinks = JSON.parse(strData);
		} else {
			ReferenceLinks = JSON.parse(msg); 
		}
	});
	
	
	///////////////////////
	get_Excavation_Data_and_Preferences();
	///////////////////////
	
	// initialize selection for canvas items
	map.activate_Select(); 
	// hide the Define-Coordinates-Manually button. This becomes visible when the user wants to define coordinates from within the ItemInfoDialog. This is for users having access to "All".
	document.getElementById("target_button").style.display = "None"; 
	// check periodically if the session is alive in order to inform the user
	setInterval(Check_if_Session_is_Alive, 350*1000);
}



/**
 * Fetches the excavation's json data from the server
 */
function GetExcavationData() {
	document.getElementById("masterContainer").style.cursor = "wait";
	
	var Compress = true;
	
	//////////////////////////// send request to server for data about this trench
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GetExcavationData", Arg1: Compress.toString() },
		xhr: function () {
			document.getElementById("MainProgressBar_msg").innerHTML = "Loading. Please wait. Downloading data";
			var xhr = new window.XMLHttpRequest();
			xhr.addEventListener("progress", function(evt){
			  if (evt.lengthComputable) {
				TheMainProgressBar.style.width = (50 * evt.loaded / evt.total) + "%";
			  }
			}, false);
			return xhr;
		},
		timeout: 62000,
		error: function(xmlhttprequest, textstatus, message) {
					document.getElementById("canvas").style.cursor = "default";
					document.getElementById("masterContainer").style.cursor = "default";
					alert("Error during Trench Data retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}			  
	}).done(function( msg ) {
		if( msg.length > 10 ) {
			// remember when the data is fetched and start checking for new data periodically
			GMT_of_last_fetched_Data = Utils.get_GMT_datetime();
			// Parse json data from server
			if( Compress ) {
				var strData  = atob(msg);
				var charData = strData.split('').map(function(x){return x.charCodeAt(0);}); // Convert binary string to character-number array
				var binData  = new Uint8Array(charData); // Turn number array into byte-array
				var data     = pako.inflate(binData); // uncompress using pako
				var strData = new TextDecoder("utf-8").decode(data);  // Convert gunzipped byteArray back to ascii string: //THIS WORKS FOR SMALL STRINGS: var strData  = String.fromCharCode.apply(null, new Uint16Array(data)); 
				ExcData   = JSON.parse(strData); // parse json data
			} else {
				ExcData = JSON.parse(msg); // parse json data
			}
			
			if( ExcData.length == 0 ) {
				if( TheUsername.localeCompare("admin") == 0 ) {
					alert("Welcome to WebDig.\nYou can import data into the application by clicking on your username at the top right.");
				} else {
					alert("Welcome to WebDig.\nYou have to log in as 'admin' in order to import data into the application.");
				}
			}
			
			// check and process data - this delays a lot
			//var ErrorMsgs = check_TrenchData_forErrors( ExcData );
			//if( ErrorMsgs.length > 0 ) alert( "Errors found in Data:\n\n" + ErrorMsgs );
			
			// Process the data in a thread, so that you can refresh the progress bar
			document.getElementById("MainProgressBar_msg").innerHTML = "Loading. Please wait. Processing data";
			processExcavationData(); // process trench data			
			var CheckProcessingCompletion_Interval_id = setInterval(CheckProcessingCompletion, 600);
			function CheckProcessingCompletion() {	
				if( I == ExcData.length ) {
					clearInterval( CheckProcessingCompletion_Interval_id );
				} else {
					TheMainProgressBar.style.width = (50 + 50 * I / ExcData.length) + "%";
					return;
				}
				// populate Trench-names list
				for( let i=0; i<list_of_all_Trenches.length; i++ ) {
					var option = document.createElement('option');
					option.value = list_of_all_Trenches[i];
					option.innerHTML = list_of_all_Trenches[i];
					AvailableTrenchesCombo.appendChild(option);
				}	
				AvailableTrenchesCombo.loadOptions(); // refreshes the multi-select
				// automatically display the dialog with item information, if requested to do so (by the user at  the url - for citation links).
				if( itemUUID_atURL.length > 0 ) {  
					// set the item's trench as the current one
					itemUUID_atURL = "";
					var ItemData = getDataBy_UUID( UUID );
					if( ItemData.hasOwnProperty("Trench") && ItemData["Trench"].length > 0 ) {
						set_current_Trenches( [ItemData["Trench"]] );
					}
					// set the plan associated with the item's trench as the current one
					PopulatePlansList();
					item_trenches = ItemData["Trench"].split("\n");;
					for( let idx=0; idx<item_trenches.length; idx++ ) {
						if( TrenchPlanRelations.hasOwnProperty( item_trenches[idx] ) ) {
							AvailablePlansCombo.value = TrenchPlanRelations[item_trenches[idx]][0];
							break;
						}
					}
				} else { 
					// set the default trench (as stored into preferences) as the current one
					if( ExcavationPreferences.hasOwnProperty("DefaultTrench") ) {
						if( ExcavationPreferences["DefaultTrench"].toLowerCase() === "all" ) {
							set_current_Trenches( list_of_all_Trenches );
						} else {
							set_current_Trenches( [ExcavationPreferences["DefaultTrench"]] );
						}
					}
					// set the default plan (as stored into preferences) as the current one
					PopulatePlansList();
					if( ExcavationPreferences.hasOwnProperty("DefaultPlan") && ExcavationPreferences["DefaultPlan"].length>0) {
						AvailablePlansCombo.value = ExcavationPreferences["DefaultPlan"];
					} 
				}
				// resolve the maximum layer depth in order to set the maximum at the select-layer which is displayed when the alter_a_coordinate_button is clicked
				var current_num_of_Layers;
				for (let idx = 0; idx < ExcData.length; idx++) { 
					if( ExcData[idx].hasOwnProperty("Location") ) {
						current_num_of_Layers = ExcData[idx]["Location"].length;
						if( current_num_of_Layers > Max_num_of_Layers ) Max_num_of_Layers = current_num_of_Layers;
					}
				}
				document.getElementById("Layers_slider").max = Max_num_of_Layers;
				document.getElementById('Layers_rangeValue').textContent = 0;
				document.getElementById('Layers_slider').value = 0;
				// display data to user
				PopulateCategoriesCombo(); // fill a combobox with all available item categories 
				if( ExcavationPreferences.hasOwnProperty("ItemsList_SortByFields") && ExcavationPreferences["ItemsList_SortByFields"].length > 0 ) {
					sortExcavationData( ExcavationPreferences["ItemsList_SortByFields"] );
					console.log("Sorting by " + ExcavationPreferences["ItemsList_SortByFields"][0] + " "  +ExcavationPreferences["ItemsList_SortByFields"][1] + " "  +ExcavationPreferences["ItemsList_SortByFields"][2] );
				}
				PopulateItemsList(ExcData, "", ""); // fill a list with all the available items			
				num_of_selected_items = 0;
				updateInfoBar();
				updateSelectedItemsOnList();
				document.getElementById("itemsList_ul").scrollTop = 0;
				map.drawWorld();
				
				// automatically display the dialog with item information, if requested to do so (by the user at  the url - for citation links).
				if( itemUUID_atURL.length > 0 ) { 
					Dialog.showItemDataDialog( itemUUID_atURL );
				}
				// display permissions-of-usage warning to guest users	
				if( TheUsername.length==0 || TheUsername.toLowerCase().includes("guest") ) { // display permissions-of-usage warning to guest users
					if( ExcavationPreferences.hasOwnProperty("Permissions_html") && ExcavationPreferences["Permissions_html"].length>0) {
						Dialog.Display_Permissions_Dialog();
					}
				}
				// dismiss the progress bar
				document.getElementById("MainProgressBarWindow").style.display = 'none';
			}
		} else {
			alert("Failed to download the excavation data.\nPlease check your Internet connection.");
		}
		
		document.getElementById("canvas").style.cursor = "default";
		document.getElementById("masterContainer").style.cursor = "default";
		
		map.drawWorld();
	});
	
}



/**
 * Fetches the excavation's preferences json file from the server
 */
function get_Excavation_Data_and_Preferences() {
	var Compress = true;
	//////////////////////////// send request to server for the preferences file
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GetPreferences", Arg1: Compress.toString() },
		timeout: 25000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during Preferences retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}	  
	}).done(function( msg ) {
		if( msg.length > 10 ) {
			// Parse json data from server
			if( Compress ) {
				var strData  = atob(msg);
				var charData = strData.split('').map(function(x){return x.charCodeAt(0);}); // Convert binary string to character-number array
				var binData  = new Uint8Array(charData); // Turn number array into byte-array
				var data     = pako.inflate(binData); // uncompress using pako
				var strData = new TextDecoder("utf-8").decode(data);  // Convert gunzipped byteArray back to ascii string: //THIS WORKS FOR SMALL STRINGS: var strData  = String.fromCharCode.apply(null, new Uint16Array(data)); 
				ExcavationPreferences = JSON.parse(strData); // parse json data
			} else {
				ExcavationPreferences = JSON.parse(msg); // parse json data
			}
			// fill in the application's data structures (they are initiated in data.js)
			if( ExcavationPreferences.hasOwnProperty("fields") ) {
				FieldDefinitions = ExcavationPreferences["fields"];
			} else {
				FieldDefinitions = [];
			}
			if( ExcavationPreferences.hasOwnProperty("EditableItemFields") ) {
				for(var i=0; i<ExcavationPreferences["EditableItemFields"].length; i++) {
					var a_Type = ExcavationPreferences["EditableItemFields"][i]["Type"];
					if( ! EditableItemFields.includes(a_Type) ) EditableItemFields.push( a_Type );
					EditableItemFields[ a_Type ] = ExcavationPreferences["EditableItemFields"][i]["FieldNames"];
				}
			}
			if( ExcavationPreferences.hasOwnProperty("VisibleItemFields") ) {
				for(var i=0; i<ExcavationPreferences["VisibleItemFields"].length; i++) {
					var a_Type = ExcavationPreferences["VisibleItemFields"][i]["Type"];
					if( ! VisibleItemFields.includes(a_Type) ) VisibleItemFields.push( a_Type );
					VisibleItemFields[ a_Type ] = ExcavationPreferences["VisibleItemFields"][i]["FieldNames"];
				}
			}
			if( ExcavationPreferences.hasOwnProperty("Colors") ) {
				COLORS = Utils.convert_JSON_keys_to_lowercase( ExcavationPreferences["Colors"] );
				if( COLORS.hasOwnProperty("selected")     ) COLOR_selected     = COLORS["selected"];
				if( COLORS.hasOwnProperty("focused")      ) COLOR_focused      = COLORS["focused"];
				if( COLORS.hasOwnProperty("various")      ) COLOR_various      = COLORS["various"];
				if( COLORS.hasOwnProperty("highlight")    ) COLOR_highlight    = COLORS["highlight"];
				if( COLORS.hasOwnProperty("crosssection") ) COLOR_crosssection = COLORS["crosssection"];
				if( COLORS.hasOwnProperty("distances")    ) COLOR_distances    = COLORS["distances"];
				if( COLORS.hasOwnProperty("artifact")     ) COLOR_artifact     = COLORS["artifact"];
				if( COLORS.hasOwnProperty("locus")        ) COLOR_locus        = COLORS["locus"];
				if( COLORS.hasOwnProperty("feature")      ) COLOR_feature      = COLORS["feature"];
				if( COLORS.hasOwnProperty("partition")    ) COLOR_partition    = COLORS["partition"];
			}			
			////////////////////////////////////////////
			GetExcavationData();
			////////////////////////////////////////////
		} else {
			alert("Unable to download the Preferences file.");
		}
	});
}

/**
  * Makes certain trenches the current ones. This affects the trenches combobox and the items-list
  * @param some_trench_names an array containing some trench names 
  */
function set_current_Trenches( some_trench_names ) {
	// alter state
	currentTrenchNames = some_trench_names;
	// alter GUI
	var options = AvailableTrenchesCombo.options;
	for (let i = 0; i < options.length; i++) { 
		if (some_trench_names.includes(options[i].text) ) {
			options[i].selected = true;
		}
	}
	AvailableTrenchesCombo.loadOptions();
}


/** 
  * THREAD FUNCTION
  * This function is enabled only for registered users. It ensures data consistency.
  * Asks the server if there are any new data for the current trench. The server replies by sending the new data in json format.
  * If the reply is not empty a warning is displayed to the user. When user clicks on the warning the new data will be used.
  * This is a thread-function which is called every several seconds.
  */
function Fetch_NewData_for_currentTrench() {
	console.log("Fetching new data. (after " + FetchNewData_Interval_seconds + " sec)" );
	if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) {
		document.getElementById("new_data_button_img").style.visibility = "hidden";
		return;
	}
	document.getElementById("new_data_button_img").style.cursor = "wait";
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GiveMeAnyNewData", Arg1: GMT_of_last_fetched_Data },
		timeout: 25000,
		error: function(xmlhttprequest, textstatus, message) {
					document.getElementById("new_data_button_img").style.cursor = "pointer";
					console.log("Error during new data check. Please check your network connection. ("+textstatus+" "+message+")");
				}			  
	}).done(function( msg ) {
		msg = msg.trim(); //msg = '[{"Identifier":"AAA111","Title":"tester","Description":"Just testing"}]';
		GMT_of_last_fetched_Data = Utils.get_GMT_datetime();
		if( msg.length > 20  &&  msg.startsWith('[') ) {
			if(theFetchedNewData == null) {
				theFetchedNewData = JSON.parse(msg);
			} else { // there are previously fetched data which were not processed yet. So, merge them
				var NEWdata = JSON.parse(msg);
				for(let i=0; i<NEWdata.length; i++) { // for each new data item
					// check if the item already exists in theFetchedNewData
					var idx = -1;
					for(let j=0; j<theFetchedNewData.length; j++) {
						if( NEWdata[i]["IdentifierUUID"].localeCompare( theFetchedNewData[j]["IdentifierUUID"] ) == 0 ) {
							idx = j;
							break;
						}
					}
					//
					if( idx >= 0 ) { // the item data was already fetched before
						theFetchedNewData[idx] = NEWdata[i];
					} else { // the item data is brand new
						theFetchedNewData.push( NEWdata[i] );
					}
				}
			}
			// update GUI
			document.getElementById("new_data_button_img").src = "images/system/new_data_exclamation.png";
			document.getElementById("new_data_button_img").title = "There are new data! Click on me if you want to load them.";
		} else { // the reply contains the number of active users (that is those who have logged in recently)
			try { 
				if( Utils.ContainsInteger(msg) ) { // change interval depending on how many users are logged in the system
					var num_of_active_users = parseInt(msg);
					if(num_of_active_users > 1  &&  FetchNewData_Interval_seconds != 120) { // count one's self as well
						FetchNewData_Interval_seconds = 120; // increase interval
						clearInterval( FetchNewData_IntrevalID );
						FetchNewData_IntrevalID = setInterval(Fetch_NewData_for_currentTrench, FetchNewData_Interval_seconds*1000);
					} else if(num_of_active_users <= 1  &&  FetchNewData_Interval_seconds != 400) {
						FetchNewData_Interval_seconds = 400; // increase interval
						clearInterval( FetchNewData_IntrevalID );
						FetchNewData_IntrevalID = setInterval(Fetch_NewData_for_currentTrench, FetchNewData_Interval_seconds*1000);
					} 
				}
			} catch (ex) {console.log(ex);}
		}
		document.getElementById("new_data_button_img").style.cursor = "pointer";
	});
}

/**
  * This function is called when new data have been fetched and the user has pressed the NewData-notification button. 
  * The data is incorporated into the local json database and the data structures are updated.
  */
function Load_theFetchedNewData() {
	var item_identifiers_of_FetchedNewData = "";
	if(theFetchedNewData != null) {
		for(let i=0; i<theFetchedNewData.length; i++) { // for each FetchedNewData element
			var ExistingItemDataIDX = getIndexBy_UUID( theFetchedNewData[i]["IdentifierUUID"] );
			if( ExistingItemDataIDX < 0 ) {// this FetchedNewData element describes a newly created item
				ExcData.push( theFetchedNewData[i] );
			} else { // this FetchedNewData element has the data of an existing altered item
				var is_it_visible  = ExcData[ExistingItemDataIDX]["Visible"];
				var is_it_selected = ExcData[ExistingItemDataIDX]["Selected"];
				ExcData[ExistingItemDataIDX] = JSON.parse(JSON.stringify( theFetchedNewData[i] )); // clone
				ExcData[ExistingItemDataIDX]["Visible"]  = is_it_visible;
				ExcData[ExistingItemDataIDX]["Selected"] = is_it_selected;
			}
			// constuct info for user
			if(i>0) item_identifiers_of_FetchedNewData += ", ";
			item_identifiers_of_FetchedNewData += theFetchedNewData[i]["Identifier"];
		}
		// process the new data
		var ErrorMsgs = check_TrenchData_forErrors( ExcData );
		if( ErrorMsgs.length > 0 ) alert( "Errors found in Data:\n\n" + ErrorMsgs );
		QUICK_processExcavationData(); // process trench data
		//Update the List of items
		for(let i=0; i<theFetchedNewData.length; i++) {
			try { // maybe the item is not in the list at that moment
				document.getElementById( "LIbottom~"+theFetchedNewData[i]["IdentifierUUID"] ).innerHTML = theFetchedNewData[i]["Type"] + " - " + theFetchedNewData[i]["Title"];
			} catch(ex) {}
		}
		// update GUI and state
		PopulateCategoriesCombo();
		PopulatePlansList();
		updateInfoBar();
		document.getElementById("new_data_button_img").src = "images/system/new_data_tick.png";
		document.getElementById("new_data_button_img").title = "Click on me to check if there are new data. I also check by myself periodically and become red when there are new data.";
		theFetchedNewData = null;
	}
	return item_identifiers_of_FetchedNewData;
}

/**
  * This function is called when the user presses the NewData-notification button. 
  * If new data have been fetched then they are going to be processed, if not then the server will be asked
  */
function new_data_button_clicked() {
	if(theFetchedNewData == null) {
		// reset interval
		try{ clearInterval( FetchNewData_IntrevalID ); } catch(Ex) {} 
		FetchNewData_IntrevalID = setInterval(Fetch_NewData_for_currentTrench, FetchNewData_Interval_seconds*1000);
		// contact server
		Fetch_NewData_for_currentTrench();
	} else {
		var item_identifiers_of_FetchedNewData = Load_theFetchedNewData();
		alert( "Data of the following items have been updated:\n" + item_identifiers_of_FetchedNewData );
	}	
}

/**
  * THREAD FUNCTION
  * Called periodically in order to inform user if the sessions has timed-out.
  */
function Check_if_Session_is_Alive() {
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "WhoAmI" },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					console.log("Error during session status check. Please check your network connection. ("+textstatus+" "+message+")");
				}			  		
	}).done(function( msg ) {
		TheUsername = msg;
		TheUsername = TheUsername.replaceAll(" ", "");
		TheUsername = TheUsername.replaceAll("\n", "");
		TheUsername = TheUsername.replaceAll("\t", "");
		if( msg.length > 0 ) {
			document.getElementById("user_info_name").textContent = TheUsername;
		} else {
			document.getElementById("user_info_name").textContent = "Guest";
		}
	});
}

/**
 * Called when the user clicks on the add-new-item option of the 3-dots menu.
 * It checks the user permissions and if they are ok the new-item-dialog is displayed, which allows the user to create a new item with some basic info.
 * Afterwards the item-info-dialog the new item will be automatically displayed for the user to enter the rest of the information.
 */
function AddNewItem() {
	// Check for Access Permissions
	var AccessGranted = false;
	if( TheAccessLevels.toLowerCase().indexOf(",all,") >= 0 ) AccessGranted = true;
	if( TheAccessLevels.toLowerCase().indexOf(",addnew,") >= 0 ) AccessGranted = true;
	if( AccessGranted == false ) { 
		alert("You do not have access to add a new item to the system.");
	} else {
		Dialog.show_NewItem_Dialog();
	}
}




/**
  * Uploads a photo to the server. The server will create a data record for the photo and link with the item whose IdentifierUUID given as argument
  * @param UUID IdentifierUUID of the item to which the photo will be linked to
  */
async function uploadPhoto( UUID ) {
	document.getElementById("itemInfoDialog").style.cursor = "wait";
	var formData = new FormData();           
    formData.append("file", photo_upload.files[0]);
	formData.append( "Command", "UploadPhoto");
	formData.append( "Arg1", UUID );
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		contentType: false,
        processData: false,
		cache: false, 
		data: formData,
		timeout: 180000,
		error: function(xmlhttprequest, textstatus, message) {
					document.getElementById("itemInfoDialog").style.cursor = "default";
					alert("Error during photo upload. Please check your network connection. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		if( msg.indexOf("Error") < 0 ) {
			// ask for the data of the altered item, because it contains server-created information
			$.ajax({ url:phpURL, type:"POST", data:{Command:"GetItemData", Arg1:UUID, timeout:22000} 
			}).done(function( msg2 ) {
				// update local copy of the database
				itemData = JSON.parse(msg2);
				for (let i = 0; i < ExcData.length; i++) { 
					if( ExcData[i]["IdentifierUUID"].localeCompare( UUID ) == 0 ) {
						ExcData[i] = itemData;
						break;
					}
				}
				// retreive the UUID of the new photo
				var NewPhotoUUID = itemData["RelationIncludesUUID"][0];
				if(NewPhotoUUID.indexOf("\n") >= 0) NewPhotoUUID = NewPhotoUUID.substr( NewPhotoUUID.lastIndexOf("\n") + 1 );
				NewPhotoUUID = NewPhotoUUID.trim();
				// ask for the photograph item
				$.ajax({ url:phpURL, type:"POST", data:{Command:"GetItemData", Arg1:NewPhotoUUID, timeout:22000} 
				}).done(function( msg3 ) {
					// update local copy of the database
					photoData = JSON.parse(msg3);
					ExcData.push( photoData );
					QUICK_processExcavationData();
					updateInfoBar();
					// inform user
					Dialog.showItemDataDialog( UUID );
					document.getElementById("itemInfoDialog").style.cursor = "default";
					alert("The image was uploaded successfuly and linked to item '" + itemData["Identifier"] + "'.");
				});
			});	
		} else {
			document.getElementById("itemInfoDialog").style.cursor = "default";
			alert(msg);
		}
	});
}



/**
  * Exports the data of the selected items in a csv file.
  */
function ExportData_CSV() {
	if( ExcData == null ) {
		alert( "The Excavation Data has not been loaded yet." );
		return;
	}
	delimeter = "\t";
	var FieldsToIgnore = ["Selected", "Visible", "Location", "Type", "DateUTC", "Format", "RelationIncludes", "RelationIncludesUUID", "RelationBelongsToUUID", "RelationIsAboveUUID", "RelationIsBelowUUID", "ThumbnailImageUUID", "RelationIsCoevalWithUUID", "RelationCutsUUID", "RelationIsCutByUUID", "RelationIsNextToUUID", "RelationIsBeforeUUID", "RelationIsAfterUUID"];
	var csvHeaders = ["IdentifierUUID", "Identifier", "Title", "Type"];
	var fileContent = "";
	var num_of_exported_items = 0;
	// construct csv file header
	for( let i=0; i<ExcData.length; i++ ) {
		if( ExcData[i]["Selected"] || num_of_selected_items==0 ) {
			num_of_exported_items += 1;
			var keys = Object.keys( ExcData[i] );
			// add the field name to the header if it is new and it is not an app-specific field
			for(j=0; j<keys.length; j++) {
				if( csvHeaders.includes(keys[j])==false && FieldsToIgnore.includes(keys[j])==false ) {
					csvHeaders.push( keys[j] );
				}
			}
		}
	}
	// write header to file
	for( let i=0; i<csvHeaders.length; i++ ) {
		if( i > 0 ) fileContent += delimeter;
		fileContent += csvHeaders[i];
	}
	fileContent += "\n";
	// construct csv file contents
	for( let i=0; i<ExcData.length; i++ ) {
		if( ExcData[i]["Selected"] || num_of_selected_items==0 ) {
			for(j=0; j<csvHeaders.length; j++) {
				if( j > 0 ) fileContent += delimeter;
				if(typeof ExcData[i][csvHeaders[j]] != "undefined") {
					var csv_field = ExcData[i][csvHeaders[j]].toString();
					csv_field = csv_field.replaceAll("\t", " ");
					csv_field = csv_field.replaceAll("\n", " ");
					csv_field = csv_field.replaceAll("\r", " ");
					fileContent += csv_field;
				}
			}
			fileContent += "\n";
		}
	}
	// zip the csv file
	var compressed_fileContent = pako.gzip(fileContent, {to: 'string'});
	// construct the filename
	const DateObj = new Date();
	if( num_of_exported_items==0 ) {
		var filename = DateObj.toLocaleString('default',{month:'long'}) + " " + DateObj.getDate() + " " + DateObj.getFullYear() + ", " +         "all"         + " items.csv.zip";
	} else {
		var filename = DateObj.toLocaleString('default',{month:'long'}) + " " + DateObj.getDate() + " " + DateObj.getFullYear() + ", " + num_of_exported_items + " items.csv.zip";
	}
	// let user download the file
	var aBlob = new Blob([compressed_fileContent], { type: 'octet/stream' });
	var tmp = document.createElement('a');
	tmp.download = filename;
	tmp.href = window.URL.createObjectURL(aBlob);
	tmp.click();
	window.URL.revokeObjectURL(tmp);
	alert( "Data of " + num_of_exported_items + " items was exported in tab-delimited CSV format inside a compressed ZIP file. Please check your browser's Downloads." );
}







/**
  * Commands the server to create a word document containing one page for each item with photos and information about that item. 
  * When the server is done, the function downloads the document from the server.
  */
function ExportData_MSWORD() {
	if( ExcData == null ) {
		alert( "The Excavation Data has not been loaded yet." );
		return;
	}
	// construct the string with all selected item UUIDs
	var SelectedUUIDs = "";
	if( num_of_selected_items > 0 ) {
		SelectedUUIDs = ",";
		for (let i=0; i < ExcData.length; i++) {
			if( ExcData[i]["Selected"] ) {
				SelectedUUIDs += ExcData[i]["IdentifierUUID"] + ",";
			}
		}
	}
	var currentUnixTime = Math.floor( (new Date()).getTime() / 1000 );
	// send request to server
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "ExportMSWord", Arg1: SelectedUUIDs, Arg2: currentUnixTime},
		timeout: 65000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during export. Please check your network connection. ("+textstatus+" "+message+")");
				}			  
	}).done(function( msg ) {
		msg = msg.trim();
		if( msg.length == 0 || msg.length > 0 ) { // the data has been exported. Download the file
			DateObj = new Date();
			if( num_of_selected_items==0 ) {
				var localfilename = DateObj.toLocaleString('default',{month:'long'}) + " " + DateObj.getDate() + " " + DateObj.getFullYear() + ", " +         "all"         + " items.docx";
			} else {
				var localfilename = DateObj.toLocaleString('default',{month:'long'}) + " " + DateObj.getDate() + " " + DateObj.getFullYear() + ", " + num_of_selected_items + " items.docx";
			}
			var tmp_link = document.createElement('a');
			console.log( localfilename + " * " + currentUnixTime + '.docx' );
			tmp_link.setAttribute('href', ServerURL + "tmp_files/" + currentUnixTime + '.docx');
			tmp_link.setAttribute('download', localfilename);
			tmp_link.style.display = 'none';
			document.body.appendChild(tmp_link);
			tmp_link.click();
			document.body.removeChild(tmp_link);
		}
	});
}




/**
  * Requests the data-changes file from the server and calls the corresponding dialog to display them.
  */
function getDataChanges_and_DisplayThem() {
	document.getElementById("masterContainer").style.cursor = "wait";
	var Compress = true;
	//////////////////////////// send request to server for the preferences file
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "GetDataChanges", Arg1: Compress.toString() },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					document.getElementById("masterContainer").style.cursor = "default";
					alert("Error during data change retrieval. Please check your network connection. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		if( msg.length > 10 ) {
			if( Compress ) {
				var strData  = atob(msg);
				var charData = strData.split('').map(function(x){return x.charCodeAt(0);}); // Convert binary string to character-number array
				var binData  = new Uint8Array(charData); // Turn number array into byte-array
				var data     = pako.inflate(binData); // uncompress using pako
				var strData = new TextDecoder("utf-8").decode(data);  // Convert gunzipped byteArray back to ascii string: //THIS WORKS FOR SMALL STRINGS: var strData  = String.fromCharCode.apply(null, new Uint16Array(data)); 
				Dialog.Display_TrackChanges_Dialog(strData);
			} else {
				Dialog.Display_TrackChanges_Dialog(msg);
			}
		} else {
			Dialog.Display_TrackChanges_Dialog(msg);
		}
		document.getElementById("masterContainer").style.cursor = "default";
	});
}


/**
  * captures a large size image of the whole map, even the non visible area.
  */
function CaptureMap() {
	// remember current canvas state
	var Map_Canvas = document.getElementById("canvas");
	var original_ZoomFactor = ZoomFactor;
	var original_CanvasOffsetX = CanvasOffsetX;
	var original_CanvasOffsetY = CanvasOffsetY;
	// instruct canvas to display the full-size map
	Map_Canvas.style.width = PlanImageWidth + "px";
	Map_Canvas.style.height = PlanImageHeight + "px";
	ZoomFactor = 1;
	CanvasOffsetX = 0;
	CanvasOffsetY = 0;
	map.drawWorld();
	// open the canvas contents in a new tab
	var map_image = Map_Canvas.toDataURL('image/png');
	window.open(map_image);
	// revert to original canvas state
	Map_Canvas.style.width = "100%";
	Map_Canvas.style.height = "100%";
	ZoomFactor = original_ZoomFactor;
	CanvasOffsetX = original_CanvasOffsetX;
	CanvasOffsetY = original_CanvasOffsetY;
	map.drawWorld();
}


/**
  * Fill the available plans combo box with the plans of the selected trench. These are described inside the json database.
  */
function PopulatePlansList() {
	// remember the currently selected plan if any
	var CurrentPlan = AvailablePlansCombo.value;
	// clear the plans combo box
	var i, L = AvailablePlansCombo.options.length - 1;
	for(i = L; i >= 0; i--) {
		AvailablePlansCombo.remove(i);
	}
	// calculate which plans should be available
	var available_plans_list = [];
	for(plan_name in PlanTrenchRelations) {
		for(let j=0; j<PlanTrenchRelations[plan_name].length; j++) {
			if( currentTrenchNames.includes(PlanTrenchRelations[plan_name][j]) ) {
				if(!available_plans_list.includes(plan_name)) available_plans_list.push( plan_name );
			}
		}
	}
	available_plans_list.sort();
	// fill the combo with the plans of the selected trench
	for (let i = 0; i < available_plans_list.length; i++) { 
		var option = document.createElement('option');
		option.value = available_plans_list[i];
		option.innerHTML = available_plans_list[i];
		AvailablePlansCombo.appendChild(option);
	}
	// 
	if( CurrentPlan != null && CurrentPlan.length > 0 ) { // the user may have changed trench and plans-list are automatically refreshed
		if( available_plans_list.includes(CurrentPlan) ) {
			AvailablePlansCombo.value = CurrentPlan;
		}
	}
}



/**
 * Fills the Categories combo-box with all the available types and categories that exist in the trench data-set.
 */
function PopulateCategoriesCombo() {	
	// find all Types and categories defined inside the trench data
	var Organization = [];
	Organization.push( "" ); 	Organization[ "" ] = [];
	Organization.push( "All" );	Organization[ "All" ] = [];
	// init Organization with all types
	for (let i=0; i<list_of_all_Types.length; i++) {
		Organization.push( list_of_all_Types[i] );
		Organization[ list_of_all_Types[i] ] = [];
	}
	// add Categories to each Type
	for (let i = 0; i < ExcData.length; i++) { 
		if( ExcData[i]["Type"].localeCompare("Image") == 0 ) continue; // << ignore the Image category
		if( ExcData[i].hasOwnProperty("Category") && ExcData[i]["Category"].length>0 ) {
			var item_type = ExcData[i]["Type"];
			var item_category = ExcData[i]["Category"];
			if( Organization[item_type].includes(item_category) == false ) { // we found a new category for this type
				Organization[ item_type ].push( item_category );
			}
		}
	}	
	
	// ---- fill the combo with Types and their respective Categories
	$("#itemCategoriesCombo").empty();
	var an_option;
	for (let i = 0; i < Organization.length; i++) { 
		var GroupName = Organization[i];
		an_option = document.createElement('OPTION');
		an_option.value = GroupName;
		an_option.innerHTML = GroupName;
		an_option.classList.add( "combo_type" );
		if( GroupName != "Image" && GroupName != "Plan") itemCategoriesCombo.appendChild( an_option );
		for (let j = 0; j < Organization[GroupName].length; j++) {
			an_option = document.createElement('OPTION');
			an_option.value = Organization[GroupName][j];
			an_option.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;"+Organization[GroupName][j];
			an_option.classList.add( "combo_category" );
			if( GroupName != "Image" ) itemCategoriesCombo.appendChild( an_option );
		}
	}
	
	// ---- fill the Panel with Types and their respective Categories
	$("#itemCategoriesPanel").empty();
	var an_option;
	for (let i = 0; i < Organization.length; i++) { 
		if( Organization[i].trim().length == 0 ) continue; // <<
		var GroupName = Organization[i];
		an_option = document.createElement('OPTION');
		an_option.value = GroupName;
		an_option.text = GroupName;
		an_option.innerHTML = GroupName;
		an_option.classList.add( "combo_type" );
		if( GroupName != "Image" ) itemCategoriesPanel.add(an_option);
		for (let j = 0; j < Organization[GroupName].length; j++) {
			an_option = document.createElement('OPTION');
			an_option.value = Organization[GroupName][j];
			an_option.text = Organization[GroupName][j];
			an_option.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;"+Organization[GroupName][j];
			an_option.classList.add( "combo_category" );
			if( GroupName != "Image" ) itemCategoriesPanel.add( an_option );
		}
	}	
	itemCategoriesPanel.size = itemCategoriesPanel.options.length; // for the itemCategoriesPanel, make all options visible
}





/**
  * This function fills the items-list with all the items the user has selected to see.
  */
function PopulateItemsList( JSONdata, Category, SearchString ) {
	ItemList_wasPopulatedBy_AdvancedSearch = false;
	$(itemsList_ul).empty();
	num_of_items_in_list = 0;
	var item_belongs_to_selected_trenches;
	var include_in_list;
	for (let i = 0; i < JSONdata.length; i++) { // for every item in the trench
		// -------- exclusion rules
		// -- ignore any undefined data
		if( typeof JSONdata[i] == "undefined" ) continue; // <<<
		// -- do not display Image items in the list
		if( JSONdata[i]["Type"].localeCompare("Image") == 0 ) continue; // <<<
		// -- do not display Plans in the list
		if( JSONdata[i]["Type"].localeCompare("Plan") == 0 ) continue; // <<<
		// -- do not dispay to guest users the very large Identifiers, which denote temporary items
		if( TheUsername.length==0 || TheUsername.toLowerCase().includes("guest") ) { 
			if( JSONdata[i]["Identifier"].length > 14 ) continue;
		}
		
		// -------- inclusion rules
		// -- display only the items which belong to the selected trenches
		item_belongs_to_selected_trenches = false;
		var item_trenches = "";
		if (JSONdata[i].hasOwnProperty("Trench")) { 
			item_trenches = JSONdata[i]["Trench"].split("\n");
			for( let idx=0; idx<item_trenches.length; idx++) {
				if( currentTrenchNames.includes( item_trenches[idx] ) ) { item_belongs_to_selected_trenches = true; break; }
			}
 		}
		// -- check if the item should be in the items list, according to the wishes of the user		
		include_in_list = false;
		if( item_belongs_to_selected_trenches ) {
			if( Category.length==0  &&  SearchString.length==0 ) {
				include_in_list = true;
			} else if( Category.length>0  &&  (Category.localeCompare(JSONdata[i]["Type"])==0 || Category.localeCompare(JSONdata[i]["Category"])==0) ) {
				include_in_list = true;
			} else if( SearchString.length > 0 ) {
				SearchString = SearchString.toLowerCase();
				for (let key in JSONdata[i]) { 
					if( key.includes("UUID")==false ) {
						if( typeof JSONdata[i][key]==="string" && JSONdata[i][key].toLowerCase().includes( SearchString ) ) {
							include_in_list = true;
							break;
						}
					}
				}
			}
		}
		
		// -------- add the item into the list
		if( include_in_list ) {
			addInItemsList( JSONdata[i] );
			JSONdata[i]["Visible"] = true;
		} else {
			JSONdata[i]["Visible"] = false;
		}
	}	
	// refresh
	updateSelectedItemsOnList();
	updateInfoBar();
}


/**
  * Adds an item into the items-list
  * @arg: item_json (json): the data of the item in json format
  */
function addInItemsList( item_json ) {
	var thumbnail_filename="", thumbnail_filename2="", thumbnail_height;
	var item_footer_b;
	// find the thumbnail-image for this item
	if( typeof item_json["ThumbnailImageUUID"]=="undefined"  ||  item_json["ThumbnailImageUUID"].length==0 ) {
		thumbnail_filename = "images/system/no_picture.png";
		thumbnail_height = "50px";
	} else {
		thumbnail_filename = "Data/images/thumbnails_mini/" + item_json["ThumbnailImageUUID"] + ".jpg";
		thumbnail_height = "80px";
		
	}
	// construct html for this item
	if( item_json.hasOwnProperty("Title") ) {
		item_footer_b = item_json["Title"]
	} else {
		item_footer_b = item_json["Category"]
	}
	var id = item_json["IdentifierUUID"];
	var list_item_html = "";
	var bgcolor = getItemColor( item_json["Type"], item_json["Category"] );
	list_item_html += "<div class='listitemcontainer' id='" + "LI~"+id + "'>";
	list_item_html += "<div class='listitemleft'   id='LIleft~"   + id + "' style='background:" + bgcolor + ";' > <b>" + item_json["Identifier"] + "</b>  </div>";
	list_item_html += "<div class='listitemback'   id='LIback~"   + id + "'>" + "<img src='" + thumbnail_filename+ "' height='" + thumbnail_height + "'" + " onclick='document.getElementById(\"" + "LIback~"+id + "\").click();'>" + "</div>";	
	
	list_item_html += "<div class='listitembottom' id='LIbottom~" + id + "'>" + item_json["Type"] + " - " + item_footer_b + "</div>";
	list_item_html += "</div>";
	$(itemsList_ul).append($("<li id='LI~" + id +  "' class='listitem' data-inset='false'>").html(  list_item_html ));
	num_of_items_in_list += 1;
	item_json["Visible"] = true;
}

/**
  * This function refreshes the label below the items-list displaying information regarding the number of selected items and the number of total items.
  */
function updateInfoBar() {
	document.getElementById("InfoBar").innerHTML = "<b>" + num_of_items_in_list + " / " + num_of_trench_items_without_the_images + " items" + "<br>" + num_of_selected_items + " selected</b>" ;
}

/**
  * This function updates the items-list, highlighting with yellow border all the selected items.
  */
function updateSelectedItemsOnList() {
	var listitems = document.getElementsByClassName("listitem");
	for(let i=0; i<listitems.length; i++) {
		let itemUUID = listitems[i].id.substr( listitems[i].id.indexOf("~")+1 );
		var ItemData = getDataBy_UUID( itemUUID );
		if( typeof ItemData == "undefined"  ) {
			console.log("Attention: Undefined item was found with UUID: " + itemUUID);
			continue;
		}
		if( ItemData["Selected"] ) {
			document.getElementById( listitems[i].id ).style.boxShadow = "0px 0px 4px 6px " + COLOR_selected + " inset";
		} else {
			document.getElementById( listitems[i].id ).style.boxShadow = "";
		}
	}
}

/**
  * scrolls the items-list so that the item in the argument becomes visible
  * @arg IdentifierUUID (string)
  * @arg Scroll_Behavior (string) "auto" or "smooth"
  */
function Scroll_ItemsList( IdentifierUUID, Scroll_Behavior="smooth" ) {
    targetLi = document.getElementById("LI~"+IdentifierUUID);
	if( targetLi != null ) { // this can be null if the item is not in the Items-List
		itemsList_ul.scrollTo({ top: targetLi.offsetTop-88, behavior: Scroll_Behavior });
	}
}


/**
  * Alters the state of all items in the item-list (at the left of the application GUI) to Selected=true
  */
function SelectAllItemsInList() {
	var listitems = document.getElementsByClassName("listitem");
	for(let i=0; i<listitems.length; i++) {
		let itemID = listitems[i].id.substr( listitems[i].id.indexOf("~")+1 ).trim();
		var ItemData = getDataBy_UUID( itemID );
		if( typeof ItemData != "undefined"  &&  typeof ItemData["IdentifierUUID"] != "undefined" ) {
			if( ItemData["Selected"]==false  || typeof ItemData["Selected"]=="undefined" ) {
				ItemData["Selected"] = true;
				num_of_selected_items += 1;
			}
		}
	}
	updateInfoBar();
	map.drawWorld();
	updateSelectedItemsOnList();
}


/**
  * Alters the state of all items in the item-list (at the left of the application GUI) to Selected=true
  */
function DeselectAllItemsInList() {
	var listitems = document.getElementsByClassName("listitem");
	for(let i=0; i<listitems.length; i++) {
		let itemID = listitems[i].id.substr( listitems[i].id.indexOf("~")+1 );
		var ItemData = getDataBy_UUID( itemID );
		if( typeof ItemData["Selected"] != "undefined"  ) {
			if( ItemData["Selected"]==true) {
				ItemData["Selected"] = false;
				num_of_selected_items -= 1;
			}
		}
	}
	updateInfoBar();
	map.drawWorld();
	updateSelectedItemsOnList();
}


/**
  * This function is called when the user selects the corresponding option from the 3-dots menu.
  * All the selected items and only them will be displayed in the items-list
  */
function PopulateItemsList_withOnlySelectedItems() {
	ItemList_wasPopulatedBy_AdvancedSearch = false;
	$(itemsList_ul).empty();
	num_of_items_in_list = 0;
	var include_in_list = false;
	for (let i = 0; i < ExcData.length; i++) { // for every item in the trench
		if( typeof ExcData[i] == "undefined" ) continue;
		// the item should be in the items list if it is selected
		include_in_list = false;
		if( typeof ExcData[i]["Selected"]!="undefined"  &&  ExcData[i]["Selected"]==true ) {
			include_in_list = true;
		} 
		// add the item into the list
		if( include_in_list ) {
			addInItemsList( ExcData[i] );
			ExcData[i]["Visible"] = true;
		} else {
			ExcData[i]["Visible"] = false;
		}
	}
	updateInfoBar();
	map.drawWorld();
	updateSelectedItemsOnList();
}



/**
  * Called by AdvancedSearchDialog and after a Saving action.
  * The criteria are saved into the global array 'Autofill' by AdvancedSearchDialog, where the user specifies search criteria with wildcards and for different fields.
  * This functions reads 'Autofill' and decides for each item if it should be include into the Items-list or not.
  */
function PopulateItemsList_AccordingTo_AdvancedSearchCriteria() {
	ItemList_wasPopulatedBy_AdvancedSearch = true; // remember this in order to call the function again after a saving action
	//  get all search terms seperated by the OR character
	var IdentifierCriteria, TitleCriteria, SourceCriteria, ArtifactDateCriteria, SquareCriteria, DescriptionCriteria, IssueAuthorityCriteria, CoverageTemporalCriteria;
	if(Autofill["IdentifierCriterion"].length==0) 		IdentifierCriteria = []; 		else IdentifierCriteria 		= Autofill["IdentifierCriterion"].split("|");
	if(Autofill["TitleCriterion"].length==0) 			TitleCriteria = []; 			else TitleCriteria 				= Autofill["TitleCriterion"].split("|");
	if(Autofill["SourceCriterion"].length==0) 			SourceCriteria = []; 			else SourceCriteria 			= Autofill["SourceCriterion"].split("|");
	if(Autofill["ArtifactDateCriterion"].length==0)		ArtifactDateCriteria = []; 		else ArtifactDateCriteria 	 	= Autofill["ArtifactDateCriterion"].split("|");
	if(Autofill["SquareCriterion"].length==0) 			SquareCriteria = []; 			else SquareCriteria 			= Autofill["SquareCriterion"].split("|");
	if(Autofill["DescriptionCriterion"].length==0) 		DescriptionCriteria = []; 		else DescriptionCriteria 	 	= Autofill["DescriptionCriterion"].split("|");
	if(Autofill["IssueAuthorityCriterion"].length==0) 	IssueAuthorityCriteria = []; 	else IssueAuthorityCriteria 	= Autofill["IssueAuthorityCriterion"].split("|");
	if(Autofill["CoverageTemporalCriterion"].length==0)	CoverageTemporalCriteria = [];	else CoverageTemporalCriteria	= Autofill["CoverageTemporalCriterion"].split("|");
	// ---- For each item check if it fits all the advanced-search criteria
	var c1, c2, c3, c4, c5, c6, c7, c8;
	$(itemsList_ul).empty();
	num_of_items_in_list = 0;
	var include_in_list = false;
	for (let i = 0; i < ExcData.length; i++) { // for every item in the trench
		// ignore undefined and image items
		if( typeof ExcData[i] == "undefined" ) continue;
		if( ExcData[i]["Type"].localeCompare("Image") == 0 ) continue; // <<<
		
		// check if the item belongs to one of the currently selected Trenches
		item_belongs_to_selected_trenches = false;
		var item_trenches = "";
		if (ExcData[i].hasOwnProperty("Trench")) { 
			item_trenches = ExcData[i]["Trench"].split("\n");
			for( let idx=0; idx<item_trenches.length; idx++) {
				if( currentTrenchNames.includes( item_trenches[idx] ) ) { item_belongs_to_selected_trenches = true; break; }
			}
 		}
		if( item_belongs_to_selected_trenches == false ) continue; // <<<
	
		// **** check IdentifierCriteria
		if(IdentifierCriteria.length==0) c1 = true; else c1 = false;
		for(let j=0; j<IdentifierCriteria.length; j++) {
			if(IdentifierCriteria[j].length>0) c1 = c1 || Utils.WildcardSearch( ExcData[i]["Identifier"], IdentifierCriteria[j].trim() );
		}
		// **** check TitleCriteria
		if(Autofill["TitleCriterion"].length==0) c2 = true; else c2 = false;
		for(let j=0; j<TitleCriteria.length; j++) {
			if(TitleCriteria[j].length>0) c2 = c2 || Utils.WildcardSearch( ExcData[i]["Title"], TitleCriteria[j].trim() );
		}
		// **** check SourceCriteria
		if(Autofill["SourceCriterion"].length==0) c3 = true; else c3 = false;
		for(let j=0; j<SourceCriteria.length; j++) {
			if(SourceCriteria[j].length>0) c3 = c3 || Utils.WildcardSearch( ExcData[i]["Source"], SourceCriteria[j].trim() );
		}
		// **** check ArtifactDateCriteria
		if(Autofill["ArtifactDateCriterion"].length==0) c4 = true; else c4 = false;
		for(let j=0; j<ArtifactDateCriteria.length; j++) {
			if(ArtifactDateCriteria[j].length>0) c4 = c4 || Utils.WildcardSearch( ExcData[i]["ArtifactDate"], ArtifactDateCriteria[j].trim() );
		}
		// **** check SquareCriteria
		if(Autofill["SquareCriterion"].length==0) c5 = true; else c5 = false;
		for(let j=0; j<SquareCriteria.length; j++) {
			if(SquareCriteria[j].length>0) c5 = c5 || Utils.ExactSearch( ExcData[i]["Square"], SquareCriteria[j].trim() ); // PREFER EXACT SEARCH FOR THIS FIELD if(SquareCriteria[j].length>0) c5 = c5 || Utils.WildcardSearch( ExcData[i]["Square"], SquareCriteria[j].trim() );
		}
		// **** check DescriptionCriteria
		if(Autofill["DescriptionCriterion"].length==0) c6 = true; else c6 = false;
		for(let j=0; j<DescriptionCriteria.length; j++) {
			if(DescriptionCriteria[j].length>0) c6 = c6 || Utils.WildcardSearch( ExcData[i]["Description"], DescriptionCriteria[j].trim() );
		}
		// **** check IssueAuthorityCriteria
		if(Autofill["IssueAuthorityCriterion"].length==0) c8 = true; else c8 = false;
		for(let j=0; j<IssueAuthorityCriteria.length; j++) {
			if(IssueAuthorityCriteria[j].length>0) c8 = c8 || Utils.WildcardSearch( ExcData[i]["IssueAuthority"], IssueAuthorityCriteria[j].trim() );
		}
		
		// **** check CoverageTemporalCriteria
		if(Autofill["CoverageTemporalCriterion"].length==0) c7 = true; else c7 = false;
		for(let j=0; j<CoverageTemporalCriteria.length; j++) {
			if(CoverageTemporalCriteria[j].length>0) c7 = c7 || Utils.WildcardSearch( ExcData[i]["CoverageTemporal"], CoverageTemporalCriteria[j].trim() );
		}
		// if all criteria are satisfied add the item into the list
		include_in_list = c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8;
		if( include_in_list ) {
			addInItemsList( ExcData[i] );
		} else {
			ExcData[i]["Visible"] = false;
		}
	}
}


/**
  * This function is called when the user selects the corresponding option from the 3-dots menu.
  * Then only the items which are listed in the items-list will be visible on the map.
  */
function DisplayAllListedItems() {
	document.getElementById( "dropup_displaylisted" ).innerHTML = "<b>Display all listed items on map" + " &#10004;</b>";
	document.getElementById( "dropup_displayselected" ).innerHTML = "<b>Display only selected items on map</b>";
	map.set_DisplayOnlySelectedItemsOnMap( false );
	map.drawWorld();
}

/**
  * This function is called when the user selects the corresponding option from the 3-dots menu.
  * Then only the items which have been selected will be visible on the map.
  */
function DisplayOnlySelectedItems() {
	document.getElementById( "dropup_displaylisted" ).innerHTML = "<b>Display all listed items on map</b>";
	document.getElementById( "dropup_displayselected" ).innerHTML = "<b>Display only selected items on map" + " &#10004;</b>";
	map.set_DisplayOnlySelectedItemsOnMap( true );
	map.drawWorld();
}



/**
  * @arg IdentifierUUID (string) the unique Identifier of an item
  * @returns the UUID of the next element of the argument in the items-list 
  */
function getNextListElementUUID( IdentifierUUID ) {
	var result = IdentifierUUID;
	var itemsList_LIs = itemsList_ul.getElementsByTagName("li");
	var currUUID = "";
	var nextUUID = "";
	var s = "";
	for(var i=0; i<itemsList_LIs.length; i++) {
		currUUID = itemsList_LIs[i].id.substring( 3 );
		if( i == itemsList_LIs.length-1 ) { // this is the last element, wrap to the top
			nextUUID = itemsList_LIs[0].id.substring( 3 );
		} else {
			nextUUID = itemsList_LIs[i+1].id.substring( 3 );
		}
		if( currUUID.localeCompare(IdentifierUUID) == 0 ) {
			result = nextUUID;
		}
	}
	return result;
}
/**
  * @arg IdentifierUUID (string) the unique Identifier of an item
  * @returns the UUID of the previous element of the argument in the items-list 
  */
function getPrevListElementUUID( IdentifierUUID ) {
	var result = IdentifierUUID;
	var itemsList_LIs = itemsList_ul.getElementsByTagName("li");
	var currUUID = "";
	var prevUUID = "";
	var s = "";
	for(var i=0; i<itemsList_LIs.length; i++) {
		currUUID = itemsList_LIs[i].id.substring( 3 );
		if( i == 0 ) { // this is the last element, wrap to the top
			prevUUID = itemsList_LIs[itemsList_LIs.length-1].id.substring( 3 );
		} else {
			prevUUID = itemsList_LIs[i-1].id.substring( 3 );
		}
		if( currUUID.localeCompare(IdentifierUUID) == 0 ) {
			result = prevUUID;
		}
	}
	return result;
}


/**
 * Tells the web server to delete an item from the database
 */
function DeleteSelectedItem() {
	if( num_of_selected_items == 1 ) {
		var selecteditem_idx = -1;
		for (let i = 0; i < ExcData.length; i++) { 
			if( ExcData[i]["Selected"] ) {
				selecteditem_idx = i; break;
			}
		}
		if( selecteditem_idx >= 0 ) {
			// Check for Access Permissions
			var AccessGranted = false;
			if( TheAccessLevels.toLowerCase().indexOf(",all,") >= 0 ) AccessGranted = true;
			if( TheAccessLevels.indexOf(","+ExcData[selecteditem_idx]["Type"]+",") >= 0 ) AccessGranted = true;
			if( TheAccessLevels.indexOf(","+ExcData[selecteditem_idx]["Category"]+",") >= 0 ) AccessGranted = true;
			if( AccessGranted ) { 
				var item_UUID = ExcData[selecteditem_idx]["IdentifierUUID"];
				var item_id = ExcData[selecteditem_idx]["Identifier"];
				var item_title = ExcData[selecteditem_idx]["Title"];
				if (confirm("Are you sure you want to delete [" + item_id + "] '" + item_title + "'?" )) {
					document.getElementById("masterContainer").style.cursor = "wait";
					$.ajax({                                      
						url: phpURL,
						type: "POST",
						data: { Command: "Delete", Arg1: ExcData[selecteditem_idx]["IdentifierUUID"] },
						timeout: 22000,
						error: function(xmlhttprequest, textstatus, message) {
									alert("Error during deletion. Please check your network connection. ("+textstatus+" "+message+")");
								}
					}).done(function( msg ) {
						document.getElementById("masterContainer").style.cursor = "default";
						if( msg.length > 2 ) { // some error occured
							alert(msg);
						} else {
							ExcData.splice(selecteditem_idx, 1); // Remove the item from the local copy of the database, as well
							QUICK_processExcavationData();
							try { document.getElementById("itemsList_ul").removeChild( document.getElementById("LI~"+item_UUID) ); } catch(ex) { }
							num_of_selected_items--;
							updateInfoBar();
							alert( "Deletion completed for [" + item_id + "] '" + item_title + "'" );
						}
					});
				}
			} else {
				alert( "You do not have access to delete this item" );
			}
		}
	} else if (num_of_selected_items == 0) {
		alert( "No item has been selected." );
	} else {
		alert( "Only one item can be deleted each time, as a safety precaution." );
	}
}


/**
  * Removes a relation between a photo and an item, both at the local copy of the database and at the server. 
  * The photograph is not deleted from the server.
  */
function DeletePhoto( itemUUID, imageUUID ) {
	var itemData = getDataBy_UUID( itemUUID );
	// Check for Access Permissions
	var AccessGranted = false;
	if( TheAccessLevels.toLowerCase().indexOf(",all,") >= 0 ) AccessGranted = true;
	if( TheAccessLevels.indexOf(","+itemData["Type"]+",") >= 0 ) AccessGranted = true;
	if( TheAccessLevels.indexOf(","+itemData["Category"]+",") >= 0 ) AccessGranted = true;
	if( AccessGranted ) { 
		if (confirm("Are you sure you want to delete photo " + imageUUID + " from item '" + itemData["Title"] + "'?" )) {
			document.getElementById("masterContainer").style.cursor = "wait";
			$.ajax({
				url: phpURL,
				type: "POST",
				data: { Command: "DeleteImage", Arg1: itemUUID, Arg2: imageUUID },
				timeout: 24000,
				error: function(xmlhttprequest, textstatus, message) {
							document.getElementById("masterContainer").style.cursor = "default";
							alert("Error during image deletion. Please check your network connection. ("+textstatus+" "+message+")");
						}
			}).done(function( msg ) {
				if( msg.length > 2 ) { // some error occured
					alert(msg);
				} else {
					// update the local copy of the database
					for (let i = 0; i < ExcData.length; i++) { 
						if( ExcData[i]["IdentifierUUID"].localeCompare(itemUUID) == 0 ) {
							ExcData[i]["RelationIncludesUUID"][0] = ExcData[i]["RelationIncludesUUID"][0].replace(imageUUID+"\n", "");
							ExcData[i]["RelationIncludesUUID"][0] = ExcData[i]["RelationIncludesUUID"][0].replace("\n"+imageUUID, "");
							ExcData[i]["RelationIncludesUUID"][0] = ExcData[i]["RelationIncludesUUID"][0].replace(imageUUID      , "");
							ExcData[i]["RelationIncludesUUID"][0] = ExcData[i]["RelationIncludesUUID"][0].replace("\n\n", "\n");
							break;
						}
					}
					// inform user
					Dialog.showItemDataDialog( itemUUID );
					document.getElementById("masterContainer").style.cursor = "default";
					alert( "Photo " + imageUUID + " removed from item '" + itemData["Title"] + "'." );
				}
			});
		}
	} else {
		alert( "You do not have access to delete this photo" );
	}
}





/***************************************** SAVING TO SERVER ********************************/
/**
 * Saves changes of an item's data fields to the web server. If this is successful, then the local copy is updated, as well.
 * This function is called by the dialog which displays the item information when the "Save" button is pressed, or by the create-new-item dialog.
 * It reads the dialog's fields and updates the data with the user's changes.
 * @param NewItemData (json) the data of the item to be saved
 * @param display_the_ItemDataDialog (Boolean) if true the the item-data-dialog will be displayed at the end of the function.
 */
function SaveItem( NewItemData, display_the_ItemDataDialog=true ) {
	var local_item_idx = getIndexBy_UUID( NewItemData["IdentifierUUID"] );
	document.getElementById("itemInfoDialog").style.cursor = "wait";
	document.getElementById("canvas").style.cursor = "wait";
	$.ajax({ // Alter data on the server
		url: phpURL,
		type: "POST",
		data: { Command: "Save", Arg1: JSON.stringify(NewItemData) },
		timeout: 28000,
		error: function(xmlhttprequest, textstatus, message) {
					document.getElementById("itemInfoDialog").style.cursor = "default";
					document.getElementById("canvas").style.cursor = "default";
					alert("Unable to save. Please check if you are logged in and that your network connection is active. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		if( msg.length > 0 ) {
			alert( msg );
		} else {
			// -------- Alter data fields of the local json 
			if( local_item_idx >= 0  ) { // that is an existing item
				ExcData[local_item_idx] = JSON.parse(JSON.stringify( NewItemData )); // clone
			} else { // that is a newly created item
				ExcData.push( NewItemData );
				QUICK_processExcavationData(); // re-process the data, so that the indexes are correct after the addition
			}
			// update the "Square" field of child elements
			if( NewItemData.hasOwnProperty("Square") ) {
				for( let i=0; i<ExcData.length; i++ ) {
					if( ExcData[i].hasOwnProperty("RelationBelongsToUUID")  &&  ExcData[i]["RelationBelongsToUUID"][0].indexOf(NewItemData["IdentifierUUID"]) >= 0 ) {
						ExcData[i]["Square"] = NewItemData["Square"];
					}
				}
			}
			// -------- update GUI
			if( ItemList_wasPopulatedBy_AdvancedSearch ) {
				PopulateItemsList_AccordingTo_AdvancedSearchCriteria();
			} else {
				PopulateItemsList(ExcData, currentItemsListCategory, currentItemsListSearchString);
			}
			updateSelectedItemsOnList();
			PopulateCategoriesCombo();
			updateInfoBar();
			// -------- inform user
			if( display_the_ItemDataDialog ) Dialog.showItemDataDialog( NewItemData["IdentifierUUID"] );
			if( local_item_idx >= 0  ) { 
				alert("Changes were saved to the server.");
			} else { // that is a newly created item
				alert("The new item has been created.");
			}
		}
		// update GUI and state
		document.getElementById("itemInfoDialog").style.cursor = "default";
		document.getElementById("canvas").style.cursor = "default";
		ITEM_DATA_HAS_BEEN_CHANGED = false;
	});
}

/***************************************** EVENT HANDLERS **********************************/


/**
 * Event handler: called when the user has clicked on a row of the Items-List.
 * If Ctrl is pressed then the clicked item will be selected. If not then the item-info-dialog for this item will be launched.
 */
function ItemList_ClickHandler(e) {
	if( e.target.id.length == 0 || e.target.id.localeCompare("itemsList_ul")==0 ) {  return;  } 
	// locate the data of the clicked item
	var ItemData = getDataBy_UUID( e.target.id.substr( e.target.id.indexOf("~")+1 ) );
	// check if special key is pressed along with clicking
	var special_key_pressed = false;
	if( window.navigator.platform.toLowerCase().includes( "mac" ) ) {
		if( window.event.button == 2  ||  window.event.altKey  ||  window.event.metaKey ) {
			special_key_pressed = true;
		}
	} else if( window.event.ctrlKey ) { 
		special_key_pressed = true;
	}
	//
	if( special_key_pressed ) { // select the item if ctrl is pressed
		if( ItemData["Selected"] == true) {
			ItemData["Selected"] = false;
			num_of_selected_items -= 1;
		} else {
			ItemData["Selected"] = true;
			num_of_selected_items += 1;
			map.HighlightItempOnMap( ItemData["IdentifierUUID"] );
		}
		updateInfoBar();
		map.drawWorld();
		updateSelectedItemsOnList();
	} else { // when simple click, display item details in a dialog 
		Dialog.showItemDataDialog( ItemData["IdentifierUUID"], true );
	}
}




/**
  * When an item-field of the ItemDataDialog is clicked, this function is called to alter the html of that div-element,
  * so that the user can edit the content. The function either displays a textaera or a combobox or a red border in case user has no access.
  * @arg itemUUID (string) the item's unique id
  * @arg fieldName (string) the name of the field which the user has clicked and shall be altered
  */
function UpdateGUI_forFieldAlteration( itemUUID, fieldName ) {
	var ItemData = getDataBy_UUID( itemUUID );
	//
	//if (window.event.ctrlKey) alert( document.getElementById(itemUUID+"_"+fieldName).innerHTML );
	var item_type = "";
	var item_category = "";
	if( ItemData.hasOwnProperty("Type") )     item_type     = ItemData["Type"];
	if( ItemData.hasOwnProperty("Category") ) item_category = ItemData["Category"];
	
	// Check for Access Permissions
	var AccessGranted = false;
	if( TheAccessLevels.toLowerCase().indexOf(",all,") >= 0 ) AccessGranted = true;
	if( TheAccessLevels.indexOf(","+item_type+",") >= 0 ) AccessGranted = true;
	if( TheAccessLevels.indexOf(","+item_category+",") >= 0 ) AccessGranted = true;
	// Check if the field can be edited
	var is_this_field_editable = false;
	if( AccessGranted == false ) {
		is_this_field_editable = false; 
	} else if( item_type.trim().length==0 && item_category.trim().length==0 ) {
		if( EditableItemFields[ "" ].includes( fieldName ) ) is_this_field_editable = true;
	} else if( item_category.trim().length>0 && EditableItemFields.includes(item_category) ) {
		if( EditableItemFields[ item_category ].includes( fieldName ) ) is_this_field_editable = true;
	} else if( item_category.trim().length==0 || EditableItemFields.includes( item_category ) == false) {
		if( EditableItemFields[ item_type ].includes( fieldName ) ) is_this_field_editable = true;
	}
	// Privilleged users shall be able to see and edit the more sensitive fields
	if( TheAccessLevels.toLowerCase().includes(",all,") && (fieldName==="Trench" || fieldName==="Type" || fieldName==="Category" || fieldName==="Subcategory") ) { 
		is_this_field_editable = true;
	}
	//
	if( is_this_field_editable ) {
		ITEM_DATA_HAS_BEEN_CHANGED = true;
		var valueList = getFieldValueList(fieldName);
		var field_innerHTML = document.getElementById(itemUUID+"_"+fieldName).innerHTML;
		var fieldValue = ItemData[ fieldName ];
		if( typeof fieldValue == "undefined" ) fieldValue = ""; else fieldValue = String(fieldValue);
		// display a textarea or a combobox 
		if( field_innerHTML.indexOf("<textarea")<0  &&  field_innerHTML.indexOf("<datalist")<0) { // if the field's html contains these tags, then user has already clicked on it and the field editing visuals have been displayed
			if( valueList == null ) { // this field should be displayed as text -> html textarea
				var line_count = parseInt( document.getElementById(itemUUID+"_"+fieldName).style.minHeight ) / 18;
				if( isNaN(line_count) || line_count==0 ) line_count = 1;
				document.getElementById(itemUUID+"_"+fieldName).innerHTML = "<textarea rows=" + line_count + " class='dialog_itemfield_editable' id='" + itemUUID+"_"+fieldName+"_text" + "'>" + fieldValue + "</textarea>";
			} else { // this field should be displayed as text with extra predefined options -> html datalist
				s ="";
				s += "<input type='text' id='" + itemUUID+"_"+fieldName+"_text" + "' class='dialog_itemfield_editable' name='" + itemUUID+"_"+fieldName+"_text" + "' list='" + itemUUID+"_"+fieldName+"_list" + "'/>";
				s += "<datalist id='" + itemUUID+"_"+fieldName+"_list" + "'>";
				if(fieldValue.length > 0) s += "<option value='" + fieldValue + "'>" + fieldValue + "</option>"; // include the previous option as well
				for( let i=0; i<valueList.length; i++ ) {
					s += "<option value='" + valueList[i] + "'>" + valueList[i] + "</option>";
				}
				s += "</datalist>";
				document.getElementById(itemUUID+"_"+fieldName).innerHTML = s;
				document.getElementById(itemUUID+"_"+fieldName+"_text").value = fieldValue; // set the previous value as the default one
			}
		}
	} else {
		document.getElementById(itemUUID+"_"+fieldName).style.border = "1px solid red";
	}
}

/**
 * Event handler: called when the user has changed the value of the itemCategories-Combobox above the Items-List.
 * Only the items of the selected type or category will displayed in the Items-List.
 */
function itemCategoriesCombo_ChangeHandler(e) {
	document.getElementById("canvas").style.cursor = "wait";
	if( itemCategoriesCombo.value.localeCompare("All") == 0 ) {
		currentItemsListCategory = "";
		currentItemsListSearchString = "";
		PopulateItemsList(ExcData, "", "");
		updateSelectedItemsOnList();
	} else { 
		currentItemsListCategory = itemCategoriesCombo.value;
		currentItemsListSearchString = "";
		PopulateItemsList(ExcData, itemCategoriesCombo.value, "");
		updateSelectedItemsOnList();
	}
	
	// correct the value of the itemCategoriesPanel
	for(var i = 0; i < itemCategoriesPanel.length; i++) {
		if(itemCategoriesPanel.options[i].value.localeCompare( itemCategoriesCombo.value ) == 0) {
			itemCategoriesPanel.options[i].selected = true;
		} else {
			itemCategoriesPanel.options[i].selected = false;
		}
	}
	
	map.drawWorld();
	document.getElementById("canvas").style.cursor = "default";
}

/**
 * Event handler: called when the user has changed the value of the itemCategories-Panel on the left of the Items-List.
 * Only the items of the selected type or category will displayed in the Items-List.
 */
function itemCategoriesPanel_ChangeHandler(e) {
	document.getElementById("canvas").style.cursor = "wait";
	
	if( itemCategoriesPanel.value.localeCompare("All") == 0 ) {
		currentItemsListCategory = "";
		currentItemsListSearchString = "";
		PopulateItemsList(ExcData, "", "");
		updateSelectedItemsOnList();
	} else { 
		currentItemsListCategory = itemCategoriesPanel.value;
		currentItemsListSearchString = "";
		PopulateItemsList(ExcData, itemCategoriesPanel.value, "");
		updateSelectedItemsOnList();
	}
	
	// Convert all options to an array -> get an array of only the selected options -> get an array of the selected option values
	var Selected_Categories = Array.from(itemCategoriesPanel.options).filter(function (option) {
		return option.selected;
	}).map(function (option) {
		return option.value;
	});

	// correct the value of the itemCategoriesCombo/itemsSearchText
	if( Selected_Categories.length == 1 ) {
		document.getElementById("itemsSearchText").value = Selected_Categories[0];
	} else {
		document.getElementById("itemsSearchText").value = "";
	}

	$(itemsList_ul).empty();
	num_of_items_in_list = 0;
	var include_in_list;
	for (let i = 0; i < ExcData.length; i++) { // for every item in the trench
		// ignore undefined and image items
		if( typeof ExcData[i] == "undefined" ) continue; // <<<
		if( ExcData[i]["Type"].localeCompare("Image") == 0 ) continue; // <<<
		
		// check if the item belongs to one of the currently selected Trenches
		item_belongs_to_selected_trenches = false;
		var item_trenches = "";
		if (ExcData[i].hasOwnProperty("Trench")) { 
			item_trenches = ExcData[i]["Trench"].split("\n");
			for( let idx=0; idx<item_trenches.length; idx++) {
				if( currentTrenchNames.includes( item_trenches[idx] ) ) { item_belongs_to_selected_trenches = true; break; }
			}
 		}
		if( item_belongs_to_selected_trenches == false ) continue; // <<<
	
		// check if the item belongs to a selected Type or Category
		include_in_list = false;
		if( Selected_Categories.includes(ExcData[i]["Type"]) || Selected_Categories.includes(ExcData[i]["Category"]) || Selected_Categories.includes("All") ) {
			include_in_list = true;
		}
		
		if( include_in_list ) {
			addInItemsList( ExcData[i] );
		} else {
			ExcData[i]["Visible"] = false;
		}
	}
	updateInfoBar();
	map.drawWorld();
	document.getElementById("canvas").style.cursor = "default";
}


/**
 * Event handler: called when the user types in the search box above the Items-List.
 * It handles the Enter key which initiates the search and resets the value of the itemCategoriesCombo so that the user can re-select the same category after a search.
 */
function itemsSearchText_KeypressHandler(e) {
	itemCategoriesCombo.value = ""; //
	if( e.keyCode == 13 ) { // enter
		var s = document.getElementById("itemsSearchText").value.toLowerCase();
		currentItemsListCategory = "";
		currentItemsListSearchString = s;
		PopulateItemsList(ExcData, "", s);
		updateInfoBar();
		updateSelectedItemsOnList();
		map.drawWorld();
		
		// correct the value of the itemCategoriesPanel
		for(var i = 0; i < itemCategoriesPanel.length; i++) {
			itemCategoriesPanel.options[i].selected = false;
		}
	}
}

/**
 * Event handler: called when the user has clicked the Trenches-Combobox at the top.
 * It allows the user to re-select the same value and load again the data of the same trench.
 */
function AvailableTrenchesCombo_ChangeHandler() {
	// ---- Resolve which trenches the user has selected
	var options = AvailableTrenchesCombo.options;
	var num_of_selected_trenches = 0;
	currentTrenchNames = [];
	for (let i = 0; i < options.length; i++) { 
		if (options[i].selected) {
			num_of_selected_trenches++;
			if( currentTrenchNames.includes( options[i].text ) == false ) {
				currentTrenchNames.push( options[i].text )
			}
		}
	}
	// ---- auto-select the default trench if the user has selected nothing
	//if( num_of_selected_trenches == 0 ) {
	//	set_current_Trenches( [ExcavationPreferences["DefaultTrench"]] );
	//}
	// ---- auto-populate the Plans combo-box with the plans related to the selected trenches
	PopulatePlansList();
	// ---- populate the items-list
	PopulateItemsList(ExcData, "", "");
	// ---- the plan may have also changed, take care of it 
	AvailablePlansCombo.dispatchEvent( new Event('change') );
	
}



/**
 * Event handler: called when the user has changed the value of the Plans-Combobox at the top.
 */
function AvailablePlansCombo_ChangeHandler( e ) {
	if( AvailablePlansCombo.value.length == 0 ) {
		map.drawWorld();
		return; // <<<<
	}
		
	var selected_plan = AvailablePlansCombo.value;
		
	for (let i = 0; i < ExcData.length; i++) { 
		// ---- mark the items which belong to Trenches which are compatible with the selected Plan, so that only them are displayed on the map
		var item_is_compatible_with_selected_plan = false;
		if( ExcData[i].hasOwnProperty("Trench") ) {
			var item_trenches = ExcData[i]["Trench"].split("\n");
			for(let idx=0; idx<item_trenches.length; idx++) {
				if( PlanTrenchRelations[selected_plan].includes( item_trenches[idx] ) ) {
					item_is_compatible_with_selected_plan = true;
					break;
				}
			}
		}
		ExcData[i]["InPlan"] = item_is_compatible_with_selected_plan;
	}
	
	// update map
	map.drawWorld();
}



/**
 * Event handler: called when the Item-Search-Button at the right of the Search-Text-Box is clicked.
 */
function ItemSearchButton_ClickHandler( e ) {
	if( e.ctrlKey ) {
		Dialog.ShowAdvancedSearchDialog();
	} else {
		var ev = new KeyboardEvent('keyup', {altKey:false, bubbles: true, cancelBubble: false, cancelable: true, charCode: 0, code: 'Enter', composed: true, ctrlKey: false, currentTarget: null, defaultPrevented: true, detail: 0, eventPhase: 0, isComposing: false, isTrusted: true, key: 'Enter', keyCode: 13, location: 0, metaKey: false, repeat: false, returnValue: false, shiftKey: false, type: 'keydown', which: 13});
		document.getElementById('itemsSearchText').dispatchEvent(ev); 	
	}
}

/**
 * Event handler: called when the ToggleCategoriesPanelButton_ClickHandler (a half circle button at the lower left) is clicked.
 */
function ToggleCategoriesPanelButton_ClickHandler( e ) {
	var theButton = document.getElementById('ToggleCategoriesPanelButton');
	if( theButton.innerHTML.localeCompare("&gt;") == 0 ) { // greater then symbol: '>'
		theButton.innerHTML = "&lt;"; // less then symbol: '<'
		document.getElementById('ItemControls_LeftColumn').style.display = "inline";
		map.drawWorld();
	} else {
		theButton.innerHTML = "&gt;"; // greater then symbol: '>'
		document.getElementById('ItemControls_LeftColumn').style.display = "none";
		map.drawWorld();
	}
}

/**
 * Event handler: called when the window is resized. It fixes the canvas distortion.
 */
function WindowResizeHandler( e ) {
	map.drawWorld();
}


/**
 * Event handler: called when the InfoBar below the items-list is clicked. It resets the search results and de-selects all items.
 */
function InfoBar_ClickHandler( e ) {
	for (let i = 0; i < ExcData.length; i++) {
		if( typeof ExcData[i] == "undefined" ) continue;
		if( typeof ExcData[i]["Selected"]!="undefined"  &&  ExcData[i]["Selected"]==true ) {
			ExcData[i]["Selected"] = false;
			num_of_selected_items--;
		} 
	}
	currentItemsListCategory = "";
	currentItemsListSearchString = "";
	PopulateItemsList(ExcData, "", "");
	updateSelectedItemsOnList();
	document.getElementById("itemsSearchText").value = "";
	document.getElementById("itemsList_ul").scrollTop = 0;
	updateInfoBar();
	map.drawWorld();
}

/**
 * Identifiers are formated like A372. A is the Identifier's group-name and 372 the group-number. 
 * The role of this listener is to suggest the maximum+1 number while user is typing.
 * (Programmer's note: the this keyword corresponds to the input-textbox the listener is bounded to)
 */
function IdentifierTextbox_ChangeHandler( e ) {
	// if backspace pressed then do not act
	if( event.keyCode == 8 ) return false;// backspace
	// resolve which group character(s) the user has typed
	var group_name = this.value.substring(0, this.selectionStart);
	if( group_name.length == 0 ) return false;
	// find the max number for the this Identifier 
	var max = 0;
	var group_number = 0;
	for (let i = 0; i < ExcData.length; i++) { 
		if( ExcData[i]["Identifier"].startsWith(group_name) ) {
			try {
				group_number = parseInt( ExcData[i]["Identifier"].substring( group_name.length ) );
				if( group_number > max ) max = group_number;
			} catch( ex ) {}
		}
	}
	// suggest max+1 to the user
	if( max > 0 ) {
		this.value = group_name + (max+1).toString() ;
		this.setSelectionRange( group_name.length, this.value.length );
		return true;
	}
}



//////////////////////////// Handle Click on username and help ///////////////////////////////
/* When the user clicks on her username, toggle between hiding and showing the dropdown menu */
function toggle_user_menu() {
	document.getElementById("userinfo_dropdown").classList.toggle("show");
	// close any other drop-down menu
	var dropdowns = document.getElementsByClassName("help-dropdown-content");
	for (var i = 0; i < dropdowns.length; i++) {
		if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
	}
}
function toggle_help_menu() {
	document.getElementById("help_dropdown").classList.toggle("show");
	// close any other drop-down menu
  	var dropdowns = document.getElementsByClassName("user-dropdown-content");
	for (var i = 0; i < dropdowns.length; i++) {
		if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
	}
}

// Close the dropdown menus if the user clicks outside of them
window.onclick = function(event) {
	if (!event.target.matches('.drop_downs')) {
		var dropdowns = document.getElementsByClassName("dropdown-content");
		for (var i = 0; i < dropdowns.length; i++) {
			if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
		}
    }
};

function UserLogout() {
	$.ajax({                                      
		url: phpURL,
		type: "POST",
		data: { Command: "Logout" },
		timeout: 22000,
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error during logout. Please check your network connection. ("+textstatus+" "+message+")");
				}
	}).done(function( msg ) {
		if( msg.trim().toLowerCase().localeCompare("ok") == 0 ) { // if logged out successfuly then go to login page
			window.location.replace( "./index.html" );  
		} else {
			alert( "Server error\n" + msg );
		}
	});
}



function AddUser() {
	if( TheUsername.localeCompare("admin") == 0 ) {
		var NewUserName, NewUserPassword, NewAccessString, ok;
		ok = true;
		NewUserName = prompt("Please enter the new user's Name.", "");
		if( NewUserName.trim().length == 0 ) { ok = false; }
		if( ok ) NewUserPassword = prompt("Please enter the new user's Password.", "");
		if( NewUserPassword.trim().length == 0 ) { ok = false; }
		if( ok ) NewAccessString = prompt("Please enter the user's access rights. \n(item types separated by commas, 'adddnew', 'del' or 'all'. Example: 'Feature,Coin,addnew')", "");
		if( NewAccessString.trim().length == 0 ) { ok = false; }
		if( ok ) {
			$.ajax({                                      
				url: phpURL,
				type: "POST",
				data: { Command: "AddUser", Arg1:NewUserName, Arg2:NewUserPassword, Arg3:NewAccessString },
				timeout: 22000,
				error: function(xmlhttprequest, textstatus, message) {
							alert("Error during adding new user. Please check your network connection. ("+textstatus+" "+message+")");
						}
			}).done(function( msg ) {
				alert( msg );
			});
		}
	} else {
		alert("Only the admin user can add new users.");
	}
}



function Change_User_Rights() {
	if( TheUsername.localeCompare("admin") == 0 ) {
		var UserName, NewAccessString, ok;
		ok = true;
		UserName = prompt("Please enter the name of the user whose permissions you wish to alter:", "");
		if( UserName.trim().length == 0 ) { ok = false; }
		NewAccessString = prompt("Please enter the new access rights. \n(item types separated by commas, 'adddnew', 'del', 'all' or 'Coordinates'. Example: ',Feature,Coin,addnew,')", "");
		if( NewAccessString.trim().length == 0 ) { ok = false; }
		if( ok ) {
			$.ajax({                                      
				url: phpURL,
				type: "POST",
				data: { Command: "Change_User_Rights", Arg1:UserName, Arg2:NewAccessString },
				timeout: 22000,
				error: function(xmlhttprequest, textstatus, message) {
							alert("Error during changing the user's access rights. Please check your network connection. ("+textstatus+" "+message+")");
						}
			}).done(function( msg ) {
				alert( msg );
			});
		}
	} else {
		alert("Only the admin user can change permissions.");
	}
}

/**
  * Commands the web server to process iDig json data.  
  * The iDig data are:
  *    ExcavationData.json at web-server folder Data/ will be processed to add new items and append to them new fields.
  *    Preferences.json at web-server folder Data/ will be processed to add functionality.
  */
function Import_iDig_Data() {
	if( TheUsername.localeCompare("admin") == 0 ) {
		var msg = "";
		msg += "After you have uploaded the following json files to the web server, this command will do the following:\n";
		msg += " * iDig.json\t at web-server folder Data/ will be processed and add any new items to the database, appending new fields, as well.\n";
		msg += " * Preferences.json\t at web-server folder Data/ will be processed to add functionality.\n";
		msg += "This action will take time and can be repeated many times to add new data.\n";
		msg += "- Do you want to continue?";
		var ok = confirm(msg); 
		if( ok ) {
			document.getElementById("masterContainer").style.cursor = "wait";
			$.ajax({                                      
				url: phpURL,
				type: "POST",
				data: { Command: "Import_iDig_Data" },
				timeout: 28000,
				error: function(xmlhttprequest, textstatus, message) {
							document.getElementById("masterContainer").style.cursor = "default";
							alert("Error during data import. Please check your network connection. ("+textstatus+" "+message+")");
						}
			}).done(function( msg ) {
				document.getElementById("masterContainer").style.cursor = "default";	
				alert( msg );
			});
		}
	} else {
		alert("Only the admin user can import iDig data.");
	}
}



/**
  * Commands the web server to process images at the web-server folder Data/images_for_import/ and copy them to correct location and creaate thumbnails if they do not exist.
  * This action has to be repeated many times in order to process all images, since PHP scripts can run for limited time only.
  */
function Import_iDig_Images() {
	if( TheUsername.localeCompare("admin") == 0 ) {
		var msg = "";
		msg += "After you have uploaded the images at the web-server folder Data/images_for_import/, this comand will copy them to correct location and creaate thumbnails if they do not exist\n";
		msg += "This action will take time and has to be repeated many times in order to process all images, since PHP scripts can run for limited time only.\n";
		msg += "- Do you want to continue?";
		var ok = confirm( msg ); 
		if( ok ) {
			document.getElementById("masterContainer").style.cursor = "wait";
			$.ajax({                                      
				url: phpURL,
				type: "POST",
				data: { Command: "Import_iDig_Images" },
				timeout: 28000,
				error: function(xmlhttprequest, textstatus, message) {
							document.getElementById("masterContainer").style.cursor = "default";
							alert("Error during images import. Please check your network connection. ("+textstatus+" "+message+")");
						}
			}).done(function( msg ) {
				document.getElementById("masterContainer").style.cursor = "default";
				alert( msg );
			});
		}
	} else {
		alert("Only the admin user can import iDig images.");
	}
}




/**
  * When the user presses the layers button (at the map tools) he can choose which layer to work with.
  * This functions handles what happens when the user changes the layer value.
  */
function Handle_LayerSelection() {
	Current_Layer = document.getElementById("Layers_slider").value;
	map.drawWorld();
}