<?php

/*
 * This code uses PHPWord in order to eport data in MS-Word format (https://github.com/PHPOffice/PHPWord/tree/master/src/PhpWord).
 * Installing PHPWord needs to run the following command at the web server from terminal: "composer require phpoffice/phpword"
 * PHPWord is installed in folder "vendor" which is at the same level as public_html
*/
require_once __DIR__ . '/../vendor/autoload.php';



/**
  * Creates a word document containing one page for each item with photos and information about that item. 
  * The filename should be the current time as Unix seconds with docx extension.
  * @arg $UUIDS_to_export (String) The IDs of the items the data of which will be exported. Separated by comma, start with comma, end with comma, no spaces between.
  * @arg $FileName (String) The exported filename. It should be the current time as Unix seconds with docx extension. Example: 649232421.docx. It is given as argument by the client so that he knows what to download.
  */
function GenerateWordDocument($UUIDS_to_export, $FileName) {
	// load trench data
	$jsonString = file_get_contents("Data/ExcavationData.json");
	$TrenchData = json_decode($jsonString, true);
	
	// init word document
	$phpWord = new \PhpOffice\PhpWord\PhpWord();
	
	// escape special characters in content
	\PhpOffice\PhpWord\Settings::setOutputEscapingEnabled(true);
	
	// define Fonts
	$phpWord->addFontStyle(  "GlobalFont_normal", array('name' => 'Calibri', 'size' => 12, 'color' => 'black', 'bold' => false) );
	$phpWord->addFontStyle(  "GlobalFont_bold"  , array('name' => 'Calibri', 'size' => 12, 'color' => 'black', 'bold' => true)  );
	$phpWord->addFontStyle(  "GlobalFont_cover" , array('name' => 'Calibri', 'size' => 40, 'color' => 'black', 'bold' => false) );
	// define paragraph styles
	$phpWord->addParagraphStyle('ParagraphCenterd', array('align'=>'center'));
	$phpWord->addParagraphStyle('ParagraphJustify', array('alignment'=>'both'));
	// define table styles
	$tableStyle = [
		'cellMarginRight'  => 160,
		'layout'      => \PhpOffice\PhpWord\Style\Table::LAYOUT_FIXED, // Enforces exact widths
	];
	$rowStyle = [
		'cantSplit' => true,  // ensures that if this row falls near the bottom of a page, the ENTIRE row moves to the next page instead of splitting the text in half.
		'tblHeader' => false // Set to true only if this is a repeating header row
	];
	//$firstRowStyle = $tableStyle;
	//$phpWord->addTableStyle('GlobalTableStyle', $tableStyle, $firstRowStyle);
	// define image styling
	$imageStyle = array('marginTop' => 8, 'marginLeft' => 12, 'wrappingStyle' => 'behind', 'width' => '', 'height' => 100 );
	// define title styles (used for headers and table of contents)
	$phpWord->addTitleStyle(0, array('name'=>'Calibri', 'size'=>16, 'color'=>'dodgerblue'));
	
	// Add first-page cover
	$section = $phpWord->addSection(); // any element you append to a document must reside inside of a Section.
	//>>>>>>>>>> $section->addText($TrenchName, "GlobalFont_cover", "ParagraphCenterd");
	$section->addText("Data Export: ".gmdate("Y-m-d")." ".gmdate("H:i:s"), "GlobalFont_bold", "ParagraphCenterd");
	$section->addPageBreak();
	
	// Add a page for each item
	$num_of_exported_items = 0;
	for ($i = 0; $i<count($TrenchData); $i++) {
		if( strcmp($TrenchData[$i]["Type"], "Image") == 0 ) continue; // <<< ignore items of type image
		if( strcmp($TrenchData[$i]["Type"], "Plan")  == 0 ) continue; // <<< ignore items of type plan
		////
		if( strlen($UUIDS_to_export) <= 3  ||  str_contains($UUIDS_to_export, ",".$TrenchData[$i]["IdentifierUUID"].",") ) { // ignore non selected items
			$num_of_exported_items = $num_of_exported_items + 1;
			
			// resolve item's Identifier
			if( isset($TrenchData[$i]["Identifier"])  &&  strlen(trim($TrenchData[$i]["Identifier"])) > 0 ) {
				$the_Identifier = $TrenchData[$i]["Identifier"];
			} else {
				$the_Identifier = $TrenchData[$i]["IdentifierUUID"];
			}
			
			// add a new section
			$section = $phpWord->addSection();
			
			// Add a title-header for the item
			$section->addTitle($the_Identifier . ', ' . $TrenchData[$i]["Title"], 0 );

			// add images of the item
			if ( isset($TrenchData[$i]["RelationIncludesUUID"]) && count($TrenchData[$i]["RelationIncludesUUID"])>0) {
				$textrun = $section->addTextRun();
				$IncludedUUIDs = explode("\n", $TrenchData[$i]["RelationIncludesUUID"][0]);
				for ($j = 0; $j<count($IncludedUUIDs); $j++) {	
					$image_filename = "Data/images/thumbnails/" . $IncludedUUIDs[$j] . ".jpg";
					if( file_exists($image_filename) ) {
						$textrun->addImage($image_filename, $imageStyle);
						$textrun->addText(" ", "GlobalFont_normal");
					}
				}
			}
			
			echo $num_of_exported_items . ">" . $TrenchData[$i]["IdentifierUUID"] . ">" . $TrenchData[$i]["Identifier"] . "\n";
			
			// add item information in a table format
			$table = $section->addTable( $tableStyle );
			$table->addRow(null, $rowStyle);		$cell=$table->addCell(1800); $cell->addText("Identifier","GlobalFont_bold"); 	$cell=$table->addCell(7000); $cell->addText($the_Identifier,"GlobalFont_normal");
			$table->addRow(null, $rowStyle);		$cell=$table->addCell(); $cell->addText("Title","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Title"],"GlobalFont_normal");
			if ( isset($TrenchData[$i]["RelationBelongsToUUID"]) && count($TrenchData[$i]["RelationBelongsToUUID"])>0 ) {
				if( strpos($TrenchData[$i]["RelationBelongsToUUID"][0], "\\n") < 0 ) {
					$ItemData = getItemData($TrenchData, $TrenchData[$i]["RelationBelongsToUUID"][0]);
					$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Locus","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($the_Identifier.", ".$ItemData["Title"], "GlobalFont_normal");
				}
			}
			
			// CELL WIDTH: 1 cm  = 567 twips
			
			if ( isset($TrenchData[$i]["Trench"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Trench","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Trench"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["Square"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Square","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Square"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["Description"]) ) {
				$s = $TrenchData[$i]["Description"];
				//$s = substr($s, 0, 682);  // 675 - 682
				//$s = str_replace( "&", "", $s );
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Description","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($s,"GlobalFont_normal", "ParagraphJustify");
			}
			if ( isset($TrenchData[$i]["Dimensions"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Dimensions","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Dimensions"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["ArtifactDate"]) &&  strlen($TrenchData[$i]["ArtifactDate"]) > 0 ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Date","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["ArtifactDate"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["Comparanda"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Comparanda","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Comparanda"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["Notes"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Notes","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Notes"],"GlobalFont_normal");
			}
			if ( isset($TrenchData[$i]["Additional Bibliography"]) ) {
				$table->addRow(null, $rowStyle);	$cell=$table->addCell(); $cell->addText("Additional Bibliography","GlobalFont_bold"); 		$cell=$table->addCell(); $cell->addText($TrenchData[$i]["Additional Bibliography"],"GlobalFont_normal");
			}
			// change page
			if($i < count($TrenchData)-1) $section->addPageBreak();
		}
	}


	// Delete older exports
	$currentUnixTime = time();
	$local_filenames = scandir("./");
	for ($i = 0; $i<count($local_filenames); $i++) {
		if( str_ends_with($local_filenames[$i], ".docx") ) {
			$filneUnixTime = substr( $local_filenames[$i], 0, strpos($local_filenames[$i], ".") );
			if( $currentUnixTime - intval($filneUnixTime) > 60*60*24*10 ) { // file is several days old
				unlink( $local_filenames[$i] ); 
			}
		}
	}
	
	// Saving the document as OOXML file. The filename should be the current time as Unix seconds with docx extension
	$objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
	$objWriter->save( $FileName );
	
	return true;

	// Saving the document as ODF file...
	//$objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'ODText');
	//$objWriter->save('helloWorld.odt');

	// Saving the document as HTML file...
	//$objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'HTML');
	//$objWriter->save('helloWorld.html');

	/* Note: we skip RTF, because it's not XML-based and requires a different example. */
	/* Note: we skip PDF, because "HTML-to-PDF" approach is used to create PDF documents. */
}




function getItemData( $TrenchData, $ItemUUID ) {	
	for( $i=0; $i<count($TrenchData); $i++ ) {
		if( strcmp( $TrenchData[$i]["IdentifierUUID"], $ItemUUID ) == 0 ) {
			return $TrenchData[$i];
		}
	}
}


?>