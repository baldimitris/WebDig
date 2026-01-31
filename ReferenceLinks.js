
/**
 * This class holds the Reference Links. These are pairs of a Text and a Link. 
 * If the Text is found in an item's field then that part of the text becomes a Link for the user to click and visit.
 * The application gives the user the opportunity to edit the Reference Links through the GUI.
 */

class ReferenceLinks_class {

	constructor( ) {
	}
	
	
	setReferenceLinks( ReferenceLinks_json ) {
		this.ReferenceLinks = ReferenceLinks_json;
	}
	
	getLink( reference_text ) {
		return this.ReferenceLinks[ reference_text ];
	}
	
	
	getAllReferenceLinks() {
		return this.ReferenceLinks;
	}
	
}
