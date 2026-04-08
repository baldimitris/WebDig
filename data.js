// TODO: https://sucuri.net/guides/how-to-install-ssl-certificate/

/**
 * This module contains all global variables and functions for manipulating the Trench data
 */
 
/************ CONSTANTS *************/
const ServerURL=window.location.href.substring( 0, window.location.href.lastIndexOf("/")+1 );
const phpURL="./WebDigServer.php";
var itemUUID_atURL = ""; // useful for directly accessing an item. example: http://lino.mysch.gr/webdig/app_main.html?id=DD047199-FEE2-474B-A3A5-EA61B7A44D46

var COLOR_artifact = "skyblue";
var COLOR_locus =  "rgb(255, 160, 122)"; // "lightsalmon"; "crimson"
var COLOR_feature = "rgb(238, 130, 238)"; // "violet";
var COLOR_partition = "rgb(238, 130, 238)"; // "violet";
var COLOR_various = "darkorchid";
var COLOR_selected = "gold";
var COLOR_focused = "teal";
var COLOR_image = "aquamarine";
var COLOR_highlight = "crimson";
var COLOR_crosssection = "crimson";
var COLOR_distances = "green";
var COLORS = [];

/********* State variables *********/
// system-related
var running_on_mobile_device = null;
// canvas-related
var map = null;
// selection-related
var PolygonPoints = []; // state for the polygon selection tool
var PencilSelectionWidth = 40; // state for the pencil selection tool
var PencilPath = []; // state for the pencil selection tool
// cross-section related
var CrossSectionX1 = -1;
var CrossSectionY1 = -1;
var CrossSectionX2 = -1;
var CrossSectionY2 = -1;
var CrossSectionShapes = [];
// layers related
var Max_num_of_Layers = 1;
var Current_Layer = 0; // 0 is the first layer, that is the first polygon described in "Location" field of the database
// coordinate-altering related
var CoordinateAltering_SelectedPointIdx = -1;
var CoordinateAltering_SelectedItemIdx = -1;
var CoordinateAltering_SelectedItemData_Backup = null;
// ReferenceLinks-related
var ReferenceLinks = null;//theReferenceLinks = new ReferenceLinks_class();
// user-related
var TheUsername = "";
var TheAccessLevels = "";
// history-related
var theHistory = new History();
var Autofill = []; // holds the data entered by the user at the AdvancedSearchDialog at a certain text field. Example Autofill["TitleCriterion"]="Roof tile" remembers that the user has typed "Roof tile" at the "TitleCriterion" field.
var ItemList_wasPopulatedBy_AdvancedSearch; // boolean

var itemCategoriesCombo;
var itemCategoriesPanel;
var itemsList_ul;
var currentItemsListCategory = "";
var currentItemsListSearchString = "";

var currentPlanTitle = "";
var PlanImage = null;
var PlanImageWidth = 0;
var PlanImageHeight = 0;
var PlanMinX = 0;
var PlanMaxX = 0;
var PlanMinY = 0;
var PlanMaxY = 0;

var ZoomFactor = 1; // how much zoomed will the canvas be, from 0 to 1
var CanvasOffsetX = 0; // 
var CanvasOffsetY = 0; //

var MouseIsDown = false;
var MouseStartX, MouseStartY; // the initial position of the mouse when it is clicked and draged
var MouseX, MouseY; // the current position of the mouse

var ExcData = null; // holds all the Excavation Data in a json array
var currentTrenchName = "Hermes house"; // TODO: remove
var currentTrenchNames = [];
var TrenchNames; // an array of the names of all trenches
var num_of_items_in_list = 0;
var num_of_selected_items = 0;
var num_of_trench_items_without_the_images = 0;
var DataSubset = []; // used for sorting the items-list
var ExcavationPreferences = null; // all data inside Preferences.json
var FieldDefinitions = null; // data from Preferences.json
var list_of_all_Types    = []; // holds all the different Types of the ExcData. Filled by processExcavationData function
var list_of_all_Categories = []; // holds all the different Categories of the ExcData. Filled by processExcavationData function
var list_of_all_Loci = []; // holds all the different Types of the ExcData. Filled by processExcavationData function
var list_of_all_Squares  = []; // holds all the different Squares of the ExcData. Filled by processExcavationData function
var list_of_all_Sources  = []; // holds all the different Sources of the ExcData. Filled by processExcavationData function
var list_of_all_Trenches = []; // holds all the different Trenches of the ExcData. Filled by processExcavationData function
var PlanTrenchRelations  = []; // holds all the different Trenches per Plan of the ExcData. Filled by processExcavationData function. Example: PlanTrenchRelations["Plan1"] = ["Hermes house", "Crossroads"]
var TrenchPlanRelations  = []; // holds all the different Plans per Trench  of the ExcData. Filled by processExcavationData function. Example: TrenchPlanRelations["Hermes house"] = ["Plan1", "Plan2"]


// for editing the fields in the item-info dialog. These are default values, the actual values are loaded from Preferences.json
var EditableItemFields = ["", "Locus", "Feature", "Artifact", "Coin", "Bone", "Ceramics", "Shell", "Soil", "HandPicked", "Image", "Notes"]; 
EditableItemFields[""]           = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Locus"]    = ["Title", "Description", "Source", "Square", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Feature"]    = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Artifact"]   = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Coin"]       = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Bone"]       = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Ceramics"]   = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Shell"]      = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Soil"]       = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["HandPicked"] = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
EditableItemFields["Image"]      = ["Title", "Description", "Source", "Modifier", "Category", "Color", "Hue", "Boundary", "Sorting", "Sieve", "Category", "Subcategory", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "FormatImage", "ArtifactDate", "Dimensions", "Comparanda", "Additional bibliography", "Notes" ];
// for displaying the fields in the item-info dialog.  These are default values, the actual values are loaded from Preferences.json
var VisibleItemFields  = ["", "Locus", "Feature", "Artifact", "Coin", "Bone", "Ceramics", "Shell", "Soil", "HandPicked", "Image", "Notes"]; 
VisibleItemFields[""]         	= [ "Identifier", "Title", "Category", "Subcategory", "Source", "Square", "Description", "RelationIncludesUUID", "Boundary", "Modifier", "Hue", "Color", "Sorting", "Sieve", "Identifier", "Category", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "Creator", "Origin", "IssueAuthority", "Obverse", "Reverse", "Fabric", "CoverageArea", "Category", "Notes"];
VisibleItemFields["Locus"]  	= [ "Identifier", "Title", "Category", "Subcategory", "Source", "Square", "Description", "RelationIncludesUUID", "Boundary", "Modifier", "Hue", "Color", "Sorting", "Sieve", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "RelationIsAboveUUID", "RelationIsBelowUUID", "Notes" ];
VisibleItemFields["Feature"]	= [ "Identifier", "Title", "Category", "Subcategory", "Source", "Square", "Description", "Dimensions", "Materials", "RelationIncludesUUID", "RelationIsAboveUUID", "RelationIsBelowUUID", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes" ];
VisibleItemFields["Artifact"] 	= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "Dimensions", "ArtifactDate", "Description", "Comparanda", "CoverageTemporal", "CoverageEarliest", "CoverageLatest",  "CoverageArea", "Additional bibliography", "Notes"];
VisibleItemFields["Coin"] 		= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "IssueAuthority", "Region", "Date", "Obverse", "Reverse", "Inscription", "Fabric", "Denomination", "Diameter", "Weight", "Axis", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Bibliography", "Notes"];
VisibleItemFields["Bone"] 		= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes"];
VisibleItemFields["Ceramics"] 	= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "Description", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes"];
VisibleItemFields["Shell"] 		= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "Description", "TotalWeight", "FineWareWeight", "Hue", "Color", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes"];
VisibleItemFields["Soil"] 		= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "Description", "Hue", "Color", "Boundary", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes"];
VisibleItemFields["HandPicked"] = [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "Square", "CoverageArea", "ArtifactDate", "Description", "Hue", "Color", "Boundary", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Notes"];
VisibleItemFields["Image"] 		= [ "Identifier", "Title", "RelationBelongsToUUID", "Category", "Subcategory", "Source", "ArtifactDate", "Description", "Notes"];
var ITEM_DATA_HAS_BEEN_CHANGED = false; // used for displaying a warning to the user when he tries to leave the item-info-dialog without saving

// Fields which are visible only to registered users
ItemFields_VisibleOnlyToRegisteredUsers = [ "Notes" ];

// two parallel index-arrays with IdentifierUUID and index of each item in the trench. The arrays are typically sorted by IdentifierUUID in order to search quickly for that.
var Item_IDs = [];
var Item_Indexes = [];

var global_tmp_data = ""; // used to pass data between the GUI and the application logic

var General_DataOwner 		= "©Ephorate of Antiquities of Rhodope, Ministry of Culture of the Hellenic Republic";
var General_DataLicense 	= "This record is licensed by the Ministry of Culture of the Hellenic Republic";
var General_Photographer 	= "©Ephorate of Antiquities of Rhodope, Ministry of Culture of the Hellenic Republic";//"Orestis Kourakis";


/**
 * Looks into the data from Preferences.json and retrieves the predefined value-list of a certain field.
 * if the field has value-list it returns its contents as an array. When the user edits this field he will be proposed with these values by an html-datalist.
 * if the field has no value-list then null is returned.
 * @param {String} field_name: the name of the field to look for
 * @return an array of strings being the value-list of the field at the argument, or null if the field has no such value-list.
 */
function getFieldValueList( field_name ) {
	var theValueList = null;
	// use the value-list from Preferences.json
	for( let i=0; i<FieldDefinitions.length; i++ ) {
		if( FieldDefinitions[i]["field"].localeCompare(field_name)==0  &&  typeof FieldDefinitions[i]["valuelist"] != "undefined" ) {
			if(FieldDefinitions[i]["valuelist"].length > 0) theValueList = FieldDefinitions[i]["valuelist"];
		}
	}
	// create a value-list for certain fields
	if( theValueList == null ) {
		if( field_name.localeCompare("Type") == 0 ) {
			theValueList = list_of_all_Types;
		} else if( field_name.localeCompare("Category") == 0 ) {
			theValueList = list_of_all_Categories;
		} else if( field_name.localeCompare("Trench") == 0 ) {
			theValueList = list_of_all_Trenches;
		}
	}
	////
	return theValueList;
}

/**
 * Looks into the data from Preferences.json and retrieves the data type (if any) of a certain field.
 * @param {String} field_name: the name of the field to look for
 * @return (String) the data type of the field or an empty string if there is type specified
 */
function getFieldDataType( field_name ) {
	var FieldDataType = "";
	// use the value-list from Preferences.json
	for( let i=0; i<FieldDefinitions.length; i++ ) {
		if( FieldDefinitions[i]["field"].localeCompare(field_name)==0  &&  typeof FieldDefinitions[i]["datatype"] != "undefined" ) {
			if(FieldDefinitions[i]["datatype"].length > 0) FieldDataType = FieldDefinitions[i]["datatype"];
		}
	}
	return FieldDataType;
}


/**
 * Parses all JSON ExcData and returns empty string if all is ok, or a string with error messages if errors where found
 */
function check_TrenchData_forErrors( ExcData ) {
	var result = "";
	// Check for duplicate Identifiers
	for (let i = 0; i < ExcData.length-1; i++) { 
		if( ExcData[i].hasOwnProperty("IdentifierUUID")==false || ExcData[i]["IdentifierUUID"] == null ||  ExcData[i]["IdentifierUUID"]==0) {
			result += "Empty IdentifierUUID at item with index: " + i + "\n";
		} else {
			for (let j = i+1; j < ExcData.length; j++) { 
				if( ExcData[i]["IdentifierUUID"].localeCompare( ExcData[j]["IdentifierUUID"] ) == 0 ) {
					result += "Duplicate IdentifierUUID: " + ExcData[i]["IdentifierUUID"] + "\n";
				}
			}
		}
	}
	return result;
}


/**
 * @arg itemType (String): the type of an item
 * @arg itemCategory (String): the category of an item
 * @return an html color according to the item type and category
 */
function getItemColor( itemType, itemCategory ) {
	var result = COLOR_various;
	if (typeof itemType !== 'undefined') {
		itemType = itemType.toLowerCase(); 
	} else {
		itemType = "";
	}
	if (typeof itemCategory !== 'undefined') {
		itemCategory = itemCategory.toLowerCase(); 
	} else {
		itemCategory = "";
	}
	if( COLORS.hasOwnProperty( itemCategory ) ) {
		result = COLORS[ itemCategory ];
	} else if( COLORS.hasOwnProperty( itemType ) ) {
		result = COLORS[ itemType ];
	}
	return result;
}




/**
 * Sorts the UUIDs and indexes them, so that binary searching can be used instead of sequential searching, thus accelerating the searching procedure.
 * The function parses and edits ExcData, which is a global instance and holds all data about the items. This array is created by parsing the json data file of the trench.
 * Processing is executed in itervals (as in a thread) in order to give time for an UI-thread to update the progress bar.
 * > In order to re-process that data after an update call the function QUICK_processExcavationData()
 */
var I = 0; // used to show progress on the progressBar
function processExcavationData() {
	// add info to the index-arrays in order to accelerate searching + resolve all different Types and Categories
	Item_IDs = [];
	Item_Indexes = [];
	num_of_trench_items_without_the_images = 0;
	var item_trenches; // temp supportive variable
	if( ExcData == null ) return; // <<<
		
	// for displaying the progress in the progressBar
	//var TheMainProgressBar = document.getElementById("MainProgressBar");
	var Interval_id = setTimeout(frame, 50);
	function frame() {
		if( I >= ExcData.length ) {
			// sort arrays
			list_of_all_Types.sort();
			list_of_all_Categories.sort();
			list_of_all_Loci.sort();
			list_of_all_Squares.sort();
			list_of_all_Sources.sort();
			list_of_all_Trenches.sort();
			// construct index-arrays for quick search of the items
			sortIndexes(0, Item_Indexes.length);
		} else {
			go_on = true;
			while( go_on ) {
				//
				if( ExcData[I] == null ) {
					I = I + 1;
					continue;
				}
				//// count all items except those of Image and Plan type or in case it is a a guest user hide the very large Identifiers, which denote temporary items
				var count_it = true;
				if( TheUsername.length==0 || TheUsername.toLowerCase().includes("guest") ) { 
					if( ExcData[I]["Identifier"].length > 15 ) count_it = false;
				}
				if( ExcData[I]["Type"].localeCompare("Image")==0 || ExcData[I]["Type"].localeCompare("Plan")==0) count_it = false;
				if(count_it) num_of_trench_items_without_the_images++;
				//// fill the index-arrays
				Item_IDs.push( ExcData[I]["IdentifierUUID"] );
				Item_Indexes.push( I );
				//// resolve all different Types, Categories etc
				if( ExcData[I].hasOwnProperty("Type") && ExcData[I]["Type"].length > 0    && list_of_all_Types.includes(ExcData[I]["Type"]) == false ) list_of_all_Types.push(ExcData[I]["Type"]);
				if( ExcData[I].hasOwnProperty("Category") && ExcData[I]["Category"].length > 0 && list_of_all_Categories.includes(ExcData[I]["Category"]) == false ) list_of_all_Categories.push(ExcData[I]["Category"]);
				if( ExcData[I]["Type"] == "Locus" && list_of_all_Loci.includes(ExcData[I]["Identifier"]) == false ) list_of_all_Loci.push(ExcData[I]["Identifier"]);
				if( ExcData[I].hasOwnProperty("Square") && ExcData[I]["Square"].length > 0    && list_of_all_Squares.includes(ExcData[I]["Square"])      == false ) list_of_all_Squares.push(ExcData[I]["Square"]);
				if( ExcData[I].hasOwnProperty("Source") && ExcData[I]["Source"].length > 0    && list_of_all_Sources.includes(ExcData[I]["Source"])      == false ) list_of_all_Sources.push(ExcData[I]["Source"]);
				//// an item may belong to several trenches separated by a new line character
				if (ExcData[I].hasOwnProperty("Trench")) { 
					item_trenches = ExcData[I]["Trench"].split("\n");
					for( let idx=0; idx<item_trenches.length; idx++) {
						if(list_of_all_Trenches.includes(item_trenches[idx])==false) {
							// do not display trench called 'Pending' to the guest users
							var show_it = true;
							if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // it is a guest user
								if(item_trenches[idx].localeCompare("Pending") == 0) show_it = false;
							}
							if( show_it ) {
								list_of_all_Trenches.push(item_trenches[idx]);
							}
						}
					}
				}
				//// construct the plan-trench structure
				if( ExcData[I].hasOwnProperty("Type") && ExcData[I]["Type"]==="Plan" && ExcData[I].hasOwnProperty("Trench") && ExcData[I].hasOwnProperty("Title")) {
					item_trenches = ExcData[I]["Trench"].split("\n");
					PlanTrenchRelations[ExcData[I]["Title"]] = item_trenches;
					//
					for( let idx=0; idx<item_trenches.length; idx++ ) {
						if( TrenchPlanRelations.hasOwnProperty[item_trenches[idx]] ) {
							if( TrenchPlanRelations[ item_trenches[idx] ].includes(ExcData[I]["Title"]) == false ) {
								TrenchPlanRelations[ item_trenches[idx] ].push( ExcData[I]["Title"] ); 
							}
						} else {
							TrenchPlanRelations[ item_trenches[idx] ] = []; // an array of plan titles
							TrenchPlanRelations[ item_trenches[idx] ].push( ExcData[I]["Title"] ); 
						}
					}
				}
				// go on
				I = I + 1;
				if( I % 400 == 0 || I==ExcData.length) {
					go_on = false;
					//TheMainProgressBar.style.width = (50 + 50 * I / ExcData.length) + "%";
					//console.log((50 + 50 * I / ExcData.length) + "%");
					Interval_id = setTimeout(frame, 60);
				}
			}
		}
	}
}




/**
 * It is used to re-process the excavation data after an update. It updates the indexes for the quick search
 */
function QUICK_processExcavationData() {
	Item_IDs = [];
	Item_Indexes = [];
	num_of_trench_items_without_the_images = 0;
	var item_trenches; // temp supportive variable
	if( ExcData == null ) return; // <<<
	////
	for (let i = 0; i < ExcData.length; i++) {
		//// count all items except those of Image type
		var count_it = true;
		if( TheUsername.length==0 || TheUsername.toLowerCase().includes("guest") ) { 
			if( ExcData[i]["Identifier"].length > 14 ) count_it = false;
		}
		if( ExcData[i]["Type"].localeCompare("Image")==0 || ExcData[i]["Type"].localeCompare("Plan")==0) count_it = false;
		if(count_it) num_of_trench_items_without_the_images++;
		//// fill the index-arrays
		Item_IDs.push( ExcData[i]["IdentifierUUID"] );
		Item_Indexes.push( i );
	}
	// construct index-arrays for quick search of the items
	sortIndexes(0, Item_Indexes.length);
}

	
	
	
	
	
// QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ quicksort algorithm for the INDEXES QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ	
/**
 * Sorts the parallel arrays of the Indexes and the IDs of the ExcData using the quicksort algorithm. 
 * This enables fast binary search by ID 
 */
function sortIndexes(low, high) {
	if (low < high) {
        var pi = partitionIndexes(low, high);
        sortIndexes(low, pi-1);  // Before pi
        sortIndexes(pi+1, high); // After pi
    }
}	
/** Used for sorting and indexing the UUIDs, thus enabling binary search. This function takes last element as pivot, places the pivot element at its correct position in sorted array, and places all smaller (smaller than pivot) to left of pivot and all greater elements to right of pivot */
function  partitionIndexes(low, high) {
    var pivot = Item_IDs[high];  // pivot (Element to be placed at right position)
    var i = low - 1; // Index of smaller element and indicates the 
    // right position of pivot found so far
    for (let j = low; j <= high-1; j++) {
		if (Item_IDs[j].localeCompare(pivot) < 0) { // If current element is smaller than the pivot
			i++;    // increment index of smaller element
			swapIndexes( i, j );
        }
    }
    swapIndexes( i + 1, high );
    return (i + 1);
}
/** Used for sorting and indexing the UUIDs, thus enabling binary search. Swaps two UUIDs and their indexes */	
function swapIndexes(i, j) {
	if( i >= Item_IDs.length || j >= Item_IDs.length ) return;
	var tmp1 = Item_IDs[i];
	Item_IDs[i] = Item_IDs[j];
	Item_IDs[j] = tmp1;
	var tmp2 = Item_Indexes[i];
	Item_Indexes[i] = Item_Indexes[j];
	Item_Indexes[j] = tmp2;
}
// QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ




/** 
 * BINARY SEARCH. Finds and returns a JSON data item according to its IdentifierUUID field 
 */
function getDataBy_UUID( UUID, l=0 ,r=Item_IDs.length ) {
	try {
		if (r >= l) {
			var mid = l + Math.floor((r-l)/2);
			var comparisonValue = Item_IDs[mid].localeCompare(UUID);
			if (comparisonValue == 0) {
				return ExcData[ Item_Indexes[mid] ];
			}
			if (comparisonValue > 0) { // If element is smaller than mid, then it can only be present in left subarray
				return getDataBy_UUID(UUID, l, mid - 1);
			} else {// Else the element can only be present in right subarray
				return getDataBy_UUID(UUID, mid + 1, r);
			}
		}
	} catch(ex) {
	}
    return undefined; // We reach here when element is not present in array
}

/** 
 * BINARY SEARCH. Finds and returns the index of an item according to its IdentifierUUID field 
 */
function getIndexBy_UUID( UUID, l=0 ,r=Item_IDs.length ) {
	try {
		if (r >= l) {
			var mid = l + Math.floor((r-l)/2);
			var comparisonValue = Item_IDs[mid].localeCompare(UUID);
			if (comparisonValue == 0) {
				return Item_Indexes[mid];
			}
			if (comparisonValue > 0) { // If element is smaller than mid, then it can only be present in left subarray
				return getIndexBy_UUID(UUID, l, mid - 1);
			} else {// Else the element can only be present in right subarray
				return getIndexBy_UUID(UUID, mid + 1, r);
			}
		}
	} catch(ex) {
	}
    return -1; // We reach here when element is not present in array
}


// qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq quicksort algorithm for JSON-DATA qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
function sortExcavationData(SortingFields, low=-1, high=-1) {
	if( low==-1 && high==-1 ){
		low  = 0;
		high = DataSubset.length-1;
	}
	if (low < high) {
        var pi = partitionTrenchData(SortingFields, low, high);
        sortExcavationData(SortingFields, low, pi-1);  // Before pi
        sortExcavationData(SortingFields, pi+1, high); // After pi
    }
}	
/* This function takes last element as pivot, places the pivot element at its correct position in sorted array, and places all smaller (smaller than pivot) to left of pivot and all greater elements to right of pivot */
function  partitionTrenchData(SortingFields, low, high) {
    var pivot = DataSubset[high];  // pivot (Element to be placed at right position)
    var i = low - 1; // Index of smaller element and indicates the 
    // right position of pivot found so far
    for (let j = low; j <= high-1; j++) {
		if ( compareTrenchData( DataSubset[j], pivot, SortingFields) < 0 ) { // If current element is smaller than the pivot
			i++;    // increment index of smaller element
			swapTrenchData( i, j );
        }
    }
    swapTrenchData( i + 1, high );
    return (i + 1);
}	
function swapTrenchData(i, j) {
	var tmp =  DataSubset[i] ;
	DataSubset[i] = DataSubset[j] ;
	DataSubset[j] =  tmp ;
}
function compareTrenchData(item1, item2, SortingFields) {
	var item1_IDnum="", item2_IDnum="";
	var idx;
	var verdict = 0; // zero=equal negative=item1 is smaller positive=item1 is larger
	var i=0;
	while( verdict == 0  &&  i < SortingFields.length ) {
		if( item1[SortingFields[i]] > item2[SortingFields[i]] )      { verdict =  1; } 
		else if( item1[SortingFields[i]] < item2[SortingFields[i]] ) { verdict = -1; }
		i += 1; // check the next comparison field
	}
	return verdict;
}

// qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq




/** 
 * SEQUENTIAL SEARCH. Finds and returns a JSON data item according to its Identifier field 
 */
function getDataBy_Identifier( Identifier ) {
	var result = null;
	try {
		for (let i = 0; i < ExcData.length; i++) { 
			if ( ExcData[i]["Identifier"].localeCompare( Identifier ) == 0 ) {
				result = ExcData[i]; 
			}
		}
	} catch(ex) {
	}
    return result;
}





/**
 * Alters the JSON data of a certain field, of a certain item with a new value.
 * @arg UUID (String): the UUID of the item to be altered
 * @arg FieldName (String): the field of the item to be changed
 * @arg newFieldValue (String): the new value which the field will be assigned
 */
function AlterData( UUID, FieldName, newFieldValue ) {
	var ItemData = getDataBy_UUID( UUID );
	ItemData[ FieldName ] = newFieldValue;
}


/**
 * @arg an_Identifier (String): an Identifier to check against all the items of the Trench
 * @return true if some item in the Trench has the same identifier as in the argument
 */
function DoesThisIdentifierExists( an_Identifier ) {
	var result = false;
	for (let i = 0; i < ExcData.length; i++) {
		if( ExcData[i].hasOwnProperty("Identifier") ) {
			if( ExcData[i]["Identifier"].localeCompare(an_Identifier) == 0 ) {
				result = true;
				break;
			}
		}
	}
	return result;
}


/**
 * @return a string containig a new unique UUID which will be used for a new item. It is composed of date, time and random digits
 */
function constructNewUUID() {
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var numbers = "0123456789";
	const now = new Date();
	var newUUID = "";
	newUUID += String(now.getDate()).padStart(2, '0'); 
	newUUID += String(now.getMonth()+1).padStart(2, '0'); 
	newUUID += now.getFullYear();
	newUUID += "-";
	newUUID += String(now.getHours()).padStart(2, '0'); 
	newUUID += String(now.getMinutes()).padStart(2, '0');
	newUUID += String(now.getSeconds()).padStart(2, '0');
	newUUID += "-";
	newUUID += characters.charAt(Math.floor(Math.random() * characters.length));
	newUUID += characters.charAt(Math.floor(Math.random() * characters.length));
	newUUID += numbers.charAt(Math.floor(Math.random() * numbers.length));
	newUUID += numbers.charAt(Math.floor(Math.random() * numbers.length));
	return newUUID;
}


/**
  * Removes a relation between two items. It checks if the items and their relation exists and alters the server's database and the local database.
  * @param parent_UUID
  * @param child_UUID
  * @param relation_title can be "belongs to", "includes", "is above", "is below"
  */
function RemoveRelation(parent_UUID, child_UUID, relation_title) {
	document.getElementById("itemInfoDialog").style.cursor = "wait";
	var parent_field, child_field, index, tmp;
	var child_Identifier;
	// create clones of parent and child items in order to edit them
	var AlteredParentData = JSON.parse(JSON.stringify( getDataBy_UUID(parent_UUID) ));
		var AlteredChildData = getDataBy_UUID(child_UUID);
	if( AlteredChildData == null ) {
		child_Identifier = child_UUID;
	} else {
		AlteredChildData  = JSON.parse(JSON.stringify( getDataBy_UUID(child_UUID)  ));
		child_Identifier = AlteredChildData["Identifier"];
	}

	// remember which fields will be altered
	if(        relation_title.localeCompare("belongs to") == 0){ parent_field = "RelationBelongsToUUID"; child_field = "RelationIncludesUUID";
	} else if( relation_title.localeCompare("includes") == 0)  { parent_field = "RelationIncludesUUID";  child_field = "RelationBelongsToUUID";
	} else if( relation_title.localeCompare("is above") == 0)  { parent_field = "RelationIsAboveUUID";   child_field = "RelationIsBelowUUID";
	} else if( relation_title.localeCompare("is below") == 0)  { parent_field = "RelationIsBelowUUID";   child_field = "RelationIsAboveUUID";
	}
	
	// remove relation at the parent side
	UUIDs = [];
	if ( AlteredParentData.hasOwnProperty(parent_field) ) UUIDs = AlteredParentData[parent_field][0].split('\n');
	index = UUIDs.indexOf( child_UUID );
	if( index >= 0 ) UUIDs.splice(index, 1);
	AlteredParentData[parent_field] = [];
	AlteredParentData[parent_field].push( UUIDs.join("\n") );
	if( AlteredParentData[parent_field][0].length == 0 ) delete AlteredParentData[parent_field];
	
	// remove relation at the child side
	if( AlteredChildData != null ) {
		UUIDs = [];
		if ( AlteredChildData.hasOwnProperty(child_field) ) UUIDs = AlteredChildData[child_field][0].split('\n');
		index = UUIDs.indexOf( parent_UUID );
		if( index >= 0 ) UUIDs.splice(index, 1);
		AlteredChildData[child_field] = [];
		AlteredChildData[child_field].push( UUIDs.join("\n") );
		if( AlteredChildData[child_field][0].length == 0 ) delete AlteredChildData[child_field];
	}
	
	// update some fields of the related items
	AlteredParentData["DateModified"]  = new Date().toISOString().substring(0, 19);
	AlteredParentData["UpdatedByUser"] = TheUsername;
	if( AlteredChildData != null ) {
		AlteredChildData["DateModified"]   = new Date().toISOString().substring(0, 19);
		AlteredChildData["UpdatedByUser"]  = TheUsername;
	}
	
	console.log( "-------------" );
	console.log( JSON.stringify(AlteredParentData) );
	console.log( "-------------" );
	if( AlteredChildData != null ) console.log( JSON.stringify(AlteredChildData) );
	console.log( "-------------" );

	
	// Send a Save request to the server: in two steps, one for each item in the relation
	// 1st request for the parent
	$.ajax({
		url: phpURL, type: "POST", timeout: 18000,
		data: { Command: "Save",  Arg1: JSON.stringify(AlteredParentData) },
		error: 	function(xmlhttprequest, textstatus, message) {
					alert("Error while trying to reach server. Please check your network connection. ("+textstatus+" "+message+")");
				}		
	}).done(function( msg ) {
		console.log("DEL 1/2");
		if( msg.length > 0 ) {
			document.getElementById("itemInfoDialog").style.cursor = "default";
			alert( "An error occured. The relation was not deleted.\n" + msg ); 
		} else {
				// alter local copy
				var local_item_idx = getIndexBy_UUID( parent_UUID );
				ExcData[local_item_idx] = JSON.parse(JSON.stringify( AlteredParentData )); // clone
				// 2nd request for the child
				if( AlteredChildData != null ) {
					$.ajax({
						url: phpURL, type: "POST", timeout: 18000,
						data: { Command: "Save",  Arg1: JSON.stringify(AlteredChildData) },
						error: 	function(xmlhttprequest, textstatus, message) {
									alert("Error while trying to reach server. Please check your network connection. ("+textstatus+" "+message+")");
								}		
					}).done(function( msg ) {
						document.getElementById("itemInfoDialog").style.cursor = "default";
						console.log("DEL 2/2");
						if( msg.length > 0 ) {
							alert( "An error occured. The relation was not deleted properly. Please check the relation data in both items.\n" + msg ); 
						} else {
							// alter local copy
							var local_item_idx = getIndexBy_UUID( child_UUID );
							ExcData[local_item_idx] = JSON.parse(JSON.stringify( AlteredChildData )); // clone
							Dialog.showItemDataDialog( AlteredParentData["IdentifierUUID"] );
							alert("The Relation was deleted:\n" + AlteredParentData["Identifier"] + " " + relation_title + " " + AlteredChildData["Identifier"]);
						}
					});
				} else {
					document.getElementById("itemInfoDialog").style.cursor = "default";
					Dialog.showItemDataDialog( AlteredParentData["IdentifierUUID"] );
					alert("The Relation (with a not-in-database-item) was deleted:\n" + AlteredParentData["Identifier"] + " " + relation_title + " " + child_Identifier);
				}
		}
	});
	//

}


/**
  * Creates a new relation between two items. It checks if the items and their relation exists and alters the server's database and the local database.
  * @param parent_UUID 
  * @param child_UUID
  * @param relation_title can be "belongs to", "includes", "is above", "is below"
  */
function CreateRelation(parent_UUID, child_UUID, relation_title) {
	document.getElementById("itemInfoDialog").style.cursor = "wait";
	var parent_field, child_field, index;
	var child_Identifier;
	// create clones of parent and child items in order to edit them
	var AlteredParentData = JSON.parse(JSON.stringify( getDataBy_UUID(parent_UUID) ));
	var AlteredChildData = getDataBy_UUID(child_UUID);
	if( AlteredChildData == null ) {
		child_Identifier = child_UUID;
	} else {
		AlteredChildData  = JSON.parse(JSON.stringify( getDataBy_UUID(child_UUID)  ));
		child_Identifier = AlteredChildData["Identifier"];
	}
	
	// remember which fields will be altered
	if(        relation_title.localeCompare("belongs to") == 0){ parent_field = "RelationBelongsTo"; child_field = "RelationIncludes";
	} else if( relation_title.localeCompare("includes") == 0)  { parent_field = "RelationIncludes";  child_field = "RelationBelongsTo";
	} else if( relation_title.localeCompare("is above") == 0)  { parent_field = "RelationIsAbove";   child_field = "RelationIsBelow";
	} else if( relation_title.localeCompare("is below") == 0)  { parent_field = "RelationIsBelow";   child_field = "RelationIsAbove";
	}
	
	// create relation at the parent side (Identifier)
	IDs = [];
	if ( AlteredParentData.hasOwnProperty(parent_field) ) IDs = AlteredParentData[parent_field].split('\n');
	index = IDs.indexOf( child_Identifier );
	if( index < 0 ) IDs.push( child_Identifier );
	AlteredParentData[parent_field] = IDs.join("\n");
	// create relation at the parent side (UUID)
	UUIDs = [];
	if ( AlteredParentData.hasOwnProperty(parent_field+"UUID") ) UUIDs = AlteredParentData[parent_field+"UUID"][0].split('\n');
	index = UUIDs.indexOf( child_UUID );
	if( index < 0 ) UUIDs.push(child_UUID);
	AlteredParentData[parent_field+"UUID"] = [];
	AlteredParentData[parent_field+"UUID"].push( UUIDs.join("\n") );
	
	// create relation at the child side (Identifier)
	if( AlteredChildData != null ) {
		IDs = [];
		if ( AlteredChildData.hasOwnProperty(child_field) ) IDs = AlteredChildData[child_field].split('\n');
		index = IDs.indexOf( AlteredParentData["Identifier"] );
		if( index < 0 ) IDs.push( AlteredParentData["Identifier"] );
		AlteredChildData[child_field] = IDs.join("\n");
		// create relation at the child side (UUID)
		UUIDs = [];
		if ( AlteredChildData.hasOwnProperty(child_field+"UUID") ) UUIDs = AlteredChildData[child_field+"UUID"][0].split('\n');
		index = UUIDs.indexOf( parent_UUID );
		if( index < 0 ) UUIDs.push(parent_UUID);
		AlteredChildData[child_field+"UUID"] = [];
		AlteredChildData[child_field+"UUID"].push( UUIDs.join("\n") );
	}
	
	// update some fields of the related items
	AlteredParentData["DateModified"]  = new Date().toISOString().substring(0, 19);
	AlteredParentData["UpdatedByUser"] = TheUsername;
	if( AlteredChildData != null ) {
		AlteredChildData["DateModified"]   = new Date().toISOString().substring(0, 19);
		AlteredChildData["UpdatedByUser"]  = TheUsername;
	}
	
	console.log( "-----------------" );
	console.log( JSON.stringify(AlteredParentData) );
	console.log( "-----------------" );
	if( AlteredChildData != null ) console.log( JSON.stringify(AlteredChildData) );
	console.log( "-----------------" );
	
	// Send a Save request to the server: in two steps, one for each item in the relation
	// 1st request for the parent
	$.ajax({
		url: phpURL, type: "POST", timeout: 18000,
		data: { Command: "Save",  Arg1: JSON.stringify(AlteredParentData) },
		error: function(xmlhttprequest, textstatus, message) {
					alert("Error while trying to reach server. Please check your network connection. ("+textstatus+" "+message+")");
				}		
	}).done(function( msg ) {
		console.log("CREATE 1/2");
		if( msg.length > 0 ) { 
			document.getElementById("itemInfoDialog").style.cursor = "default";
			alert( "An error occured. The relation was not created.\n" + msg ); 
		} else {
				// alter local copy
				var local_item_idx = getIndexBy_UUID( parent_UUID );
				ExcData[local_item_idx] = JSON.parse(JSON.stringify( AlteredParentData )); // clone
				// 2nd request for the child
				if( AlteredChildData != null ) {
					$.ajax({
						url: phpURL, type: "POST", timeout: 18000,
						data: { Command: "Save",  Arg1: JSON.stringify(AlteredChildData) },
						error: 	function(xmlhttprequest, textstatus, message) {
									alert("Error while trying to reach server. Please check your network connection. ("+textstatus+" "+message+")");
								}		
					}).done(function( msg ) {
						document.getElementById("itemInfoDialog").style.cursor = "default";
						console.log("CREATE 2/2");
						if( msg.length > 0 ) { 
							alert( "An error occured. The relation was not created properly. Please check the relation data in both items.\n" + msg ); 
						} else {
							// alter local copy
							var local_item_idx = getIndexBy_UUID( child_UUID );
							ExcData[local_item_idx] = JSON.parse(JSON.stringify( AlteredChildData )); // clone
							Dialog.showItemDataDialog( AlteredParentData["IdentifierUUID"] );
							alert("The Relation was created:\n" + AlteredParentData["Identifier"] + " " + relation_title + " " + AlteredChildData["Identifier"]);
						}
					});
				} else {
					document.getElementById("itemInfoDialog").style.cursor = "default";
					Dialog.showItemDataDialog( AlteredParentData["IdentifierUUID"] );
					alert("The Relation (with a not-in-database-item) was created:\n" + AlteredParentData["Identifier"] + " " + relation_title + " " + child_Identifier);
				}
		}
	});

}


