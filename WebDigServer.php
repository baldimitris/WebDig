<?php
// increase session timeout
ini_set("session.gc_maxlifetime", 3600); 

// the maximum execution time (sec)
set_time_limit( 300 );

// initialize session
session_start();

include_once "msword.php";

$SITE_UNDER_MAINTENANCE = false;

if ( isset($_SESSION["SESSION_USERNAME"]) == false ) { $_SESSION["SESSION_USERNAME"] = "Guest"; }
if ( isset($_SESSION["SESSION_ACCESSLEVELS"]) == false ) { $_SESSION["SESSION_ACCESSLEVELS"] = ""; }
if ( isset($_SESSION["SESSION_START_SECS"]) == false ) { $_SESSION["SESSION_START_SECS"] = ""; } // PHP default session duration is 24 minutes

// make all dates/times to be counted based on NY,USA.
//date_default_timezone_set('America/New_York');

// init parameters
$Username = "";
$Password = "";
$Command  = "";
$Arg1     = "";
$Arg2     = "";
$Arg3     = "";
if( isset($_POST["Username"]) ) { $Username = $_POST["Username"]; }
if( isset($_POST["Password"]) ) { $Password = $_POST["Password"]; }
if( isset($_POST["Command"]) ) 	{ $Command  = $_POST["Command"]; }
if( isset($_POST["Arg1"]) ) 	{ $Arg1     = $_POST["Arg1"]; }
if( isset($_POST["Arg2"]) ) 	{ $Arg2     = $_POST["Arg2"]; }
if( isset($_POST["Arg3"]) ) 	{ $Arg3     = $_POST["Arg3"]; }

// init state
$UserIP   = getClientIP();
$UserTime   = 0; // Unix seconds UTC - used for timestamping the password before encryption in order to avoid copying of the ciphertext
$ServerTime = 0; // Unix seconds UTC - used for validating that the password's timestamp is recent enough

// decrypt password when user logs in
if( strlen($Username) > 0  &&  strlen($Password) > 0 ) {
	$private_key = openssl_pkey_get_private( "file://webdig_key_rsa", "gu7c4kmhP4Wzi94ddwA2U2k94BfA8sw7" );
	$private_key_details = openssl_pkey_get_details($private_key);
	$encrypted_user_data = pack('H*', $Password); // convert data from hexadecimal notation
	if (openssl_private_decrypt($encrypted_user_data, $decrypted_user_data, $private_key)) {
		try {
			$Password = substr($decrypted_user_data, 0, strpos($decrypted_user_data, " "));
			$UserTime = intval(substr($decrypted_user_data, strpos($decrypted_user_data, " ")+1)); // Unix seconds UTC
			$ServerTime = time(); // Unix seconds UTC
		} catch(Exception $e) {
			$Password = "wrong encryption format";
			$UserTime = 0;
			$ServerTime = 0;
		}
	} else {
		$Password = "wrong encryption key";
		$UserTime = 0;
		$ServerTime = 0;
	}
}

if( strcmp($Command, "GetExcavationData") == 0 ) { // ----------------------------------------------------------------------------------------------- GetExcavationData
	$Compress = $Arg1;
	Raise_ConcurrencyFlag();
	$jsonString = file_get_contents("Data/ExcavationData.json");
	// %%%%%%%% Guset users cannot see all fields  %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
	if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) {
		$NoGuestFields = ["Dimensions", "ArtifactDate", "Description", "Comparanda", "Color", "CoverageTemporal", "CoverageEarliest", "CoverageLatest", "CoverageArea", "Modifier", "Hue", "Boundary", "Sorting", "Sieve", "TotalWeight", "FineWareWeight", "CookWareWeight", "TileWeight", "AmphoraToes", "AmphoraLids", "CoarseWareWeight", "BoneFreshBreaksPercent", "BoneBags", "BoneNumberOfSpecimens", "BoneSource", "BoneWeight", "BoneSpecies", "BoneInterpretationOfContext", "BoneSpeciesNotes", "BoneTaphonomyNotes", "IssueAuthority", "Obverse", "Reverse", "Fabric", "Notes", "Denomination", "Diameter", "CoinWeight", "Axis", "Bibliography", "Additional bibliography"];
		$ExcData = json_decode($jsonString, true);
		for ($i=0; $i<count($ExcData); $i++) {
			for ($j=0; $j<count($NoGuestFields); $j++) {
				if( isset($ExcData[$i][$NoGuestFields[$j]]) ) unset( $ExcData[$i][$NoGuestFields[$j]] );
			}
		}
		$jsonString = json_encode($ExcData);
	}
	// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
	// Compose the reply, containing the data and their length
	if( strcmp($Compress, "true") == 0 ) {
		$Content =  base64_encode( gzcompress($jsonString) );
	} else {
		$Content = $jsonString;
	}
	$ContentLength = strlen($Content);
	//$msgJSON->ContentLength = $ContentLength;
	//$msgJSON->Content = $Content;
	//echo( json_encode($msgJSON) );
	
	header('Content-Length: ' . $ContentLength);
	echo( $Content );
	
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Compress );
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "GetImagesData") == 0 ) { // ----------------------------------------------------------------------------------------------- GetExcavationData
	$Compress = $Arg1;
	Raise_ConcurrencyFlag();
	$jsonString = file_get_contents("Data/ImagesData.json");
	if( strcmp($Compress, "true") == 0 ) {
		echo( base64_encode( gzcompress($jsonString) ) );
	} else {
		$ImagesData = json_decode($jsonString, true);
		$jsonString = json_encode($ImagesData); // remove spaces of pretty-print to lessen transaction time
		echo( $jsonString  );
	}
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Compress );
	Lower_ConcurrencyFlag();	
} else if( strcmp($Command, "GetItemData") == 0 ) { // ----------------------------------------------------------------------------------------------- GetItemData
	$itemUUID = $Arg1;
	Raise_ConcurrencyFlag();
	$jsonString = file_get_contents("Data/ExcavationData.json");
	$ExcData = json_decode($jsonString, true);
	$item_idx = -1;
	for ($i = 0; $i<count($ExcData); $i++) {
		if( strcmp( $ExcData[$i]["IdentifierUUID"], $itemUUID) == 0 ) {
			$item_idx = $i; break;
		}
	}
	if ( $item_idx >= 0 ) {
		echo( json_encode($ExcData[$item_idx]) );
	} else {
		echo "Error: Item '" . $itemUUID . "' not found";
	}
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "GetPreferences") == 0 ) { // ---------------------------------------------------------------------------------- GetPreferences
	$Compress = $Arg1;
	$jsonString = file_get_contents("Data/Preferences.json");
	if( strcmp($Compress, "true") == 0 ) {
		echo( base64_encode( gzcompress($jsonString) ) );
	} else {
		echo( $jsonString  );
	}
} else if( strcmp($Command, "GetDataChanges") == 0 ) { // ---------------------------------------------------------------------------------- GetPreferences
	$Compress = $Arg1;
	Raise_ConcurrencyFlag();
	if( file_exists("DataChanges.txt") ) {
		$FileContentsString = file_get_contents("DataChanges.txt");
		if( strcmp($Compress, "true") == 0 ) {
			echo( base64_encode( gzcompress($FileContentsString) ) );
		} else {
			echo( $FileContentsString );
		}	
	} else {
		echo "";
	}
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "GiveMeAnyNewData") == 0 ) { // ---------------------------------------------------------------------------------- GiveMeAnyNewData
	$after_this_GMT_str = $Arg1; // Format: "Y-m-d H:i:s". Example: "2023-10-25 11:03:42"
	Raise_ConcurrencyFlag();
	$answer = GetNewData($after_this_GMT_str);
	if( strlen($answer) > 10 ) {
		echo $answer;
	} else { // if there are no new data, then respond with the number of logged in users, so that the client can tune the interval by which pings the server
		echo getNumOfActiveUsers()."";
	}
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "GetReferenceLinks") == 0 ) { // ------------------------------------------------------------------------------------- GetReferenceLinks
	$Compress = $Arg1;
	$jsonString = file_get_contents("ReferenceLinks.json");
	if( strcmp($Compress, "true") == 0 ) {
		echo( base64_encode( gzcompress($jsonString) ) );
	} else {
		echo( $jsonString  );
	}
} else if( strcmp($Command, "IdentifierExistsInDB") == 0 ) { // ------------------------------------------------------------------------------------- IdentifierExistsInDB
	$Identifier = $Arg1;
	Raise_ConcurrencyFlag();
	// load the data of the server
	$jsonString = file_get_contents("Data/ExcavationData.json");
	$ExcData = json_decode($jsonString, true);
	// check if the Identifier already exists in the database
	$item_idx = -1;
	for ($i = 0; $i<count($ExcData); $i++) {
		if( strcmp( $ExcData[$i]["Identifier"], $Identifier) == 0 ) { 
			$item_idx = $i; break;
		}
	}
	if($item_idx == -1) { echo "false"; } else { echo "true"; }
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "Save") == 0 ) { // -------------------------------------------------------------------------------------------------- Save
	$NewItemData = $Arg1; // json data of the item to be saved, both altered and not-altered fields
	Raise_ConcurrencyFlag();
	try {
		$newData = json_decode($NewItemData, true);
		if( isset($newData["IdentifierUUID"]) == false ) {
			echo("I cannot save the new data: there is no IdentifierUUID.");
			return;
		}
		// keep backup if necessary
		BackUpExcavationData();
		// parse the data of the server and locate the item to be updated
		$jsonString = file_get_contents("Data/ExcavationData.json");
		$ExcData = json_decode($jsonString, true);
		$item_idx = -1;
		for ($i = 0; $i<count($ExcData); $i++) {
			if( strcmp( $ExcData[$i]["IdentifierUUID"], $newData["IdentifierUUID"]) == 0 ) { // item-data found
				$item_idx = $i; break;
			}
		}
		// Check if user has access to alter the data - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
		$AccessGranted = false;
		if( $item_idx >= 0 ) {
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",all,"    )>-1)  { $AccessGranted = true; }
			else if( isset($ExcData[$item_idx]["Type"])    &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Type"]).","    )>-1)  { $AccessGranted = true; }
			else if( isset($ExcData[$item_idx]["Subtype"])  &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Subtype"])."," )>-1)  { $AccessGranted = true; }
		} else { // it is a request to save a new item
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",all,"    )>-1)  { $AccessGranted = true; }
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",addnew,"    )>-1)  { $AccessGranted = true; }
		}
		if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) $AccessGranted = false;
		// ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK

		$Identifier_of_new_item_already_exists = false;
		
		if( $AccessGranted ) {
			// Remove unecessary run-time fields
			if( isset( $newData["Visible"]  ) ) unset($newData["Visible"]);
			if( isset( $newData["Selected"] ) ) unset($newData["Selected"]);
			if( isset( $newData["InPlan"] ) ) unset($newData["InPlan"]);
			// Make sure that the Identifier of the new item is unique 
			if( $item_idx < 0 ) { // it is a request to save a new item
				for ($i = 0; $i<count($ExcData); $i++) {
					if( strcmp( $ExcData[$i]["Identifier"], $newData["Identifier"]) == 0 ) { // item-data found
						$Identifier_of_new_item_already_exists = true; break;
					}
				}
			}
		}
		
		// save the item
		if( $Identifier_of_new_item_already_exists ) { // it is a request to save a new item, but the identifier already exists in the db
			echo "SERVER: An item with Identifier " . $newData["Identifier"] . " already exists in the database.";
		} else if( $AccessGranted ) {
			$newData["DateModified"] = gmdate("Y-m-d") . " ". gmdate("H:i:s");
			$newData["UpdatedByUser"] = $_SESSION["SESSION_USERNAME"];
			if( $item_idx >= 0 ) { // it is a request to alter an existing item
				// ==== Log it
				LogDataChange( $_SESSION["SESSION_USERNAME"], $newData["IdentifierUUID"], getFieldDifferences($newData, $ExcData[$item_idx]) );
				// ==== in case the altered item is a Locus then some fields of its child-items must be updated.
				if ( isset($newData["Type"])  &&  strcmp($newData["Type"],"Locus")==0  &&  isset($newData["RelationIncludesUUID"]) ) {
					for ($i=0; $i<count($ExcData); $i++) {
						if( isset($ExcData[$i]["RelationBelongsToUUID"])  &&  strpos($ExcData[$i]["RelationBelongsToUUID"][0], $newData["IdentifierUUID"]) !== false ) { // this is a child element
							$ExcData[$i]["Square"] = $newData["Square"];
							//if( isset($ExcData[$i]["Category"]) && isset($newData["CoverageEarliest"]) && strcmp($ExcData[$i]["Category"],"Coin") !=0 ) { $ExcData[$i]["CoverageEarliest"] = $newData["CoverageEarliest"]; }
							//if( isset($ExcData[$i]["Category"]) && isset($newData["CoverageLatest"])   && strcmp($ExcData[$i]["Category"],"Coin") !=0 ) { $ExcData[$i]["CoverageLatest"]   = $newData["CoverageLatest"]; }
							if( isset($ExcData[$i]["Type"])     && isset($newData["Title"])            && strcmp($ExcData[$i]["Type"],"Partition")==0 ) { $ExcData[$i]["Title"]            = $newData["Title"]; }
						}
					}
				}
				// ==== update in memory
				$ExcData[ $item_idx ] = $newData;
			} else { // it is a request to save a new item
				$newData["DateCreated"]   = gmdate("Y-m-d") . " ". gmdate("H:i:s");
				$newData["DateModified"]  = gmdate("Y-m-d") . " ". gmdate("H:i:s");
				$newData["UpdatedByUser"] = $_SESSION["SESSION_USERNAME"];
				// log the data insertion and save the new item
				LogDataChange( $_SESSION["SESSION_USERNAME"], $newData["Identifier"], "New" );
				array_push($ExcData, $newData);
				// construct belongs-to relation by saving the relation to the parent item
				$parent_item_idx = -1;
				if ( isset($newData["RelationBelongsToUUID"])  &&  count($newData["RelationBelongsToUUID"])>0  &&  strlen($newData["RelationBelongsToUUID"][0])>0 ) {
					for ($i = 0; $i<count($ExcData); $i++) { // find the related parent item
						if( strcmp($ExcData[$i]["IdentifierUUID"], $newData["RelationBelongsToUUID"][0]) == 0 ) {
							$parent_item_idx = $i;
							if( isset($ExcData[$i]["RelationIncludesUUID"]) ) {
								$ExcData[$i]["RelationIncludesUUID"][0] .= "\n" . $newData["IdentifierUUID"]; 
							} else {
								$ExcData[$i]["RelationIncludesUUID"] = [ $newData["IdentifierUUID"] ];
							}
							break;
						}
					}
				}
			}
			// >>>>>>>> save data to the server's disk <<<<<<<<
			$newJsonString = json_encode($ExcData, JSON_PRETTY_PRINT);
			file_put_contents("Data/ExcavationData.json", $newJsonString, LOCK_EX);
			if( $item_idx >= 0 ) { 
				Store_NewData_forPropagation($newData);
			} else { 
				Store_NewData_forPropagation($newData);
				if( $parent_item_idx >= 0 ) {
					Store_NewData_forPropagation($ExcData[$parent_item_idx]);
				}
			}
		} else {
			if( $item_idx < 0 ) {
				echo("I am sorry, you do not have the permission to add new items.");
			} else {
				echo("I am sorry, you do not have the permission to alter the data of item ". $ExcData[$item_idx]["Identifier"] . "\nYou can alter only:\n" . strtolower($_SESSION["SESSION_ACCESSLEVELS"])  );
			}
		}
	} catch(Exception $e) {
		echo $e->getMessage();
	}
	// log it
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1, $Arg2 );
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "SaveReferenceLinks") == 0 ) { // ------------------------------------------------------------------------------------- SaveReferenceLinks
	try {
		// Check if user has access to alter the data - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
		$AccessGranted = false; 
		if (strlen($_SESSION["SESSION_ACCESSLEVELS"])>0) $AccessGranted = true;
		if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) $AccessGranted = false;
		// ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
		if( $AccessGranted ) {
			$ReferenceLinks_str = $Arg1; // a json string
			// - - - - - - - - keep backup of the old ReferenceLinks file - - - - - - - - 
			$Now_YMD = gmdate("Y-m-d"); // date string
			$Now_HIS = gmdate("H_i_s"); // time string
			$sourceFile = "ReferenceLinks.json";
			$backupFile = "backup/ReferenceLinks " . $Now_YMD . " ". $Now_HIS . ".json";
			copy($sourceFile, $backupFile);
			// zip the new backup file
			$zipFile = str_replace( ".json", ".zip", $backupFile);
			$zip = new ZipArchive;
			$zip->open($zipFile, ZipArchive::CREATE);
			$zip->addFile( $backupFile );
			$zip->close();
			// del the unzipped file
			unlink($backupFile);
			// - - - - - - - - save the new ReferenceLinks data - - - - - - - - 
			$jsonfile = fopen("ReferenceLinks.json", "w");
			fwrite($jsonfile, $ReferenceLinks_str);
			fclose($jsonfile);
		}
	} catch(Exception $e) {
		echo $e->getMessage();
	}
	// log it
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1 );	
} elseif ( strcmp($Command, "UploadPhoto") == 0 ) { // ------------------------------------------------------------------------------------------ UploadPhoto
	$itemUUID = $Arg1;
	Raise_ConcurrencyFlag();
	$error_msg = "";
	if ( $_FILES['file']['error'] > 0 ) {
        $error_msg = 'Error while uploading photo:<br>' . $_FILES['file']['error'];
    }
    else {
		// construct photo filename for server storage
		srand( make_seed() );
		$photo_filename_at_server  = Lengthen2(gmdate('d')) . Lengthen2(gmdate('m')) . Lengthen2(gmdate('y')) . '-'; //$photo_filename_at_server  = Lengthen2(dechex(gmdate('d'))) . Lengthen2(dechex(gmdate('m'))) . Lengthen2(dechex(gmdate('y'))) . '-';
		$photo_filename_at_server .= Lengthen2(gmdate('H')) . Lengthen2(gmdate('i')) . Lengthen2(gmdate('s')) . '-'; //$photo_filename_at_server .= Lengthen2(dechex(gmdate('H'))) . Lengthen2(dechex(gmdate('i'))) . Lengthen2(dechex(gmdate('s'))) . '-';
		$photo_filename_at_server .= substr( hash('md5', $_FILES['file']['tmp_name']),  0, 8) . '-';
		$photo_filename_at_server .= dechex(rand(1,1000));
		$photo_filename_at_server = strtoupper( $photo_filename_at_server );
		// save photo on server side
        move_uploaded_file($_FILES['file']['tmp_name'], "Data/images/" . $photo_filename_at_server . ".jpg");
		// create a thumbnail for this image
		CreateThumbnail("Data/images/".$photo_filename_at_server.".jpg",  "Data/images/thumbnails/", 200);
		CreateThumbnail("Data/images/".$photo_filename_at_server.".jpg",  "Data/images/thumbnails_mini/", 80);
		// ############ Alter the JSON data ############
		try {
			// parse the data of the server and locate the item to be updated
			$jsonString = file_get_contents("Data/ExcavationData.json");
			$ExcData = json_decode($jsonString, true);
			$item_idx = -1;
			for ($i = 0; $i<count($ExcData); $i++) {
				if( strcmp( $ExcData[$i]["IdentifierUUID"], $itemUUID) == 0 ) { // item-data found
					$item_idx = $i; break;
				}
			}
			if( $item_idx >= 0 ) { 
				// Check if user has access to alter the data - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
				$AccessGranted = false; 
				if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",all,"    )>-1)  { $AccessGranted = true; }
				else if( isset($ExcData[$item_idx]["Type"])     &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Type"]).","    )>-1)  { $AccessGranted = true; }
				else if( isset($ExcData[$item_idx]["Subtype"])  &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Subtype"])."," )>-1)  { $AccessGranted = true; }
				if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) $AccessGranted = false;
				// ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
				if( $AccessGranted ) {
					// update json data of the item with the photo's info
					$ExcData[ $item_idx ]["RelationIncludesUUID"][0] .= "\n" . $photo_filename_at_server;
					if( isset($ExcData[ $item_idx ]["ThumbnailImageUUID"]) == false ) { // if this item has no Thumbnail then make this image its Thumbnail
						$ExcData[ $item_idx ]["ThumbnailImageUUID"] = $photo_filename_at_server; 
					}
					$itemType = $ExcData[$item_idx]["Type"];
					$itemIdentifier = $ExcData[$item_idx]["Identifier"];
					$itemIdentifierUUID = $ExcData[$item_idx]["IdentifierUUID"];
					$itemTitle = $ExcData[$item_idx]["Title"];
					if( isset($ExcData[$item_idx]["Source"]) &&  is_null($ExcData[$item_idx]["Source"])==false ) {
						$itemSource = $ExcData[$item_idx]["Source"];
					} else {
						$itemSource = "";
					}
					$itemTrench = $ExcData[$item_idx]["Trench"];
					// update json data with a new photo item
					array_push ( $ExcData, json_decode('[{"IdentifierUUID": ' . $photo_filename_at_server . '}]', true));
					$new_item_index = count($ExcData) - 1;
					$ExcData[$new_item_index]["Type"] = "Image";
					$ExcData[$new_item_index]["Title"] = "";
					$ExcData[$new_item_index]["IdentifierUUID"] = $photo_filename_at_server;
					$ExcData[$new_item_index]["RelationBelongsToUUID"] = [ $ExcData[$item_idx]["IdentifierUUID"] ];
					$ExcData[$new_item_index]["Identifier"] = $photo_filename_at_server;
					if( strlen($itemSource) > 0 ) {
						$ExcData[$new_item_index]["Source"] = $itemSource;
					}
					$ExcData[$new_item_index]["Trench"] = $itemTrench;
					$ExcData[$new_item_index]["FormatImage"] = $photo_filename_at_server . ".jpg";
					$ExcData[$new_item_index]["FormatImageHeight"] = "" . $img_height;
					$ExcData[$new_item_index]["FormatImageWidth"] = "" . $img_width;
					$ExcData[$new_item_index]["DateUTC"] = gmdate("Y-m-d") . "T". gmdate("H:i:s") . "Z" ;
					$ExcData[$new_item_index]["Date"] = gmdate("M d, Y");
					$ExcData[$new_item_index]["DateModified"] = gmdate("Y-m-d") . "T". gmdate("H:i:s") . "Z" ;
					$ExcData[$new_item_index]["DateTimeZone"] = "Europe\/Athens";
					// save data to the server's disk
					$newJsonString = json_encode($ExcData, JSON_PRETTY_PRINT);
					file_put_contents("Data/ExcavationData.json", $newJsonString, LOCK_EX);
					LogDataChange( $_SESSION["SESSION_USERNAME"], $itemIdentifierUUID, "AddPhoto" );
					echo( "Photograph " . $photo_filename_at_server . " uploaded and linked with item '" . $itemTitle . "'" );
				}  else {
					echo("Error: You do not have permission to alter the data of item " . $ExcData[$item_idx]["Identifier"] );
				}
			} else {
				echo("Error: Unable to find item " . $itemUUID );
			}
		} catch(Exception $e) {
			echo ( "Error:" . $e->getMessage() );
		}
		LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1, $Arg2, $photo_filename_at_server );
    }
	if( strlen($error_msg) > 0 ) { 
		echo ($error_msg); 
	}
	Raise_ConcurrencyFlag();
} else if( strcmp($Command, "Delete") == 0 ) { // -------------------------------------------------------------------------------------------------- Delete
	$itemUUID = $Arg1;
	Raise_ConcurrencyFlag();
	try {
		// parse the data of the server and locate the item to be deleted
		$jsonString = file_get_contents("Data/ExcavationData.json");
		$ExcData = json_decode($jsonString, true);
		$item_idx = -1;
		for ($i = 0; $i<count($ExcData); $i++) {
			if( strcmp( $ExcData[$i]["IdentifierUUID"], $itemUUID) == 0 ) { // item-data found
				$item_idx = $i; break;
			}
		}
		if( $item_idx >= 0 ) {
			// Check if user has access to alter the data - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
			$AccessGranted = false; 
			if( isset($ExcData[$item_idx]["Type"])     &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Type"]).","    )>-1)  { $AccessGranted = true;  }
			if( isset($ExcData[$item_idx]["Subtype"])  &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Subtype"])."," )>-1)  { $AccessGranted = true;  }
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",del,"    ) <  0)  { $AccessGranted = false; }
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",all,"    ) > -1)  { $AccessGranted = true;  }
			if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) $AccessGranted = false;
			// ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
			if( $AccessGranted ) {
				LogDataChange( $_SESSION["SESSION_USERNAME"], $ExcData[$item_idx]["Identifier"], "Delete" );
				// delete item
				array_splice( $ExcData, $item_idx, 1 );
				// TODO: Unlink all references to this item - consider this may not be good to do
				// save data to the server's disk
				$newJsonString = json_encode($ExcData, JSON_PRETTY_PRINT);
				file_put_contents("Data/ExcavationData.json", $newJsonString, LOCK_EX);
			} else {
				echo("I am sorry, you do not have permission to alter the data of item " . $ExcData[$item_idx]["Identifier"] );
			}
		} else {
			echo("Unable to find item " . $itemUUID );
		}
	} catch(Exception $e) {
		echo $e->getMessage();
	}
	// log it
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1, $Arg2 );
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "DeleteImage") == 0 ) { // ---------------------------------------------------------------------------------------------- Delete Image
	$itemUUID = $Arg1;
	$ImageUUID_toDelete = $Arg2;
	Raise_ConcurrencyFlag();
	try {
		// parse the data of the server and locate the item to be deleted
		$jsonString = file_get_contents("Data/ExcavationData.json");
		$ExcData = json_decode($jsonString, true);
		$item_idx = -1;
		for ($i = 0; $i<count($ExcData); $i++) {
			if( strcmp( $ExcData[$i]["IdentifierUUID"], $itemUUID) == 0 ) { // item-data found
				$item_idx = $i; break;
			}
		}
		if( $item_idx >= 0 ) {
			// Check if user has access to alter the data - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
			$AccessGranted = false; 
			if(strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",all,"    )>-1)  { $AccessGranted = true; }
			else if( isset($ExcData[$item_idx]["Type"])  &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Type"]).","    )>-1)  { $AccessGranted = true; }
			else if( isset($ExcData[$item_idx]["Subtype"])  &&  strpos( ",".strtolower($_SESSION["SESSION_ACCESSLEVELS"]).","  ,  ",".strtolower($ExcData[$item_idx]["Subtype"])."," )>-1)  { $AccessGranted = true; }
			if( strlen(trim($_SESSION["SESSION_USERNAME"]))==0 || strcmp($_SESSION["SESSION_USERNAME"],"Guest")==0 ) $AccessGranted = false;
			// ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK - ACCESS CHECK
			if( $AccessGranted ) {
				// remove the image id from the item's references
				$s = $ExcData[$item_idx]["RelationIncludesUUID"][0];
				$s = str_replace( $ImageUUID_toDelete . "\n", "", $s );
				$s = str_replace( "\n" . $ImageUUID_toDelete, "", $s );
				$s = str_replace( $ImageUUID_toDelete       , "", $s );
				$s = str_replace( "\n\n", "\n", $s ); 
				$ExcData[$item_idx]["RelationIncludesUUID"][0] = $s;
				// save data to the server's disk
				$newJsonString = json_encode($ExcData, JSON_PRETTY_PRINT);
				file_put_contents("Data/ExcavationData.json", $newJsonString, LOCK_EX);
				LogDataChange( $_SESSION["SESSION_USERNAME"], $ExcData[$item_idx]["IdentifierUUID"], "DelPhoto" );
			} else {
				echo("I am sorry, you do not have the permission to alter the data of item " . $ExcData[$item_idx]["Identifier"] );
			}
		} else {
			echo("Unable to find item " . $itemUUID );
		}
	} catch(Exception $e) {
		echo $e->getMessage();
	}
	// log it
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1, $Arg2, $Arg3 );
	Lower_ConcurrencyFlag();
} else if( strcmp($Command, "WhoAmI") == 0 ) { // ------------------------------------------------------------------------------------------------ Who Am I?
    echo $_SESSION["SESSION_USERNAME"];
} else if( strcmp($Command, "GetAccessLevels") == 0 ) { // --------------------------------------------------------------------------------------- GetAccessLevels
    echo $_SESSION["SESSION_ACCESSLEVELS"];	
} else if( strlen($Username) > 0  &&  strlen($Password) > 0 ) { // -------------------------------------------------------------------------------- Login
	if( $SITE_UNDER_MAINTENANCE == false) {
		if( strcmp(strtolower($Username), "guest") == 0 )  { // guest session
			$_SESSION["SESSION_USERNAME"] = "Guest"; 
			$_SESSION["SESSION_ACCESSLEVELS"] = "";
			$_SESSION["SESSION_START_SECS"] = floor(microtime(true));
			// go to the web application
			ob_start();
			header("Location: app_main.html");
			ob_end_flush();
		} else {
			$_SESSION["SESSION_ACCESSLEVELS"] = getAccessLevels( $Username, $Password );
			if( strlen($_SESSION["SESSION_ACCESSLEVELS"]) > 0 ) {
				if( abs( $ServerTime - $UserTime ) < 10*60 ) { // 10 min diff allowed between user and system time
					$_SESSION["SESSION_USERNAME"] = $Username;
					$_SESSION["SESSION_START_SECS"] = floor(microtime(true));
					// save the login username and time
					$UserLogins = [];
					$idx = -1;
					if( file_exists("login_times.json") ) {
						$jsonString = file_get_contents("login_times.json");
						$UserLogins = json_decode($jsonString, true);
						for ($i = 0; $i<count($UserLogins); $i++) {
							if( strcmp($UserLogins[$i]["Username"], $_SESSION["SESSION_USERNAME"]) == 0 ) {
								$idx = $i;
								break;
							}
						}
					}
					if($idx >= 0) { // username exits in the file
						$UserLogins[$idx]["Date"] = gmdate("Y-m-d");
						$UserLogins[$idx]["Time"] = gmdate("H:i:s");
					} else {
						$new_rec = new stdClass();
						$new_rec->Username = strtolower($_SESSION["SESSION_USERNAME"]);
						$new_rec->Date = gmdate("Y-m-d");
						$new_rec->Time = gmdate("H:i:s");
						array_push($UserLogins, $new_rec);
					}
					file_put_contents("login_times.json",  json_encode($UserLogins, JSON_PRETTY_PRINT)  , LOCK_EX);
					// go to the web application
					ob_start();
					header("Location: app_main.html");
					ob_end_flush();
				} else {
					$_SESSION["SESSION_USERNAME"] = "Guest";
					echo "Error: Correct your time:" . "<br>" . gmdate("Y-m-d H:i:s", $UserTime) . " -> " . gmdate("Y-m-d H:i:s", $ServerTime);
				}
			} else {
				$_SESSION["SESSION_USERNAME"] = "Guest"; 
				echo "Login Failed: Wrong credentials.";
			}
		}
	} else {
		echo "Maintenance. Please try later.";
	}
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], "LOGIN", $_SESSION["SESSION_ACCESSLEVELS"], $Arg2, $Arg3 );
} else if( strcmp($Command, "chpass") == 0 ) { // ------------------------------------------------------------------------------------------------ Change Password
	$OldPassword = $Arg1;
	$NewPassword = $Arg2;
	$ok = changePassword( $_SESSION["SESSION_USERNAME"], $OldPassword, $NewPassword );
	if( $ok == false ) {  echo "Wrong Password for " . $_SESSION["SESSION_USERNAME"] . ".\nPassword has not been changed." ;  }
} else if( strcmp($Command, "Logout") == 0 ) { // ------------------------------------------------------------------------------------------------ Logout
	session_unset();   // remove all session variables
	session_destroy(); // close the session
	echo "ok";
} else if( strcmp($Command, "ExportMSWord") == 0 ) { // ------------------------------------------------------------------------------------------ Export Word Document	
	$itemUUIDs  = $Arg1; // separated by comma, start with comma, end with comma, no spaces between
	$FileName   = "tmp_files/" . $Arg2 . ".docx";
	$itemUUIDs = str_replace(" ", "", $itemUUIDs); // force no spaces
	$itemUUIDs = "," . $itemUUIDs . ","; // force start with comma and end with comma
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $Arg1, "", "" );
	$ok = GenerateWordDocument($itemUUIDs, $FileName);
	echo $ok;
} else if( strcmp($Command, "GetMaxIdentifier") == 0 ) { // ------------------------------------------------------------------------ search for the max identifier
	$UserTyped_txt = $Arg1;
	$max = -1;
	$jsonString = file_get_contents("Data/ExcavationData.json");
	$ExcData = json_decode($jsonString, true);
	for ($j = 0; $j<count($ExcData); $j++) { // for each item 
		if( strcmp($ExcData[$j]["Type"], "Image") != 0 ) { // ignore images
			$prefix = substr($ExcData[$j]["Identifier"], 0, strlen($UserTyped_txt));
			if( strcmp($prefix, $UserTyped_txt) == 0 ) {
				$tmp = substr($ExcData[$j]["Identifier"], strlen($UserTyped_txt) );
				$n = intval( $tmp );
				if ($n > $max) { $max = $n; }
			}
		}
	}
	echo $max;
} else if( strcmp($Command, "AddUser") == 0 ) {
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $new_username );
	if( strcmp(strtolower($_SESSION["SESSION_USERNAME"]), "admin") == 0 )  { 
		$new_username  = trim($Arg1);
		$new_password  = trim($Arg2);
		$new_rights    = trim($Arg3);
		if( strlen(new_username) > 0 ) {
			addUser( $new_username, $new_password, $new_rights ); 
			echo( "User " . $new_username . "  was added to the system with password " . $new_password . " and access to " . $new_rights .  ".");
		} else {
			echo( "NO new user was created." );
		}
	} else { 
		echo("This user does not have access rights for such an action.");
	}
} else if( strcmp($Command, "Change_User_Rights") == 0 ) {
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, $new_username );
	if( strcmp(strtolower($_SESSION["SESSION_USERNAME"]), "admin") == 0 )  { 
		$username   = $Arg1;
		$new_rights = $Arg2;
		changeAccessLevels( $username, $new_rights );
		echo( "User " . $username . " has new access rights: " . $new_rights .  ".");
	} else { 
		echo("This user does not have access rights for such an action.");
	}
} else if( strcmp($Command, "Import_iDig_Data") == 0 ) {
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, "" );
	if( strcmp(strtolower($_SESSION["SESSION_USERNAME"]), "admin") == 0 )  { 
		echo( Import_iDig_Data() );
	} else { 
		echo("User ". $_SESSION["SESSION_USERNAME"] ." does not have access rights for such an action.");
	}		
} else if( strcmp($Command, "Import_iDig_Images") == 0 ) {
	LogThis( $UserIP, $_SESSION["SESSION_USERNAME"], $Command, "" );
	if( strcmp(strtolower($_SESSION["SESSION_USERNAME"]), "admin") == 0 ) { 
		echo( Import_iDig_Images() );
	} else { 
		echo("User ". $_SESSION["SESSION_USERNAME"] ." does not have access rights for such an action.");
	}	
} else if( strcmp($Command, "DeleteImage") == 0 ) {
	
	
} else { // -------------------------------------------------------------------------------------------------------------------------------------- ELSE > check URL params
	// the rarely used administration commands can be executed through url params.
	if( strcmp($_GET["cmd"], "info") == 0 ) {
		echo "WebDig says hello.<br>";
		echo "<br>Client IP: <b>" . $UserIP . "</b>";
		echo '<br>PHP version: <b>' . phpversion() . "</b>";
		echo '<br>Session timeout: <b>' . ini_get("session.gc_maxlifetime") . " sec</b>";
		echo "<br>LogFile size: <b>" . filesize("log.txt") . "</b> bytes<br>";
		echo "System date and time (UTC): <b>" . gmdate("Y-m-d") . "   " . gmdate("H:i:s") . "</b>  Unix-Seconds: <b>" . (floor(microtime(true))) . "</b><br>";
		echo "Username: <b>" . $_SESSION["SESSION_USERNAME"] . "</b> Session Start: <b>" . $_SESSION["SESSION_START_SECS"].  "</b><br>"; 
		echo "<br>File Counters:<br>";
		echo "&nbsp;&nbsp;&nbsp;&nbsp;Plans: " . (count(scandir( "./plans/" ))-2) . " files<br>";
		echo "&nbsp;&nbsp;&nbsp;&nbsp;" . "Image files: " . (getFileCount("Data/images/")-getFileCount("Data/images/thumbnails/")) . " images, " . getFileCount("Data/images/thumbnails/") . " thumbnails, " . round(GetDirectorySize("Data/")/1024/1024/1024,2) . " Gbytes<br>";
		echo "&nbsp;&nbsp;&nbsp;&nbsp;" . "Backup files: " . getFileCount("Data/backup/" ) . " files, " . round(GetDirectorySize("Data/backup/")/1024/1024,2) . " Mbytes<br><br>";
	} else if( strcmp($_GET["cmd"], "orphan") == 0 ) { // displays the image filenames which do not exist in the database and the image-items which do not correspond to a file. Example: WebDigServer.php?cmd=orphan
		$jsonString = file_get_contents("Data/ExcavationData.json");
		$ExcData = json_decode($jsonString, true);
		$Files  = scandir( "Data/images/" );
		$Thumbs = scandir( "Data/images/thumbnails/" );
		echo( "<u>" . count($ExcData) . " json items");
		echo ", " . (getFileCount("Data/images/")-getFileCount("Data/images/thumbnails/")) . " images, " . getFileCount("Data/images/thumbnails/") . " thumbnails, " . round(GetDirectorySize("Data/")/1024/1024/1024,2) . " Gbytes</u><br>";
		echo ("<br><b>Images which are not included into the database:</b><br>");
		for ($i = 0; $i<count($Files); $i++) {  // for each image
			if( strpos($Files[$i], ".jpg") > 0 ) { // if it is an image
				$image_is_orphan = true;
				for ($item_idx = 0; $item_idx<count($ExcData); $item_idx++) { // for each item
					if( strcmp($ExcData[$item_idx]["Type"], "Image") == 0  &&  isset($ExcData[$item_idx]["FormatImage"])  && strcmp($ExcData[$item_idx]["FormatImage"], $Files[$i]) == 0 ) {
						$image_is_orphan = false;
						break;
					}
				}
				if( $image_is_orphan ) echo( "&nbsp;&nbsp;&nbsp;&nbsp;" . $Files[$i] . "<br>" );
			}
		}
		echo ("<br><b>Images which do not exist in the server storage:</b><br>");
		for ($item_idx = 0; $item_idx<count($ExcData); $item_idx++) { // for each item
			if( strcmp($ExcData[$item_idx]["Type"], "Image") == 0  &&  isset($ExcData[$item_idx]["FormatImage"]) ) { // if it is an image
				$image_is_orphan = true;
				for ($i = 0; $i<count($Files); $i++) {  // for each image		
					if( strpos($Files[$i], ".jpg") > 0  &&  strcmp($ExcData[$item_idx]["FormatImage"], $Files[$i]) == 0 ) {
						$image_is_orphan = false;
						break;
					}
				}
				if( $image_is_orphan ) echo( "&nbsp;&nbsp;&nbsp;&nbsp;" . $ExcData[$item_idx]["IdentifierUUID"] . "<br>" );
			}
		}
		echo ("<br><b>Image DB items which do not include a photo file:</b><br>");
		for ($item_idx = 0; $item_idx<count($ExcData); $item_idx++) { // for each item 
			if( strcmp($ExcData[$item_idx]["Type"], "Image") == 0  &&  isset($ExcData[$item_idx]["FormatImage"])==false ) { // if it is an image
				echo( "&nbsp;&nbsp;&nbsp;&nbsp;" . $ExcData[$item_idx]["IdentifierUUID"] . "<br>" );
			}
		}
		echo ("<br><b>Image files without a thumbnail:</b><br>");
		for ($i = 0; $i<count($Files); $i++) {  // for each image		
			if( strpos($Files[$i], ".jpg") > 0 ) {
				$image_is_orphan = true;
				for ($j = 0; $j<count($Thumbs); $j++) {  // for each thumbnail
					if( strcmp($Files[$i], $Thumbs[$j]) == 0 ) {
						$image_is_orphan = false;
						break;
					}
				}
				if( $image_is_orphan ) echo( "&nbsp;&nbsp;&nbsp;&nbsp;" . $Files[$i] . "<br>" );
			}
		}
		echo ("<br><b>Thumbnail images without an original size image file:</b><br>");
		for ($j = 0; $j<count($Thumbs); $j++) {  // for each thumbnail
			if( strpos($Thumbs[$j], ".jpg") > 0 ) {
				$image_is_orphan = true;
				for ($i = 0; $i<count($Files); $i++) {  // for each image		
					if( strcmp($Files[$i], $Thumbs[$j]) == 0 ) {
						$image_is_orphan = false;
						break;
					}
				}
				if( $image_is_orphan ) echo( "&nbsp;&nbsp;&nbsp;&nbsp;" . $Thumbs[$j] . "<br>" );
			}
		}
	} else if( strcmp($_GET["cmd"], "adduser") == 0 ) { // example: WebDigServer.php?cmd=adduser&username=Marion&password=123456&access=Coin,Bone
		addUser( $_GET["username"], $_GET["password"], $_GET["access"] ); 
		echo( "User '" . $_GET["username"] . "'  added to the system with password " . $_GET["password"] . " and access to " . $_GET["access"] .  ".");
	} else if( strcmp($_GET["cmd"], "test") == 0 ) { // used for testing. example: WebDigServer.php?cmd=test
		//echo "<br>Done.";
	}
}


// =========================================================================================================================================================
// =========================================================================================================================================================
// =========================================================================================================================================================
// =========================================================================================================================================================

/**
  * Raises the concurrency flag, which is used to prevent data from being accesed by two users at the same time. 
  * This flag is a file which is created before a save action begins and is deleted after the save action has finished.
  * If the flag is already raised the function waits for it to be lowered or until timetout of several seconds is reached.
  */
function Raise_ConcurrencyFlag() {
	$FlagFilename = "DataSaving.txt";
	// Wait for the saving-concurrency-flag to be lowered. 
	$NOWsec = floor(microtime(true));
	$FLAGCREATIONsec = $NOWsec;
	while( file_exists($FlagFilename)  &&  $NOWsec-$FLAGCREATIONsec<8 ) { // a flag which is raised for several seconds is considered obsolete.
		usleep(200000); // micro-seconds
		$FLAGCREATIONsec = filectime($FlagFilename);
		$NOWsec = floor(microtime(true));
	}
	// raise the saving-concurrency-flag
	touch( $FlagFilename );
}

/**
  * Lowers the concurrency flag, which is used to prevent data from being accesed by two users at the same time. 
  * This flag is a file which is created before a save action begins and is deleted after the save action has finished.
  * If the flag is already raised the function waits for it to be lowered or until timetout of several seconds is reached.
  */
function Lower_ConcurrencyFlag() {
	$FlagFilename = "DataSaving.txt";
	unlink( $FlagFilename );
}


/**
 * Takes a password and returns the hash value calculated on it
 */
function getPasswordHash( $a_password ) {
	return password_hash($a_password, PASSWORD_DEFAULT, ['cost' => 12]);
}	
/*
 * Adds a user to the system. Example addUser("Marion", "123456", "Coin,Bone")
 */
function addUser( $NewUsername, $NewPassword, $AccessLevels ) {
	$fd = fopen("p.txt", "a");
	fwrite($fd, $NewUsername . " " . getPasswordHash($NewPassword) . " " . $AccessLevels . "\n");
	fclose($fd);
}
/*
 * Checks credentials of a user. 
 * If user is found in the system then the items she can edit is returned as a comma separated string.
 * If user is not in the system then an empty string is returned.
 * Reference: https://stackoverflow.com/questions/1581610/how-can-i-store-my-users-passwords-safely
 */
function getAccessLevels( $username, $password ) { 
	$result = "";
	$fd = fopen("p.txt", "r");
	if ($fd) {
		while (($line = fgets($fd)) !== false) {
			$rec = explode(" ", $line);
			if( strcmp(strtolower($rec[0]), strtolower($username))==0  &&  password_verify($password, $rec[1]) ) {
				$result = $rec[2];
				break;
			}
		}
	}
	fclose($fd);
	$result = str_replace(  " ", "", $result );
	$result = str_replace( "\r", "", $result );
	$result = str_replace( "\t", "", $result );
	$result = str_replace( "\n", "", $result );
	return $result;
}

/*
 * Alters the access levels (=rights) of a user.
 * The action is allowed only to admin user and the access levels are stored into a text file along with username and password.
 */
function changeAccessLevels( $username, $new_access_levels ) { 
	$ok = false;
	$oldfile = fopen("p.txt", "r");
	if ($oldfile) {
		$newfile = fopen("p.tmp", "w");
		while (($line = fgets($oldfile)) !== false) { // read all lines from the users file
			$rec = explode(" ", $line);
			// copy the lines to a new users file, except of the line regarding this username. For it check the credentials and replace with a new line with the new password
			if( strcmp(strtolower($rec[0]), strtolower($username))==0 ) { 
				fwrite($newfile, $rec[0] . " " . $rec[1] . " " . $new_access_levels . "\n");
				$ok = true;
			} else {
				fwrite($newfile, $line);
			}
		}
		fclose($oldfile);
		fclose($newfile);
		rename("p.tmp", "p.txt");
	}
	return $ok;
}

/**
 * Changes the password of a user.
 * Returns true for succes. False means that the okd password was probably incorrect
 */
function changePassword( $username, $OldPassword, $NewPassword ) {
	$ok = false;
	$oldfile = fopen("p.txt", "r");
	if ($oldfile) {
		$newfile = fopen("p.tmp", "w");
		while (($line = fgets($oldfile)) !== false) { // read all lines from the users file
			$rec = explode(" ", $line);
			// copy the lines to a new users file, except of the line regarding this username. For it check the credentials and replace with a new line with the new password
			if( strcmp(strtolower($rec[0]), strtolower($username))==0   &&   password_verify($OldPassword, $rec[1]) ) { 
				fwrite($newfile, $rec[0] . " " . getPasswordHash($NewPassword) . " " . $rec[2] . "\n");
				$ok = true;
			} else {
				fwrite($newfile, $line);
			}
		}
		fclose($oldfile);
		fclose($newfile);
		rename("p.tmp", "p.txt");
	}
	return $ok;
}



function LogThis( $a1="", $a2="", $a3="", $a4="", $a5="", $a6="", $a7="", $a8=""  ) {
	// remove old records if necessary
	clearstatcache(); // remove obsolete information about the files
	if ( filesize("log.txt") > 2001001 ) { // ~2 Mbyte
		$lines_to_del = 500;
		$oldfile = fopen("log.txt", "r");
		if ($oldfile) {
			$newfile = fopen("tmplog.txt", "w");
			$line_idx = 0;
			while (($line = fgets($oldfile)) !== false) {
				$line_idx += 1;
				if( $line_idx > $lines_to_del) fwrite($newfile, $line);
			}
			fclose($oldfile);
			fclose($newfile);
			rename("tmplog.txt", "log.txt");
		}
	}
	// add the new record
	$logfile = fopen("log.txt", "a");
	$record_txt  = gmdate('d-m-Y H:i:s');
	$record_txt .= "\t" . substr($a1, 0, 30);
	$record_txt .= "\t" . substr($a2, 0, 30);
	$record_txt .= "\t" . substr($a3, 0, 30);
	$record_txt .= "\t" . substr($a4, 0, 30);
	$record_txt .= "\t" . substr($a5, 0, 30);
	$record_txt .= "\t" . substr($a6, 0, 30);
	$record_txt .= "\t" . substr($a7, 0, 30);
	$record_txt .= "\t" . substr($a8, 0, 30);
	fwrite($logfile, $record_txt . "\r\n");
	fclose($logfile);
}





/**
 * Logs an alteration at the database. The information saved is the date and time of alteration and the information in the arguments
 * @param {String} $username: the user who commanded the data alteration
 * @param {String} $item_identifier: the identifier of the altered item 
 * @param {String} $itemfield: the field of the altered item 
 */
function LogDataChange( $username, $item_identifier, $altered_fields ) {
	// remove fields which do not present valuable information. These are always altered on a data change.
	$altered_fields = str_replace(", DateModified", "", $altered_fields); 
	$altered_fields = str_replace("DateModified, ", "", $altered_fields);
	$altered_fields = str_replace("DateModified"  , "", $altered_fields);
	$altered_fields = str_replace(", UpdatedByUser", "", $altered_fields); 
	$altered_fields = str_replace("UpdatedByUser, ", "", $altered_fields);
	$altered_fields = str_replace("UpdatedByUser"  , "", $altered_fields);
	$altered_fields = trim($altered_fields);
	$record_txt  = gmdate('d-m-Y H:i:s');
	$record_txt .= "\t" . $username;
	$record_txt .= "\t" . $item_identifier;
	$record_txt .= "\t" . $altered_fields;
	$record_txt .= "\r\n";
	file_put_contents("DataChanges.txt", $record_txt, FILE_APPEND | LOCK_EX);
}



/**
 * @param {String} $Item1: json object with data of an item
 * @param {String} $Item2: json object with data of an item
 * @return all field names which have different values between Item1 and Item2 or do not exist in Item2, separated by a comma and a space. Some app-specific fields are ignored.
 */
function getFieldDifferences( $Item1, $Item2 ) {
	$result = "";
	$field_names = array_keys( $Item1 );
	for ($i = 0; $i<count($field_names); $i++) {
		try {
			$difference_found = false;
			// ignore run-time fields
			if( strcmp($field_names[$i], "Visible")==0 || strcmp($field_names[$i], "Selected")==0 || strcmp($field_names[$i], "InPlan")==0 ) { 
				continue; 
			}
			// check if Item1 contains a new field 
			if( isset($Item2[$field_names[$i]]) == false ) {
				$difference_found = true;
			} else { 
				// check field type
				if ( strcmp(gettype($Item1[$field_names[$i]]),"array") != 0  &&  strcmp(gettype($Item2[$field_names[$i]]),"array") != 0 ) {
					if( strcmp(strval($Item1[$field_names[$i]]), strval($Item2[$field_names[$i]])) != 0 ) {
						$difference_found = true;
					}
				}
			}
			//
			if( $difference_found ) {
				if( strlen($result) > 0 ) $result = $result . ", ";
				$result = $result . $field_names[$i];
			}
		} catch(Exception $e) { }	
	}
	return $result;
}


/**
 * @return the IP of the client who has accessed the server
 */
function getClientIP() {
	$ip = "";
	if(!empty($_SERVER['HTTP_CLIENT_IP'])) {  // whether ip is from the share internet  
		$ip = $_SERVER['HTTP_CLIENT_IP'];  
	} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {  // whether ip is from the proxy  
		$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
	} else { //whether ip is from the remote address    
		$ip = $_SERVER['REMOTE_ADDR'];  
	}
    return $ip;  
}


/**
 * creates and returns a pretty random random-seed number
 */
function make_seed() {
  list($usec, $sec) = explode(' ', microtime());
  return $sec + $usec * 1000000;
}

/**
 * adds zeros to the left of a string so that it has two digits
 */
function Lengthen2( $s ) {
	if( strlen($s) == 1 ) {
		return "0" . $s;
	} else {
		return $s;
	}
}


/**
 * This functions executes all theh backup-related actions:
 *     - clears old backup files
 *     - checks if a backup is needed
 *     - keeps a backup
 *     - zips the new backup file
 * The function is called whenever a user tries to save something
 */
function BackUpExcavationData() {
	$BACKUP_LIFETIME_HOURS = 24 * 600; // backup-files older than this time will be deleted 
	$MAX_HOURS_WITHOUT_BACKUP = 5;
	clearstatcache(); // remove obsolete information about the files
	// BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB delete old backup files
	$hours_without_backup = -1;
	$BackupFiles = scandir( "Data/backup/" );
	$NowDate = strtotime( gmdate("Y-m-d H:i:s") ); //$NowDate = time();
	for ($i = 0; $i<count($BackupFiles); $i++) {
		if( strlen($BackupFiles[$i]) < 5 ) {
			continue;
		}
		try {
			$str_date = $BackupFiles[$i];
			$str_date = str_replace( ".json", "", $str_date);
			$str_date = str_replace( ".zip", "", $str_date);
			$str_date = str_replace( "-", "/", $str_date);
			$str_date = str_replace( "_", ":", $str_date);
			$BackupDate = strtotime( $str_date );
			$interval_hours = $NowDate - $BackupDate; // seconds
			$interval_hours = $interval_hours / 3600;
			if( $interval_hours > $BACKUP_LIFETIME_HOURS ) { // that is an old file, delete it 
				unlink( "Data/backup/" . $BackupFiles[$i] );	
			}
			if( $hours_without_backup > $interval_hours  ||  $hours_without_backup <= 0 ) {
				$hours_without_backup = $interval_hours;
			}
		} catch(Exception $e) {
			continue;
		}	
	}
	
	// BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB check if it is time to take a backup and keep the backup 
	if( $hours_without_backup < 0  ||  $hours_without_backup > $MAX_HOURS_WITHOUT_BACKUP ) {
		$Now_YMD = gmdate("Y-m-d"); // date string
		$Now_HIS = gmdate("H_i_s"); // time string
		$sourceFile = "Data/ExcavationData.json";
		$backupFile = "Data/backup/" . $Now_YMD . " ". $Now_HIS . ".json";
		if (!file_exists("Data/backup/")) { // create the backup folder if not exists already
			mkdir("Data/backup/", 0777, true);
		}
		copy($sourceFile, $backupFile);
		// BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB zip the new backup file
		try {
			$zipFile = str_replace( ".json", ".zip", $backupFile);
			$zip = new ZipArchive;
			$zip->open($zipFile, ZipArchive::CREATE);
			$zip->addFile( $backupFile );
			$zip->close();
		} catch(Exception $e) { }
		// BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB del the unzipped file
		unlink($backupFile);
	}
}






/**
 * @return a string containig a new unique UUID which will be used for a new item. It is composed of date, time and random digits
 */
function constructNewUUID() {
	$characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	$numbers = "0123456789";
	$Now_YMD = gmdate("Y-m-d"); // date string
	$Now_HIS = gmdate("H_i_s"); // time string
	$Now_msec = time();
	$newUUID = "";
	$newUUID .= gmdate("d", $Now_msec);
	$newUUID .= gmdate("m", $Now_msec); 
	$newUUID .= gmdate("Y", $Now_msec);
	$newUUID .= "-";
	$newUUID .= gmdate("H", $Now_msec);
	$newUUID .= gmdate("m", $Now_msec);
	$newUUID .= gmdate("s", $Now_msec);
	$newUUID .= "-";
	$n = rand(0, strlen($characters)-1);
	$newUUID .= $characters[ $n ];
	$n = rand(0, strlen($characters)-1);
	$newUUID .= $characters[ $n ];
	$n = rand(0, strlen($numbers)-1);
	$newUUID .= $numbers[ $n ];
	$n = rand(0, strlen($numbers)-1);
	$newUUID .= $numbers[ $n ];
	return $newUUID;
}


/**
  * @arg $path (string) a folder path
  * @return a folder's size in bytes ( Recursively reads the files in the subfolders, as well )
  */
function GetDirectorySize($path){
    $bytestotal = 0;
    $path = realpath($path);
    if($path!==false && $path!='' && file_exists($path)){
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $object){
            $bytestotal += $object->getSize();
        }
    }
    return $bytestotal;
}

/**
  * @arg $path (string) a folder path
  * @return the number of files in a folder ( Recursively reads the files in the subfolders, as well )
  */
function getFileCount($path) {
    $size = 0;
    $ignore = array('.','..','cgi-bin','.DS_Store');
    $files = scandir($path);
    foreach($files as $t) {
        if(in_array($t, $ignore)) continue;
        if (is_dir(rtrim($path, '/') . '/' . $t)) {
            $size += getFileCount(rtrim($path, '/') . '/' . $t);
        } else {
            $size++;
        }   
    }
    return $size;
}



/**
  * Creates a thumbnail of an image and stores it in a folder.
  * @arg $image_path (string) the full path file name of the image.
  * @arg $thumbnail_path (string) the full path where the thumbnail will be stored, must end in '/'.
  */
function CreateThumbnail( $image_path, $thumbnail_path, $thumb_height ) {
	//debug_print("ZORO X1 " . $image_path . " " . $thumbnail_path . " " . $thumb_height . "\r\n" );
	$image_filename = substr( $image_path, strrpos($image_path,"/")+1 );
	//debug_print("ZORO X2 " . $image_filename . "\r\n" );
	list($img_width, $img_height) = getimagesize( $image_path );
	//debug_print("ZORO X3 " . $img_width . " " . $img_height . "\r\n" );
	$thumb_width = (int) ($img_width * ($thumb_height / $img_height));
	//debug_print("ZORO X4 " . $thumb_width . " " . $thumb_height . "\r\n" );
	$thumb = imagecreatetruecolor($thumb_width, $thumb_height);
	//debug_print("ZORO X5 " . $image_path . "\r\n" );
	$source = imagecreatefromjpeg( $image_path );
	//debug_print("ZORO X6 " . "\r\n" );
	imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumb_width, $thumb_height, $img_width, $img_height);
	//debug_print("ZORO X7 " . $thumbnail_path . $image_filename . "\r\n" );
	imagejpeg($thumb, $thumbnail_path . $image_filename);
	//debug_print("ZORO X8 " . $image_path . "\r\n" );
}




/**
  * When an item's data are changed, this function is called to store the item's data in a seperate file.
  * The new data can be send by the server to any active user who asks for it, in order to see the updated information.
  * The items in the file contain UpdatedByUser and DateModified fields which coordinate 
  * which records should be sent to the user and when they should be removed.
  * @arg $item_data (json) the data of an item.
  */
function Store_NewData_forPropagation( $item_data ) {
	// Read the existing NewData-for-propagation
	$NewData = null;
	if(file_exists("tmp_files/NewData.json")) {
		$jsonString = file_get_contents("tmp_files/NewData.json");
		$NewData = json_decode($jsonString, true);
	}
	if( $NewData == null ) $NewData = [];
	// check if a record for this item exists already in the NewData-for-propagation
	$idx = -1;
	for ($i = 0; $i<count($NewData); $i++) {	
		if( strcmp($NewData[$i]["IdentifierUUID"], $item_data["IdentifierUUID"]) == 0) {
			$idx = $i;
		}
	}
	// if a record for this item exists already in the NewData-for-propagation, then update the record, else append the new item's data
	if( $idx >= 0 ) {
		$NewData[$idx] = $item_data;
	} else {
		if( $item_data != null ) array_push ( $NewData, $item_data);
	}
	// Save the NewData-for-propagation file
	$newJsonString = json_encode($NewData, JSON_PRETTY_PRINT);
	file_put_contents("tmp_files/NewData.json", $newJsonString, LOCK_EX);
}



/**
  * Returns json data of items which have been edited after the time given in the argument.
  * @arg $after_this_GMT_str (String) Format: "Y-m-d H:i:s". Example: "2023-10-25 11:03:42"
  */
function GetNewData( $after_this_GMT_str ) {
	$result = "";
	$result_json = [];
	$newdata_filename = "tmp_files/NewData.json";
	if( file_exists($newdata_filename) == false ) return ""; // <<<<
	// parse dates
	$now_date_str = gmdate("Y-m-d") . " ". gmdate("H:i:s");
	$now_date_obj = new DateTime($now_date_str);
	$after_this_GMT_obj = new DateTime($after_this_GMT_str);
	// Read the existing NewData-for-propagation
	$jsonString = file_get_contents($newdata_filename);
	$NewData = json_decode($jsonString, true);
	// Remove old entries
	$num_of_removed_entries = 0;
	$entry_removed = true;
	while( $entry_removed ) {
		$entry_removed = false;
		for ($i = 0; $i<count($NewData); $i++) {
			$entry_date_str = $NewData[$i]["DateModified"];
			$entry_date_obj = new DateTime($entry_date_str);
			$difference = $entry_date_obj->diff($now_date_obj);
			$total_hours = ($difference->days * 24) + $difference->h; 
			if( $total_hours > 10 ) { // this is an old entry, remove it
				array_splice( $NewData, $i, 1 );
				$entry_removed = true;
				$num_of_removed_entries++;
				break;	
			}
		}
	}
	// Save
	if( $num_of_removed_entries > 0 ) {
		file_put_contents("tmp_files/NewData.json", json_encode($NewData, JSON_PRETTY_PRINT) ,LOCK_EX);
	}
	// collect the data which are younger than the function argument
	for ($i = 0; $i<count($NewData); $i++) {
		if(strcmp($_SESSION["SESSION_USERNAME"], $NewData[$i]["UpdatedByUser"]) != 0) { // the data was altered from another user
			$entry_date_str = $NewData[$i]["DateModified"];
			$entry_date_obj = new DateTime($entry_date_str);
			$date_diff = $entry_date_obj->getTimestamp() - $after_this_GMT_obj->getTimestamp(); 
			if( $date_diff > 0 ) {
				array_push( $result_json, $NewData[$i] );
			}
		}
	}
	//
	$result = json_encode($result_json);
	return $result;
}



/**
  * Reads the txt file 'login_times.json', which contains the username and last login date and time of each user.
  * @return the number of registered users (non-guest) who have logged within the last 50 minutes.
  */
function getNumOfActiveUsers() {
	$result = 0;
	$now_date_str = gmdate("Y-m-d") . " ". gmdate("H:i:s");
	$now_date_obj = new DateTime($now_date_str);
	// read the json file with the usernames and login times
	$jsonString = file_get_contents("login_times.json");
	$UserLogins = json_decode($jsonString, true);
	// count those users who have logged in recently
	for ($i = 0; $i<count($UserLogins); $i++) {
		if( strcmp(strtolower($UserLogins[$i]["Username"]), "guest") != 0 ) {
			$LoginTime_obj = new DateTime($UserLogins[$i]["Date"]." ".$UserLogins[$i]["Time"]);
			$difference = $LoginTime_obj->diff($now_date_obj);
			$mins_since_last_login = ($difference->days*24*60) + $difference->h*60 + $difference->i;
			if( $mins_since_last_login < 50 ) {
				$result++;
			}
		}
	}
	return $result;
}


/**
  * Writes a debug message into a file on the server, to be checked for debugging purposes
  */
function debug_print( $msg ) {
	file_put_contents("tmp_files/debug.txt", $msg, LOCK_EX | FILE_APPEND );
}




/**
  * Commands the web server to process iDig json data.  
  * The iDig data are:
  *    ExcavationData.json at web-server folder Data/ will be processed to add new items and append to them new fields.
  *    Preferences.json at web-server folder Data/ will be processed to add functionality.
  */
function Import_iDig_Data() {
	$Reply = "";
	$all_Types = [];
	$all_Categories = [];
	$last_Plan_name = ""; // the last Plan is probably the most recent one
	$FieldNames = array(); // json object containing array of fields for each Type and Category
	$SystemFieldNames = ["IdentifierUUID", "CoverageXYZ", "RightsTrashed", "RightsStatus", "RightsLocked", "DateTimeZone", "CoverageSerialized", "RightsDeleted", "CoveragePosition", "RightsSidelined", "RelationBelongsToUUID", "CoverageGEO", "Location", "RelationIsBelowUUID", "RelationIncludesUUID", "CoverageEnvelopeXYZ", "RelationCutsUUID", "CoverageEnvelopeGEO", "RelationIncludes", "RelationIsBelow", "RelationIsNextToUUID", "RelationIsNextTo", "RelationIsCutBy", "RelationAttachments", "RelationCuts", "RelationBelongsTo", "ThumbnailImageUUID", "DateModified", "RelationIsCutByUUID", "FormatImageHeight", "FormatImageWidth", "RelationIsAbove", "RelationIsAboveUUID", "FormatImageEnvelopeGEO", "FormatImageTransformXYZ", "FormatImageEnvelopeXYZ", "FormatImageTransformGEO", "FormatImage"];
	$duplicates_list = "";
	$num_of_added_items = 0;
	$num_of_duplicates = 0;
	// ================ open data JSON Files ================
	$ExcData  = json_decode( file_get_contents("Data/ExcavationData.json"), true );
	$iDigData = json_decode( file_get_contents("Data/iDig.json"), true );
	// -------- add any new items from iDig to the Excavation data
	for ($i=0; $i<count($iDigData); $i++) {
		$idx = getIndexBy_UUID( $ExcData, $iDigData[$i]["IdentifierUUID"] );
		if( $idx < 0 ) { // this is a new item to be added
			// ---- check unique Identifier
			$idx = getIndexBy_Identifier( $ExcData, $iDigData[$i]["Identifier"] );
			if( $idx >= 0 ) { // the Identifier of the new item already exists
				$num_of_duplicates += 1;
				$report = true;
				//if( isset($iDigData[$i]["Type"]) && strcmp($iDigData[$i]["Type"], "Image")==0 ) $report = false;
				if( $report ) {
					$duplicates_list .= "  " . $iDigData[$i]["IdentifierUUID"] . "    " . $iDigData[$i]["Identifier"] . "\n";
				}
			}
			// ---- set trench name
			if( isset($iDigData[$i]["Source"]) ) {
				$iDigData[$i]["Trench"] = $iDigData[$i]["Source"];
			}
			// ---- convert 'Material' field from array to stirng
			if( isset($iDigData[$i]["Material"]) ) {
				$material_array = $iDigData[$i]["Material"];
				$material_str = "";
				for ($m=0; $m<count($material_array); $m++) {
					if($m > 0) $material_str .= ", ";
					$material_str .= $material_array[$m];
				}
				$iDigData[$i]["Material"] = $material_str;
			}
			// ---- resolve the name of the last Plan
			//debug_print( $iDigData[$i]["Type"] . "/\n" );
			if( isset($iDigData[$i]["Type"])  &&  strcmp($iDigData[$i]["Type"], "Plan")==0 ) {
				//debug_print( $iDigData[$i]["Title"] . "  >>> " . $last_Plan_name . ".\n" );
				if( isset($iDigData[$i]["Title"]) ) $last_Plan_name = $iDigData[$i]["Title"];
			}
			// ---- add the new item to the database
			$num_of_added_items += 1;
			array_push($ExcData, $iDigData[$i]);
		}
	}
	
	// -------- add fields to data items
	for ($i=0; $i<count($ExcData); $i++) {	// for each database item
		// ---- resolve all Types and Categories
		if( isset($ExcData[$i]["Type"])     && in_array($ExcData[$i]["Type"],     $all_Types     )==false ) array_push($all_Types,      $ExcData[$i]["Type"]);
		if( isset($ExcData[$i]["Category"]) && in_array($ExcData[$i]["Category"], $all_Categories)==false ) array_push($all_Categories, $ExcData[$i]["Category"]);
		
		// ---- resolve fields for each Type and Category
		if( in_array($ExcData[$i]["Type"], $FieldNames) == false ) { // a yet unprocessed Type found
			$F = [];
			foreach( array_keys($ExcData[$i]) as $key ) { // retrieve all fields from this Type except of the system fields
				if( in_array($key, $SystemFieldNames) == false ) array_push($F, $key);
			}
			if( is_null($F) ) $F = ["Title", "Identifier", "Source", "Trench", "Type", "Category", "Description" ];
			$FieldNames[ $ExcData[$i]["Type"] ] = $F;
		}
		if( in_array($ExcData[$i]["Category"], $FieldNames) == false ) { // a yet unprocessed Category found
			$F = [];
			foreach( array_keys($ExcData[$i]) as $key ) { // retrieve all fields from this Category except of the system fields
				if( in_array($key, $SystemFieldNames) == false ) array_push($F, $key);
			}
			if( is_null($F) ) $F = ["Title", "Identifier", "Source", "Trench", "Type", "Category", "Description" ];
			$FieldNames[ $ExcData[$i]["Category"] ] = $F;
		}
		
		// ---- check if thumbnail is set, if not then set ThumbnailImageUUID
		if( isset($ExcData[$i]["ThumbnailImageUUID"])==false && isset($ExcData[$i]["RelationIncludesUUID"]) ) { 
			$childrenUUIDs = explode(',', str_replace("\n", ",", $ExcData[$i]["RelationIncludesUUID"][0]));
			for ($k=0; $k<count($childrenUUIDs); $k++) {
				$idx = getIndexBy_UUID( $ExcData, $childrenUUIDs[$k] );
				if( $idx >= 0 ) {
					if( isset($ExcData[$idx]["Type"]) && strcmp($ExcData[$idx]["Type"], "Image")==0 ) {
						$ExcData[$i]["ThumbnailImageUUID"] = $ExcData[$idx]["IdentifierUUID"];
						break;
					}
				}
			}
		}
		// ---- set Location based on CoverageXYZ field
		if( isset($ExcData[$i]["Location"])==false && isset($ExcData[$i]["CoverageXYZ"]) ) { 
			$coordinates_str = $ExcData[$i]["CoverageXYZ"];
			$coordinates_str = substr( $coordinates_str, strrpos($coordinates_str, "(")+1 );
			$coordinates_str = substr( $coordinates_str, 0, strpos($coordinates_str, ")") );
			$Points = explode(',', $coordinates_str);
			$ExcData[$i]["Location"] = [];
			for ($j=0; $j<count($Points); $j++) {
				$Points[$j] = trim( $Points[$j] );
				$Coordinates = explode(' ', $Points[$j]);
				$point_X = (float)$Coordinates[0];
				$point_Y = (float)$Coordinates[1];
				$point_Z = 0.0;
				if( count($Coordinates) >= 3 ) $point_Z = (float)$Coordinates[2];
				$XYZ_array = array( "X"=>$point_X, "Y"=>$point_Y, "Z"=>$point_Z );
				array_push( $ExcData[$i]["Location"], $XYZ_array );
			}
		}
	}
	// ------------ save ExcavationData.json
	file_put_contents("Data/ExcavationData.json", json_encode($ExcData, JSON_PRETTY_PRINT), LOCK_EX);
	
	// ================ process Preferences.json ================
	$PreferencesData = json_decode( file_get_contents("Data/Preferences.json"), true );
	if( isset($PreferencesData["DefaultTrench"])==false ) $PreferencesData["DefaultTrench"] = "All";
	if( isset($PreferencesData["DefaultPlan"])==false ) $PreferencesData["DefaultPlan"] = $last_Plan_name;
	if( isset($PreferencesData["Plan_GeoReferencing_field"])==false ) $PreferencesData["Plan_GeoReferencing_field"] = "FormatImageEnvelopeGEO";
	if( isset($PreferencesData["ItemsList_SortByFields"])==false ) $PreferencesData["ItemsList_SortByFields"] = ["Type", "Category", "Identifier"];
	if( isset($PreferencesData["Colors"])==false ) {
		$json_colors->selected = "gold";
		$json_colors->focused = "teal";
		$json_colors->various = "darkorchid";
		$json_colors->highlight = "crimson";
		$json_colors->crosssection = "crimson";
		$json_colors->distances = "green";
		$json_colors->artifact = "skyblue";
		$json_colors->locus =  "rgb(255, 160, 122)";
		$json_colors->feature = "rgb(238, 130, 238)";
		$json_colors->partition = "rgb(238, 130, 238)";
		$PreferencesData["Colors"] = $json_colors;
	}
	$all_Types_and_Categories = [""];
	$all_Types_and_Categories = array_merge( $all_Types_and_Categories, $all_Types );
	$all_Types_and_Categories = array_merge( $all_Types_and_Categories, $all_Categories );
	if( isset($PreferencesData["EditableItemFields"])==false ) $PreferencesData["EditableItemFields"] = [];
	if( isset($PreferencesData["VisibleItemFields"])==false )  $PreferencesData["VisibleItemFields"] = [];
	for ($i=0; $i<count($all_Types_and_Categories); $i++) {
		$field_names = $FieldNames[ $all_Types_and_Categories[$i] ]; //["Title", "Description", "Source", "Modifier", "Subcategory", "Color", "Hue", "Boundary"];
		$field_info  = array( "Type"=>$all_Types_and_Categories[$i], "FieldNames"=>$field_names );
		array_push( $PreferencesData["EditableItemFields"], $field_info );
		array_push( $PreferencesData["VisibleItemFields"], $field_info );
	}
	file_put_contents("Data/Preferences.json", json_encode($PreferencesData, JSON_PRETTY_PRINT), LOCK_EX);
	
	// verbose
	$Reply .= $num_of_added_items . " new items were added.\n";
	if( $num_of_duplicates > 0 ) {
		$Reply .= "WARNING: " . $num_of_duplicates . " items have duplicate Identifiers:\n";
		$Reply .= $duplicates_list;
	}
	return $Reply;
}



/**
  * processes images at the web-server folder Data/images and creaates thumbnails if they do not exist.
  * This action has to be repeated many times in order to process all images, since PHP scripts can run for limited time only.
  */
function Import_iDig_Images() {
	$start_sec = time();
	$num_of_imports = 0;
	$num_of_duplicates = 0;
	$duplicates_list = "";
	$errors_list = "";
	$import_filenames = scandir( "Data/images_for_import/" );
	// create folders
	if (!file_exists("Data/images/")) { mkdir("Data/images/", 0755, true); }
	if (!file_exists("Data/images/thumbnails/")) { mkdir("Data/images/thumbnails/", 0755, true); }
	if (!file_exists("Data/images/thumbnails_mini/")) { mkdir("Data/images/thumbnails_mini/", 0755, true); }
	// process images (must be .jpg files in Data/images_for_import/ folder)
	for ($i=0; $i<count($import_filenames); $i++) { // for each image create two thumbnails
		if( strlen($import_filenames[$i]) < 4 ) continue;
		$now_sec = time();
		if( $now_sec - $start_sec > 25 ) break; // abort if it takes too long, the user should try again later
		//
		if( file_exists("Data/images/".$import_filenames[$i]) == false ) {
			$num_of_imports += 1;
			// rename file exension from JPG or jpeg to simply jpg 
			$img_name = substr( $import_filenames[$i] ,  0, strpos($import_filenames[$i], '.') );
			$img_extension = substr( $import_filenames[$i] ,  strpos($import_filenames[$i], '.')+1 );
			if( strcmp($img_extension, "jpg"  ) != 0 ) {
				$img_extension = strtolower($img_extension);
				if( strcmp($img_extension, "jpeg" ) == 0 ) $img_extension = "jpg";
				if( strcmp($img_extension, "jpg" ) != 0 ) {
					$errors_list .= "Wrong extension: " . $import_filenames[$i] . "\n";
				} else {
					rename( "Data/images_for_import/".$import_filenames[$i], "Data/images/".$img_name.".jpg" );
					$import_filenames[$i] = $img_name.".jpg";
				}
			}
			// import images into the web app
			rename( "Data/images_for_import/".$import_filenames[$i], "Data/images/".$import_filenames[$i] );
			if( file_exists("Data/images/thumbnails/"+$import_filenames[$i]) == false ) {
				CreateThumbnail("Data/images/".$import_filenames[$i],  "Data/images/thumbnails/", 200);
			}
			if( file_exists("Data/images/thumbnails_mini/"+$import_filenames[$i]) == false ) {
				CreateThumbnail("Data/images/".$import_filenames[$i],  "Data/images/thumbnails_mini/", 80);
			}
		} else {
			$num_of_duplicates += 1;
			$duplicates_list .= "  " . $import_filenames[$i] . "\n";
		}
	}
	$msg = "";
	$msg .= $num_of_imports . " images were processed into thumbnails.\n";
	if( $num_of_duplicates > 0 ) {
		$msg .= $num_of_duplicates . " duplicates found:\n";
		$msg .= $duplicates_list;
	}
	if( strlen($errors_list) > 0 ) {
		$msg .= "ERRORS:\n";
		$msg .= $errors_list;
	}
	return $msg;
}




/** 
 * SERIAL SEARCH. Finds and returns the index of an item according to its IdentifierUUID field 
 */
function getIndexBy_UUID( $json_data, $UUID ) {
	$pos = -1;
	for ($i=0; $i<count($json_data); $i++) {
		if( strcmp($json_data[$i]["IdentifierUUID"], $UUID ) == 0 ) {
			$pos = $i;
			break;
		}
	}
    return $pos;
}

/** 
 * SERIAL SEARCH. Finds and returns the index of an item according to its Identifier field 
 */
function getIndexBy_Identifier( $json_data, $Identifier ) {
	$pos = -1;
	for ($i=0; $i<count($json_data); $i++) {
		if( strcmp($json_data[$i]["Identifier"], $Identifier ) == 0 ) {
			$pos = $i;
			break;
		}
	}
    return $pos;
}


?>