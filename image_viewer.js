
const phpURL="./WebDigServer.php";
const HEADER_HEIGHT = 60;
var itemUUID = "";
var itemData = null;
var canvaswrapper = null;
var canvas = null;
var context = null;
var theImage = null;
var MouseStartX, MouseStartY, MousePrevX, MousePrevY, MouseX, MouseY;
var MouseIsDown = false;
var annotations_json = null;
//
var running_on_mobile_device = false; // links with Utils, exists in data, as well

// tools state
var ToolColor;
var State = "Hand";
var TextTool_posX = 0;
var TextTool_posY = 0;

window.onload = function Init() {
	// init canvas
	canvaswrapper = document.getElementById("canvas_wraper");
	canvas = document.getElementById('annotations_canvas');
	context = canvas.getContext('2d');
	canvas.style.height = (window.innerHeight-HEADER_HEIGHT) + "px";
	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	// init event listeners
	canvas.addEventListener('keydown',this.Canvas_KeyDownHandler,false);
	canvas.addEventListener('dblclick',this.Canvas_DoubleclickHandler,false);
	canvas.addEventListener('mousedown',this.Canvas_MouseDownHandler,false);
	canvas.addEventListener('mousemove',this.Canvas_MouseMoveHandler,false);
	canvas.addEventListener('mouseup',this.Canvas_MouseUpHandler,false);
	// init tools
	ToolColor = document.getElementById("html5colorpicker").value;
	// read the data of an item from the URL
	document.body.style.cursor = "wait";
	var url_object = new URL( window.location.href );
	itemUUID = url_object.searchParams.get("id");
	
	// send request to server for data about this item
	$.ajax({                                      
		url: phpURL, type: "POST", data: { Command:"GetItemData", Arg1:itemUUID } 
	}).done(function( msg ) {
		if( msg.length > 50 ) { 
			// Parse json data from server
			itemData = JSON.parse(msg);
			// fetch image file
			theImage = new Image();        
			theImage.src = "images/" + itemData["FormatImage"];
			theImage.onload = function() {
				document.body.style.cursor = "default";
				if( theImage.height >= canvas.height ) { // large image
					document.getElementById("zoom_range").max = 100;
				} else { // small image
					document.getElementById("zoom_range").max = parseInt( 100 * canvas.height/theImage.height );
				}
				DrawCanvas( canvas.height/theImage.height ); 
				displayItemInfo();
			}
		} else {
			document.getElementById("message").innerHTML = "Error while fetching the requested image. Either the immage file was not found or the communication was interrupted. Please try again.";
		}
	});
};

function DrawCanvas( ZoomFactor ) {
	context.clearRect(0, 0, canvas.width, canvas.height);
	displayImage( ZoomFactor );
	displayAnnotations();
}

function displayImage( ZoomFactor ) {
	// set proper size and display image
	canvas.width = theImage.width * ZoomFactor;
	canvas.height = theImage.height * ZoomFactor;
	canvas.style.width = theImage.width * ZoomFactor + "px";
	canvas.style.height = theImage.height * ZoomFactor + "px";
	canvaswrapper.style.width = theImage.width * ZoomFactor + "px";
	canvaswrapper.style.height = theImage.height * ZoomFactor + "px";
	context.drawImage(theImage, 0, 0, theImage.width * ZoomFactor, theImage.height * ZoomFactor );
	// display scroll bars if neccessary
	canvaswrapper.style.maxHeight = (window.innerHeight-HEADER_HEIGHT) + "px";
	canvaswrapper.style.maxWidth = (window.innerHeight-HEADER_HEIGHT) * theImage.width / theImage.height + "px";
	if ( canvas.height < window.innerHeight-HEADER_HEIGHT + 2 ) {
		canvaswrapper.style.overflow = "hidden";
		canvas.style.cursor = "default";
	} else {
		canvaswrapper.style.overflow = "scroll";
		canvas.style.cursor = "grab";
	}
	// display the zoom value
	document.getElementById("zoom_range").value = parseInt(ZoomFactor*100);
	document.getElementById("zoom_txt").textContent = parseInt(ZoomFactor*100) + "%";
	
}
		
function displayAnnotations() {
	if( document.getElementById("display_annotations_checkbox").checked ) {
		if( annotations_json == null ) { // read from json only the first time
			annotations_json = JSON.parse( itemData["FormatImageAnnotations"] );
		}
		for( let i=0; i<annotations_json.length; i++ ) {
			context.beginPath();
			if( annotations_json[i]["type"].localeCompare("arrow") == 0 ) {
				context.strokeStyle = annotations_json[i]["color"];
				context.lineWidth = 1 + 2*parseInt(canvas.height/400);
				var from_x = annotations_json[i]["points"][0][0]*canvas.width;
				var from_y = annotations_json[i]["points"][0][1]*canvas.height;
				var to_x = annotations_json[i]["points"][1][0]*canvas.width;
				var to_y = annotations_json[i]["points"][1][1]*canvas.height;
				draw_arrow( context, from_x, from_y, to_x, to_y );
				context.stroke();
			} else if( annotations_json[i]["type"].localeCompare("text") == 0 ) {
				context.fillStyle = annotations_json[i]["color"];
				context.font = "bold " + (6 + 4*parseInt(canvas.height/120)) + "px Arial";
				context.fillText( annotations_json[i]["text"], annotations_json[i]["points"][0][0]*canvas.width, annotations_json[i]["points"][0][1]*canvas.height);
				context.fill();
			} else {
				console.log( "Unknown annotation type: " + annotations_json[i]["type"]);
			}
			context.closePath();
		}
	}
}

/**
 * Draws an arrow on the canvas upon the item image
 * @arg context the html-canvas' context
 * @arg from_x the arrow start position
 * @arg from_y the arrow start position
 * @arg to_x the arrow tip position
 * @arg to_y the arrow tip position
 */
function draw_arrow(context, from_x, from_y, to_x, to_y) {
	var headlen = 8 + 5*parseInt(canvas.height/300); // length of head in pixels
	var dx = to_x - from_x;
	var dy = to_y - from_y;
	var angle = Math.atan2(dy, dx);
	context.moveTo(from_x, from_y);
	context.lineTo(to_x, to_y);
	context.lineTo(to_x - headlen * Math.cos(angle - Math.PI / 6), to_y - headlen * Math.sin(angle - Math.PI / 6));
	context.moveTo(to_x, to_y);
	context.lineTo(to_x - headlen * Math.cos(angle + Math.PI / 6), to_y - headlen * Math.sin(angle + Math.PI / 6));
}


/**
 * Displays some item fields on the web page, as plain text
 */
function displayItemInfo() {
	var s = "";
	try {
		if( itemData.hasOwnProperty("Title") && itemData["Title"].length > 0 ) {
			s += "<p class='info_row'>";
			s +=   "<div class='info1'><b>" + "Title:" + "</b><br></div>";
			s +=   "<div class='info2'>" + itemData["Title"] + "</div>";
			s += "</p>";
		}
	} catch(ex) {}
	try {
		if( itemData.hasOwnProperty("Identifier") && itemData["Identifier"].length > 0 ) {
			s += "<p class='info_row'>";
			s +=   "<div class='info1' ><b>" + "Identifier:" + "</b><br></div>";
			s +=   "<div class='info2' >" + itemData["Identifier"] + "</div>";
			s += "</p>";			
		}
	} catch(ex) {}
	try {			
		if( itemData.hasOwnProperty("RelationBelongsToUUID") && itemData["RelationBelongsToUUID"][0].length > 0 ) {
			var ParentItem = getDataBy_UUID( itemData["RelationBelongsToUUID"][0] );
			if( ParentItem != null ) {
				s += "<p class='info_row'>";
				s +=   "<div class='info1'><b>" + "Belongs To:" + "</b><br></div>";
				s +=   "<div class='info2'>" + ParentItem["Identifier"] + "</div>";
				s += "</p>";
			}
		}
	} catch(ex) {}
	try {
		if( itemData["DateUTC"].length > 0 ) {
			s += "<p class='info_row'>";
			s +=   "<div class='info1' ><b>" + "Date(UTC):" + "</b><br></div>";
			s +=   "<div class='info2' >" + itemData["DateUTC"] + "</div>";
			s += "</p>";
		}
	} catch(ex) {}
	document.getElementById("item_info").innerHTML = s;
}

		
/*
 * Handles the mouse down event on the image
 * Allow the user to grab and move the canvas, draw an arrow, or write some text
 * @arg e is the event data
 */
function Canvas_MouseDownHandler(e) {
	MouseIsDown = true;
	// figure out where the user clicked
	var eventX, eventY;
	if( Utils.Am_I_running_on_mobile_device() ) {
		eventX = e.touches[0].clientX;
		eventY = e.touches[0].clientY;
	} else {
		eventX = e.clientX;
		eventY = e.clientY;
	}
	MousePrevX = eventX;
	MousePrevY = eventX;
	MouseStartX = eventX - canvas.getBoundingClientRect().left;
	MouseStartY = eventY - canvas.getBoundingClientRect().top;
	// act according to the selected tool
	if( State.localeCompare("Text") == 0 ) {
		TextTool_posX = MouseStartX;
		TextTool_posY = MouseStartY;
	}
}


/*
 * Handles the mouse move event on the image
 * Allow the user to grab and move the canvas inside the scrollbars, draw an arrow
 * @arg e is the event data
 */
function Canvas_MouseMoveHandler(e) {
	if( MouseIsDown ) {
		// figure out where the user clicked
		var eventX, eventY;
		if( Utils.Am_I_running_on_mobile_device() ) {
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}
		MouseX = eventX - canvas.getBoundingClientRect().left;
		MouseY = eventY - canvas.getBoundingClientRect().top;
		//
		if( State.localeCompare("Hand")==0 && canvaswrapper.scrollWidth != canvaswrapper.clientWidth || canvaswrapper.scrollHeight != canvaswrapper.clientHeight ) { // check if there are scroll-bars
			const speedX = 1 + Math.abs(MouseX - MousePrevX);
			const speedY = 1 + Math.abs(MouseY - MousePrevY);
			if( MouseX > MousePrevX ) horizontal_drift = -speedX; else if ( MouseX < MousePrevX ) horizontal_drift = speedX; else  horizontal_drift = 0;
			if( MouseY > MousePrevY ) vertical_drift = -speedY; else if( MouseY < MousePrevY ) vertical_drift = speedY; else vertical_drift = 0;
			canvaswrapper.scrollTo( canvaswrapper.scrollLeft + horizontal_drift,  canvaswrapper.scrollTop + vertical_drift );
			MousePrevX = MouseX;
			MousePrevY = MouseY;
		}
	}
}


/*
 * Handles the mouse up event on the image
 * Allows the user to grab and move the canvas, draw an arrow
 * @arg e is the event data
 */
function Canvas_MouseUpHandler(e) {
	// figure out where the user clicked
	var eventX, eventY;
	if( Utils.Am_I_running_on_mobile_device() ) {
		eventX = e.touches[0].clientX;
		eventY = e.touches[0].clientY;
	} else {
		eventX = e.clientX;
		eventY = e.clientY;
	}
	MouseX = eventX - canvas.getBoundingClientRect().left;
	MouseY = eventY - canvas.getBoundingClientRect().top;
	if( MouseIsDown ) {
		if( State.localeCompare("Arrow") == 0 ) {
			context.strokeStyle = ToolColor;
			annotations_json.push( {'type':'arrow', 'color':ToolColor, 'weight':2, 'points:', [[MouseStartX, MouseStartY],[MouseX, MouseY]]} );
			DrawCanvas();
			/*context.beginPath();
			context.strokeStyle = ToolColor;
			context.lineWidth = 3;
			context.moveTo(MouseStartX, MouseStartY);
			context.lineTo(MouseX, MouseY);
			context.closePath();
			context.stroke();*/
		} else if( State.localeCompare("Erase") == 0 ) {
			// find the clicked annotation
			for( let i=annotations_json.length-1; i<=0; i-- ) { // start searching from the end, the user probably wants to delete a more recent annotation
				annotation_min_x = Math.min( annotations_json[i]["points"][0][0], annotations_json[i]["points"][1][0] );
				annotation_max_x = Math.max( annotations_json[i]["points"][0][0], annotations_json[i]["points"][1][0] );
				annotation_min_y = Math.min( annotations_json[i]["points"][0][1], annotations_json[i]["points"][1][1] );
				annotation_max_y = Math.max( annotations_json[i]["points"][0][1], annotations_json[i]["points"][1][1] );
				if( annotation_min_x < MouseX  &&  annotation_max_x > MouseX  &&  annotation_min_y < MouseY  &&  annotation_max_Y > MouseY ) {
					annotations_json.splice(i, 1); // 2nd parameter means remove one item only
					break;
				}
			}
		}
	}
	MouseIsDown = false;
}

/**
 * Handles the double click event on the image
 * Allows the user to reset zoom factor to show-all-image ratio.
 * @arg e is the event data
 */
function Canvas_DoubleclickHandler(e) {
	DrawCanvas((window.innerHeight-HEADER_HEIGHT)/theImage.height);
}


/**
 * Handles the keyboard events on the image.
 * Allows the user to move and zoom canvas from the keyboard and to types annotation text.
 * @arg e is the event data
 */
function Canvas_KeyDownHandler(e) {
	if( State.localeCompare("Text") == 0 ) {
		// look for an existing json entry for this text annotation
		idx = -1;
		for( let i=0; i<annotations_json.length; i++ ) {
			if( annotations_json[i]["type"].localeCompare("text") == 0  &&  annotations_json[i]["points"][0][0]==MouseStartX  &&  annotations_json[i]["points"][0][1]==MouseStartY ) {
				idx = i;
				break;
			}
		}
		// if there is no existing annotation json entry for this text annotation, then create a new one
		if( idx < 0 ) {
			annotations_json.push( {'type':'text', 'text':'', 'color':ToolColor, 'weight':2, 'points:', [[MouseStartX, MouseStartY],[1.1*MouseStartX, MouseStartY]]} );
			idx = annotations_json.length - 1;
		}
		// store the text in the json entry
		annotations_json[idx]['text'] += e.key;
		// refresh
		DrawCanvas();
	} else {
		if(e.key == '+') {
			console.log((parseInt(document.getElementById("zoom_range").value)+1)/100);
			DrawCanvas((parseInt(document.getElementById("zoom_range").value)+1)/100);
		} else if(e.key == '-') {
			DrawCanvas((parseInt(document.getElementById("zoom_range").value)-1)/100);
		} 
	}
}
