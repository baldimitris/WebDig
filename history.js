
/**
 * This class manages the browsing history between the items the useer visits. 
 * When users chooses to display an item's information dialog, a new element is added to the history.
 * The user can browse back and forth from within the item-info-dialog by pressing the Prev and Next buttons.
 */
class History {

	/**
	 * initializes the array containing the UUIDs of the visited items, the pointer to the array and the maximum size of the array.
	 */
	constructor() {
		this.HistoryUUIDs = []; // The UUIDs of the items the user has recently visited (=displayed their information dialog). Works in conjuction with HistoryPointer
		this.HistoryPointer = -1;
		this.HistorySize = 50;
	}
	
	getCurrent() {
		if( this.HistoryPointer >= 0  &&  this.HistoryPointer < this.HistoryUUIDs.length ) {
			return this.HistoryUUIDs[this.HistoryPointer];
		} else {
			return "";
		}
	}
	
	getNum_of_HistoryElements() {
		return this.HistoryUUIDs.length;
	}
  
	Add( UUID ) {
		if( this.HistoryPointer == this.HistoryUUIDs.length - 1 ) { // user is currently at the last history element, so add the new history element
			if( this.HistoryUUIDs[ this.HistoryUUIDs.length - 1 ] != UUID ) { // check if this is a new item or the same again
				this.HistoryUUIDs.push( UUID );
				this.HistoryPointer = this.HistoryUUIDs.length - 1;
			}
		} else { // user is currently at an intermediate history element, so erase the items at the right of the pointer and add the new history element
			if( this.HistoryUUIDs[ this.HistoryPointer ] != UUID ) { // check if this is a new item or the same again
				var num_of_elements_to_delete = this.HistoryUUIDs.length - this.HistoryPointer - 1;
				this.HistoryUUIDs.splice(this.HistoryUUIDs.length - num_of_elements_to_delete,  num_of_elements_to_delete);
				this.HistoryUUIDs.push( UUID );
				this.HistoryPointer = this.HistoryUUIDs.length - 1;
			}
		}
		// keep size in limits
		if( this.HistoryUUIDs.length > this.HistorySize ) {
			this.HistoryUUIDs.shift();
			this.HistoryPointer = this.HistoryUUIDs.length - 1;
		}
	}
  
	Back() {
		if( this.HistoryPointer - 1 >= 0 ) {
			  this.HistoryPointer -= 1;
		}
		return this.getCurrent();
	}
  
	Forward() {
		if( this.HistoryPointer + 1 < this.HistoryUUIDs.length ) {
			this.HistoryPointer += 1;
		}
		return this.getCurrent();
	}
  
}



