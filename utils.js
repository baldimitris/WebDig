/**
 * This class holds some static utility methods.
 */
 
class Utils {

	constructor() {
	}
	
	
	/**
	  * Returns GMT date and time in the format: "Y-m-d H:i:s". Example: "2023-10-25 11:03:42"
	  */
	static get_GMT_datetime() {
		var result = "";
		result = new Date().toISOString();
		result = result.substring(0, result.length-5);
		result = result.replaceAll("T", " ");
		result = result.replaceAll("Z", "");
		return result;
	}

	/**
	 * Searches for a plain or a wildcard string (rule) into some text.
	 * If the rule contains asterisks then it executes a wildcard search. If not, then it executes a simple search.
	 * Searching is case-insensitive.
	 * if rule is an empty string then the function returns true.
	 * @param str (String): some text 
	 * @param rule (String): a rule with wildcard asterisks like soft* or *soft* or *so*ft*
	 * @return true if the string contains characters that match the rule.
	 */
	static WildcardSearch(str, rule) {
		var result = false;
		try {
			if( str == null ) {
				result = false;
			} else if( rule.length == 0 ) {
				result = true;
			} else if( rule.includes("*") ) {
				var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
				rule = rule.split("*").map(escapeRegex).join(".*");
				rule = "^" + rule + "$";
				var regex = new RegExp(rule, "im"); // i=case-insensitive  m=multiline 
				result =  regex.test(str);
			} else {
				result = str.toLowerCase().includes( rule.toLowerCase() ); // result = str.trim().toLowerCase().equals( rule.trim().toLowerCase() ); 
			}
		} catch(ex) {}
		return result;
	}

/**
	 * @param str1 (String): some text 
	 * @param str2 (String): some text
	 * @return true if the arguments are the same. Case is ignored.
	 */
	static ExactSearch(str1, str2) {
		var result = false;
		try {
			if( str1 == null  ||  str2 == null) {
				result = false;
			} else {
				result = str1.toLowerCase().localeCompare( str2.toLowerCase() ) == 0;
			}
		} catch(ex) {}
		return result;
	}

	/**
	  * Adds a row to an html table. Used for the Reference-Links table.
	  * @param (String) TableName: the css id of the table
	  */ 
	static AddRowToTable( TableName ) {
		var table = document.getElementById( TableName );
		var row = table.insertRow(-1);
		var cell1 = row.insertCell(0);  
		var cell2 = row.insertCell(1);	//cell2.innerHTML = "new";
	}



	/**
	 * Gets a color representation as an rgb string and returns the same color with transparency as an rgba string
	 * For example: "rgb(122, 243, 98)" --> "rgba(122, 243, 98, 0.3)"
	 * @param rgb_string: an rgb color representation. Example "rgb(122, 243, 98)"
	 * @param alpha_value: the transparency value. Zero is fully transparent, One is opaque.
	 */
	static rgb_to_rgba( rgb_string, alpha_value ) {
		return rgb_string.replace(")", ", "+alpha_value+")").replace("rgb","rgba");
	}



	/**
	 * Gets a name and returns the corresponding alias. 
	 * The name can be an item field, a category title etc, which we would like to be displayed to the user with a different name than it is stored in the system.
	 * @param (String) Name: the name to be translated to an alias.
	 * @return the alias of the given name.
	 */
	static NameToAlias( Name ) {
		var result = Name;
		if( Name.localeCompare("BoneSpecies") == 0 ) {
			result = "Preliminary Bone Species";
		} else if( Name.localeCompare("RelationBelongsToUUID") == 0 ) {
			result = "Locus";
		} else if( Name.localeCompare("RelationIncludesUUID") == 0 ) {
			result = "Includes";
		} else if( Name.localeCompare("RelationIsAboveUUID") == 0 ) {
			result = "Is Above of";
		} else if( Name.localeCompare("RelationIsBelowUUID") == 0 ) {
			result = "Is Below of";
		} else if( Name.localeCompare("CoverageArea") == 0 ) {
			result = "Area (m<sup>2</sup>)";
		} else if( Name.localeCompare("Square") == 0 ) {
			result = "Square/Space";
		} else if( Name.localeCompare("Diameter") == 0 ) {
			result = "Diameter (mm)";
		} else if( Name.localeCompare("CoinWeight") == 0 ) {
			result = "Weight (g.)";
		} else if( Name.localeCompare("Axis") == 0 ) {
			result = "Axis (hours)";
		} else if( Name.localeCompare("IssueAuthority") == 0 ) {
			result = "Issuing Authority";
		} else if( Name.localeCompare("CoinInscription") == 0 ) {
			result = "Inscription obv/rev";
		}
		return result;
	}


	/**
	 * Gets an alias and returns the corresponding original name. 
	 * The name can be an item field, a category title etc, which we would like to be displayed to the user with a different name than it is stored in the system.
	 * @param (String) Alias: the alias to be translated to a name.
	 * @return the name which corresponds to the given alias.
	 */	
	static AliasToName( Alias ) {
		var result = Alias;
		return result;
	}
	
	
	
	
	
	/**
	 * Gets a field name and returns a description of it. The description can be displayed as hover text over the field name
	 * @param (String) Name: a field name.
	 * @return the description of the field name.
	 */
	static getFieldDescription( FieldName ) {
		var result = FieldName;
		if( FieldName.localeCompare("Identifier") == 0 ) {
			result = "The unique inventory number for an object. During item creation, the application proposes the next number once the letter that corresponds to the type of find is entered: A=architecture, B=bronze, C=coin, G=glass, I=inscription, IL=iron and lead, J=jewelry, L=lamp, O=organic, P=pottery, ST=stone, T=terracotta. There is no space between the letter and the number.";
		} else if( FieldName.localeCompare("Title") == 0 ) {
			result = "The brief name or description of the object, e.g., Thasian amphora stamp.";
		} else if( FieldName.localeCompare("RelationBelongsToUUID") == 0 ) {
			result = "The locus in which the object was found. During item creation, the locus can be selected from the pull-down menu.";
		} else if( FieldName.localeCompare("Category") == 0 ) {
			result = "This field describes an item more specifically than its Type.";
		} else if( FieldName.localeCompare("Subcategory") == 0 ) {
			result = "Subcategory can aid you in organizing your information. For example, you might add \"Attic\" or \"PRS\" for pottery.";
		} else if( FieldName.localeCompare("ArtifactDate") == 0 ) {
			result = "The date you give the object, as it would appear in a catalogue entry.";
		} else if( FieldName.localeCompare("Dimensions") == 0 ) {
			result = "in meters";
		} else if( FieldName.localeCompare("Description") == 0 ) {
			result = "Your description of the object. Include the state of preservation.";
		} else if( FieldName.localeCompare("Comparanda") == 0 ) {
			result = "Cite comparanda as needed.";
		} else if( FieldName.localeCompare("Additional bibliography") == 0 ) {
			result = "Provide any additional bibliography as needed. Reference Links menu may help.";
		} else if( FieldName.localeCompare("Notes") == 0 ) {
			result = "This section will not be public but is just for your use.";
		} else if( FieldName.localeCompare("CoinInscription") == 0 ) {
			result = "Enter the inscription on the the coin's obverse and reverse sides separated by a slash.";
		} else if( FieldName.localeCompare("CoverageEarliest") == 0 ) {
			result = "insert one number, adding \"-\" for BC. -300 = 300 BC. 300 = AD 300";
		} else if( FieldName.localeCompare("CoverageLatest") == 0 ) {
			result = "insert one number, adding \"-\" for BC. -300 = 300 BC. 300 = AD 300";
		}
		return result;
	}

	
	
	
	/**
	 * @return true if the user's computer is a mobile device. It may not work successfully for all cases.
	 */
	static Am_I_running_on_mobile_device() {
		var result = false;
		if(running_on_mobile_device == null) {
			try	{
				var ua = navigator.userAgent.toLowerCase();
				if ( ua.includes("android") || ua.includes("iphone") ) {
					result = true;
				}
			} catch( ex ) {}
		} else {
			result = running_on_mobile_device;
		}
		return result;
	}
	
	
	
	
	/**
	 * @param s (String): a string
	 * @return true if the argument contains an integer, positive or negative
	 */	
	static ContainsInteger( s ) {
		if( s == null ) return false;
		var result = true;
		if( s.length == 0 ) result = false;
		for( let i=0; i<s.length; i++ ) {
			var c = s.charAt(i);
			if( c!='0' && c!='1' && c!='2' && c!='3' && c!='4' && c!='5' && c!='6' && c!='7' && c!='8' && c!='9' && c!='-') {
				result = false;
				break;
			}
		}	
		return result;
	}
	
	/**
	 * @param s (String): a string
	 * @return true if the argument contains a float, positive or negative
	 */	
	static ContainsFloat( s ) {
		if( s == null ) return false;
		var result = true;
		if( s.length == 0 ) result = false;
		for( let i=0; i<s.length; i++ ) {
			var c = s.charAt(i);
			if( c!='0' && c!='1' && c!='2' && c!='3' && c!='4' && c!='5' && c!='6' && c!='7' && c!='8' && c!='9' && c!='-' && c!='.') {
				result = false;
				break;
			}
		}	
		return result;
	}
	
	
	
	
	
	
	
	
	
	
	/**
	 * 
	 * Source: https://www.w3schools.com/howto/howto_js_sort_table.asp
	 * @arg sorting_direction (String) can take two possible values: "ascending" or "descending"
	 */
	static SortTable( table_html_id, column_number_to_sort_by, sorting_direction) {
		var table, rows, switching, i, x, y, shouldSwitch, switchcount = 0;
		table = document.getElementById( table_html_id );
		switching = true;
		//Set the sorting direction to ascending:
		sorting_direction = "asc"; 
		/*Make a loop that will continue until no switching has been done:*/
		while (switching) {
			//start by saying: no switching is done:
			switching = false;
			rows = table.rows;
			/*Loop through all table rows (except the
			first, which contains table headers):*/
			for (i = 1; i < (rows.length - 1); i++) {
			  //start by saying there should be no switching:
			  shouldSwitch = false;
			  /*Get the two elements you want to compare,
			  one from current row and one from the next:*/
			  x = rows[i].getElementsByTagName("TD")[column_number_to_sort_by];
			  y = rows[i + 1].getElementsByTagName("TD")[column_number_to_sort_by];
			  /*check if the two rows should switch place,
			  based on the direction, asc or desc:*/
			  if (sorting_direction == "asc") {
				if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
				  //if so, mark as a switch and break the loop:
				  shouldSwitch= true;
				  break;
				}
			  } else if (sorting_direction == "desc") {
				if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
				  //if so, mark as a switch and break the loop:
				  shouldSwitch = true;
				  break;
				}
			  }
			}
			if (shouldSwitch) {
			  /*If a switch has been marked, make the switch
			  and mark that a switch has been done:*/
			  rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			  switching = true;
			  //Each time a switch is done, increase this count by 1:
			  switchcount ++;      
			} else {
				/*If no switching has been done AND the direction is "asc",
				set the direction to "desc" and run the while loop again.*/
				if (switchcount == 0 && sorting_direction == "asc") {
					sorting_direction = "desc";
					switching = true;
				}
			}
		}
	}
	
	
	
	
	/**
	  * Removes all elements having a certain value from an Array
	  * @arg theArray the array which will be processed
	  * @arg theValue the element's value to be removed. All occurences inside the array will be removed
	  * @return the same array as given in the argument without the value to be removed
	  */
	static removeElementsFromArrayByValue( theArray, theValue ) {
		var result = theArray.concat();
		var index = result.indexOf( theValue );
		while( index >= 0 ) {
			theArray.splice(index, 1);
			index = result.indexOf( theValue );
		}
		return result;
	}
	
	/**
	  * Removes all duplicate values from the array
	  * @arg theArray the array which will be processed
	  * @return the same array as given in the argument without any duplicate values
	  */
	static RemoveDuplicatesFromArray( theArray ) {
		var result = theArray.concat();
		for(var i=0; i<result.length; ++i) {
			for(var j=i+1; j<result.length; ++j) {
				if(result[i] === result[j])
					result.splice(j--, 1);
			}
		}
		return result;
	}


	static convert_JSON_keys_to_lowercase( json_object ) {
		return Object.fromEntries( Object.entries(json_object).map(([key, value]) => [key.toLowerCase(), value]) );
	}
	

	/**
	  * lightens or darkens a color
	  * @arg col the color as a hex string (example: "#9EFCFF") or rgb string (example: "rgb(158, 252, 255)")
	  * @arg amt the amount of brightness to add or remove from the color (positive lightens the and negative darkens the color). This number is added to each of the r, g, b channels in proportion of the channels magnitude.
	  * @ret a hex string representing the adjusted color
	  */
	static AdjustBrightness(col, amt) {
		var r, g, b;
		// retrieve r g b values from hex string
		if( col.startsWith('#') ) {
			let num = parseInt(col.replace("#", ""), 16);
			r = (num >> 16);
			g = ((num >> 8) & 0x00FF);
			b = (num & 0x0000FF);
		} else {
			[r, g, b] = col.match(/\d+/g).map(Number);
		}
		// adjust brightness of each channel proportionally to its magnitude
		r = r + Math.round(amt * r / 256);
		g = g + Math.round(amt * g / 256);
		b = b + Math.round(amt * b / 256);
		// 
		r = Math.max(Math.min(255, r), 0);
		g = Math.max(Math.min(255, g), 0);
		b = Math.max(Math.min(255, b), 0);
		// make the result color a hex string
		return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6, "0");
	}


	
}	
