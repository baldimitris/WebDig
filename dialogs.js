
var WaitingForServer_FLAG = false; // useful for the 'GetMaxIdentifier' server request, so that it is not issued consecutively

/**
 * This class contains source code for all the dialogs of the application
 * Each static class displays a different dialog.
 */
 class Dialog {

	/**
	 * Displays a dialog window containing data about a certain item.
	 * @param {String} UUID the unique id of an item. The data of this item will be displayed in the dialog. If UUID is empty then a new item will be created.
	 * @param {String} alterHistory: if true then the item's UUID is added to the Browsing History. This is necessary only when this dialog is displayed while browsing and not updating.
	*/
	static showItemDataDialog( UUID, alterHistory=false ) {
		var ItemData = getDataBy_UUID( UUID );
		if( typeof ItemData == "undefined" ) {
			alert("Could not find item " + UUID);
			return;
		}
		// inform the map that the user has focused on this item and locus, so that they are colored differently
		if (ItemData.hasOwnProperty("Location")  &&  ItemData["Location"].length > Current_Layer ) {
			map.set_Focused_itemUUID( UUID );
			map.drawWorld();
		} else if (ItemData.hasOwnProperty("RelationBelongsToUUID")) {
			var parentItem = getDataBy_UUID( ItemData["RelationBelongsToUUID"] );
			if( parentItem != null  &&  typeof parentItem != 'undefined') {
				map.set_Focused_itemUUID( parentItem["IdentifierUUID"] );
				map.drawWorld();
			}
		}
		// reset state
		ITEM_DATA_HAS_BEEN_CHANGED = false;
		// figure out item's color
		var bgcolor = getItemColor( ItemData["Type"], ItemData["Category"] );
		// manage history
		if( alterHistory ) theHistory.Add( UUID );
		// display dialog window
		var DialogTitle = "";
		if( typeof ItemData["Identifier"] != 'undefined'  &&  ItemData["Identifier"].length > 0 ) DialogTitle += "[" + ItemData["Identifier"] + "] ";
		DialogTitle += ItemData["Type"] + " - " + ItemData["Title"]; 
		var dialog_obj = $( "#itemInfoDialog" ).dialog(  
			{	height: 600,
				width:  820,
				title:  DialogTitle,
				buttons: [
					{ text: 'History Prev', id: 'iteminfodialogPrevBtn', class: 'dialogPrevBtn',
					  click: function() { 
											var go_on = true;
											if( ITEM_DATA_HAS_BEEN_CHANGED ) go_on = confirm("There are unsaved changes.\nAre you sure you want to leave this dialog?");
											if( go_on ) {
												Dialog.showItemDataDialog(theHistory.Back()); 
											}
										}
					},
					{ text: 'History Next', id: 'iteminfodialogNextBtn', class: 'dialogNextBtn',
					  click: function() { 
											var go_on = true;
											if( ITEM_DATA_HAS_BEEN_CHANGED ) go_on = confirm("There are unsaved changes.\nAre you sure you want to leave this dialog?");
											if( go_on ) {
												Dialog.showItemDataDialog(theHistory.Forward()); 
											}
										}
					},
					{ text: 'List Up', id: 'iteminfodialogUpBtn', class: 'dialogUpBtn',
					  click: function() { 	
											var go_on = true;
											if( ITEM_DATA_HAS_BEEN_CHANGED ) go_on = confirm("There are unsaved changes.\nAre you sure you want to leave this dialog?");
											if( go_on ) {
												var UUID_to_go = getPrevListElementUUID(UUID);
												Dialog.showItemDataDialog( UUID_to_go ); 
												Scroll_ItemsList(UUID_to_go);
											}
										}
					},
					{ text: 'List Down', id: 'iteminfodialogDownBtn', class: 'dialogDownBtn',
					  click: function() {	
											var go_on = true;
											if( ITEM_DATA_HAS_BEEN_CHANGED ) go_on = confirm("There are unsaved changes.\nAre you sure you want to leave this dialog?");
											if( go_on ) {
												var UUID_to_go = getNextListElementUUID(UUID);
												Dialog.showItemDataDialog( UUID_to_go ); 
												Scroll_ItemsList(UUID_to_go);
											}
										}
					},
					{ text: 'Save', id: 'iteminfodialogSaveBtn', class: 'dialogSaveBtn',
					  click: function() { 
											// check that field types are correct
											var DialogFields = document.getElementsByClassName("dialog_itemfield");
											for (let i=0; i<DialogFields.length; i++) {
												var html_id = DialogFields[i].id;
												var fieldName = html_id.substring( html_id.indexOf("_")+1 );
												var fieldDataType = getFieldDataType( fieldName );
												var fieldValue = document.getElementById( ItemData["IdentifierUUID"]+"_"+fieldName+"_text" );
												if (fieldValue != null) {
													fieldValue = document.getElementById( ItemData["IdentifierUUID"]+"_"+fieldName+"_text" ).value;
												} else {
													fieldValue = "";
												}
												if( fieldValue.length>0  &&  fieldDataType.toLowerCase().localeCompare("integer")==0  &&  Utils.ContainsInteger(fieldValue)==false ) {
														alert("Cannot save changes.\nField '" + fieldName + "' is restricted to an integer value." );
														return; // <<<<<<<<
												}
												if( fieldValue.length>0  &&  fieldDataType.toLowerCase().localeCompare("float")==0  &&  Utils.ContainsFloat(fieldValue)==false ) {
														alert("Cannot save changes.\nField '" + fieldName + "' is restricted to a numeric value." );
														return; // <<<<<<<<
												}
											}
											// ensure that the Identifier is unique
											if( document.getElementById( ItemData["IdentifierUUID"]+"_"+"Identifier"+"_text" ) != null ) { // the Identifier field has been edited
												var new_Identifier = document.getElementById( ItemData["IdentifierUUID"]+"_"+"Identifier"+"_text" ).value;
												if( ItemData["Identifier"] != new_Identifier  &&   DoesThisIdentifierExists( new_Identifier ) ) { // the new identifier is different than the previous one
													alert("Cannot save changes.\nThe identifier '" + new_Identifier + "' already exists. Please choose a unique one." );
													return; // <<<<<<<<
												}
											} 
											// compose altered data fields in json format
											var AlteredData = JSON.parse(JSON.stringify( ItemData )); // clone 
											var DialogFields = document.getElementsByClassName("dialog_itemfield");
											for (let i=0; i<DialogFields.length; i++) {
												var html_id = DialogFields[i].id;
												var fieldName = html_id.substring( html_id.indexOf("_")+1 );
												var fieldValue = document.getElementById( ItemData["IdentifierUUID"]+"_"+fieldName+"_text" );
												if (fieldValue != null) {
													fieldValue = document.getElementById( ItemData["IdentifierUUID"]+"_"+fieldName+"_text" ).value;
													AlteredData[fieldName] = fieldValue;
												}
											}
											// ************ Save it ************
											SaveItem(AlteredData);
											
											// >>>> in case the altered item is a Locus then some fields of its child-items must be updated. The server does the same alterations on his side, as well.
											if( AlteredData.hasOwnProperty("Type")  &&  AlteredData["Type"].localeCompare("Locus")==0  &&  AlteredData.hasOwnProperty("RelationIncludesUUID") ) {
												var ChildrenUUIDs = AlteredData["RelationIncludesUUID"][0].trim().split('\n');
												for (let i=0; i<ChildrenUUIDs.length; i++) {
													var child_data = getDataBy_UUID( ChildrenUUIDs[i].trim() );
													if( typeof child_data != 'undefined' ) {
														child_data["Square"] = AlteredData["Square"];
														//if( child_data.hasOwnProperty("Category") && AlteredData.hasOwnProperty("CoverageEarliest") && child_data["Category"].localeCompare("Coin")!=0  ) child_data["CoverageEarliest"] = AlteredData["CoverageEarliest"];
														//if( child_data.hasOwnProperty("Category") && AlteredData.hasOwnProperty("CoverageLatest")   && child_data["Category"].localeCompare("Coin")!=0  ) child_data["CoverageLatest"]   = AlteredData["CoverageLatest"];
														if( child_data.hasOwnProperty("Type")     && AlteredData.hasOwnProperty("Title")            && child_data["Type"].localeCompare("Partition")==0 ) child_data["Title"]            = AlteredData["Title"];
													}
												}
											}
											
										}
					}				
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); },
				beforeClose: function() {
					var go_on = true;
					if( ITEM_DATA_HAS_BEEN_CHANGED ) {
						go_on = confirm("There are unsaved changes.\nAre you sure you want to leave this dialog?");
					}
					if( go_on == false ) {
						return false;
					} else {
						map.set_Focused_itemUUID( "" );
						map.drawWorld();
					}
				}
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", bgcolor);
		//// scroll to the top
		$("#itemInfoDialog").scrollTop("0"); 
		//
		//$("#itemInfoDialog").draggable({containment : 'window' }); //
		$(".ui-dialog").draggable({ scroll: false });
		$(".ui-dialog").draggable({ containment: [-750,0,document.body.clientWidth-60, document.body.clientHeight-60] });
		
		// Check for Access Permissions
		var AccessGranted = false;
		if( TheAccessLevels.toLowerCase().indexOf(",all,") >= 0 ) AccessGranted = true;
		if( TheAccessLevels.indexOf(","+ItemData["Type"]+",") >= 0 ) AccessGranted = true;
		if( TheAccessLevels.indexOf(","+ItemData["Category"]+",") >= 0 ) AccessGranted = true;
		if( AccessGranted == false ) { 
			$('#iteminfodialogSaveBtn').attr("disabled", true);
			$('#iteminfodialogSaveBtn').attr("title", "You do not have access to save changes");
			$('#iteminfodialogSaveBtn').css("background-color", "lightgray");
			$('#iteminfodialogSaveBtn').css("color", "gray");
			$('#iteminfodialogSaveBtn').css("border-color", "gray");
			$('#iteminfodialogSaveBtn').css("cursor", "default");
		}
		
		///// fill dialog contents with data
		var s = ""; 
		// -------- construct html and css for the item images if any --------
		// figure out the related image names
		var ImageNames = [];
		let IncludedUUIDs = (""+ItemData["RelationIncludesUUID"]).split("\n");
		if( typeof IncludedUUIDs != 'undefined' ) {
			for( let i=0; i<IncludedUUIDs.length; i++ ) {
				if( typeof IncludedUUIDs[i] != 'undefined' ) {		
					var relatedItemData = getDataBy_UUID( IncludedUUIDs[i] );
					if( typeof relatedItemData != 'undefined' ) {
						if( relatedItemData["Type"].localeCompare("Image") == 0 ) {
							ImageNames.push( IncludedUUIDs[i] );
						}
					}
				}
			}
		}
		
					
		// construct html
		// ---------------- images row - begin -----------
		s += "<div class='dialog_images_row'>";
		if( ImageNames.length > 0 ) {
			for( let i=0; i<ImageNames.length; i++ ) {
				ImageNames[i] = ImageNames[i].trim();
				if( ImageNames[i].length > 0  &&  ImageNames[i].localeCompare("undefined") != 0 ) {
					var image_json_data = getDataBy_UUID( ImageNames[i] );
					s += "<div style='position:relative';>";
					s += "<a href='#' onclick='";
					s +=                "if (window.event.altKey) { AlterData(\"" + ItemData['IdentifierUUID'] + "\",\"ThumbnailImageUUID\",\"" + ImageNames[i] +"\"); Dialog.showItemDataDialog(\"" + ItemData['IdentifierUUID'] + "\");}";
					
					// ## for opening an image viewer with tools
					//s +=                "else { window.open(\"image_viewer_with_tools.html" + "?img_uuid=" + ImageNames[i] + "\", \"_blank\").focus();}'";
					
					// ## for opening an image viewer without tools
					if( image_json_data != null  &&  typeof image_json_data["FormatImageAnnotations"] != "undefined"  &&  image_json_data["FormatImageAnnotations"].length > 0 ) {
						s +=            "else { window.open(\"image_viewer.html" + "?img_uuid=" + ImageNames[i] + "&item_uuid=" + ItemData['IdentifierUUID'] + "\", \"_blank\").focus();}'";
					} else {
						s +=            "else { window.open(\"Data/images/" + ImageNames[i] + ".jpg\", \"_blank\").focus();}'";
					}
					
					s += ">";
					s += "<img src='Data/images/thumbnails/" + ImageNames[i]+".jpg" + "' title='" + ImageNames[i]  + " Alt+click (and Save) to set as default" + "' height='160px' class='dialog_item_image'";
					
					if( ImageNames[i].localeCompare( ItemData["ThumbnailImageUUID"] ) == 0 ) {
						s += " style='border:6px dashed lightseagreen'";
					} else {
						s += " style='border:6px dashed white'";
					}
					// display X button on image only if user has editing rights
					if( AccessGranted ) { 
						s += "  onmouseover='document.getElementById(\"" + "DEL_"+ImageNames[i] + "\").style.visibility=\"visible\";'";   //s += "  onmouseout ='setTimeout(function() { document.getElementById(\"" + "DEL_"+ImageNames[i] + "\").style.visibility=\"hidden\";}, 200);'";
					}
					s += ">";
					s += "</a>";
					// add a deletion button
					if( TheAccessLevels.length > 0 ) { 
						s += "<button id='" + "DEL_"+ImageNames[i] + "' style='visibility:hidden; position:absolute; left:0px; top:0px; background-color:lightseagreen; color:white; border-radius:10px;'";
						s += "  onclick='DeletePhoto(\"" + ItemData['IdentifierUUID'] + "\", \"" + ImageNames[i] + "\");'";
						s += "><b>X</b></button>";
					}
					s += "</div>";
				}
			}
		}
		// add image of a Plan if available
		if( ItemData["Type"].localeCompare("Plan")==0 ) {
			s += "<a href='plans/" +  ItemData["FormatImage"] + "' target='_blank'>";
			s +=    "<img src='plans/" +  ItemData["FormatImage"] + "' title='" + ItemData["FormatImage"] + "' height='150px' class='dialog_item_image'>";
			s += "</a>";
		}
		// add image of an Image if available
		if( ItemData["Type"].localeCompare("Image")==0 ) {
			s += "<a href='#' onclick='";
			s +=                "if (window.event.altKey) { AlterData(\"" + ItemData['IdentifierUUID'] + "\",\"ThumbnailImageUUID\",\"" + ItemData['IdentifierUUID'] +"\"); Dialog.showItemDataDialog(\"" + ItemData['IdentifierUUID'] + "\");}";
			if( typeof ItemData["FormatImageAnnotations"] != "undefined"  &&  ItemData["FormatImageAnnotations"].length > 0 ) {
				s +=            "else { window.open(\"image_viewer.html" + "?id=" + ItemData["IdentifierUUID"] + "\", \"_blank\").focus();}'";
			} else {
				s +=            "else { window.open(\"Data/images/" + ItemData["FormatImage"] + "\", \"_blank\").focus();}'";
			}
			s += ">";
			s +=    "<img src='Data/images/thumbnails/" +  ItemData["FormatImage"] + "' title='" + ItemData["FormatImage"] + "' height='150px' class='dialog_item_image'>";
			s += "</a>";
		}
		// add a button so that the user can upload photos
		var upload_photo_visibility = "visible";
		if( AccessGranted == false ) upload_photo_visibility = "hidden"; // display add-new-image-button only if user has editing rights
		s +=   "<input id='photo_upload' type='file' accept='image/png, image/jpeg, image/gif' name='photo_upload' style='visibility:hidden;' onchange='uploadPhoto(\"" + ItemData["IdentifierUUID"] + "\")' >";
		s +=   "<button id='add_new_image_button' style='visibility:" + upload_photo_visibility + ";' title='Add new photograph' onclick='getElementById(\"photo_upload\").click();'> + </button>";
		//
		s += "</div>";
		// ---------------- images row - end ----------- 
		
		// ................ Display a 'Selected' checkbox ................
		var is_selected_checked = "";
		if( ItemData["Selected"] ) {
			s +=   "<div style='grid-column:1; color:gold;' id='"+ItemData["IdentifierUUID"]+"_"+"SelectedLabel" + "'><b>" + "Selected" + "</b></div>";
			is_selected_checked = "checked";
		} else {
			s +=   "<div style='grid-column:1;' id='"+ItemData["IdentifierUUID"]+"_"+"SelectedLabel" + "'><b>" + "Selected" + "</b></div>";
		}
		s +=   "<div style='grid-column:2; ' >";
		s +=       "<input type='checkbox' " + is_selected_checked + " style='accent-color:gold;'  id='" + ItemData["IdentifierUUID"]+"_"+"SelectedCheckbox"  +  "' onclick=\"Dialog.alterSelectedState('"+ItemData["IdentifierUUID"]+"');\">";
		s +=   "</div>";
		
		// ~~~~~~~~~~~~~~~~ Display the data contained in the item's fields ~~~~~~~~~~~~~~~~
		// check which fields should be displayed
		var TheVisibleFields = [];
		if( typeof ItemData["Category"] != "undefined"  &&  ItemData["Category"].length>0  &&  VisibleItemFields.indexOf(ItemData["Category"])>=0 ) {
			TheVisibleFields = VisibleItemFields[ ItemData["Category"] ];
		} else if( ItemData["Type"].length>0  &&  VisibleItemFields.indexOf(ItemData["Type"])>=0 ) {
			TheVisibleFields = VisibleItemFields[ ItemData["Type"] ];
		} else {
			TheVisibleFields = VisibleItemFields[ "" ];
		}
		// Privilleged users shall be able to see and edit the more sensitive fields
		if( TheAccessLevels.toLowerCase().includes(",all,") ) { 
			if( TheVisibleFields.includes("Trench") == false ) TheVisibleFields.splice(2, 0, "Trench");
			if( TheVisibleFields.includes("Type") == false ) TheVisibleFields.splice(3, 0, "Type");
			if( TheVisibleFields.includes("Category") == false ) TheVisibleFields.splice(4, 0, "Category");
			if( TheVisibleFields.includes("Subcategory") == false ) TheVisibleFields.splice(5, 0, "Subcategory");
		}
		// certain fields must be visible only to registered users
		if( TheAccessLevels.length == 0 ) { 
			var field_removed = true;
			while( field_removed ) {
				field_removed = false;
				for( var i=0; i<ItemFields_VisibleOnlyToRegisteredUsers.length; i++ ) {
					var idx_to_remove = TheVisibleFields.indexOf( ItemFields_VisibleOnlyToRegisteredUsers[i] );
					if( idx_to_remove >= 0 ) {
						TheVisibleFields.splice(idx_to_remove, 1);
						field_removed = true;
						break;
					}
				}
			}
		}
		// Hide empty fields from the Guest users 
		 if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) {
			var field_removed = true;
			while( field_removed ) {
				field_removed = false;
				for( var i=0; i<TheVisibleFields.length; i++ ) {
					var field_name = TheVisibleFields[ i ];
					if( ItemData.hasOwnProperty(field_name)==false || ItemData[ field_name ].toString().trim().length == 0 ) {
						var idx_to_remove = TheVisibleFields.indexOf( TheVisibleFields[i] );
						if( idx_to_remove >= 0 ) {
							TheVisibleFields.splice(idx_to_remove, 1);
							field_removed = true;
							break;
						}
					}
				}
			}
		 }
		// display the fields in the correct order
		var extra_classes = "";
		for( var field_idx=0; field_idx<TheVisibleFields.length; field_idx++ ) {
			var field_name = TheVisibleFields[ field_idx ];
			var itemfielddata = "";
			// fill the information inside the current field of the current item
			if( typeof ItemData[field_name] != "undefined" ) {
				itemfielddata = ItemData[field_name].toString();
			}
			var enhanced_itemfielddata;  // itemfielddata with extra information and formating
			var relatedUUIDs  = []; 
			// Enhance field text: substitute item UUIDs with links to these items
			if( field_name.startsWith("Relation") ) {
				relatedUUIDs = itemfielddata.split("\n");
				enhanced_itemfielddata = "";
				for(let j=0; j<relatedUUIDs.length; j++) {
					var an_item_data = getDataBy_UUID( relatedUUIDs[j] );
					if( typeof an_item_data == "undefined" ) { // the related item was not found
						enhanced_itemfielddata += relatedUUIDs[j] + "<br>";
					} else {
						var tmp_str = an_item_data["Type"] + " " + an_item_data["Identifier"] + " - " + an_item_data["Title"];
						enhanced_itemfielddata += "<a href='javascript:Dialog.showItemDataDialog(\"" + relatedUUIDs[j] + "\",true);'>" + tmp_str + "</a>" + "<br>";
					}
				}
			} else {
				enhanced_itemfielddata = itemfielddata.replaceAll("\n","<br>");
			}
			// Enhance field text: substitute reference-titles with reference-links
			if( field_name.localeCompare("Description")==0 || field_name.localeCompare("Additional bibliography")==0 || field_name.localeCompare("Bibliography")==0) {
				for( let ref_idx=0; ref_idx<ReferenceLinks.length; ref_idx++ ) {
					var a_text    = ReferenceLinks[ref_idx]["text"];
					var an_anchor = '<a target="_blank" href="' + ReferenceLinks[ref_idx]["link"] + '">' + a_text + "</a>";
					enhanced_itemfielddata = enhanced_itemfielddata.replaceAll( a_text, an_anchor );
				}
			}
			// Auto-fill some fields when they are empty
			if( field_name.localeCompare("Photographer")==0 ) {
				extra_classes += " LicenseInfo";
				if(enhanced_itemfielddata.trim().length == 0) enhanced_itemfielddata = General_Photographer;
			} else if( field_name.localeCompare("Data Owner")==0 ) {
				extra_classes += " LicenseInfo";
				if(enhanced_itemfielddata.trim().length == 0) enhanced_itemfielddata = General_DataOwner;
			} else if( field_name.localeCompare("Data License")==0 ) {
				extra_classes += " LicenseInfo";
				if(enhanced_itemfielddata.trim().length == 0) enhanced_itemfielddata = General_DataLicense;
			}
			// calculate textbox height according to number of letters (70 letters = 1 line)
			var num_of_textbox_lines = (itemfielddata.match(/\n/g) || []).length + 1;
			if( itemfielddata.length >= 70 && num_of_textbox_lines < 2 ) num_of_textbox_lines = Math.floor(itemfielddata.length/70) + 1; // compensate for large text without new lines
			if( num_of_textbox_lines > 8 ) num_of_textbox_lines = 8; // limit maximum textbox size
			//// construct html and css for the item fields
			s +=   "<div class='"+extra_classes+"' style='grid-column:1;' title='"+Utils.getFieldDescription(field_name)+"'><b>" + Utils.NameToAlias(field_name) + "</b></div>";
			s +=   "<div style='grid-column:2;'>";
			s +=     "<div class='dialog_itemfield"+extra_classes+"' id='" + ItemData["IdentifierUUID"] + "_" + field_name  +  "' onclick=\"UpdateGUI_forFieldAlteration('" + ItemData['IdentifierUUID'] + "', '" + field_name + "');\"";
			if( num_of_textbox_lines > 1 ) s += " style='min-height:" +  (num_of_textbox_lines*18) + "px;' ";
			s +=     ">";
			s +=        enhanced_itemfielddata;
			s +=     "</div>";
			s +=   "</div>";
		}
		
		//// construct html for the automatically calculated Area of the item
		/*
		if( typeof ItemData["Location"] != "undefined"  &&  ItemData["Location"].length >= 3 ) {
			s +=  "<div class='ItemArea_inDialog' style='grid-column:1;'><b>" + "Area (m<sup>2</sup>)" + "</b></div>";
			s +=  "<div class='ItemArea_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + (+Area.CalcArea_of_Polygon(ItemData["Location"]).toFixed(2)) + "</div>" + "</div>";
		}
		*/
		
		//// construct html for the citation link
		var citation_anchor = "";
		citation_anchor += ServerURL+"app_main.html" + "?id="+UUID;
		//citation_anchor += "</a>";
		s +=	"<div class='CitationLink_inDialog' style='grid-column:1;'><b>" + "Citation Link" + "</b></div>";
		s +=	"<div class='CitationLink_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield CitationLink_field'>" + citation_anchor + "</div>" + "</div>";
		
		//// construct html and css for the parent locus of this item
		var parentData = getDataBy_UUID( ItemData["RelationBelongsToUUID"] );
		if( typeof parentData != 'undefined' ) {
			var DisplayTheField = true;
			var VAL = "";
			var sub_heading = "Locus information";
			if( ItemData["Type"].localeCompare("Locus") == 0) sub_heading = "Feature information";
			s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "" + "</b></div>";
			s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "<a class href='javascript:Dialog.showItemDataDialog(\""+parentData["IdentifierUUID"]+"\",true)'> <h2><u>" + sub_heading + "</u></h2></a>" + "</b></div>";
			//
			s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "Identifier" + "</b></div>";
			s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + parentData["Identifier"] + "</div>" + "</div>";
			//
			s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "Title" + "</b></div>";
			s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + parentData["Title"] + "</div>" + "</div>";
			//
			s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "Source" + "</b></div>";
			s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + parentData["Source"] + "</div>" + "</div>";
			//
			if( typeof parentData["Square"] == "undefined" ) VAL = ""; else VAL = parentData["Square"];
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "Square" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
			//
			if( typeof parentData["CoverageTemporal"] == "undefined" ) VAL = ""; else VAL = parentData["CoverageTemporal"];
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "CoverageTemporal" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
			//
			if( typeof parentData["CoverageEarliest"] == "undefined" ) VAL = ""; else VAL = parentData["CoverageEarliest"];
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "CoverageEarliest" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
			//
			if( typeof parentData["CoverageLatest"] == "undefined" ) VAL = ""; else VAL = parentData["CoverageLatest"];
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "CoverageLatest" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
			//
			if( typeof parentData["RelationIsAboveUUID"] == "undefined" ) {
				VAL = ""; 
			} else {
				var UUIDs = parentData["RelationIsAboveUUID"][0].split("\n");
				for(let idx=0; idx<UUIDs.length; idx++) {
					var Item_above = getDataBy_UUID( UUIDs[idx] );
					if( Item_above != null ) {
						var info_of_Item_above = Item_above["Identifier"] + " - " + Item_above["Title"];
						if(idx > 0) VAL += "<br>";
						VAL = "<a href='javascript:Dialog.showItemDataDialog(\"" + parentData["RelationIsAboveUUID"][0] + "\",true)'>" + info_of_Item_above + "</a>";
					}
				}
			}
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "is above of" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
			//
			if( typeof parentData["RelationIsBelowUUID"] == "undefined" ) {
				VAL = ""; 
			} else {
				var UUIDs = parentData["RelationIsBelowUUID"][0].split("\n");
				for(let idx=0; idx<UUIDs.length; idx++) {
					var Item_below = getDataBy_UUID( UUIDs[idx] );
					if( Item_below != null ) {
						var info_of_Item_below = Item_below["Identifier"] + " - " + Item_below["Title"];
						if(idx > 0) VAL += "<br>";
						VAL = "<a href='javascript:Dialog.showItemDataDialog(\"" + parentData["RelationIsBelowUUID"][0] + "\",true)'>" + info_of_Item_below + "</a>";
					}
				}
			}
			DisplayTheField = true;
			if(TheUsername.length==0 || TheUsername.toLowerCase().localeCompare("guest")==0) { // Hide empty fields from the Guest users 
				if( VAL.length == 0 ) DisplayTheField = false;
			}
			if( DisplayTheField ) {
				s +=   "<div class='parentData_inDialog' style='grid-column:1;'><b>" + "is below of" + "</b></div>";
				s +=   "<div class='parentData_inDialog' style='grid-column:2;'>" +  "<div class='dialog_itemfield'>" + VAL + "</div>" + "</div>";		
			}
		}
		
		// Action Buttons - Set Coordinates
		if( TheAccessLevels.toLowerCase().includes(",all,") ) {
			var SetCoordinatesBtn_HoverText = "Set New Coordinates: Allows to draw a polygon and stores 2 layers of different depths. Old coordinates are deleted if exist.";
			try {
				if(ItemData.hasOwnProperty("Location")  && ItemData["Location"].length > Current_Layer  &&  ItemData["Location"][Current_Layer].length > 0) {
					SetCoordinatesBtn_HoverText += "\n\n";
					for (let i=0; i<ItemData["Location"][Current_Layer].length; i++) {
						SetCoordinatesBtn_HoverText += ItemData["Location"][Current_Layer][i]["X"] + " " + ItemData["Location"][Current_Layer][i]["Y"] + " " + ItemData["Location"][Current_Layer][i]["Z"] + "\n";
					}
				}
			} catch(ex) { }
			s += "<div id='ItemInfoDialog_ActionButtons_Label' class='visible-to-admin-only' style='grid-column:1;'><b>Action Buttons</b></div>";
			s += "<div id='ItemInfoDialog_ActionButtons'       style='grid-column:2;'>";
			s += "    <input type='image' class='action_btn' id='SetCoordinates_Btn' title='"+SetCoordinatesBtn_HoverText+"' src='images/system/location.png' onclick='document.getElementById(\"target_button\").style.display=\"inline\"; map.ManualCoordinatesMode=true; map.ItemUUID_forManualCoordinates=\""+ItemData["IdentifierUUID"]+"\"; map.ItemIdentifier_forManualCoordinates=\""+ItemData["Identifier"]+"\"; map.drawWorld(); $(\"#itemInfoDialog\").dialog(\"close\"); map.get_canvas().focus();'>";
			s += "    <input type='image' class='action_btn' id='EditRelations_Btn'  title='"+"Edit the BelongsTo & Includes relations of this item with other items"+"' src='images/system/linkage.png' onclick='Dialog.Display_ItemRelations_Dialog(\""+ItemData["IdentifierUUID"]+"\");'>";
			if( TheAccessLevels.toLowerCase().includes(",admin,") ) {
				s += "<input type='image' class='action_btn' id='showJSON_Btn'  title='"+"Display the JSON data of this item"+"' src='images/system/json.png' onclick='Dialog.Display_ItemJSON_Dialog(\""+ItemData["IdentifierUUID"]+"\");'>";
			}
			s += "</div>";
		}
		
		//// display
		document.getElementById("itemInfoDialog").innerHTML = s; 
	}



	/**
	  * Toggles the Selected field of an item, and updates the GUI
	  * @arg IdentifierUUID (String) the unique id of an item
	  */
	static alterSelectedState( IdentifierUUID ) {
		var ItemData = getDataBy_UUID( IdentifierUUID );
		if ( document.getElementById(IdentifierUUID+"_"+"SelectedCheckbox").checked ) {
			document.getElementById(IdentifierUUID+"_"+"SelectedLabel").style.color = "gold";
			ItemData["Selected"] = true;
			num_of_selected_items++;
			map.HighlightItempOnMap( IdentifierUUID );
			updateInfoBar();
			map.drawWorld();
			updateSelectedItemsOnList();
			Scroll_ItemsList( IdentifierUUID );
			
		} else {
			document.getElementById(IdentifierUUID+"_"+"SelectedLabel").style.color = "black";
			ItemData["Selected"] = false;
			num_of_selected_items--;
			updateInfoBar();
			map.drawWorld();
			updateSelectedItemsOnList();
		}
	}
	
	
	
	
	/**
	 * Displays a dialog which allows the user to add a new item. 
	 * Only the most important fields are proposed to the user. Photos and more information can be added after the creation of the new item.
	 * The field values are combo-boxes (datalists) proposing the already available values.
	 * The 'Identifier' field automatically proposes the next larger number while the user is typing. 
	 * The dialog makes sure that the typed Identifier is unique.
	 */
	static show_NewItem_Dialog() {
		var DialogTitle = "";
		DialogTitle = "New item"; 
		var dialog_obj = $( "#itemInfoDialog" ).dialog(  
			{	height: 360,
				width:  600,
				title:  DialogTitle,
				buttons: [
					{ text: 'Close', id: 'itemInfoDialogCloseBtn', class: 'dialogCloseBtn',
					  click: function () { 
						$("#itemInfoDialog").dialog('close');
					  }
					},
					{ text: 'Save', id: 'iteminfodialogSaveBtn', class: 'dialogSaveBtn',
					  click: function () { 
						document.getElementById("masterContainer").style.cursor = "wait";
						// ensure that the Identifier is unique at the client side
						var new_Identifier = document.getElementById("NEW_Identifier").value;
						if( DoesThisIdentifierExists( new_Identifier ) ) {
							alert("Cannot save changes:\nThe identifier '" + new_Identifier + "' already exists.\nPlease choose a unique one." );
							return; // <<<<<<<<
						}
						// ensure that the parent item exists 						
						var parent_identifier = document.getElementById("NEW_RelationBelongsTo").value.trim();
						if( parent_identifier.length > 0 ) {
							var parent_item = getDataBy_Identifier( parent_identifier );
							if( parent_item == null  ||  typeof parent_item == "undefined" ) {
								alert( "Cannot save changes:\nThe parent item '" + document.getElementById("NEW_RelationBelongsTo").value + "' does not exist." );
								return; // <<<<<<<<
							}
						}
						// ensure that the Identifier is unique at the server side
						$.ajax({                                      
							url: phpURL,
							type: "POST",
							data: { Command: "IdentifierExistsInDB", Arg1: new_Identifier } 
						}).done(function( msg ) {
							if( msg.trim().toLowerCase().localeCompare("true") == 0 ) {
								alert( "Cannot save changes:\nAn item with Identifier '" + new_Identifier + "' already exists in the database." );
							} else {
								// construct a new UUID 
								var newUUID = constructNewUUID(); // this function resides at data.js
								// construct new json item
								var jsonData = {};
								jsonData["IdentifierUUID"] = newUUID;
								jsonData["Identifier"]     = document.getElementById("NEW_Identifier").value;
								jsonData["Trench"]         = document.getElementById("NEW_Trench").value;
								jsonData["Type"]           = document.getElementById("NEW_Type").value;
								jsonData["Category"]       = document.getElementById("NEW_Category").value;
								
								// construct belongs-to relation by saving the relation to the parent item
								// BE AWARE: saving for the parent item is taken care by the server when the new item is saved
								var parent_identifier = document.getElementById("NEW_RelationBelongsTo").value.trim();
								var parent_UUID;
								for (let i = 0; i < ExcData.length; i++) { // Identifier may not be unique, so make sure that it is also a Locus
									if ( ExcData[i]["Identifier"].localeCompare(parent_identifier)==0  &&  ExcData[i]["Type"].localeCompare("Locus")==0 ) {
										parent_UUID = ExcData[i]["IdentifierUUID"];
										break;
									}
								}								
								var parent_item = getDataBy_UUID( parent_UUID ); 
								if( parent_item != null  &&  typeof parent_item != "undefined" ) {
									jsonData[ "RelationBelongsToUUID" ] = [ parent_item["IdentifierUUID"] ];
									if( parent_item.hasOwnProperty("RelationIncludesUUID")==false || typeof parent_item["RelationIncludesUUID"] == "undefined") {
										parent_item["RelationIncludesUUID"] = [ newUUID ];
									} else if( parent_item["RelationIncludesUUID"].includes( newUUID ) == false ) {
										parent_item["RelationIncludesUUID"][0] += "\n"+newUUID;
									}
									if( parent_item["Type"].localeCompare("Locus")==0 ) {  // some fields take automatically their value from the parent item when the parent item is a Locus
										jsonData["Square"] = parent_item["Square"];
										//if( jsonData["Category"].localeCompare("Coin")!=0 ) jsonData["CoverageEarliest"] = parent_item["CoverageEarliest"];
										//if( jsonData["Category"].localeCompare("Coin")!=0 ) jsonData["CoverageLatest"]   = parent_item["CoverageLatest"];
										if( jsonData["Type"].localeCompare("Partition")==0 ) jsonData["Title"] = parent_item["Title"];
									}
								}
								// ********** Save changes to server **********
								SaveItem(jsonData);
							}
							document.getElementById("masterContainer").style.cursor = "pointer";
						});
					  }
					}				
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "black");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		//// scroll to the top
		$("#itemInfoDialog").scrollTop("0"); 
		///// fill dialog contents with data
		var s = ""; 
		// ---------------- images row - begin ---------
		s +=   "<div style='grid-column: 1 / 3; color:darkblue;'> <i>Photos and more information can be added after the creation of the new item.</i> </div>";
		// ---------------- images row - end ----------- 
		
		// ~~~~~~~~~~~~~~~~~ Display the new item's basic fields ~~~~~~~~~~~~~~~~~
		//////// FIELD: Identifier 
		s += "<div style='grid-column:1;' title='The unique inventory number for the object. The application proposes the next number once the letter that corresponds to the type of find is entered: A=architecture, B=bronze, C=coin, G=glass, I=inscription, IL=iron and lead, J=jewelry, L=lamp, O=organic, P=pottery, ST=stone, T=terracotta. There is no space between the letter and the number. Caps matter.'><b>" + "Identifier" + "</b></div>";
		s +=   "<div style='grid-column:2;'>";
		s +=     "<input type='text' class='dialog_itemfield' id='" + "NEW_Identifier" + "'>";
		s +=   "</div>";
		//////// FIELD: Trench
		s += "<div style='grid-column:1;' title='A trench is a collection of items. This feild has to be filled, so that the item can be searched.'><b>" + "Trench" + "</b></div>";
		s +=   "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "NEW_Trench" + "' class='dialog_itemfield' name='" + "NEW_Trench" + "' list='" + "Trench_list" + "'/>";
		s += 	 "<datalist id='" + "Trench_list" + "'>";
		for( let i=0; i<list_of_all_Trenches.length; i++ ) s += "<option value='" + list_of_all_Trenches[i] + "'>" + list_of_all_Trenches[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";
		//////// FIELD: Type
		s += "<div style='grid-column:1;' title='The type of the object. Start typing or double click to display the existing types.'><b>" + "Type" + "</b></div>";
		s +=   "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "NEW_Type" + "' class='dialog_itemfield' name='" + "NEW_Type" + "' list='" + "Type_list" + "'/>";
		s += 	 "<datalist id='" + "Type_list" + "'>";
		for( let i=0; i<list_of_all_Types.length; i++ ) s += "<option value='" + list_of_all_Types[i] + "'>" + list_of_all_Types[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";
		//////// FIELD: Category
		s += "<div style='grid-column:1;' title='A Category describes an item more specifically than its Type'><b>" + "Category" + "</b></div>";
		s +=   "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "NEW_Category" + "' class='dialog_itemfield' name='" + "NEW_Category" + "' list='" + "Category_list" + "'/>";
		s += 	 "<datalist id='" + "Category_list" + "'>";
		for( let i=0; i<list_of_all_Categories.length; i++ ) s += "<option value='" + list_of_all_Categories[i] + "'>" + list_of_all_Categories[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";
		//////// FIELD: RelationBelongsTo
		s += "<div style='grid-column:1;' title='The locus in which the object was found. Start typing or double click to display the existing loci.'><b>" + "RelationBelongsTo" + "</b></div>";
		s +=   "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "NEW_RelationBelongsTo" + "' class='dialog_itemfield' name='" + "NEW_RelationBelongsTo" + "' list='" + "Loci_list" + "'/>";
		s += 	 "<datalist id='" + "Loci_list" + "'>";
		for( let i=0; i<list_of_all_Loci.length; i++ ) s += "<option value='" + list_of_all_Loci[i] + "'>" + list_of_all_Loci[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";		
		////
		document.getElementById("itemInfoDialog").innerHTML = s; 
		document.getElementById("NEW_Identifier").focus();
		// add event listener at the NEW_Identifier field, to propose the next larger number 
		document.getElementById("NEW_Identifier").addEventListener('keyup',this.IdentifierTextbox_ChangeHandler,false);
	}
	
	
	
	/*
	 * Handles the 'Identifier' text-box at the NewItem_Dialog.
	 * The app automatically proposes: 
	 *    - the next larger number while the user is typing. 
	 *    - the item Category based on the 1st letter of the Identifier 
	 */
	static IdentifierTextbox_ChangeHandler(e) {
		var UserTyped_box = document.getElementById("NEW_Identifier");
		var UserTyped_txt = UserTyped_box.value;
		if( UserTyped_txt.length == 0 || e.key == "Backspace" || e.key == "Delete") return; // backspace and delete
		// calculate the max number among all items starting from the typed characters
		var max = -1;
		var n = -1;
		for (let i = 0; i < ExcData.length; i++) { 
			if (ExcData[i].hasOwnProperty("Identifier")) {
				if( ExcData[i]["Identifier"].startsWith( UserTyped_txt ) ) {
					var tmp = ExcData[i]["Identifier"].substr(UserTyped_txt.length);
					if( Utils.ContainsInteger( tmp ) ) {
						n = parseInt( tmp );
						if (n > max) { max = n; }
					}
				}
			}
		}
		// propose the max number to the user
		if( max >= 0  &&  Utils.ContainsInteger(UserTyped_txt.charAt(UserTyped_txt.length-1))==false  ) {
			var auto_text = (max+1).toString();
			UserTyped_box.value = UserTyped_box.value + auto_text;
			UserTyped_box.focus();
			UserTyped_box.setSelectionRange(UserTyped_box.value.length-auto_text.length, UserTyped_box.value.length);
		}
		
		// ----------- Propose an item Category based on the 1st letter of the Identifier 
		var first_letter = UserTyped_txt.charAt(0).toUpperCase();
		var second_letter = UserTyped_txt.charAt(1).toUpperCase();
		var category_txt = "";
		if ( first_letter === 'A' ) {
            category_txt = "Architecture";
        } else if ( first_letter === 'B') {
            category_txt = "Bronze";
        } else if ( first_letter === 'C' ) {
            category_txt = "Coin";
        } else if ( first_letter === 'G' ) {
            category_txt = "Glass";
        } else if ( first_letter === 'I' ) {
            if ( second_letter === 'L' ) {
                category_txt = "Iron and Lead";
            } else {
                category_txt = "Inscription";
			}
        } else if ( first_letter === 'J' ) {
            category_txt = "Jewelery";
        } else if ( first_letter === 'L' ) {
            category_txt = "Lamp";
        } else if ( first_letter === 'O' ) {
            category_txt = "Organic";
        } else if ( first_letter === 'P' ) {
            category_txt = "Pottery";
        } else if ( first_letter === 'S' ) {
            category_txt = "Stove";
        } else if ( first_letter === 'T' ) {
            category_txt = "Terracotta";
		}
		if( category_txt.length > 0 ) {
			document.getElementById("NEW_Category").value = category_txt;
		}
	}




	/**
	 * Displays a dialog with information about the Permissions of usage of the data presented in the app.
	 */
	static Display_Permissions_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 600, width:  460, title:  "Permissions",
				buttons: [ { text: 'Close', id: 'aboutdialogCloseBtn', class: 'dialogCloseBtn',
								click: function () {  $("#MessageDialog").dialog('close'); }
						   } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "teal");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		// create dialog content
		var s = "";
		if( ExcavationPreferences.hasOwnProperty("Permissions_html") && ExcavationPreferences["Permissions_html"].length>0) {
			s = ExcavationPreferences["Permissions_html"];
		} else {
			s += "<h2>Permissions</h2>";
			s += "<p>For permission to use the images in this database, contact the <a href='https://archaeologicalmuseums.gr/en/museum/5df34af3deca5e2d79e8c147/archaeological-museum-of-komotini'>Komotini Archaeological Museum</a>:</p>";
			s += "<p>";
			s += "Address: 4 A. Symeonidi Str., Komotini 69132<br>";
			s += "Telephone: (+30) 2531022411<br>";
			s += "E-mail: <a href='mailto:nta@princeton.edu'>efarod@culture.gr</a>";
			s += "</p>";
			s += "<p>Artifact photography: ©Ephorate of Antiquities of Rhodope, Ministry of Culture of the Hellenic Republic<br><br>Illustrations: Christina Kolb</p>";
		}
		document.getElementById("MessageDialogContent").innerHTML = s; 
		document.getElementById("MessageDialog").style.backgroundColor = "honeydew"; 
	}


	/**
	 * Displays a dialog after the user clicks on the export-data menu. It lets the user choose the export format.
	 */
	static ShowExportPreferencesDialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 380, width:  340, title:  "Export Data",
				buttons: [ { text: 'Cancel', id: 'aboutdialogCloseBtn', class: 'dialogCloseBtn',
								click: function () { $("#MessageDialog").dialog('close'); }
						   } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "teal");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		// create dialog content
		var s = "";
		if( num_of_selected_items == 0 ) {
			s += "<h2>Export data of all items</h2>";
		} else {
			s += "<h3>Export data of " + num_of_selected_items + " selected items</h3>";
		}
		s += "<p>Choose the format of the exported file:</p>";
		s += "<p><button id='export_csv_button' 	class='exportFormatBtn' onclick='$(\"#MessageDialog\").dialog(\"close\");ExportData_CSV();'>Tab delimeted CSV</button></p>";
		s += "<p><button id='export_msword_button'  class='exportFormatBtn' onclick='$(\"#MessageDialog\").dialog(\"close\");ExportData_MSWORD();'>MS-Word</button></p>";
		document.getElementById("MessageDialogContent").innerHTML = s; 
		document.getElementById("MessageDialog").style.backgroundColor = "lightseagreen"; 
	}

	/**
	 * Displays a dialog with information about the application and the people involved in the project.
	 */
	static DisplayAboutDialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 600, width:  460, title:  "About",
				buttons: [ { text: 'Close', id: 'aboutdialogCloseBtn', class: 'dialogCloseBtn',
								click: function () {  $("#MessageDialog").dialog('close'); }
						   } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "teal");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		// create dialog content
		var s = "";
		s += "<h2>WebDig</h2>";
		s += "<p>WebDig is an online web application which facilitates the processing and publication of archaelogical excavation data.";
		s += "The software can list and sort the archaeological finds, their loci, and associated information.";
		s += "<p>The data is the result of the on-site work of the archaeologists with the help of the <a href='https://idig.tips/'>iDig application</a> for iPads and of the after-excavation processing.</p>";
		s += "<h3>Contributors</h3>";
		s += "<p><a href='mailto:nta@princeton.edu'><b>Nathan T. Arrington</b></a><br>"; // ---------------
		s += "Associate Professor of Classical Archaeology<br>";
		s += "Princeton University<br>Department of Art and Archaeology<br>Green Hall 2N9<br>Princeton, NJ 08544<br>phone: (609) 258-1322<br>fax: (609) 258-0103<p>";
		s += "<p><a href='mailto:mtasaklaki@yahoo.gr'><b>Marina Tasaklaki</b></a><br>"; // ---------------
		s += "Archaeologist, Numismatist<br>Ephorate of Antiquities of Rhodope, Greece";
		s += "<p><a href='mailto:b.dimitris@gmail.com'><b>Dimitris Baloukidis</b></a><br>Software Developer</p>";
		s += "<br><h3>Software Libraries used</h3>";
		s += "<p>";
		s += "<a href='https://jquery.com/'>jQuery library</a><br>";
		s += "<a href='https://github.com/nodeca/pako'>Pako compression library</a><br>";
		s += "<a href='http://www-cs-students.stanford.edu/~tjw/jsbn/'>Jsbn encryption library</a><br>";
		//s += "<a href='https://github.com/dolanmiu/docx'>Docx word document generation library</a><br>";
		//s += "<a href='https://github.com/eligrey/FileSaver.js/'>FileSaver document saving library</a><br>";
		s += "<a href='https://plotly.com/javascript/'>Plotly graphing library</a><br>";
		s += "<a href='https://github.com/PHPOffice/PHPWord'>PHPWord MS-Word document generation library</a><br>";
		s += "<a href='https://github.com/codeshackio/multi-select-dropdown-js'>multiselect-dropdown</a><br>";
		s += "</p>";
		s += "<br><h3>License</h3>";
		s += "<p>To be defined.</p>";
		if( ExcavationPreferences.hasOwnProperty("About_html") && ExcavationPreferences["About_html"].length>0) {
			s += "<br>" + ExcavationPreferences["About_html"];
		}
		document.getElementById("MessageDialogContent").innerHTML = s; 
		document.getElementById("MessageDialog").style.backgroundColor = "honeydew"; 
	}
	
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToOverview_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "Overview",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>Overview</h3>";
		s += "<p>WebDig is an on-line web application that presents the data from the Molyvoti, Thrace, Archaeological Project (MTAP), a co-operation between the Ephorate of Antiquities of Rhodopi and Princeton University / the American School of Classical Studies at Athens. The application aims to disseminate information about the project; to share findings; and to allow scholars, students, and the broader public to engage in contextualized archaeological research. Excavation and survey took place 2013–15, 2019, and 2022–23. The project directors are Nathan Arrington (Princeton University), Domna Terzopoulou (Ephorate of Antiquities of Alexandroupolis), and Marina Tasaklaki (Ephorate of Antiquities of Rhodopi). Further information about the project, the research, and the publications can be found at <a href='https://scholar.princeton.edu/mtap'>https://scholar.princeton.edu/mtap</a>.</p>";
		s += "<h4>General</h4>";
		s += "<p>The areas of the archaeological site are organized into 'trenches.' On opening the application, the House of Hermes appears. To select a different area, select a different 'trench' at top left. A list of all archaeological finds within the trench can be found at the left side. To search across trenches, select multiple trenches. Clicking on a listed item displays a box which offers more information about the item. Above the list, there is a quick search tool next to magnifying glass, where users can type information or use a drop-down menu to browse. The three-dots menu at the bottom left offers several ways to interact with items, including an advanced search tool. The bar at the top of the screen offers various tools to interact with the map, as well as the user-specific options and the help menu.</p>";
		s += "<h4>Map</h4>";
		s += "<p>The items listed at the left are affected by the search terms. Clicking on an item provides more information on it. In addition, an item can be selected by Ctrl+click (PC) or Cmnd+click (Mac) or by using the three-dot menu. When selected, an item is highlighted yellow and appears on the map. By default, the application displays only the selected items on the map. This option can be altered from the three-dots menu, so that all listed items are displayed. The knife tool displays a dialog with the cross section of the selected items and the measuring tape tool displays distances of the selected items.</p>";
		s += "<br><p><a href='video/HowTo_Overview.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToChangePassword_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to Change Password",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to Change Password</h3>";
		s += "<p><ul><li>Click at your username on the upper right corner.</li><li>Select 'Settings'.</li><li>Type your current password and the new password.</li><li>Click the 'Save Changes' button.</li></ul></p>";
		s += "<br><p><a href=''>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}

	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToSearch_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to Search for an item",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to Search for an item</h3>";
		s += "<p>The search tools are located at the top left of the screen. The items list on the left will contain the search results. The search results can also be rendered on the map if the corresponding setting from the three-dots menu is enabled.</p>";
		s += "<p>Clicking on the small triangle displays all available item types and sub-types. Selecting one of them will fill the items list only with items of the respected type. The types are displayed in bold and the sub-types in normal letters. Usually different types are denoted with different color.</p>";
		s += "<p>You can search for a specific text by typing in the text box and hitting the enter key. The items list will show only those items which contain the search term in their title, description or identification number. Below the items-list you can see how many items are listed out of total.</p>";
		s += "<p>Clicking on the magnifying glass at the right of the text box pops a dialog window which supports a more advanced searching scheme, based on specific data fields. Different search criteria can be typed for each of the fields. Only the items which fulfill all the criteria will be displayed in the items list. Also, the asterisk can be used as a wildcard to be substituted for any other character. For example B3* will display all items whose identifier starts from B3.</p>";
		s += "<br><p><a href='video/HowTo_Search.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToSort_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to sort items in list",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to sort the items in the list</h3>";
		s += "<p><ul><li>Click on the three-dots menu button.</li><li>Select the 'Sort items' option.</li><li>Choose the desired order of the sorting criteria by dragging and dropping the tabs. The top-most will be the first and most important one.</li><li>Press the OK button.</li></ul></p>";
		s += "<p>If for example the two top-most tabs are 'Category' and 'Title' then all items will be sorted by Category and those belonging to the same Category will be sorted by Title.</p>";
		s += "<br><p><a href='video/HowTo_Sort.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToItemInfo_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to view and edit item information",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to view and edit item information</h3>";
		s += "<p>When an item is clicked at the items-list on the left then a dialog window appears containing data about the clicked item.</p>";
		s += "<p>The images related to the item are positioned at the top of the dialog window. Clicking on a thumbnail image will open its real size counterpart on a new tab. In case the image is associated with annotations then they will be displayed, as well. The image can be previewed with or without the annotations and zoomed to the desired size.</p>";
		s += "<p>Below the item photos there is a check box. Clicking it can select and deselect the item.</p>";
		s += "<p>The dialog contains several fields with information about the item. Every item  provides a Citation Link which gives direct access to the item's information and can be used for citation purposes.If the item belongs to a locus then a few information about the locus is also displayed.</p>";
		s += "<p>Some fields contain links, which lead to related items.  Privileged users can define custom links by using the 'Reference Links' at the three-dots menu.  The tool matches a text with a link and whenever that text appears in some item's data, then it is replaced by the link.</p>";
		s += "<p>Privileged users can also edit the item data by clicking on each field, upload photographs of the item by clicking on the button with the plus sign and remove photographs by clicking on the X button at the top left of the photograph. Be careful! The Save button must be pressed for the changes to be saved on the server. </p>";
		s += "<p>The dialog offers Previous and Next buttons which allow navigation back and forth in the history of visited items.</p>";
		s += "<br><p><a href='video/HowTo_ItemInfo.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}

	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToSelect_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to select items",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<p>Selecting items is useful for applying on them and only them certain actions, like making them visible or displaying their cross sections. The selection can be performed on the item list, on the item information dialog or on the map. Be sure to select the desirable option from the three-dots menu button in order to display on the map the listed or the selected items.</p>";
		s += "<h3>How to select items on the list</h3>";
		s += "<p>You can select and deselect items from the items-list on the left. Just click on an item while the Ctrl button is pressed. Also the first field of the item-information dialog allows you to select or deselct the item. The selected items will be highlighted with yellow color both on the list and on the map. Below the list you can see how many items are currently selected. </p>";
		s += "<h3>How to select items on the map</h3>";
		s += "<p>The tools above the map give several options for selecting items on the map.</p>";
		s += "<h4>The Rectangle Tool &nbsp;&nbsp; <img src='images/system/rectangle_tool.png'></h4> <p>Click and Drag on the map to define a rectangular selection area.</p>";
		s += "<h4>The Polygon Tool &nbsp;&nbsp; <img src='images/system/polygon_tool.png'></h4>   <p>Click several times on the map to define a polygonal selection area. Double click to close the polygon.</p>";
		s += "<h4>The Pencil  Tool &nbsp;&nbsp; <img src='images/system/pencil_tool.png'></h4>   <p>Click and Drag on the map to select all items along the mouse path. Up and Down keys can modify the pencil's width</p>";
		s += "<h4>Add or subtract to the selection</h4><p>All selection tools have also their addition and subtraction version denoted with plus or minus respectively. The former adds to the current selection and the latter removes from the current selection.</p>";
		s += "<br><p><a href='video/HowTo_Select.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToNavigateMap_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to zoom and move the map",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to zoom and move the map &nbsp;&nbsp; <img src='images/system/zoom_tool.png'> <img src='images/system/move_tool.png'></h3>";
		s += "<p>The zoom and move tools, located on the top, allow to position the map at will:";
		s += "<ul><li><b>Zoom-in:</b> Select the tool with the magnifying glass and the plus sign and click on the map. Ctrl+click zooms in larger steps.</li>";
		s += "<li><b>Zoom-out:</b> Select the tool with the magnifying glass and the minus sign and click on the map. Ctrl+click zooms in larger steps.</li>";
		s += "<li><b>Move the map:</b> Select the tool with the hand and click and drag the map. Arrows and Ctrl+Arrows can move the map, as well.</li></ul>";		
		s += "</p> <p>Zooming can be achieved by scrolling with the middle mouse button, as well. <br> If the map is double-clicked when the hand tool is selected then zooming and position is reset so that the whole map is visible.</p>";
		s += "<br><p><a href='video/HowTo_NavigateMap.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	/**
	 * Displays a how-to dialog 
	 */
	static Display_HowToCrossSections_Dialog() {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 555, width:  620, title:  "How to view Cross Sections",
				buttons: [ { text: 'Close', id: 'howtodialogCloseBtn', class: 'dialogCloseBtn', click: function () {  $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "brown"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		var s = "";
		s += "<h3>How to view Cross Sections &nbsp;&nbsp; <img src='images/system/crosssection_tool.png'></h3>";
		s += "<p>A cross section is a vertical slice of the archaelogical site revealing its layers.</p><p>In order to view a cross section you have to select the items you are interested in, select the Knife tool and draw a slice on the map. A dialog-window will display the layers which exist below the slice.</p>";
		s += "<p>The dialog allows you to select the aspect ratio of the figure. When the physical aspect ratio is selected then one meter on the vertical axis will occupy the same space as on meter on the horizontal axis. When the data fit aspect ratio is selected then the shapes will be scaled vertically so that they fill the whole space in the figure.</p>";
		s += "<p>You can also choose to display a 3D representation of the selected items.Please, have in mind that the 3D calculation may take some time in case you have selected a lot of items.</p>";
		s += "<p>The Knife tool can also be used to measure straight distances on the map. The measuring tape tool enables and disables the preview of distances on the map.</p>";
		s += "<br><p><a href='video/HowTo_CrossSections.mp4' target='_blank'>Click here to watch an explanatory video.</a></p>";
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "seashell"; 
	}
	
	
	
	
	
	
	
	
	/**
	 * Displays a dialog with a table of the data alterations made by the users and allows filtering them.
	 */
	static Display_TrackChanges_Dialog( csv_data ) {
		var dialog_obj = $( "#MessageDialog" ).dialog( 
			{	height: 640, width:  1200, title:  "Data Changes",
				buttons: [ { text: 'Close', id: 'trackchangesdialogCloseBtn', class: 'dialogCloseBtn', click: function () { global_tmp_data=""; $("#MessageDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			}
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "goldenrod"); dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		global_tmp_data = csv_data;
		var s = "";
		// HTML for the Filters-Form
		s += "<div id='wrap-filters-collapsible'>";
		s +=   "<input id='filters-collapsible' class='toggle' type='checkbox'>";
		s +=   "<label for='filters-collapsible' class='lbl-toggle'>Filters</label>";
		s +=   "<div id='filters-collapsible-content'>";
		s +=     "<div id='filters-content-inner'>";
		s +=       "<div style='grid-column:1;'><b>" + "Date From:" + "</b></div>";
		s +=       "<div style='grid-column:2;'><input type='date' class='filter_field' id='" + "trackchanges_filter_datefrom" + "'></div>";
		s +=       "<div style='grid-column:4;'><b>" + "Item Id:" + "</b></div>";
		s +=       "<div style='grid-column:5;'><input type='text' class='filter_field' id='" + "trackchanges_filter_identifier" + "'></div>";
		s +=       "<div style='grid-column:1;'><b>" + "Date To:" + "</b></div>";
		s +=       "<div style='grid-column:2;'><input type='date' class='filter_field' id='" + "trackchanges_filter_dateto" + "'></div>";
		s +=       "<div style='grid-column:4;'><b>" + "Item title:" + "</b></div>";
		s +=       "<div style='grid-column:5;'><input type='text' class='filter_field' id='" + "trackchanges_filter_title" + "'></div>";
		s +=       "<div style='grid-column:1;'><b>" + "Username:" + "</b></div>";
		s +=       "<div style='grid-column:2;'><input type='text' class='filter_field' id='" + "trackchanges_filter_username" + "'></div>";
		s +=       "<div style='grid-column:4;'><b>" + "Item type:" + "</b></div>";
		s +=       "<div style='grid-column:5;'><input type='text' class='filter_field' id='" + "trackchanges_filter_type" + "'></div>";
		s +=       "<div style='grid-column:4;'><b>" + "Alteration:" + "</b></div>";
		s +=       "<div style='grid-column:5;'><input type='text' class='filter_field' id='" + "trackchanges_filter_alteration" + "'></div>";
		s +=       "<div style='grid-column:7;'><button id='apply_filter_btn' onclick='document.getElementById(\"datachanges_table_div\").innerHTML=Dialog.constructHTML_for_DataChangesTable(global_tmp_data, document.getElementById(\"trackchanges_filter_datefrom\").value, document.getElementById(\"trackchanges_filter_dateto\").value, document.getElementById(\"trackchanges_filter_username\").value, document.getElementById(\"trackchanges_filter_identifier\").value, document.getElementById(\"trackchanges_filter_title\").value, document.getElementById(\"trackchanges_filter_type\").value, document.getElementById(\"trackchanges_filter_alteration\").value );'>Apply Filters</button></div>";
		s +=     "</div>";
		s +=   "</div>";
		s += "</div>";
		// CSS for the Filters-Form
		s += "<style>";
		s += "#filters-collapsible { display: none; }";
		s += ".lbl-toggle { display:block; font-weight:bold; text-align:left; padding:12px; margin:4px -2px 10px 4px; color:white; background:brown; cursor:pointer; border-radius:7px; transition:all 0.25s ease-in-out; } ";
		s += ".lbl-toggle:hover { background:chocolate; } ";
		s += ".lbl-toggle::before { content: ''; display:inline-block; transform: translateY(-2px); transition: transform .25s ease-in-out; } ";
		s += ".toggle:checked+.lbl-toggle::before { transform: rotate(90deg) translateX(-3px); }";
		s += "#filters-collapsible-content { max-height:0px; overflow:hidden; transition:max-height .25s ease-in-out; } ";
		s += ".toggle:checked + .lbl-toggle + #filters-collapsible-content { max-height: 350px; border:2px solid brown; padding:12px; margin:-9px -2px 4px 4px;}";
		s += ".toggle:checked+.lbl-toggle { border-bottom-right-radius: 0; border-bottom-left-radius: 0; } ";
		s += "#filters-collapsible-content #content-inner { background: rgba(0, 105, 255, .2); border-bottom: 1px solid rgba(0, 105, 255, .45); border-bottom-left-radius: 7px; border-bottom-right-radius: 7px; padding: .5rem 1rem; } ";
		s += ".filter_field{color=brown; background:transparent; width:100%; border: 1px solid brown; border-radius: 8px; padding: 5px; min-height:18px; max-height:20px; overflow-y:auto;}";
		s += "#apply_filter_btn{background-color:brown; color:white; cursor:pointer; padding:6px; border:3px solid brown; border-radius:10px;}";
		s += "#apply_filter_btn:hover{background-color:chocolate;}";
		s += "#filters-content-inner{color:brown; display:grid; grid-template-columns: 90px 200px 55px 84px 200px 45px 200px; gap:4px;}";
		s += "</style>";
		// HTML & CSS for the Data-Changes-Table
		s += "<div id='datachanges_table_div'>";
		s += this.constructHTML_for_DataChangesTable( csv_data );
		s += "</div>";
		// show it
		document.getElementById("MessageDialogContent").innerHTML = s;  document.getElementById("MessageDialog").style.backgroundColor = "gold"; 
	}
	
	
	/**
	  * Constructs html and css for the table which displays the data changes according to the csv file received by the server
	  */
	static constructHTML_for_DataChangesTable( csv_data, DateFrom="", DateTo="", Username="", ItemId="", ItemTitle="", ItemType="", Alteration="" ) {
		var s = "";
		s += "<table id='track_changes_table'>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 0, \"ascending\")'>Date (UTC)</TH>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 1, \"ascending\")'>User</TH>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 2, \"ascending\")'>Item Id</TH>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 3, \"ascending\")'>Item Title</TH>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 4, \"ascending\")'>Item Type</TH>";
		s += "<TH onclick='Utils.SortTable(\"track_changes_table\", 5, \"ascending\")'>Alteration</TH>";
		var Lines = csv_data.split("\n");
		for( var i=Lines.length-1; i>=0; i-- ) { // parse the csv data
			if( Lines[i].trim().length > 3 ) { 
				// resolve record's information
				var Fields = Lines[i].split("\t");
				var ItemUUID = Fields[2].trim();
				var ItemData = getDataBy_UUID( ItemUUID );
				var Record_Date       = Fields[0];
				var Record_Username   = Fields[1];
				var Record_ItemId     = ItemUUID;
				var Record_ItemTitle  = "";
				var Record_ItemType   = "";
				var Record_Alteration = Fields[3];
				if(typeof ItemData != "undefined") {
					if(typeof ItemData["Identifier"] != "undefined") Record_ItemId    = ItemData["Identifier"];
					if(typeof ItemData["Title"]      != "undefined") Record_ItemTitle = ItemData["Title"];
					if(typeof ItemData["Type"]       != "undefined") Record_ItemType += ItemData["Type"];
					if(typeof ItemData["Category"]   != "undefined") {
						if( Record_ItemType.length > 0 ) Record_ItemType += " - ";
						Record_ItemType += ItemData["Category"];
					}
				}
				// check if the record fulfills the filters criteria
				var include_record_in_table = true;
				if(DateFrom.length>0) {
					var ISO_Record_Date = Record_Date.substring(6,10) + "-" + Record_Date.substring(3,5) + "-" + Record_Date.substring(0,2);
					if(Date.parse(ISO_Record_Date) < Date.parse(DateFrom)) include_record_in_table = false;
				}
				if(DateTo.length>0) {
					var ISO_Record_Date = Record_Date.substring(6,10) + "-" + Record_Date.substring(3,5) + "-" + Record_Date.substring(0,2);
					if(Date.parse(ISO_Record_Date) > Date.parse(DateTo)) include_record_in_table = false;
				}
				if(Username.length>0 && Record_Username.toLowerCase().localeCompare(Username.toLowerCase())!=0) {include_record_in_table=false;}
				if(ItemId.length>0 && Record_ItemId.toLowerCase().startsWith(ItemId.toLowerCase())==false) {include_record_in_table=false;}
				if(ItemTitle.length>0 && Record_ItemTitle.toLowerCase().indexOf(ItemTitle.toLowerCase())<0) {include_record_in_table=false;}
				if(ItemType.length>0 && Record_ItemType.toLowerCase().indexOf(ItemType.toLowerCase())<0) {include_record_in_table=false;}
				if(Alteration.length>0 && Record_Alteration.toLowerCase().indexOf(Alteration.toLowerCase())<0) {include_record_in_table=false;}
				// construct html
				if( include_record_in_table ) {
					s += "<TR>";
					s += "<TD>" + Record_Date       + "</TD>";
					s += "<TD>" + Record_Username   + "</TD>";
					s += "<TD>" + Record_ItemId     + "</TD>";
					s += "<TD>" + Record_ItemTitle  + "</TD>";
					s += "<TD>" + Record_ItemType   + "</TD>";
					s += "<TD>" + Record_Alteration + "</TD>";
					s += "</TR>";
				}
			}
		}
		s += "</table>";
		// CSS
		s += "<style>";
		s += "#track_changes_table {border-spacing:0; width:100%; border:1px solid darkgray; margin:4px; margin-right:12px; font-size:90%;}";
		s += "th, td { text-align: left; padding: 12px; }";
		s += "th { cursor: pointer; }";
		s += "tr:nth-child(even) {background-color: Whitesmoke}";
		s += "tr:nth-child(odd)  {background-color: #E0E0E0}";
		s += "tr:first-child     {background-color: Silver}";
		s += "</style>";
		return s;
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	/**
	 * Displays a dialog to the user, which allows him to search items by typing criteria for several fields simultaneously. The wildcard * is supported.
	 * The items which correspond to the criteria (and only them) will be displayed in the item-list.
	 */
	static ShowAdvancedSearchDialog() {
		$( "#AdvancedSearchDialog" ).dialog(  
			{	height: 600,
				width:  720,
				title:  "Advanced Search",
				buttons: [
					{ text: 'Search', id: 'searchdialogSaveBtn', class: 'dialogSaveBtn', 
					  click: function () { 
						document.getElementById("masterContainer").style.cursor = "wait";
						var IdentifierCriterion_value	 		= document.getElementById("IdentifierCriterion").value.trim();
						var TitleCriterion_value				= document.getElementById("TitleCriterion").value.trim();
						var SourceCriterion_value	 			= document.getElementById("SourceCriterion").value.trim();
						var ArtifactDateCriterion_value 		= document.getElementById("ArtifactDateCriterion").value.trim();
						var SquareCriterion_value	 			= document.getElementById("SquareCriterion").value.trim();
						var DescriptionCriterion_value	 		= document.getElementById("DescriptionCriterion").value.trim();
						var IssueAuthorityCriterion_value		= document.getElementById("IssueAuthorityCriterion").value.trim();
						var CoverageTemporalCriterion_value 	= document.getElementById("CoverageTemporalCriterion").value.trim();
						// remember what the user has typed
						Autofill["IdentifierCriterion"]   		= IdentifierCriterion_value;
						Autofill["TitleCriterion"]        		= TitleCriterion_value;
						Autofill["SourceCriterion"]        		= SourceCriterion_value;
						Autofill["ArtifactDateCriterion"] 		= ArtifactDateCriterion_value;
						Autofill["SquareCriterion"]   			= SquareCriterion_value;
						Autofill["DescriptionCriterion"]  		= DescriptionCriterion_value;
						Autofill["IssueAuthorityCriterion"]  	= IssueAuthorityCriterion_value;
						Autofill["CoverageTemporalCriterion"]  	= CoverageTemporalCriterion_value;
						//
						PopulateItemsList_AccordingTo_AdvancedSearchCriteria();
						//
						updateInfoBar();
						map.drawWorld();
						updateSelectedItemsOnList();
						document.getElementById("masterContainer").style.cursor = "pointer";
						$( "#AdvancedSearchDialog" ).dialog('close');
					  }
					},
					{ text: 'Close', id: 'searchdialogCloseBtn', class: 'dialogCloseBtn',
					  click: function () { 
						$("#AdvancedSearchDialog").dialog('close');
					  }
					}
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		).prev(".ui-dialog-titlebar").css("background","lightseagreen");
		// create instructions for the user
		document.getElementById("AdvancedSearchInstructions").innerHTML = "<p><u>Instructions:</u><br>You can type different search criteria for each of the above fields.<br>Only items which fulfill all the criteria will be displayed in the list on the left.</p><p>The asterisk character (*) can be used as a wildcard.<br>For example, B3* will display all items which start from B3.</p><p>The pipeline character (|) can be used to search for multiple criteria for a field.<br>For example, 001|B3* will display all items which contain 001 or start from B3.</p>"; 
		// create dialog content
		var s = "";
		//////// Identifier Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label' title='The unique inventory number for an object. It starts from a letter denoting the type of find: A=architecture, B=bronze, C=coin, G=glass, I=inscription, IL=iron and lead, J=jewelry, L=lamp, O=organic, P=pottery, ST=stone, T=terracotta. There is no space between the letter and the number. Caps matter.'>" + "<b>Identifier:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='IdentifierCriterion' class='AdvancedSearch_Text'>" + "</div>";
		//////// Title Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label' title='The brief name or description of an object.'>" + "<b>Title:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='TitleCriterion' class='AdvancedSearch_Text'>" + "</div>";
		//////// Source Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label'>" + "<b>Source:</b>" + "</div>";
		s += "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "SourceCriterion" + "' class='AdvancedSearch_Text' name='" + "SourceCriterion" + "' list='" + "Sources_list" + "'/>";
		s += 	 "<datalist id='" + "Sources_list" + "'>";
		for( let i=0; i<list_of_all_Sources.length; i++ ) s += "<option value='" + list_of_all_Sources[i] + "'>" + list_of_all_Sources[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";
		//////// ArtifactDate Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label' title='The date of an object, as it would appear in a catalogue entry.'>" + "<b>ArtifactDate:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='ArtifactDateCriterion' class='AdvancedSearch_Text'>" + "</div>";
		//////// Square Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label'>" + "<b>Square:</b>" + "</div>";
		s += "<div style='grid-column:2;'>";
		s += 	 "<input type='text' id='" + "SquareCriterion" + "' class='AdvancedSearch_Text' name='" + "SquareCriterion" + "' list='" + "Squares_list" + "'/>";
		s += 	 "<datalist id='" + "Squares_list" + "'>";
		for( let i=0; i<list_of_all_Squares.length; i++ ) s += "<option value='" + list_of_all_Squares[i] + "'>" + list_of_all_Squares[i] + "</option>";
		s +=     "</datalist>";
		s += "</div>";
		//////// Description Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label' title='The description of an object. It usually includes the state of preservation.'>" + "<b>Description:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='DescriptionCriterion' class='AdvancedSearch_Text'>" + "</div>";
		//////// IssueAuthority Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label' title='The Issue Authority of an object. Usually a city or other entity.'>" + "<b>Issue Authority:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='IssueAuthorityCriterion' class='AdvancedSearch_Text'>" + "</div>";
		//////// CoverageTemporal Criterion
		s += "<div style='grid-column:1;' class='AdvancedSearch_Label'>" + "<b>Coverage Temporal:</b>" + "</div>";
		s += "<div style='grid-column:2;' >"  + "<input type='text' id='CoverageTemporalCriterion' class='AdvancedSearch_Text'>" + "</div>";
		document.getElementById("AdvancedSearchContent").innerHTML = s;
		// auto-fill with previously entered values
		if("IdentifierCriterion" in Autofill) 		document.getElementById("IdentifierCriterion").value   		= Autofill["IdentifierCriterion"];
		if("TitleCriterion" in Autofill) 			document.getElementById("TitleCriterion").value        		= Autofill["TitleCriterion"];
		if("SourceCriterion" in Autofill) 			document.getElementById("SourceCriterion").value        	= Autofill["SourceCriterion"];
		if("ArtifactDateCriterion" in Autofill) 	document.getElementById("ArtifactDateCriterion").value 		= Autofill["ArtifactDateCriterion"];
		if("SquareCriterion" in Autofill) 			document.getElementById("SquareCriterion").value 			= Autofill["SquareCriterion"];
		if("DescriptionCriterion" in Autofill) 		document.getElementById("DescriptionCriterion").value  		= Autofill["DescriptionCriterion"];
		if("IssueAuthorityCriterion" in Autofill) 	document.getElementById("IssueAuthorityCriterion").value  	= Autofill["IssueAuthorityCriterion"];
		if("CoverageTemporalCriterion" in Autofill) document.getElementById("CoverageTemporalCriterion").value  = Autofill["CoverageTemporalCriterion"];
		// add event listeners: when user hits the enter key, the dialog should execute the search
		document.getElementById("IdentifierCriterion").addEventListener(      "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("TitleCriterion").addEventListener(           "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("SourceCriterion").addEventListener(          "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("ArtifactDateCriterion").addEventListener(    "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("SquareCriterion").addEventListener(          "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("DescriptionCriterion").addEventListener(     "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("IssueAuthorityCriterion").addEventListener(  "keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		document.getElementById("CoverageTemporalCriterion").addEventListener("keyup", function (e) { if(e.code=="Enter") { $("#searchdialogSaveBtn").click(); } });
		//
		document.getElementById("IdentifierCriterion").focus();
	}









	/**
	 * Displays a dialog to the user, which allows him to select the order of the fields according to which the item sorting will take place.
	 * The sorting will take place on the items-list for those items the user has selected to be displayed. 
	 */
	static showSortItemsDialog() {
		$(sortable).empty();
		$( "#SortItemsDialog" ).dialog(  
			{	height: 620,
				width:  400,
				title:  "Sort Items in the List by:",
				buttons: [
					{ text: 'OK', id: 'sortdialogSaveBtn', class: 'dialogSaveBtn', 
					  click: function () { 
						document.getElementById("masterContainer").style.cursor = "wait";
						var SortingFields = [];
						var LIs = document.getElementsByClassName("SortingField");
						for (let i = 0; i < LIs.length; i++) {
							SortingFields.push( LIs[i].innerHTML );
						}
						Dialog.SortItemsList( SortingFields );
						document.getElementById("masterContainer").style.cursor = "pointer";
						$( "#SortItemsDialog" ).dialog('close');
					  }
					},
					{ text: 'Close', id: 'sortdialogCloseBtn', class: 'dialogCloseBtn',
					  click: function () { 
						$("#SortItemsDialog").dialog('close');
					  }
					}
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		).prev(".ui-dialog-titlebar").css("background","gold");
		// create dialog content
		var SortingFields = ["Identifier", "Type", "Category", "Subcategory", "Title", "Fabric", "IssueAuthority", "ArtifactDate", "ArtifactDatedBy", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "Selected" ];
		for( let i=0; i<SortingFields.length; i++ ) {
			var s = SortingFields[i];
			$(sortable).append($("<li class='SortingField'>").html( s ));
		}
		document.getElementById("SortItemsInstructions").innerHTML = "Instructions: Drag and Drop the tabs to set the desired order of the sorting criteria."; 
	}
	
	/**
	 * Sorts the ExcData and refreshes the items-list on the left of the GUI. 
	 * @arg SortingFields: a list of field names according to which the items-list will be sorted. First fields have larger priority.
	 */
	static SortItemsList( SortingFields ) {
		DataSubset = [];
		for( let i=0; i<ExcData.length; i++ ) {
			if( ExcData[i]["Visible"] != false ) {
				DataSubset.push(  JSON.parse(JSON.stringify(ExcData[i])) );
			}
		}
		sortExcavationData(SortingFields);
		PopulateItemsList( DataSubset, "", "" );
		updateSelectedItemsOnList();
	}








	/*
	 * Creates and Displays Reference Links dialog. The reference links are pairs of text and link which the user can define with this dialog.
	 * Whenever the text is found in a field of an item, it is replaced by the link.
	 */
	static ShowReferenceLinksDialog() {
		$(reference_links_div).empty();
		$( "#ReferenceLinksDialog" ).dialog(  
			{	height: 520,
				width:  860,
				title:  "Reference Links",
				buttons: [
					{ text: 'Save Changes', id: 'reflinksdialogSaveBtn', class: 'dialogSaveBtn', 
					  click: function () { 
							// construct the new json of ReferenceLinks
							ReferenceLinks = [];
							var table = document.getElementById( "ReferenceLinksTable" );
							for (let i = 1; i < table.rows.length; i++) {
								var a_text = table.rows[i].cells[0].innerHTML;
								var a_link = table.rows[i].cells[1].innerHTML;
								if( a_text.trim().length > 2  &&  a_link.trim().length > 2  &&  a_text.localeCompare("<br>") != 0 ) {
									ReferenceLinks.push( {text:a_text, link:a_link} );
								}
							}
							// convert ReferenceLinks to human-readable string
							var json_str = JSON.stringify( ReferenceLinks, null, 4 );
							// TODO: json_str should be compressed here
							
							// update ReferenceLinks on server
							document.getElementById("ReferenceLinksDialog").style.cursor = "wait";
							$.ajax({  	url: phpURL,
										type: "POST",
										data: { Command: "SaveReferenceLinks", Arg1: json_str } 
							}).done(function( msg ) {
								document.getElementById("ReferenceLinksDialog").style.cursor = "pointer";
								if( msg.length == 0 ) {
									$("#ReferenceLinksDialog").dialog('close');
									alert( "Your changes to the Reference Links are saved." );
								} else {
									alert( "ERROR MESSAGE:\n" + msg );
								}
							});
					  }
					},				
					{ text: 'Close', id: 'reflinksdialogCloseBtn', class: 'dialogCloseBtn',
					  click: function () { 
						$("#ReferenceLinksDialog").dialog('close');
					  }
					}
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		).prev(".ui-dialog-titlebar").css("background","DarkTurquoise");
		// Check for Access Permissions
		if( TheAccessLevels.length == 0 ) { 
			$('#reflinksdialogSaveBtn').attr("disabled", true);
			$('#reflinksdialogSaveBtn').attr("title", "You do not have access to save changes");
			$('#reflinksdialogSaveBtn').css("background-color", "lightgray");
			$('#reflinksdialogSaveBtn').css("color", "gray");
			$('#reflinksdialogSaveBtn').css("border-color", "gray");
			$('#reflinksdialogSaveBtn').css("cursor", "default");
		}
		//  RRRRRRRRRRRRRRRRRRRRRRR create dialog content RRRRRRRRRRRRRRRRRRRRRRR
		// consruct html
		var html_table = "<h4>Here you can assign a Uniform Resource Locator to some Text.<br>Whenever this text is found inside an item's description or bibliography the text will become a link pointing to the URL.</h4>";
		html_table += '<table id="ReferenceLinksTable" contenteditable>';
		html_table += '	<tr><th contenteditable=false style="width:30%"><div>TEXT</div></th><th contenteditable=false><div>URL</div></th></tr>';
		html_table += '</table>';
		html_table += '<button id="add_row_to_table_button"  onclick="Utils.AddRowToTable(\'ReferenceLinksTable\')" title="Add Row"> Add Row </button>';
		$(reference_links_div).append( html_table );
		// fill with data
		var table = document.getElementById( "ReferenceLinksTable" );
		for( let i=0; i<ReferenceLinks.length; i++ ) {
			var row = table.insertRow(-1);
			var cell1 = row.insertCell(0);  
			var cell2 = row.insertCell(1);	
			cell1.innerHTML = ReferenceLinks[i]["text"];
			cell2.innerHTML = ReferenceLinks[i]["link"];
		}
	}

	





	static DisplaySettingsDialog() {
		$(SettingsDialogContent).empty();
		var dialog_obj = $( "#SettingsDialog" ).dialog(  
			{	height: 400, width:  600, title:  "Settings",
				buttons: [
					{ text: 'Save Changes', id: 'settingsdialogSaveBtn', class: 'dialogSaveBtn', 
					  click: function () { 		
							/*
							// construct the json of the new settings
							var NewSettings = [];
							NewSettings.push( {name:"NEW_Password", value:document.getElementById("NEW_Password").value} );
							// convert json to human-readable string
							var json_str = JSON.stringify( NewSettings, null, 4 );					  
							*/
							// change password on server
							if( document.getElementById("NEW_Password").value.length > 0 ) {
								document.getElementById("SettingsDialog").style.cursor = "wait";
								$.ajax({  	url: phpURL, type: "POST", timeout: 26000,
											data: { Command: "chpass", Arg1: document.getElementById("OLD_Password").value, Arg2: document.getElementById("NEW_Password").value }
								}).done(function( msg ) {
									document.getElementById("SettingsDialog").style.cursor = "pointer";
									if( msg.length == 0 ) {
										$("#SettingsDialog").dialog('close');
										alert( "Your new Settings are saved." );
									} else {
										alert( "ERROR MESSAGE:\n" + msg );
									}
								});
							} else {
								alert( "You have to type something at the New Password field." );
							}
					  }
					},				
					{ text: 'Close', id: 'settingsdialogCloseBtn', class: 'dialogCloseBtn',
					  click: function () { 
						$("#SettingsDialog").dialog('close');
					  }
					}
				],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "teal");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		//  RRRRRRRRRRRRRRRRRRRRRRR create dialog content RRRRRRRRRRRRRRRRRRRRRRRz a,<
		var s = "";
		// Check for Access Permissions
		if( TheAccessLevels.length == 0 ) { 
			s = "You don't have permission to alter the Settings.";
		} else {
			//////// FIELD: Current Password
			s +=   "<div style='grid-column:1;'><b>" + "Current Password" + "</b></div>";
			s +=   "<div style='grid-column:2;'>   <input type='Password' class='dialog_itemfield' id='" + "OLD_Password" + "'>   </div>";
			//////// FIELD: New Password
			s +=   "<div style='grid-column:1;'><b>" + "New Password" + "</b></div>";
			s +=   "<div style='grid-column:2;'>   <input type='Password' class='dialog_itemfield' id='" + "NEW_Password" + "'>   </div>";
		}
		document.getElementById("SettingsDialogContent").innerHTML = s; 
	}









	/**
	 * Displays a dialog after the user has drawn a cross section on the map. 
	 * The dialog contains a canvas with shapes representing the vertical view of the drawn cross section.
	 */
	static DisplayCrossSectionDialog( section_x1, section_y1, section_x2, section_y2 ) {
		if( num_of_selected_items == 0 ) {
			return; // <<<<
		}
		// change state
		Dialog.i_have_calculated_the_3d_plot = false; 
		document.getElementById("CrossSection_ThreeD").style.display = "none";
		// init dialog
		var dialog_obj = $( "#CrossSectionDialog" ).dialog(
			{	height: 630, width:  950, title:  "Cross Section",
				buttons: [ { text: 'Close', id: 'crosssectiondialogCloseBtn', class: 'dialogCloseBtn', click: function () { $("#CrossSectionDialog").dialog('close'); } } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", COLOR_crosssection);
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		// ------------ create dialog content ------------
		var plot2dX=[], plot2dY=[], plot2dZ=[], plot2dData=[], Shapes2D = [];
		// create the controls at the top
		var controls_html = "";
		controls_html += "<select class='CrossSectionControls_combo' id='aspectRatioCombo'>";
		controls_html +=   "<option value='0'>Physical aspect ratio</option>";
		controls_html +=   "<option value='1'>Data-fit aspect ratio</option>";
		controls_html += "</select>";
		controls_html += "<select class='CrossSectionControls_combo' id='PlotTypesCombo'>";
		controls_html +=   "<option value='0'>Display only 2D plot</option>";
		controls_html +=   "<option value='1'>Display 2D and 3D plots</option>";
		controls_html += "</select>";
		controls_html += "<hr>";
		//  calculate min and max coordinates of all selected polygons ------------
		var minX = 9999999; var minY = 9999999; var minZ = 9999999; var maxX = -9999999; var maxY = -9999999; var maxZ = -9999999;
		for (let i = 0; i < ExcData.length; i++) {
			if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer  &&  ExcData[i]["Location"][Current_Layer].length > 1) { // this is a selected locus
				for(let j=0; j<ExcData[i]["Location"][Current_Layer].length; j++) {
					if( minX > ExcData[i]["Location"][Current_Layer][j]["X"] ) minX = ExcData[i]["Location"][Current_Layer][j]["X"];
					if( minY > ExcData[i]["Location"][Current_Layer][j]["Y"] ) minY = ExcData[i]["Location"][Current_Layer][j]["Y"];
					if( minZ > ExcData[i]["Location"][Current_Layer][j]["Z"] ) minZ = ExcData[i]["Location"][Current_Layer][j]["Z"];
					if( maxX < ExcData[i]["Location"][Current_Layer][j]["X"] ) maxX = ExcData[i]["Location"][Current_Layer][j]["X"];
					if( maxY < ExcData[i]["Location"][Current_Layer][j]["Y"] ) maxY = ExcData[i]["Location"][Current_Layer][j]["Y"];
					if( maxZ < ExcData[i]["Location"][Current_Layer][j]["Z"] ) maxZ = ExcData[i]["Location"][Current_Layer][j]["Z"];
				}
			}
		}
		// compute factors which correct distances
		var Fx = (PlanMaxX-PlanMinX) / (PlanImageWidth*ZoomFactor);
		var Fy = (PlanMaxY-PlanMinY) / (PlanImageHeight*ZoomFactor);
		// check if there are any selected item which intersect with the user-drawn cross section.
		for (let i = 0; i < ExcData.length; i++) {
			if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer  &&  ExcData[i]["Location"][Current_Layer].length > 1) { // this is a selected locus
				// ---- calculate the interestions between the cross-section and the item's polygons
				var CS = new CrossSection( ExcData[i], section_x1, section_y1, section_x2, section_y2 );
				var CS_result = CS.CalcCrossSection();
				if( CS_result.length <= 0 ) continue; // <<< no intersection found with this item
				// ---- correct distances to represent reality and round to 2 digits 
				for (let corner_idx=0; corner_idx<CS_result.length; corner_idx++) {
					CS_result[corner_idx]["X"] = (Fx*CS_result[corner_idx]["X"]).toFixed(2);
					CS_result[corner_idx]["Y"] = (Fy*CS_result[corner_idx]["Y"]).toFixed(2) - PlanMinY;
					if(CS_result[corner_idx].hasOwnProperty("Z")) CS_result[corner_idx]["Z"] = CS_result[corner_idx]["Z"].toFixed(2); // make depth negative so that it is plotted correctly
				}
				// ******** create coordinates for the 2D plot for this item
				// compute the center point
				var centerX = 0;  var centerY = 0;
				for (let corner_idx=0; corner_idx<CS_result.length; corner_idx++) {
					centerX += parseFloat( CS_result[corner_idx]["X"] );
					centerY += parseFloat( CS_result[corner_idx]["Z"] );
				}
				centerX /= CS_result.length;
				centerY /= CS_result.length;
				// sort the corners so that when we draw the edges they will not cross each other.
				Area.SortPolygonCorners( CS_result, centerX, centerY );
				// construct shapes
				var trace2dSHAPE = {};
				trace2dSHAPE.type = "scatter";
				trace2dSHAPE.name = ExcData[i]["Identifier"];
				trace2dSHAPE.showlegend = false;
				trace2dSHAPE.fillcolor = Utils.rgb_to_rgba( getItemColor(ExcData[i]["Type"], ExcData[i]["Category"]), 0.20 );
				trace2dSHAPE.fill = "toself";
				trace2dSHAPE.mode = "lines";
				trace2dSHAPE.line = {};
				trace2dSHAPE.line.color = getItemColor( ExcData[i]["Type"], ExcData[i]["Category"] );
				trace2dSHAPE.line.width = 1;
				var shape_X = [], shape_Y = [];
				for (let corner_idx=0; corner_idx<CS_result.length; corner_idx++) {
					shape_X.push( parseFloat(CS_result[corner_idx]["X"]) );
					shape_Y.push( parseFloat(CS_result[corner_idx]["Z"]) );
				}
				if( CS_result.length == 2 ) { // only the top polygon is described for this item, so just add a bottom line equal to the max depth. 
					shape_X.push( parseFloat(CS_result[1]["X"]) );		shape_Y.push( minZ );
					shape_X.push( parseFloat(CS_result[0]["X"]) );		shape_Y.push( minZ );
				}
				shape_X.push( parseFloat(CS_result[0]["X"]) );		shape_Y.push( parseFloat(CS_result[0]["Z"]) ); // close polygon
				trace2dSHAPE.x = shape_X;
				trace2dSHAPE.y = shape_Y;
				plot2dData.push( trace2dSHAPE );
				// construct text label at the center of the polygon
				var trace2dTXT = { x:[centerX], y:[centerY], text:"<b>"+[ExcData[i]["Identifier"]]+"</b>", mode:'text', showlegend:false };
				plot2dData.push( trace2dTXT );
			}
		}
		
		if( plot2dData.length == 0 ) {
			$("#CrossSectionDialog").dialog('close');
			alert("Cross section cannot be displayed.");
			return;
		}
		
		// set html and event-handlers for the controls
		document.getElementById("CrossSection_Controls").innerHTML = controls_html; 
		document.getElementById("aspectRatioCombo").addEventListener('change',this.aspectRatioCombo_ChangeHandler,false);
		document.getElementById("PlotTypesCombo").addEventListener('change',this.PlotTypesCombo_ChangeHandler,false);

		// -------- call plotly --------
		var Area2D = document.getElementById('CrossSection_TwoD');
		var plot2dLayout = { title:'Cross Section', autosize:true, yaxis:{title:"Elevation (m)", scaleanchor:"x", scaleratio:1}, xaxis:{title:"Width (m)"} };
		Plotly.newPlot(Area2D, plot2dData, plot2dLayout);
	}
	
	
	


	/*
	 * Handles the aspectRatioCombo at the CrossSectionDialog.
	 * Can switch between 1-by-1 aspect ratio and fill-all-space aspect ratio 
	 */
	static aspectRatioCombo_ChangeHandler(e) {
		var combo = document.getElementById("aspectRatioCombo");
		var selected_option = combo.options[combo.selectedIndex].text;
		if( selected_option.localeCompare("Physical aspect ratio") == 0 ) {
			Plotly.relayout('CrossSection_TwoD', { yaxis:{title:"Elevation (m)", scaleanchor:"x", scaleratio:1} } );
		} else {
			Plotly.relayout('CrossSection_TwoD', { yaxis:{title:"Elevation (m)", scaleanchor:undefined, scaleratio:undefined} } );
		}
	}

	
	/*
	 * flag to remember if calulations have been made, so that they are not made again
	 */
	static i_have_calculated_the_3d_plot = false;
	/*
	 * Handles the PlotTypesCombo at the CrossSectionDialog.
	 * Can switch between displaying only a 2D plot and displaying a 2D and a 3D plot
	 */
	static PlotTypesCombo_ChangeHandler(e) {
		var combo = document.getElementById("PlotTypesCombo");
		var selected_option = combo.options[combo.selectedIndex].text;
		if( selected_option.localeCompare("Display only 2D plot") == 0 ) {
			document.getElementById("CrossSection_ThreeD").style.display = "none";
		} else {
			if( Dialog.i_have_calculated_the_3d_plot == false ) {
				// ------------ warn user if he has selected many items ------------
				var ok = true;
				if ( num_of_selected_items > 20 ) {
					ok = confirm("The 3D representation of so many items will take some time.\nDo you want to continue?");
				}
				if(ok == false) {
					combo.options.selectedIndex = 0;
					return;
				}
				// ------------ calculate min and max coordinates of all selected polygons ------------
				var minX = 9999999; var minY = 9999999; var minZ = 9999999; var maxX = -9999999; var maxY = -9999999; var maxZ = -9999999;
				for (let i = 0; i < ExcData.length; i++) {
					if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer  &&  ExcData[i]["Location"][Current_Layer].length > 1 ) { // this is a selected locus
						for(let j=0; j<ExcData[i]["Location"][Current_Layer].length; j++) {
							if( minX > ExcData[i]["Location"][Current_Layer][j]["X"] ) minX = ExcData[i]["Location"][Current_Layer][j]["X"];
							if( minY > ExcData[i]["Location"][Current_Layer][j]["Y"] ) minY = ExcData[i]["Location"][Current_Layer][j]["Y"];
							if( minZ > ExcData[i]["Location"][Current_Layer][j]["Z"] ) minZ = ExcData[i]["Location"][Current_Layer][j]["Z"];
							if( maxX < ExcData[i]["Location"][Current_Layer][j]["X"] ) maxX = ExcData[i]["Location"][Current_Layer][j]["X"];
							if( maxY < ExcData[i]["Location"][Current_Layer][j]["Y"] ) maxY = ExcData[i]["Location"][Current_Layer][j]["Y"];
							if( maxZ < ExcData[i]["Location"][Current_Layer][j]["Z"] ) maxZ = ExcData[i]["Location"][Current_Layer][j]["Z"];
						}
					}
				}
				// ------------------ create traces of the polygons and artifacts for the 3D representation ------------------
				var MyColors = ["#217ca3", "#e29930", "#919636", "#af1c1c", "#e7552c", "#1b4b5a", "#e4535e", "#aebd38", "#ffbb00", "#2c7873"];
				var MyColors_idx = 0;
				var plot3dX=[], plot3dY=[], plot3dZ=[], plot3dData=[];
				for (let i = 0; i < ExcData.length; i++) {
					if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer &&  ExcData[i]["Location"][Current_Layer].length > 1 ) { // this is a selected locus
						var CS = new CrossSection( ExcData[i], CrossSectionX1, CrossSectionY1, CrossSectionX2, CrossSectionY2 );
						var ItemPolygons = CS.getItemPolygons();
						plot3dX=[]; plot3dY=[]; plot3dZ=[];
						for (let  poly_idx=0; poly_idx<ItemPolygons.length; poly_idx++) {
							for (let  edge_idx=0; edge_idx<ItemPolygons[poly_idx].length; edge_idx++) {
								plot3dX.push( (ItemPolygons[poly_idx][edge_idx]["X"]-PlanMinX).toFixed(2) );
								plot3dY.push( (PlanMaxY-ItemPolygons[poly_idx][edge_idx]["Y"]).toFixed(2) );
								plot3dZ.push( (ItemPolygons[poly_idx][edge_idx]["Z"]).toFixed(2) );
							}
							var show_trace_name = true;
							if( poly_idx > 0 ) show_trace_name = false;
						}
						var trace = {x:plot3dX, y:plot3dY, z:plot3dZ, name:ExcData[i]["Identifier"], showlegend:true, mode:'lines', line:{width:3, color:MyColors[MyColors_idx]}, type:'scatter3d' };
						plot3dData.push( trace );
						MyColors_idx++;
					} else if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer  &&  ExcData[i]["Location"][Current_Layer].length == 1 ) { // this is a selected artifact (single point)
						var trace = {x:[ExcData[i]["Location"][Current_Layer][0]["X"]-PlanMinX], y:[PlanMaxY-ExcData[i]["Location"][Current_Layer][0]["Y"]], z:[ExcData[i]["Location"][Current_Layer][0]["Z"]], text:ExcData[i]["Identifier"], showlegend:false, mode: 'markers+text', marker:{color:COLOR_artifact,width:5,symbol:'circle',line:{color:COLOR_artifact,width:1},opacity:0.8}, type:'scatter3d'};
						plot3dData.push( trace );
					}
				}
				// ------------------ plot the cross section at the 3D representation ------------------
				var Fx = (PlanMaxX-PlanMinX) / (PlanImageWidth*ZoomFactor);  // factor which corrects distances
				var Fy = (PlanMaxY-PlanMinY) / (PlanImageHeight*ZoomFactor); // factor which corrects distances
				var section_x1 = CrossSectionX1.toFixed(2), section_y1 = CrossSectionY1.toFixed(2),  section_x2 = CrossSectionX2.toFixed(2), section_y2 = CrossSectionY2.toFixed(2);
				var section_x = [Fx*section_x1, Fx*section_x2, Fx*section_x1+0.001, Fx*section_x2+0.001];
				var section_y = [Fy*section_y1, Fy*section_y2,       Fy*section_y1,       Fy*section_y2];
				var section_z = [minZ-0.1,           minZ-0.1,            maxZ+0.1,            maxZ+0.1];
				var section_trace = {type:'mesh3d', x:section_x, y:section_y, z:section_z, name:"Section", showscale:false, color:"hotpink", opacity:0.20, showlegend:true};
				plot3dData.push( section_trace );
				// -------- call plotly --------
				var plot3dLayout = { title:'Cross Section 3D', autosize:true, zaxis:{title:"Elevation (m)"}};
				Plotly.newPlot('CrossSection_ThreeD', plot3dData, plot3dLayout);
				// change state
				Dialog.i_have_calculated_the_3d_plot = true;
			}
			// :::::::::::: make the 3D plot visible ::::::::::::
			document.getElementById("CrossSection_ThreeD").style.display = "block";
		}		
	}
	
	
	

	
	
	/**
	  * this dialog allows the user to see and edit the relations of an item to other items
	  * @param itemUUID this item's relations will be displayed 
	  */
	static Display_ItemRelations_Dialog( itemUUID ) {
		var ItemData = getDataBy_UUID( itemUUID );
		var dialog_obj = $( "#ItemRelationsDialog" ).dialog( 
			{	height: 500, width:  760, title:  "Relations of " + ItemData["Identifier"] + " - " + ItemData["Title"],
				buttons: [ { text: 'Close', id: 'ItemRelationsDialog_CloseBtn', class: 'dialogCloseBtn',
								click: function () {  $("#ItemRelationsDialog").dialog('close'); }
						   } ],
				open: function(event, ui) { $( this ).siblings( ".ui-dialog-titlebar" ).find( "button" ).focus(); }
			} 
		);
		dialog_obj.prev(".ui-dialog-titlebar").css("background", "teal");
		dialog_obj.prev(".ui-dialog-titlebar").css("color", "white");
		
		// resolve all the relations if this item with other items
		var BelongsToUUIDs=[], IncludesUUIDs=[], IsBelowUUIDs=[], IsAboveUUIDs=[];
		if( ItemData.hasOwnProperty("RelationBelongsToUUID") ) 	BelongsToUUIDs 	= ItemData["RelationBelongsToUUID"][0].trim().split('\n');
		if( ItemData.hasOwnProperty("RelationIncludesUUID") ) 	IncludesUUIDs	= ItemData["RelationIncludesUUID"][0].trim().split('\n');
		if( ItemData.hasOwnProperty("RelationIsAboveUUID") ) 	IsAboveUUIDs 	= ItemData["RelationIsAboveUUID"][0].trim().split('\n');
		if( ItemData.hasOwnProperty("RelationIsBelowUUID") ) 	IsBelowUUIDs 	= ItemData["RelationIsBelowUUID"][0].trim().split('\n');
		
		// create dialog content
		var s = "";
		
		for (let UUID of BelongsToUUIDs) {
			s += Dialog.construct_HTML_for_a_relation( ItemData["IdentifierUUID"], UUID, "belongs to" );
		}
		if(BelongsToUUIDs.length > 0) s += "<hr class='relation-hr'>";
		//
		for (let UUID of IncludesUUIDs) {
			s += Dialog.construct_HTML_for_a_relation( ItemData["IdentifierUUID"], UUID, "includes" );
		}
		if(IncludesUUIDs.length > 0) s += "<hr class='relation-hr'>";
		//
		for (let UUID of IsAboveUUIDs) {
			s += Dialog.construct_HTML_for_a_relation( ItemData["IdentifierUUID"], UUID, "is above" );
		}
		if(IsAboveUUIDs.length > 0) s += "<hr class='relation-hr'>";
		//
		for (let UUID of IsBelowUUIDs) {
			s += Dialog.construct_HTML_for_a_relation( ItemData["IdentifierUUID"], UUID, "is below" );
		}
		if(IsBelowUUIDs.length > 0) s += "<hr class='relation-hr'>";
		
		// construct html for adding a NEW relation
		s += "<br>";
		s += "<div class='relations-grid-container'>";
		s +=   "<div class='relations-grid-item'>";
		s +=       "<div class='relation-parent' style='color:teal'>" 		+ ItemData["Identifier"]	+ "</div>";
		s +=       "<select id='relation-type-combo'> <option value='belongs to'>belongs to</option> <option value='includes'>includes</option> <option value='is above'>is above</option> <option value='is below'>is below</option> </select>";
		s +=       "<div class='relation-child'>" 		+ "<input type='text' id='NEW_RelatedIdentifier' placeholder='Type an Identifier'>" + "</div>";
		s +=   "</div>";
		s +=   "<div class='relations-grid-item'>";
		s +=       "<button class='relation-add-btn' title='Add this new relation' onclick='var child_Identifier = document.getElementById(\"NEW_RelatedIdentifier\").value.trim(); var relation_title = document.getElementById(\"relation-type-combo\").value; var childData = getDataBy_Identifier(child_Identifier); if(child_Identifier.length==0) { alert(\"You have to type an Identifier in the text box.\"); } else if( childData==null) { CreateRelation(\""+itemUUID+"\", child_Identifier, relation_title); } else { CreateRelation(\""+itemUUID+"\", childData.IdentifierUUID, relation_title); $( \"#ItemRelationsDialog\" ).dialog(\"close\"); }'> <b>+</b> </button>";
		s +=   "</div>";
		s += "</div>";
		s += "<br>";
		
		// set
		document.getElementById("ItemRelationsDialogContent").innerHTML = s; 
		document.getElementById("ItemRelationsDialog").style.backgroundColor = "honeydew"; 
	}

	
	/**
	  * Is called by Display_ItemRelations_Dialog() to construct html code (one line for each relation)
	  * @param parent_UUID 
	  * @param child_UUID
	  * @param relation_title can be "belongs to", "includes", "is above", "is below" 
	  */
	static construct_HTML_for_a_relation( parent_UUID, child_UUID, relation_title ) {
		// resolve some info about the parent item
		var ItemData = getDataBy_UUID( parent_UUID );
		// resolve some info about the child item
		var childItemText = "";
		var childItemData = getDataBy_UUID( child_UUID );
		if( childItemData != undefined ) { 
			childItemText += childItemData["Type"] + " " + childItemData["Identifier"] + "  " + childItemData["Title"];
		} else { 
			childItemText = "Non-existent item: " + child_UUID; 
		}
		if( childItemText.length > 50 ) { 
			if( childItemText.length > 58 ) childItemText = childItemText.substring(0, 58);
			childItemText = "<small>" + childItemText + "</small>";
		}
		// construct html for this relation
		var s = "";
		s += "<div class='relations-grid-container'>";
		s +=   "<div class='relations-grid-item'>";
		s +=       "<div class='relation-parent'>" 		+ ItemData["Identifier"]	+ "</div>";
		s +=       "<div class='relation-description'>" + relation_title			+ "</div>";
		s +=       "<div class='relation-child'>" 		+ childItemText 			+ "</div>";
		s +=   "</div>";
		s +=   "<div class='relations-grid-item'>" + "<button class='relation-remove-btn' title='Remove this relation' onclick='RemoveRelation(\""+parent_UUID+"\", \""+child_UUID+"\", \""+relation_title+"\"); $( \"#ItemRelationsDialog\" ).dialog(\"close\");'> <b>X</b> </button>" + "</div>";
		s += "</div>";
		return s;
	}
	


	/**
	  * displays the JSON data of an item
	  * @param itemUUID this item's relations will be displayed 
	  */
	static Display_ItemJSON_Dialog( itemUUID ) {
		var s = "";
		var ItemData = getDataBy_UUID( itemUUID);
		s = JSON.stringify( ItemData, null, 4  );
		alert( s );
	}

}