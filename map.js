
/**
 * This module:
 *    - handles all drawing, events etc relative to the map. The map is a canvas where all items are drawn on.
 *    - draws the plan image and the items positions on the plan.
 *    - handles all the events occuring on the map.
 *    - handles the behavior of the various map tools.
 */

/** text to display on the top left of the canvas - for debugging purposes mainly on mobile devices. it is not a class property in order to be visible from the event listeners */ 
var text_to_display = "";

class Map {
	
	
	
	/**
	 * Initializes the map object based on a html-canvas 
	 * @arg canvas_html_id is the id of the canvas element at the html file.
	 */
	constructor( canvas_html_id ) {
		// -------------- class members:
		/** the canvas html object. */
		this.canvas = null; 
		/** the canvas context. */
		this.context;
		/** if the plan image is not downloaded yet, then a loading message is displayed in its place */
		this.PlanIsLoading;
		/** Remembers the selected tool. Possible values: zoomin, zoomout, drag, select, selectplus, selectminus, polygon, polygonplus, polygonminus, pencil, pencilplus, pencilminus, crosssection. */
		this.CanvasState = "select";  
		/** Keeps track of how many visual elements have been drawn on the canvas */
		this.num_of_drawables_OnCanvas = 0;
		/** If true then only the items which the user has selected will be displayed on the map. If false then all the items listed in the items-list will be displayed on the map.*/
		this.DisplayOnlySelectedItemsOnMap = true;
		/** If true then distances of the plan and the selected item's polygons will be displayed on the map */
		this.DisplayDistances = false;
		
		/** Remembers whether the Ctrl is pressed or not */
		this.CtrlKeyIsDown = false;
		
		/** If true then the user can click on the map to set the coordinates of an item */
		this.ManualCoordinatesMode = false;
		/** The itemUUID of the item for which the coorinates are being set when in ManualCoordinatesMode */
		this.ItemUUID_forManualCoordinates = ""; 
		/** The Identifier of the item for which the coorinates are being set when in ManualCoordinatesMode */
		this.ItemIdentifier_forManualCoordinates = ""; 
		/** The coordinates set manually when in defining-coordinates-manually state */
		this.ManualCoordinates = []; 
		
		/** The UUID of the item to be highlihted - usually the newly selected item */
		this.Highlight_itemUUID = "";
		/** The current opacity of the highlight animation */
		this.currentHighlightAlpha = 1.0;
		/** The interval id of the highlight animation */
		this.Highlight_interval_ID;
		
		/** The UUID of the item (or its locus, in case the item has no Location data) the information of which the user is currently displaying */
		var Focused_itemUUID = "";
		
		/** Map Capture needs */
		this.DotSize = 4;           // pixels
		this.ColorBrightness = 0;   // the default value (zero) means that color depends on the item category. Positive means brighter, negative means darker
		this.RectangleOpacity = 20; // 20% opacity means alpha channel=0.2 
		this.AllItemsColor = "";    // default value "" means that the color depends on the item category
		
		// -------------- init
		this.canvas = document.getElementById( canvas_html_id );
		this.context = this.canvas.getContext('2d');
		document.getElementById("canvas").style.cursor = "wait";
		if (this.context) {
			// draw plan and items
			this.drawWorld();
		}
		// add event listeners for canvas handling
		canvas.addEventListener('keydown',this.Canvas_KeyDownHandler,false);
		canvas.addEventListener('keyup',this.Canvas_KeyUpHandler,false);
		canvas.addEventListener('mousedown',this.Canvas_MouseDownHandler,false);
		canvas.addEventListener('mousemove',this.Canvas_MouseMoveHandler,false);
		canvas.addEventListener('mouseup',this.Canvas_MouseUpHandler,false);
		canvas.addEventListener('mouseout',this.Canvas_MouseUpHandler,false);
		canvas.addEventListener('wheel',this.Canvas_WheelHandler,false);
		canvas.addEventListener('dblclick',this.Canvas_DoubleclickHandler,false);
		
		// for mobile devices:
		// https://web.dev/mobile-touchandmouse/
		// https://bencentra.com/code/2014/12/05/html5-canvas-touch-events.html
		// https://gist.github.com/bencentra/91350fe91c377c1ca574
		canvas.addEventListener('touchstart',this.Canvas_MouseDownHandler,false);		
		canvas.addEventListener('touchmove',this.Canvas_MouseMoveHandler,false);
		canvas.addEventListener('touchend',this.Canvas_MouseUpHandler,false);
		document.body.addEventListener("touchstart", function (e) {
			if (e.target == canvas) { e.preventDefault(); } 
		}, false);
		document.body.addEventListener("touchend", function (e) {
			if (e.target == canvas) { e.preventDefault(); }
		}, false);
		document.body.addEventListener("touchmove", function (e) {
			if (e.target == canvas) { e.preventDefault(); }
		}, false);
		
		
		// ------------ FOR LAYERS: add event listener for updating the number display when the range slider moves
		document.getElementById('Layers_slider').addEventListener('input', () => {
			document.getElementById('Layers_rangeValue').textContent = document.getElementById('Layers_slider').value;
		});

		// ------------ FOR LAYERS: Close range slider if clicking outside
		window.addEventListener('click', (e) => {
			if (!document.getElementById('layers_button').contains(e.target) && !document.getElementById('Layers_rangePopover').contains(e.target)) {
				document.getElementById('Layers_rangePopover').style.display = 'none';
			}
		});
		
	}


	
	setDotSize( n ) { this.DotSize = n; }
	setColorBrightness( n ) { this.ColorBrightness = n; }
	setRectangleOpacity( n ) { this.RectangleOpacity = n; }
	setAllItemsColor( n ) { this.AllItemsColor = n; }
	
	
	
	/**
	 * Returns the canvas html elemenet, on which the Map object draws
	 */
	 get_canvas() {
		 return this.canvas;
	 }
	
	/**
	 * @arg s is the string to be displayed at the top left of the map for debugging purposes, mainly in mobile devices 
	 */
	set_text_to_display( s ) {
		text_to_display = s;
	}

	/**
	 * @arg s is the string to be added to the text to be displayed at the top left of the map for debugging purposes, mainly in mobile devices 
	 */
	addto_text_to_display( s ) {
		text_to_display += s;
	}
	
	/**
	 * Sets a flag which guides the map to display the selected-by-the-user items or the  included-in-the-items-list items.
	 * @param {boolean} b
	 */
	set_DisplayOnlySelectedItemsOnMap( b ) {
		this.DisplayOnlySelectedItemsOnMap = b;
	}

	/**
	 * The focused item will be displayed with a special color on the map. It usually is the item which the user has selected and is seeing its info.
	 * @param {String} UUID: the unique identifier of the item
	 */
	set_Focused_itemUUID( UUID ) {
		this.Focused_itemUUID = UUID;
	}

	/**
	 * zooms in the canvas by increasing the ZommFactor state-variable and redrawing everything. This is called from other functions in order to zoom.
	 */
	ZoomIn( step=1 ) {  
		//CanvasOffsetX -= (MouseX/(PlanImageWidth*ZoomFactor))  * step*0.01* PlanImageWidth * ZoomFactor;
		//CanvasOffsetY -= (MouseY/(PlanImageHeight*ZoomFactor)) * step*0.01* PlanImageHeight * ZoomFactor;
		ZoomFactor += step*0.01;
		this.drawWorld();
	}

	/**
	 * zooms out the canvas by dereasing the ZommFactor state-variable and redrawing everything. This is called from other functions in order to zoom.
	 */
	ZoomOut( step=1 ) {
		ZoomFactor -= step*0.01;
		if( ZoomFactor <= 0 ) ZoomFactor = 0.01;
		this.drawWorld();
	}
	
	
	/**
	 * zooms 100%
	 */
	Zoom_OriginalSize() {
		ZoomFactor = 1;
		this.drawWorld();
	}
	
	/**
	 * zooms 10%
	 */
	Zoom_SmallSize() {
		ZoomFactor = 0.1;
		this.drawWorld();
	}
	

	/**
	  * draws an arrow on the canvas, based on the arguments
	  */
	draw_arrow(ctx, fromX, fromY, toX, toY, lineWidth, lineColor) {	
		const headLength = 15; // Adjusted for better visibility
		const angle = Math.atan2(toY - fromY, toX - fromX);
		// init
		ctx.save(); // Save state to avoid polluting global styles
		ctx.beginPath();
		ctx.strokeStyle = lineColor;
		ctx.lineWidth = lineWidth;
		ctx.lineCap = "round"; // Makes the tip and joints look smoother
		ctx.lineJoin = "round";
		// 1. Draw the main shaft
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		// 2. Draw first wing
		ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
		// 3. Move back to the tip to draw the second wing
		ctx.moveTo(toX, toY);
		ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
		// draw
		ctx.stroke();
		ctx.restore();
	}


	/**
	 * Draws all elements on the canvas, based on selected tool, selected items etc.
	 */
	drawWorld() {
		var x=0, y=0, map_x=0, map_y=0;
		// make the canvas size equal to its drawing size
		this.canvas.width  = this.canvas.offsetWidth;
		this.canvas.height = this.canvas.offsetHeight;
		// clear canvas
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// draw the background plan
		this.displayPlan ( document.getElementById("AvailablePlansCombo").value );
		// display a map-loading message
		if(this.PlanIsLoading) {
			this.context.beginPath();
			this.context.font = "14px Arial";
			this.context.fillStyle = "lightseagreen";
			this.context.lineWidth = 1;
			this.context.strokeStyle = "lightseagreen";
			if( document.getElementById("AvailablePlansCombo").value.length > 0 ) {
				this.context.fillText( "The Plan '"+document.getElementById("AvailablePlansCombo").value+"' is loading. Please wait.", 20, 20);
			}
			this.context.closePath();
			this.context.fill();
			this.context.stroke();
		}		
		
		// draw coordinates of the clicked point if the ruler is activated
		if( this.DisplayDistances  &&  MouseX > 0  &&  MouseY > 0) {
			this.context.beginPath();
			this.context.font = "bold 16px Arial";
			this.context.strokeStyle = "black";
			this.context.fillStyle = "black";
			map_x = this.map_range( (MouseX-CanvasOffsetX)/ZoomFactor,  0, PlanImageWidth, 	  PlanMinX, PlanMaxX);
			map_y = this.map_range( (MouseY-CanvasOffsetY)/ZoomFactor,  PlanImageHeight, 0,   PlanMinY, PlanMaxY); 
			map_x = map_x.toFixed(3);
			map_y = map_y.toFixed(3);
			this.context.fillText("Clicked Coordinates: " + map_x + " " + map_y, 20, 20);
			this.context.closePath();
			this.context.fill();
		}
		
		// draw dimensions of the plan
		if( this.DisplayDistances && PlanImageWidth>0) {
			var W = PlanImageWidth  * ZoomFactor;
			var H = PlanImageHeight * ZoomFactor;
			this.context.beginPath();
			this.context.strokeStyle = COLOR_distances;
			this.context.fillStyle = COLOR_distances;
			this.context.lineWidth = 3;
			this.context.font = "bold 22px Arial";
			// vertical line
			this.context.moveTo(CanvasOffsetX+W+2, CanvasOffsetY);				this.context.lineTo(CanvasOffsetX+W+18, CanvasOffsetY);
			this.context.moveTo(CanvasOffsetX+W+10, CanvasOffsetY);				this.context.lineTo(CanvasOffsetX+W+10, CanvasOffsetY+H/2-20);
			this.context.moveTo(CanvasOffsetX+W+10, CanvasOffsetY+H/2+20);		this.context.lineTo(CanvasOffsetX+W+10, CanvasOffsetY+H);
			this.context.moveTo(CanvasOffsetX+W+2, CanvasOffsetY+H);			this.context.lineTo(CanvasOffsetX+W+18, CanvasOffsetY+H);
			this.context.fillText( +(PlanMaxY-PlanMinY).toFixed(2)+"m", CanvasOffsetX+W+4, CanvasOffsetY+H/2+4); 
			// horizontal line
			this.context.moveTo(CanvasOffsetX, CanvasOffsetY+H+2);				this.context.lineTo(CanvasOffsetX, CanvasOffsetY+H+18);
			this.context.moveTo(CanvasOffsetX, CanvasOffsetY+H+10);				this.context.lineTo(CanvasOffsetX+W/2-56, CanvasOffsetY+H+10);
			this.context.moveTo(CanvasOffsetX+W/2+56, CanvasOffsetY+H+10);		this.context.lineTo(CanvasOffsetX+W, CanvasOffsetY+H+10);
			this.context.moveTo(CanvasOffsetX+W, CanvasOffsetY+H+2);				this.context.lineTo(CanvasOffsetX+W, CanvasOffsetY+H+18);
			this.context.fillText( +(PlanMaxX-PlanMinX).toFixed(2)+"m", CanvasOffsetX+W/2-44, CanvasOffsetY+H+14); 
			// draw
			this.context.closePath();
			this.context.fill();
			this.context.stroke();
		}
		// draw the trench items
		if( ExcData != null ) {
			for (let i = 0; i < ExcData.length; i++) { 
				try {
					/// check if this item should be displayed on the map or not
					var display_current_item = false;
					var focus_on_current_item = false;
					if( ExcData[i].hasOwnProperty("Location") && ExcData[i]["Location"].length > Current_Layer ) {
						if( this.DisplayOnlySelectedItemsOnMap ) {
							if( ExcData[i]["Selected"] ) display_current_item = true;
						} else {
							if( ExcData[i]["Visible"] ) display_current_item = true;
						}
						
						if( ExcData[i]["IdentifierUUID"].localeCompare(this.Focused_itemUUID) == 0 ) {
							display_current_item = true;
							focus_on_current_item = true;
						}
						if( display_current_item && ExcData[i].hasOwnProperty("InPlan") ) {
							if( ExcData[i]["InPlan"]==false ) { 
								display_current_item = false;
								focus_on_current_item = false;
							}
						}
					}
					///
					if( display_current_item  &&  ExcData[i]["Location"].length > Current_Layer ) {
						var LocationMatrix = ExcData[i]["Location"][Current_Layer];
						// set type-related properties
						var itemcolor;
						if( this.AllItemsColor.length ==  0 ) {
							itemcolor = getItemColor( ExcData[i]["Type"], ExcData[i]["Category"] );
							if( this.ColorBrightness != 0 ) { // change the Brightness of the default color
								var tmp_canvas = document.createElement("canvas");
								tmp_canvas.getContext("2d").fillStyle = itemcolor;
								var rgb_string = tmp_canvas.getContext("2d").fillStyle;
								tmp_canvas.remove();
								itemcolor = Utils.AdjustBrightness( rgb_string, this.ColorBrightness );
							}
						} else {
							itemcolor = this.AllItemsColor;
						}
						// draw
						if( LocationMatrix.length == 1 ) { // it is just a point on the map
							x = parseFloat( LocationMatrix[0]["X"] );
							y = parseFloat( LocationMatrix[0]["Y"] );						
							this.context.fillStyle = itemcolor;
							if( focus_on_current_item ) {
								this.context.strokeStyle = COLOR_focused;
								this.context.lineWidth = 5;
							} else if( ExcData[i]["Selected"] ) {
								// highlight the selected items
								this.context.strokeStyle = COLOR_selected;
								this.context.lineWidth = 3;
							} else {
								this.context.strokeStyle = itemcolor;
								this.context.lineWidth = 1;
							}
							this.context.beginPath();
							map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
							map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY; 
							this.context.arc(map_x, map_y, this.DotSize, 0, 2*Math.PI);
							this.context.fill(); 
							this.context.stroke(); 
							this.num_of_drawables_OnCanvas++;
						} else if( LocationMatrix.length > 1 ) { // it is a shape on the map
							// **************** draw the polygon ****************  
							x = LocationMatrix[0]["X"];
							y = LocationMatrix[0]["Y"];
							map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0              , PlanImageWidth) * ZoomFactor + CanvasOffsetX;
							map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,              0) * ZoomFactor + CanvasOffsetY;
							if( this.currentHighlightAlpha > 0  &&  ExcData[i]["IdentifierUUID"].localeCompare(this.Highlight_itemUUID)==0 ) {
								this.context.globalAlpha = 0.20 + this.currentHighlightAlpha;
								this.context.fillStyle = COLOR_highlight;
							} else {
								this.context.globalAlpha = this.RectangleOpacity / 100;
								this.context.fillStyle = itemcolor;
							}
							this.context.beginPath();
							this.context.moveTo(map_x, map_y);
							for(let pointIdx=1; pointIdx<LocationMatrix.length; pointIdx++) {								
								x = LocationMatrix[pointIdx]["X"];
								y = LocationMatrix[pointIdx]["Y"];
								map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
								map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY;
								this.context.lineTo(map_x, map_y);
								this.num_of_drawables_OnCanvas++;
							}
							// connect final and starting point together
							x = LocationMatrix[0]["X"];
							y = LocationMatrix[0]["Y"];
							map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
							map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY;
							this.context.lineTo(map_x, map_y);
							this.num_of_drawables_OnCanvas++;
							// fill shape with semitransparent color
							this.context.closePath();
							this.context.fill();
							// decide opaque border color and draw it
							if( focus_on_current_item ) {
								this.context.strokeStyle = COLOR_focused;
								this.context.lineWidth = 5;
							} else if( ExcData[i]["Selected"] ) {
								this.context.strokeStyle = COLOR_selected;
								this.context.lineWidth = 3;
							} else {
								this.context.strokeStyle = itemcolor;
								this.context.lineWidth = 2;
							}
							this.context.globalAlpha = 1;
							this.context.stroke();

							// **************** Display lengths of edges of the selected items ****************
							this.context.beginPath();
							this.context.font = "bold 22px Arial";
							this.context.lineWidth = 1;
							this.context.strokeStyle = COLOR_distances;
							this.context.fillStyle = "white";
							if( this.DisplayDistances  &&  ExcData[i]["Selected"]  &&  LocationMatrix.length>=3 ) {
								x = LocationMatrix[0]["X"];
								y = LocationMatrix[0]["Y"];
								map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0              , PlanImageWidth) * ZoomFactor + CanvasOffsetX;
								map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,              0) * ZoomFactor + CanvasOffsetY;
								var prev_map_x = map_x;
								var prev_map_y = map_y; 
								for(let pointIdx=1; pointIdx<LocationMatrix.length; pointIdx++) {
									if( pointIdx > 1 ) { prev_map_x = map_x; prev_map_y = map_y; }
									x = LocationMatrix[pointIdx]["X"];
									y = LocationMatrix[pointIdx]["Y"];
									map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
									map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY;
									var txt = +Lines.CalculateDistance(x, y,  LocationMatrix[pointIdx-1]["X"], LocationMatrix[pointIdx-1]["Y"]).toFixed(2) + "m";
									var txt_x = prev_map_x + (map_x-prev_map_x)/2;
									var txt_y = prev_map_y + (map_y-prev_map_y)/2;
									this.context.fillText( txt, txt_x, txt_y );
									this.context.strokeText( txt, txt_x, txt_y );
									this.num_of_drawables_OnCanvas++;
								}
							}
							this.context.closePath();
							this.context.fill();
							this.context.stroke();
						}
						
						//// ~~~~ when in "alter_a_coordinate" state, then highlight the point selected by the user to alter its coordinates
						if( map.CanvasState.startsWith("alter_a_coordinate")  &&  ExcData[i]["Location"].length > Current_Layer ) {
							// locate the selected element
							var the_selected_item = ExcData[CoordinateAltering_SelectedItemIdx];
							// calculate the position of the selected point on the map
							ExcData[i]["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]
							x = the_selected_item["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["X"];
							y = the_selected_item["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["Y"];
							map_x = this.map_range(x,  PlanMinX, PlanMaxX,   0              , PlanImageWidth) * ZoomFactor + CanvasOffsetX;
							map_y = this.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,              0) * ZoomFactor + CanvasOffsetY;
							// highlight the selected point
							this.context.beginPath();
							this.context.strokeStyle = "mediumvioletred";
							this.context.fillStyle = "mediumvioletred";
							this.context.lineWidth = 1;
							this.context.arc(map_x, map_y, 1, 0, 2*Math.PI);
							this.context.fill(); 
							this.context.stroke(); 
							this.context.beginPath();
							this.context.lineWidth = 3;
							this.context.arc(map_x, map_y, 8, 0, 2*Math.PI);
							this.context.stroke(); 
							this.num_of_drawables_OnCanvas++;
						}
						
						//// ~~~~~~~~~~~~~~~~ draw Highlight of a point on map ~~~~~~~~~~~~~~~~~~~~
						if( this.currentHighlightAlpha > 0   &&   ExcData[i]["IdentifierUUID"].localeCompare(this.Highlight_itemUUID)==0 ) {
							// Instead of moving the map, draw an arrow from the map center towards the selected item
							// Move map so that the highlighted item is visible
							// if(map_x > this.canvas.width-20)  CanvasOffsetX = CanvasOffsetX + map_x - this.canvas.width - this.canvas.width/2;
							// if(map_y > this.canvas.height-20) CanvasOffsetY = CanvasOffsetY + map_y - this.canvas.height - this.canvas.height/2;
							// if(map_x < 0)                CanvasOffsetX = CanvasOffsetX - map_x + this.canvas.width/2;
							// if(map_y < 0) 				 CanvasOffsetY = CanvasOffsetY - map_y + this.canvas.height/2;
							
							// If the selected item is not visible to the current map area then draw an arrow from the map center towards the selected item
							if(map_x > this.canvas.width-50 || map_x < 50 || map_y > this.canvas.height-50 || map_y < 50) {
								this.context.globalAlpha = this.currentHighlightAlpha;
								var arrow_length = 60;
								var fromX = 120;
								var fromY = 120;
								var sin_phi = Math.abs(map_y-fromY) / Math.sqrt((map_y-fromY)*(map_y-fromY) + (map_x-fromX)*(map_x-fromX));
								var cos_phi = Math.abs(map_x-fromX) / Math.sqrt((map_y-fromY)*(map_y-fromY) + (map_x-fromX)*(map_x-fromX));
								var toX = fromX - Math.sign(fromX-map_x) * arrow_length * cos_phi;
								var toY = fromY - Math.sign(fromY-map_y) * arrow_length * sin_phi;
								this.draw_arrow(this.context, fromX, fromY, toX, toY, 8, COLOR_highlight);
							}
							
							// draw a vertical and a horizontal line towards the item
							this.context.beginPath();
							this.context.globalAlpha = this.currentHighlightAlpha;
							this.context.strokeStyle = COLOR_highlight;
							if( LocationMatrix.length == 1 ) { // a point on the map
								this.context.lineWidth = 8;
								this.context.moveTo(map_x, 0);
								this.context.lineTo(map_x, map_y);
								this.context.moveTo(0, map_y);
								this.context.lineTo(map_x, map_y);
							} else { // a shape on the map
								var min_x = +999999;
								var min_y = +999999;
								var max_x = -999999;
								var max_y = -999999;
								for(let pointIdx=1; pointIdx<LocationMatrix.length; pointIdx++) {
									if( min_x > LocationMatrix[pointIdx]["X"] ) min_x = LocationMatrix[pointIdx]["X"];
									if( max_x < LocationMatrix[pointIdx]["X"] ) max_x = LocationMatrix[pointIdx]["X"];
									if( min_y > LocationMatrix[pointIdx]["Y"] ) min_y = LocationMatrix[pointIdx]["Y"];
									if( max_y < LocationMatrix[pointIdx]["Y"] ) max_y = LocationMatrix[pointIdx]["Y"];
								}
								min_x = this.map_range(min_x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
								max_x = this.map_range(max_x,  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
								min_y = this.map_range(min_y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY;
								max_y = this.map_range(max_y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY;
								this.context.lineWidth = 4;
								this.context.moveTo(min_x, 0);
								this.context.lineTo(min_x, max_y);
								this.context.moveTo(max_x, 0);
								this.context.lineTo(max_x, max_y);
								this.context.moveTo(0, min_y);
								this.context.lineTo(max_x, min_y);
								this.context.moveTo(0, max_y);
								this.context.lineTo(max_x, max_y);
							}
							this.context.stroke(); 
							this.context.globalAlpha = 1;
						}
					}					
					
				} catch(ex) {
					//console.log(">>> " + ex.toString());
				}
			}
		}
		
				
		// draw cross section line
		if( this.CanvasState.localeCompare("crosssection")==0 ) {
			if( CrossSectionX1 >= 0  &&  CrossSectionX2 < 0 ) {
				this.context.fillStyle = COLOR_crosssection;
				this.context.strokeStyle = COLOR_crosssection;
				this.context.lineWidth = 2;
				// draw starting point as dot
				this.context.beginPath();
				this.context.arc(CrossSectionX1, CrossSectionY1, 5, 0, 2*Math.PI);
				this.context.closePath();
				this.context.stroke();
				this.context.fill();
				// draw line 
				this.context.beginPath();
				this.context.moveTo(CrossSectionX1, CrossSectionY1);
				this.context.lineTo(MouseX, MouseY);
				this.context.closePath();
				this.context.stroke();
				// draw finish  point as dot
				this.context.beginPath();
				this.context.arc(MouseX, MouseY, 5, 0, 2*Math.PI);
				this.context.closePath();
				this.context.stroke();
				this.context.fill();
				// draw distance between the two points			
				var dist = (PlanMaxX-PlanMinX) / (PlanImageWidth*ZoomFactor) * Lines.CalculateDistance(CrossSectionX1, CrossSectionY1, MouseX, MouseY);
				var txt_x = CrossSectionX1 + (MouseX-CrossSectionX1)/2 + 6; //var txt_x = Math.min(CrossSectionX1, MouseX) + (MouseX - CrossSectionX1)/2;
				var txt_y = CrossSectionY1 + (MouseY-CrossSectionY1)/2 - 6; //var txt_y = Math.min(CrossSectionY1, MouseY) + (MouseY - CrossSectionY1)/2;
				this.context.beginPath();
				this.context.font = "bold 22px Arial";
				this.context.fillStyle = "white";
				this.context.lineWidth = 1;
				this.context.strokeStyle = COLOR_distances;
				this.context.fillText( (+dist).toFixed(2)+"m", txt_x, txt_y);
				this.context.strokeText( (+dist).toFixed(2)+"m", txt_x, txt_y);
				this.context.closePath();
				this.context.fill();
				this.context.stroke();
			} else if( CrossSectionX1 >= 0  &&   CrossSectionX2 >= 0 ) {
				this.CalcAndDrawCrossSection( CrossSectionX1, CrossSectionY1, CrossSectionX2, CrossSectionY2 );
			}
		}
		
		
		//// draw mouse selection
		if( MouseIsDown  &&  this.CanvasState.startsWith("select") ) {
			this.context.globalAlpha = 0.28;
			this.context.fillStyle = "lightseagreen";
			this.context.fillRect(MouseStartX, MouseStartY, MouseX-MouseStartX, MouseY-MouseStartY);
			this.context.globalAlpha = 1;
			//
			this.context.beginPath();
			this.context.strokeStyle  = "teal";
			this.context.rect(MouseStartX, MouseStartY, MouseX-MouseStartX, MouseY-MouseStartY);
			this.context.stroke(); 
		} else if( this.CanvasState.startsWith("polygon") && PolygonPoints.length > 1) {
			this.context.strokeStyle  = "teal";
			this.context.lineWidth = 3;
			this.context.beginPath();
			this.context.moveTo(PolygonPoints[0]["x"], PolygonPoints[0]["y"]);
			if( PolygonPoints.length > 1 ) {
				for(let i=1; i<PolygonPoints.length; i++) {
					this.context.lineTo(PolygonPoints[i]["x"], PolygonPoints[i]["y"]);
				}
			}
			this.context.arc(PolygonPoints[PolygonPoints.length-1]["x"], PolygonPoints[PolygonPoints.length-1]["y"], 4, 0, 2*Math.PI);
			this.context.stroke(); 
			this.context.globalAlpha = 0.28;
			this.context.fillStyle = "lightseagreen";
			this.context.fill(); 
			this.context.globalAlpha = 1;
		}
		
		// draw some info text
		//if( text_to_display.length > 0  &&  this.DisplayDistances ) { // TODO: remove this.DisplayDistances
		if( text_to_display.length > 0 ) { 
			this.context.beginPath();
			this.context.font = "bold 13px Arial black";
			this.context.fillStyle = "black";
			this.context.fillText( text_to_display, 10, 80 );
			this.context.closePath();
			this.context.fill();
		}
		
		//
		if( map != null  &&  map.ManualCoordinatesMode ) {
			// display help message
			this.context.beginPath();
			this.context.font = "bold 16px Arial";
			this.context.strokeStyle = "mediumvioletred";
			this.context.fillStyle = "mediumvioletred";
			this.context.fillText(this.ItemIdentifier_forManualCoordinates+": Defining coordinates manually: Use the Target button above to define points on the map. ESC=cancel ENTER=finish DEL=clear", 10, 20);
			this.context.closePath();
			this.context.fill();
			// display indicative border
			this.context.beginPath();
			this.context.strokeStyle = "mediumvioletred";
			this.context.lineWidth = 6;
			this.context.rect(0, 0, this.canvas.width, this.canvas.height);
			this.context.stroke();
			// Transform ManualCoordinates so that they can be displayed on Map
			var ManualCoordinates_onMap = [];
			for(var i=0; i<this.ManualCoordinates.length; i++ ) {
				var map_x = this.map_range(this.ManualCoordinates[i]["X"],  PlanMinX, PlanMaxX,   0   ,  PlanImageWidth) * ZoomFactor + CanvasOffsetX;
				var map_y = this.map_range(this.ManualCoordinates[i]["Y"],  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY; 
				ManualCoordinates_onMap.push( {"X":map_x, "Y":map_y} );
			}
			// display ManualCoordinates_onMap
			if( ManualCoordinates_onMap.length > 0 ) {
				this.context.beginPath();
				this.context.strokeStyle = "mediumvioletred";
				this.context.lineWidth = 2;
				this.context.arc(ManualCoordinates_onMap[0]["X"], ManualCoordinates_onMap[0]["Y"], 3, 0, 2*Math.PI);
				this.context.moveTo( ManualCoordinates_onMap[0]["X"], ManualCoordinates_onMap[0]["Y"] );
				for(var i=1; i<ManualCoordinates_onMap.length; i++ ) {
					this.context.lineTo( ManualCoordinates_onMap[i]["X"], ManualCoordinates_onMap[i]["Y"] );
				}
				this.context.lineTo( ManualCoordinates_onMap[0]["X"], ManualCoordinates_onMap[0]["Y"] );
				this.context.stroke();
			}
		}
		
		if( map != null  &&  map.CanvasState.startsWith("alter_a_coordinate") ) {
			// display help message
			this.context.beginPath();
			this.context.font = "bold 16px Arial";
			this.context.strokeStyle = "mediumvioletred";
			this.context.fillStyle = "mediumvioletred";
			if( CoordinateAltering_SelectedPointIdx < 0 ) {
				this.context.fillText("Altering coordinates: Move a point by click and drag. ESC:cancel ENTER:save PLUS:add_point MINUS:del_point D:set_depth", 10, 20);
			} else {
				this.context.fillText("Altering coordinates of " + CoordinateAltering_SelectedItemData_Backup["Identifier"]+ ", point #" + CoordinateAltering_SelectedPointIdx + ": Move point by click and drag. ESC:cancel ENTER:save PLUS:add_point MINUS:del_point D:set_depth", 10, 20);
			}
			this.context.closePath();
			this.context.fill();
		}
	}	




	/**
	 * Displays an image as background of the canvas
	 * @param {String} PlanTitle the plan's name as is written inside the JSON data of the trench.
	 **/
	displayPlan( PlanTitle ) {
		if( ExcData == null ) { return; } // <<<< data has not been loaded yet
		////
		var PlanData; 
		// display the image on the canvas and remember it, so that it is not oaded again
		if( currentPlanTitle==PlanTitle && PlanImage!=null && PlanImage!=undefined) { // image file has already been loaded
			try {
				this.context.drawImage(PlanImage, CanvasOffsetX, CanvasOffsetY, PlanImage.width * ZoomFactor, PlanImage.height * ZoomFactor );
			} catch( ex ) {
				console.log("Plan image was not found: " + PlanTitle);
				this.context.fillStyle = "red";
				this.context.fillText( "Plan image was not found", 10, 36);
				this.context.fill();
				document.getElementById("canvas").style.cursor = "default";
				if( PlanData != null && PlanData.hasOwnProperty("FormatImage") ) console.log( "!!! Plan images not found:" + PlanData["FormatImage"] );
			}
		} else {
			// find the plan's JSON data
			for (let i = 0; i	<ExcData.length; i++) { 
				if( ExcData[i]["Type"].localeCompare("Plan")==0 && ExcData[i]["Title"].localeCompare(PlanTitle)==0 ) {
					PlanData = ExcData[i];
					break;
				}
			}
			if( typeof PlanData == "undefined" ) { return; }  // <<<<
			// load the image
			document.getElementById("canvas").style.cursor = "wait";
			currentPlanTitle = PlanTitle;
			PlanImage = new Image();        
			PlanImage.src = "plans/" + PlanData["FormatImage"];
			console.log("Plan requested: " + PlanData["FormatImage"]);
			this.PlanIsLoading = true; // for displaying a map-loading message
			PlanImage.onload = function() {
				console.log("Plan was loaded: " + PlanData["FormatImage"]);
				map.PlanIsLoading = false;
				// fill the Plan's parameters
				var Plan_GeoReferencing_field = "FormatImageEnvelopeGEO";
				if( ExcavationPreferences.hasOwnProperty("Plan_GeoReferencing_field") && ExcavationPreferences["Plan_GeoReferencing_field"].length>0 ) {
					Plan_GeoReferencing_field = ExcavationPreferences["Plan_GeoReferencing_field"];
				}
				var s = PlanData[ Plan_GeoReferencing_field ];
				var coords = s.substring( s.indexOf("(")+1 );
				coords = coords.replaceAll( ")", "" );
				coords = coords.replaceAll( " ", "" );
				coords = coords.split(",");
				PlanMinX = parseFloat( coords[0] );
				PlanMaxX = parseFloat( coords[1] );
				PlanMinY = parseFloat( coords[3] );  // !!!!!!!! y becomes maximum at the top of the plan
				PlanMaxY = parseFloat( coords[2] );	
				PlanImageWidth  = PlanImage.width;
				PlanImageHeight = PlanImage.height;
				// calculate zoom factor, so that new plan is fully visible
				map.ZoomToFitScreen();
				// draw
				map.context.drawImage(PlanImage, 0, 0, PlanImage.width * ZoomFactor, PlanImage.height * ZoomFactor );
				//console.log(PlanMinX + " " + PlanMaxX + " " + PlanMinY + " " + PlanMaxY + " : " + PlanImageWidth + " " +PlanImageHeight );
				map.drawWorld();
				document.getElementById("canvas").style.cursor = "default";
			}
		}
	}


	/** 
	 * calulates the zommfactor so that the plan is fully visible
	 */
	ZoomToFitScreen() {
		CanvasOffsetX = 0;
		CanvasOffsetY = 0;
		ZoomFactor = Math.min( this.context.canvas.width/PlanImageWidth, this.context.canvas.height/PlanImageHeight );
		//console.log(ZoomFactor+" >> " + this.context.canvas.width + "/" + PlanImageWidth + " " + this.context.canvas.height + "/" + PlanImageHeight );
	}			


	/**
	 * Calculates the coordinates of the intersection points between the cross-section line defined by the arguments and each polygon side of the the selected items.
	 * @param {int} section_x1 horizontal coordinate of the 1st point of the cross-section line segment
	 * @param {int} section_y1 vertical   coordinate of the 1st point of the cross-section line segment
	 * @param {int} section_x2 horizontal coordinate of the 2nd point of the cross-section line segment
	 * @param {int} section_y2 vertical   coordinate of the 2nd point of the cross-section line segment
	 * @returns {Array} an array of JSON entities. Each entity represents a shape and contains a name/id and the coordinates of the corners. Format example: { ID: 'LK-973', POLYGON: [ { X: 3, Y: 4 }, { X: 7, Y: 6 } ] }
	 */
	CalcAndDrawCrossSection( section_x1, section_y1, section_x2, section_y2 ) {
		if( ExcData == null ) return;
		CrossSectionShapes = [];

		// draw cross section line
		this.context.strokeStyle = COLOR_crosssection;
		this.context.beginPath();
		this.context.moveTo(CrossSectionX1, CrossSectionY1);
		this.context.lineTo(CrossSectionX2, CrossSectionY2);
		this.context.closePath();
		this.context.stroke();

		// calculate intersections with selected items and draw them
		var num_of_intersections = 0;
		for (let i = 0; i < ExcData.length; i++) {
			try {
				if( ExcData[i]["Selected"]  &&  ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer  &&  ExcData[i]["Location"][Current_Layer].length > 1 ) { // this is a visible locus
					var json_shape = {};
					json_shape["ID"] = ExcData[i]["Identifier"];
					json_shape["POLYGON"] = [];
					for(let pointIdx=1; pointIdx<ExcData[i]["Location"][Current_Layer].length; pointIdx++) {
						// calculate the coordinates of each edge of the item
						var edge_x1 = ExcData[i]["Location"][Current_Layer][pointIdx-1]["X"];
						var edge_y1 = ExcData[i]["Location"][Current_Layer][pointIdx-1]["Y"];
						var edge_x2 = ExcData[i]["Location"][Current_Layer][pointIdx]["X"];
						var edge_y2 = ExcData[i]["Location"][Current_Layer][pointIdx]["Y"];
						var edge_x1 = this.map_range(edge_x1,  PlanMinX, PlanMaxX,                0,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
						var edge_y1 = this.map_range(edge_y1,  PlanMinY, PlanMaxY,   PlanImageHeight,               0) * ZoomFactor + CanvasOffsetY;
						var edge_x2 = this.map_range(edge_x2,  PlanMinX, PlanMaxX,                0,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
						var edge_y2 = this.map_range(edge_y2,  PlanMinY, PlanMaxY,   PlanImageHeight,               0) * ZoomFactor + CanvasOffsetY;
						// check if and where the item's edge and the user-drawn cross-section intersect
						var [intersectionX, intersectionY] = Lines.CalculateIntersection( edge_x1, edge_y1, edge_x2, edge_y2,  section_x1, section_y1, section_x2, section_y2 );
						// draw the intersection point on the map
						if( intersectionX != null ) { // the cross-section intersects with this edge
							num_of_intersections += 1;
							this.context.fillStyle = COLOR_crosssection;
							this.context.strokeStyle = COLOR_crosssection;
							this.context.beginPath();
							this.context.arc(intersectionX, intersectionY, 3, 0, 2*Math.PI);
							this.context.closePath();
							this.context.fill();
							this.context.stroke(); 
						}
						// calculate the underground intersection points
						if( intersectionX != null ) { // the cross-section intersects with this edge
							var edge_z1 = ExcData[i]["Location"][Current_Layer][pointIdx-1]["Z"];
							var edge_z2 = ExcData[i]["Location"][Current_Layer][pointIdx]["Z"];
							var intersectionZ = (edge_z2-edge_z1)*(intersectionX-edge_x1)/(edge_x2-edge_x1) + edge_z1;
							json_shape["POLYGON"].push( {X:intersectionX, Y:intersectionY, Z:intersectionZ} );
						}
					}
					if( json_shape["POLYGON"].length > 0 ) CrossSectionShapes.push( json_shape );
				}
			} catch( ex ) { 
				//console.log(">>" + ex.toString); 
			}
		}
	}




	/**
	 * remaps a number from one range to another
	 */
	map_range(value, low1, high1, low2, high2) {
		return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
	}



	/**
	 * Highlights the position of an item on the map, in order to draw the attention of the user on that point.
	 * @param {string} UUID the identification number of the item to be highlighted.
	 */
	HighlightItempOnMap( UUID ) {
		if( typeof UUID != "undefined" ) {
			this.Highlight_itemUUID = UUID;
			this.currentHighlightAlpha = 1.0;
			var self = this;
			this.Highlight_interval_ID = setInterval(function() { 
				self.drawWorld(); 
				self.currentHighlightAlpha = self.currentHighlightAlpha - 0.05; // fade out the vertical and horizontal lines
				if( self.currentHighlightAlpha <= 0 ) clearInterval(self.Highlight_interval_ID);
			}, 150);
		}
	}



	/***************************************** EVENT HANDLERS **********************************/



	/** Event Handler: Handles the mouse down event on the map */
	Canvas_MouseDownHandler(e) {
		this.PlanIsLoading = false; // sometimes the onLoad event didn't work
		// figure out where the user clicked
		var eventX, eventY;
		if( Utils.Am_I_running_on_mobile_device() ) {
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}
		MouseX = eventX - map.canvas.getBoundingClientRect().left;
		MouseY = eventY - map.canvas.getBoundingClientRect().top;
		MouseStartX = MouseX;
		MouseStartY = MouseY;
		// act on mouse down depending on canvas state
		MouseIsDown = true;
		if( map.CanvasState.startsWith("polygon") ) {
			PolygonPoints.push( {"x":MouseX, "y":MouseY} );
			map.drawWorld();
		} else if( map.CanvasState.localeCompare("crosssection")==0 ) {
			if (  CrossSectionX1 < 0  &&  CrossSectionX2 < 0  ) {
				CrossSectionX1 = MouseX;
				CrossSectionY1 = MouseY;
			} else if (  CrossSectionX1 >= 0  &&  CrossSectionX2 >= 0 ) {
				CrossSectionX1 = MouseX;
				CrossSectionY1 = MouseY;
				CrossSectionX2 = -1;
				CrossSectionY2 = -1;
				map.drawWorld();
			}
		}
		
		// for defining the coordinates points when ManualCoordinatesMode and the target button is active
		if( map.ManualCoordinatesMode  &&  map.CanvasState.localeCompare("defining-coordinates-manually") == 0 ) {
			// calculate the manually designated coordinates
			//var tmp = "";
			//tmp += "(" + MouseX + ", " + MouseY + ") ";
			var map_x = map.map_range(MouseX-CanvasOffsetX,  0, PlanImageWidth  * ZoomFactor,  PlanMinX, PlanMaxX);
			var map_y = map.map_range(MouseY-CanvasOffsetY,  0, PlanImageHeight * ZoomFactor,  PlanMaxY, PlanMinY);
			//tmp += " --> (" + map_x + " " + map_y + ")   Offset: " + CanvasOffsetX + " " + CanvasOffsetY;
			// remember the manually designated coordinate
			map.ManualCoordinates.push( {"X":map_x, "Y":map_y} );
			// print the manually designated coordinates and refresh
			//console.log(tmp);
			map.drawWorld();
		}
		
		// for altering the X-Y coordinates of a single point
		if( MouseIsDown && map.CanvasState.startsWith("alter_a_coordinate") ) {
			// locate the point which the user has clicked - it will be highlighted and allowed to be dragged to a different place
			MouseX = eventX - map.canvas.getBoundingClientRect().left;
			MouseY = eventY - map.canvas.getBoundingClientRect().top;
			var SelectedItem = ExcData[CoordinateAltering_SelectedItemIdx];
			if( SelectedItem.hasOwnProperty("Location")  &&  SelectedItem["Location"].length > Current_Layer) { 
				var min_distance = 999999999;
				for (let idx = 0; idx < SelectedItem["Location"][Current_Layer].length; idx++) { // find out the point of the item which is closer to the mouse click
					var point_x = SelectedItem["Location"][Current_Layer][idx]["X"];
					var point_y = SelectedItem["Location"][Current_Layer][idx]["Y"];
					var map_x = map.map_range(MouseX-CanvasOffsetX,  0, PlanImageWidth  * ZoomFactor,  PlanMinX, PlanMaxX);
					var map_y = map.map_range(MouseY-CanvasOffsetY,  0, PlanImageHeight * ZoomFactor,  PlanMaxY, PlanMinY);
					var distance = Math.sqrt( (map_x-point_x)*(map_x-point_x) + (map_y-point_y)*(map_y-point_y) );
					if( distance < min_distance ) {
						min_distance = distance;
						CoordinateAltering_SelectedPointIdx = idx;
					}
				}
			}
			// update map
			map.drawWorld();
		}
	}
	

	/** Event Handler: Handles the mouse up event on the map */
	Canvas_MouseUpHandler(e) {
		// figure out where the user clicked
		var eventX, eventY;
		if( Utils.Am_I_running_on_mobile_device() ) {
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}
		////
		if( e.ctrlKey ) {
			// do something in the future
		}
		////
		if( MouseIsDown && map.CanvasState.localeCompare("zoomin") == 0 ) {
			if( e.ctrlKey ) { map.ZoomIn(4); }  else { map.ZoomIn(); }
		} else if( MouseIsDown && map.CanvasState.localeCompare("zoomout") == 0 ) {
			if( e.ctrlKey ) { map.ZoomOut(4); }  else { map.ZoomOut(); }
		} else if( MouseIsDown && map.CanvasState.startsWith("displaydistances") ) {
			MouseX = eventX - map.canvas.getBoundingClientRect().left;
			MouseY = eventY - map.canvas.getBoundingClientRect().top;
			map.drawWorld();
		} else if( MouseIsDown && map.CanvasState.startsWith("select") ) {
			MouseIsDown = false;
			if( MouseStartX==MouseX && MouseStartY==MouseY) { // it is just a click, select close neighbors
				MouseStartX -= 6;
				MouseX += 6;
				MouseStartY -= 6;
				MouseY += 6;
			} 
			let minX = Math.min(MouseX, MouseStartX);
			let maxX = Math.max(MouseX, MouseStartX);
			let minY = Math.min(MouseY,  MouseStartY);
			let maxY = Math.max(MouseY,  MouseStartY);
			if( map.CanvasState.localeCompare("select") == 0 ) num_of_selected_items = 0;
			// select all items inside the rectangular area defined by the mouse
			for (let i = 0; i<ExcData.length; i++) {
				if( map.CanvasState.localeCompare("select") == 0 ) ExcData[i]["Selected"] = false;	
				try {
					// check if this item is displayed on the map or not
					var current_item_is_displayed_on_map = false;
					if( ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer ) {
						if( map.DisplayOnlySelectedItemsOnMap ) {
							if( ExcData[i]["Selected"] ) current_item_is_displayed_on_map = true;
						} else {
							if( ExcData[i]["Visible"] ) current_item_is_displayed_on_map = true;
						}
						if( current_item_is_displayed_on_map && ExcData[i].hasOwnProperty("InPlan") ) {
							if( ExcData[i]["InPlan"]==false ) current_item_is_displayed_on_map = false;
						}
					}
					// check if the item's Selected-state has to be altered 
					if( current_item_is_displayed_on_map ) {
						for(let j=0; j<ExcData[i]["Location"][Current_Layer].length; j++ ) {
							let X = ExcData[i]["Location"][Current_Layer][j]["X"]; 
							let Y = ExcData[i]["Location"][Current_Layer][j]["Y"];
							X = map.map_range(X,  PlanMinX, PlanMaxX,   0,      PlanImageWidth) * ZoomFactor + CanvasOffsetX;
							Y = map.map_range(Y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY; 
							if( X >= minX  &&  X <= maxX  &&  Y >= minY  &&  Y <= maxY ) {
								if( map.CanvasState.localeCompare("select") == 0  ||  map.CanvasState.localeCompare("selectplus") == 0 ) {
									if( ExcData[i]["Selected"] != true ) {
										ExcData[i]["Selected"] = true;
										num_of_selected_items += 1;
									}
									// scroll list to the first selected item 
									if( num_of_selected_items == 1 ) {
										Scroll_ItemsList( ExcData[i]["IdentifierUUID"] );
									}
								} else if( map.CanvasState.localeCompare("selectminus") == 0 ) {
									if( ExcData[i]["Selected"] == true ) {
										ExcData[i]["Selected"] = false;
										num_of_selected_items -= 1;
									}
								}
								break;
							}
						}
					}
				} catch( ex ) { 
					//console.log(">>>> " + ex.toString() + " :: " );
					//console.log(">>>>Z " + ExcData[i]["Identifier"] );
				}
			}
			updateInfoBar();
			map.drawWorld();
			updateSelectedItemsOnList();
		} else if( MouseIsDown && map.CanvasState.startsWith("pencil") ) {
			if( map.CanvasState.localeCompare("pencil") == 0 ) num_of_selected_items = 0;
			for (let i = 0; i<ExcData.length; i++) {
				if( map.CanvasState.localeCompare("pencil") == 0 ) ExcData[i]["Selected"] = false;	
				try {
					// check if this item is displayed on the map or not
					var current_item_is_displayed_on_map = false;
					if( ExcData[i].hasOwnProperty("Location")  &&  ExcData[i]["Location"].length > Current_Layer ) {
						if( map.DisplayOnlySelectedItemsOnMap ) {
							if( ExcData[i]["Selected"] ) current_item_is_displayed_on_map = true;
						} else {
							if( ExcData[i]["Visible"] ) current_item_is_displayed_on_map = true;
						}
						if( current_item_is_displayed_on_map && ExcData[i].hasOwnProperty("InPlan") ) {
							if( ExcData[i]["InPlan"]==false ) current_item_is_displayed_on_map = false;
						}
					}
					// check if the item's Selected-state has to be altered 
					if( current_item_is_displayed_on_map ) {
						for(let j=0; j<ExcData[i]["Location"][Current_Layer].length; j++ ) {
							for(let idx=0; idx<PencilPath.length; idx++) {	
								var X = ExcData[i]["Location"][Current_Layer][j]["X"]; 
								var Y = ExcData[i]["Location"][Current_Layer][j]["Y"];
								X = map.map_range(X,  PlanMinX, PlanMaxX,   0   ,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
								Y = map.map_range(Y,  PlanMinY, PlanMaxY,   PlanImageHeight,     0) * ZoomFactor + CanvasOffsetY; 
								var Distance = Math.sqrt( (X-PencilPath[idx]["x"])**2 + (Y-PencilPath[idx]["y"])**2 );
								if( Distance < PencilSelectionWidth/2 ) {
									if( map.CanvasState.localeCompare("pencil") == 0  ||  map.CanvasState.localeCompare("pencilplus") == 0 ) {
										if( ExcData[i]["Selected"] != true ) {
											ExcData[i]["Selected"] = true;
											num_of_selected_items += 1;
										}
										// scroll list to the first selected item 
										if( num_of_selected_items == 1 ) {
											Scroll_ItemsList( ExcData[i]["IdentifierUUID"] );
										}
									} else if( map.CanvasState.localeCompare("pencilminus") == 0 ) {
										if( ExcData[i]["Selected"] == true ) {
											ExcData[i]["Selected"] = false;
											num_of_selected_items -= 1;
										}
									}
									break;
								}
							}
							//// break again here if item has been selected
						}
					}
				} catch( ex ) { 
					//console.log(">>>>> " + ex.toString()); 
				}
			}
			updateInfoBar();
			map.drawWorld();
			updateSelectedItemsOnList();
			PencilPath = [];
		} else if( map.CanvasState.localeCompare("crosssection")==0 ) {
			if ( CrossSectionX1 >= 0  &&  CrossSectionX2 < 0  ) {
				CrossSectionX2 = MouseX;
				CrossSectionY2 = MouseY;
			}
			map.drawWorld();
			// ############ Display stratigraphy ############
			if( MouseIsDown ) {
				Dialog.DisplayCrossSectionDialog( CrossSectionX1, CrossSectionY1, CrossSectionX2, CrossSectionY2 );
			}
		} else if( MouseIsDown && (MouseX!=MouseStartX && MouseY!=MouseStartY) && map.CanvasState.startsWith("alter_a_coordinate") ) {
			// locate the selected item
			var SelectedItem = ExcData[CoordinateAltering_SelectedItemIdx];
			// alter the selected point's coordinates
			if( CoordinateAltering_SelectedPointIdx >= 0 ) {
				MouseX = eventX - map.canvas.getBoundingClientRect().left;
				MouseY = eventY - map.canvas.getBoundingClientRect().top;
				var map_x = map.map_range(MouseX-CanvasOffsetX,  0, PlanImageWidth  * ZoomFactor,  PlanMinX, PlanMaxX);
				var map_y = map.map_range(MouseY-CanvasOffsetY,  0, PlanImageHeight * ZoomFactor,  PlanMaxY, PlanMinY);
				SelectedItem["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["X"] = map_x;
				SelectedItem["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["Y"] = map_y;
				map.drawWorld();
			}
		}
		MouseIsDown = false;
	}




	/** Event Handler: Handles the mouse move event on the map */
	Canvas_MouseMoveHandler(e) {
		// figure out where the user clicked
		var eventX, eventY;
		if( Utils.Am_I_running_on_mobile_device() ) {
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}
		// act
		if( MouseIsDown ) {
			if( map.CanvasState.localeCompare("drag") == 0 ) {
				CanvasOffsetX = CanvasOffsetX + eventX - MouseX - map.canvas.getBoundingClientRect().left;
				CanvasOffsetY = CanvasOffsetY + eventY - MouseY - map.canvas.getBoundingClientRect().top;
			}
			MouseX = eventX - map.canvas.getBoundingClientRect().left;
			MouseY = eventY - map.canvas.getBoundingClientRect().top;
			if( map.CanvasState.startsWith("pencil") ) {
				// save the pencil's path
				PencilPath.push( {"x":MouseX, "y":MouseY} );
				// draw path on canvas
				map.context.beginPath();
				map.context.fillStyle  = "lightseagreen";
				map.context.strokeStyle = "lightseagreen";
				map.context.moveTo(MouseX, MouseY);
				map.context.arc(MouseX, MouseY, PencilSelectionWidth/2, 0, 2*Math.PI);
				map.context.fill(); 
				map.context.stroke();
				map.context.closePath();
			} else if( map.CanvasState.localeCompare("crosssection")==0 ) {
				map.drawWorld();
			} else {
				map.drawWorld();
			}
		}
	}

	/** Event Handler: handles the middle mouse button-wheel for the canvas and zooms in and out of the map */
	Canvas_WheelHandler(e) {
		event.preventDefault();
		if( e.deltaY > 0 ) {
			map.ZoomOut();
		} else {
			map.ZoomIn();
		}
	}	

	/** Event Handler: handles keyboard events for the canvas. The behavior is different depending on the currently selected tool. */
	Canvas_KeyDownHandler(e) {
		if( map.CanvasState.startsWith("zoom") ) {
			if(e.key == '+') {
				map.ZoomIn();
				map.drawWorld();
			} else if(e.key == '-') {
				map.ZoomOut();
				map.drawWorld();
			}
		} else if( map.CanvasState.startsWith("drag") ) {	
			if(e.key == 'ArrowUp') {
				if( e.ctrlKey ) { CanvasOffsetY -= 16; } else { CanvasOffsetY -= 1; }
				map.drawWorld();
			} else if(e.key == 'ArrowDown') {
				if( e.ctrlKey ) { CanvasOffsetY += 16; } else { CanvasOffsetY += 1; }
				map.drawWorld();
			} else if(e.key == 'ArrowLeft') {
				if( e.ctrlKey ) { CanvasOffsetX -= 16; } else { CanvasOffsetX -= 1; }
				map.drawWorld();
			} else if(e.key == 'ArrowRight') {
				if( e.ctrlKey ) { CanvasOffsetX += 16; } else { CanvasOffsetX += 1; }
				map.drawWorld();
			}
		} else if( map.CanvasState.startsWith("select") ) {
			if(e.key == '+') {
				if( map.CanvasState.localeCompare("selectplus")==0 ) {
					map.activate_Select();
				} else {
					map.activate_SelectPlus();
				}
			} else if(e.key == '-') {
				if( map.CanvasState.localeCompare("selectminus")==0 ) {
					map.activate_Select();
				} else {
					map.activate_SelectMinus();
				}
			}
		} else if( map.CanvasState.startsWith("polygon") ) {
			if(e.key == '+') {
				if( map.CanvasState.localeCompare("polygonplus")==0 ) {
					map.activate_Polygon();
				} else {
					map.activate_PolygonPlus();
				}
			} else if(e.key == '-') {
				if( map.CanvasState.localeCompare("polygonminus")==0 ) {
					map.activate_Polygon();
				} else {
					map.activate_PolygonMinus();
				}
			} else if(e.key == 'Escape') {
				PolygonPoints = [];
				map.drawWorld();
			}
		} else 	if( map.CanvasState.startsWith("pencil") ) {
			if(e.key == '+') {
				if( map.CanvasState.localeCompare("pencilplus")==0 ) {
					map.activate_Pencil();
				} else {
					map.activate_PencilPlus();
				}
			} else if(e.key == '-') {
				if( map.CanvasState.localeCompare("pencilminus")==0 ) {
					map.activate_Pencil();
				} else {
					map.activate_PencilMinus();
				}
			} else if(e.key == 'ArrowUp') {
				PencilSelectionWidth += 1; 
				map.drawWorld();
			} else if(e.key == 'ArrowDown') {
				PencilSelectionWidth -= 1;
				map.drawWorld();
			}
		} else if( map.CanvasState.startsWith("crosssection") ) {
			if(e.key == 'Escape') {
				CrossSectionX1 = CrossSectionY1 = CrossSectionX2 = CrossSectionY2 = -1;
				map.drawWorld();
			}
		} else if( map.CanvasState.startsWith("alter_a_coordinate") ) {
			if(e.key == 'Enter') { // save changes to the server
				SaveItem( ExcData[CoordinateAltering_SelectedItemIdx], false );
				CoordinateAltering_SelectedPointIdx = -1;
				CoordinateAltering_SelectedItemData_Backup = null;
			} else if(e.key == 'Escape') { // revert changes from local backup copy 
				ExcData[CoordinateAltering_SelectedItemIdx]["Location"] = CoordinateAltering_SelectedItemData_Backup["Location"];
				CoordinateAltering_SelectedItemIdx = -1;
				CoordinateAltering_SelectedPointIdx = -1;
				CoordinateAltering_SelectedItemData_Backup = null;
				map.Deactivate_all_MapTools();
			} else if(e.key == '+') { // add a new point
				// #### the new point coordinates
				var new_point_X = 0;
				var new_point_Y = 0;
				var new_point_Z = 0;
				// #### if the selected item has no location information then add it
				if( ExcData[CoordinateAltering_SelectedItemIdx].hasOwnProperty("Location")==false ) {
					ExcData[CoordinateAltering_SelectedItemIdx]["Location"] = [];
				}
				// #### if the selected item has no location information for the currnet layer then add it
				if( ExcData[CoordinateAltering_SelectedItemIdx]["Location"].length <= Current_Layer ) {
					var num_of_layers_to_add = Current_Layer-ExcData[CoordinateAltering_SelectedItemIdx]["Location"].length+1;
					for(let i=0; i<num_of_layers_to_add; i++){
						ExcData[CoordinateAltering_SelectedItemIdx]["Location"].push( [] );
					}
				}
				
				// #### set the position of the new point as the average position of all the exiting points at the current layer. In case of no points then set it as the center of the map
				if( ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].length == 0 ) {
					new_point_X = PlanMinX + Math.abs(PlanMaxX-PlanMinX)/2;
					new_point_Y = PlanMinY + Math.abs(PlanMaxY-PlanMinY)/2;
				} else {
					for(let i=0; i<ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].length; i++) {
						new_point_X += ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer][i]["X"];
						new_point_Y += ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer][i]["Y"];
					}
					new_point_X = new_point_X / ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].length;
					new_point_Y = new_point_Y / ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].length;
					new_point_Z = ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer][0]["Z"];
				}
				ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].push( {"X":new_point_X, "Y":new_point_Y, "Z":new_point_Z} );
				map.drawWorld();
			} else if(e.key == '-') { // remove the selected point
				if( CoordinateAltering_SelectedPointIdx < 0 ) {
					alert("No point has been selected.");
				} else {
					ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer].splice(CoordinateAltering_SelectedPointIdx, 1);
				}
				map.drawWorld();
			} else if(e.key == 'D' || e.key == 'd') { // set the depth (Z parameter) of the selected point
				if( CoordinateAltering_SelectedPointIdx < 0 ) {
					alert("No point has been selected.");
				} else {
					var point_Z = prompt("Set the point's depth in meters:", ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["Z"]);
					point_Z = parseFloat(point_Z)
					if( ! isNaN(point_Z) ) {
						ExcData[CoordinateAltering_SelectedItemIdx]["Location"][Current_Layer][CoordinateAltering_SelectedPointIdx]["Z"] = point_Z;
					}
				}
			}
			map.drawWorld();
		}
		////
		if( map.ManualCoordinatesMode ) {
			if(e.key == 'Escape') { // cancel
				// refresh state and visuals
				map.ManualCoordinatesMode = false;
				map.ItemUUID_forManualCoordinates = ""; 
				map.ItemIdentifier_forManualCoordinates = ""; 
				map.ManualCoordinates = []; 
				map.activate_Select();
				map.drawWorld();
				document.getElementById("target_button").style.display = "None";
			} else if(e.key == 'Delete') { // clear
				var ItemData = getDataBy_UUID( map.ItemUUID_forManualCoordinates );
				delete ItemData["Location"];
				// Save the coordinates to the server
				SaveItem( ItemData, false );
				// refresh state and visuals
				map.ManualCoordinatesMode = false;
				map.ItemUUID_forManualCoordinates = ""; 
				map.ItemIdentifier_forManualCoordinates = ""; 
				map.ManualCoordinates = []; 
				map.activate_Select();
				map.drawWorld();
				document.getElementById("target_button").style.display = "None";
			} else if(e.key == 'Enter') {
				// Ask user for min and max depth of the manually defined coordinates
				var min_depth = prompt("Please type the minimum depth in meters of the coordinates.\nThe program will calculate depths for all points automatically.");
				var max_depth = prompt("Please type the maximum depth in meters of the coordinates.\nThe program will calculate depths for all points automatically.");
				if( min_depth != null  &&  max_depth != null  &&  min_depth.length > 0  &&  max_depth.length > 0  ) { // user did not enter empty values to cancel the procedure
					// locate the item for which the coordinates are manually set
					var ItemData = getDataBy_UUID( map.ItemUUID_forManualCoordinates );
					// alter the "Location" field of the item with the new coordinates
					if( map.ManualCoordinates.length == 0 ) { // No points where defined
						map.ManualCoordinates = [];
					} else if( map.ManualCoordinates.length == 1 ) { // it is a point, add depth information to it
						map.ManualCoordinates[0]["Z"] = parseFloat(min_depth);
						ItemData["Location"] = [ map.ManualCoordinates ];
					} else { // when several points then construct 2 polygons one with the min and the other with max depth.
						var upper_polygon = [];
						var lower_polygon = [];
						for(var i=0; i<map.ManualCoordinates.length; i++ ) {
							upper_polygon.push( {"X":map.ManualCoordinates[i]["X"], "Y":map.ManualCoordinates[i]["Y"], "Z":parseFloat(min_depth)} );
							lower_polygon.push( {"X":map.ManualCoordinates[i]["X"], "Y":map.ManualCoordinates[i]["Y"], "Z":parseFloat(max_depth)} );
						}
						ItemData["Location"] = [ upper_polygon, lower_polygon ];
					}
					// Save the coordinates to the server
					SaveItem( ItemData, false );
				}
				// refresh state and visuals
				map.ManualCoordinatesMode = false;
				map.ItemUUID_forManualCoordinates = ""; 
				map.ItemIdentifier_forManualCoordinates = ""; 
				map.ManualCoordinates = []; 
				map.activate_Select();
				map.drawWorld();
				document.getElementById("target_button").style.display = "None";
			}
		}
	}
	

	/** Event Handler: handles keyboard events for the canvas. */
	Canvas_KeyUpHandler(e) {		
		if( this.CtrlKeyIsDown ) {
			this.CtrlKeyIsDown = false;
		}
	}


	/** Event Handler: handles double click for the canvas. The behavior is different depending on the currently selected tool. */
	Canvas_DoubleclickHandler(e) { 
		if( map.CanvasState.startsWith("polygon") && PolygonPoints.length > 1) {
			// close the polygon
			PolygonPoints.push( {"x":PolygonPoints[0]["x"], "y":PolygonPoints[0]["y"]} );
			map.context.closePath();
			// init the Ray Casting object
			var theRayCasting = new RayCasting( PolygonPoints );
			// select the surrounded items - use Ray Casting Algorithm
			for (var i = 0; i < ExcData.length; i++) {
				// deselect all items
				if( map.CanvasState.localeCompare("polygon")==0 ) ExcData[i]["Selected"] = false; 
				
				// check if the current item will change selection status because of user's action - useful for not checking all items for Ray Casting
				var checkThisItem = false;
				try {
					if( ExcData[i]["Location"][Current_Layer].length > 0 ) {
						if( (ExcData[i]["Selected"]==false && map.CanvasState.localeCompare("polygon")==0)  ||  (ExcData[i]["Selected"]==false && map.CanvasState.localeCompare("polygonplus")==0)  ||  (ExcData[i]["Selected"]==true && map.CanvasState.localeCompare("polygonminus")==0)) {
							checkThisItem = true;
						}
					}
				} catch (ex) { 
					//console.log(">>>>>> " + ex.toString()); 
				}
				
				// check if this item is displayed on the map or not
				try {
					var current_item_is_displayed_on_map = false;
					if( ExcData[i]["Location"][Current_Layer].length > 0 ) {
						if( map.DisplayOnlySelectedItemsOnMap ) {
							if( ExcData[i]["Selected"] ) current_item_is_displayed_on_map = true;
						} else {
							if( ExcData[i]["Visible"] ) current_item_is_displayed_on_map = true;
						}
						if( current_item_is_displayed_on_map && ExcData[i].hasOwnProperty("InPlan") ) {
							if( ExcData[i]["InPlan"]==false ) current_item_is_displayed_on_map = false;
						}
					}
					if( current_item_is_displayed_on_map == false ) checkThisItem = false;
				} catch (ex) { 
					//console.log(">>>>>>> " + ex.toString()); 
				}
				
				// check if current item falls inside polygon	
				if( checkThisItem )	{
					for(let pointIdx=0; pointIdx<ExcData[i]["Location"][Current_Layer].length; pointIdx++) {
						var x = ExcData[i]["Location"][Current_Layer][pointIdx]["X"];
						var y = ExcData[i]["Location"][Current_Layer][pointIdx]["Y"];
						x = map.map_range(x,  PlanMinX, PlanMaxX,                0,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
						y = map.map_range(y,  PlanMinY, PlanMaxY,   PlanImageHeight,               0) * ZoomFactor + CanvasOffsetY;
						if ( theRayCasting.isPointInsidePolygon(x, y) ) {
							if( map.CanvasState.localeCompare("polygon")==0 || map.CanvasState.localeCompare("polygonplus")==0 ) {
								ExcData[i]["Selected"] = true;
							} else if( map.CanvasState.localeCompare("polygonminus")==0 ) {
								ExcData[i]["Selected"] = false;
							}
							break;
						}
					}
				}
				
			}
			// clear polygon selection
			PolygonPoints = [];
			// refresh canvas
			map.drawWorld();
		} else if( map.CanvasState.localeCompare("drag") == 0 ) {
			map.ZoomToFitScreen();
			map.drawWorld();
		}
	}


	/** This method is called when the zoom-in button is pressed and alters the map-state so that this tool works. */
	activate_ZoomIn() {
		this.CanvasState = "zoomin";
		document.getElementById("canvas").style.cursor = "zoom-in";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("zoom_in_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		this.drawWorld();
	}
	
	/** This method is called when the zoom-out button is pressed and alters the map-state so that this tool works. */
	activate_ZoomOut() {
		this.CanvasState = "zoomout";
		document.getElementById("canvas").style.cursor = "zoom-out";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("zoom_out_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		this.drawWorld();
	}
	
	/** This method is called when the drag button is pressed and alters the map-state so that this tool works. */
	activate_Drag() {
		this.CanvasState = "drag";
		document.getElementById("canvas").style.cursor = "grab";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("drag_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		this.drawWorld();
	}
	
	/** This method is called when the rectangular-select button is pressed and alters the map-state so that this tool works. */
	activate_Select() {
		this.CanvasState = "select";
		document.getElementById("canvas").style.cursor = "default";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("select_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		this.drawWorld();
	}
	
	/** This method is called when the additive rectangular-select button is pressed and alters the map-state so that this tool works. */
	activate_SelectPlus() {
		this.CanvasState = "selectplus";
		document.getElementById("canvas").style.cursor = "copy";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("selectplus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		this.drawWorld();
	}
	
	/** This method is called when the subtractive rectangular-select button is pressed and alters the map-state so that this tool works. */
	activate_SelectMinus() {
		this.CanvasState = "selectminus";
		document.getElementById("canvas").style.cursor = "alias";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("selectminus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the polygonal-select button is pressed and alters the map-state so that this tool works. */
	activate_Polygon() {
		this.CanvasState = "polygon";
		document.getElementById("canvas").style.cursor = "default";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("polygon_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the additive polygonal-select button is pressed and alters the map-state so that this tool works. */
	activate_PolygonPlus() {
		this.CanvasState = "polygonplus";
		document.getElementById("canvas").style.cursor = "copy";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("polygonplus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";		
		this.drawWorld();
	}
	
	/** This method is called when the subtractive polygonal-select button is pressed and alters the map-state so that this tool works. */
	activate_PolygonMinus() {
		this.CanvasState = "polygonminus";
		document.getElementById("canvas").style.cursor = "alias";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("polygonminus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the pencil-select button is pressed and alters the map-state so that this tool works. */
	activate_Pencil() {
		this.CanvasState = "pencil";
		document.getElementById("canvas").style.cursor = "default";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("pencil_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the additive pencil-select button is pressed and alters the map-state so that this tool works. */
	activate_PencilPlus() {
		this.CanvasState = "pencilplus";
		document.getElementById("canvas").style.cursor = "copy";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("pencilplus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the subtractive pencil-select button is pressed and alters the map-state so that this tool works. */
	activate_PencilMinus() {
		this.CanvasState = "pencilminus";
		document.getElementById("canvas").style.cursor = "alias";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("pencilminus_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the cross section button is pressed and alters the map-state so that this tool works. */
	activate_CrossSection() {
		this.CanvasState = "crosssection";
		document.getElementById("canvas").style.cursor = "crosshair";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("crosssection_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}

	/** This method is called when the measurements button is pressed and alters the map-state so that this tool works. */
	ToggleDisplayOfDistances() {
		this.DisplayDistances = ! this.DisplayDistances;
		MouseX = -1;
		MouseY = -1;
		// when ruler is enabled then the user can click on a point and see its coordinates 
		this.CanvasState = "displaydistances";
		document.getElementById("canvas").style.cursor = "crosshair";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("ruler_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
		this.drawWorld();
	}
	
	/** This method is called when the measurements button is pressed and alters the map-state so that this tool works. */
	ActivateDefiningCoordinatesManually() {
		this.CanvasState = "defining-coordinates-manually";
		document.getElementById("canvas").style.cursor = "crosshair";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		document.getElementById("target_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";
		// update map
		this.drawWorld();
	}
	
	/** This method is called when the layers-button is clicked */
	activate_SelectLayer() {
		const btn = document.getElementById('layers_button');
		const popover = document.getElementById('Layers_rangePopover');
		// display the range pop-over
		popover.style.display = 'inline';
		// Position the popover directly under the button
		const rect = btn.getBoundingClientRect();
		popover.style.left = `${rect.left}px`;
		popover.style.top = `${rect.bottom + window.scrollY}px`;
		// update map
		this.drawWorld();
	}
	
	/** This method is called when the alter-a-coordinate-of-a-point is clicked */
	activate_AlterCoordinate() {
		// check if one and only one element is selected
		var num_of_selected_items = 0;
		if( ExcData != null ) {
			for (let i = 0; i < ExcData.length; i++) { 
				if( ExcData[i].hasOwnProperty("Selected") && ExcData[i]["Selected"] ) num_of_selected_items++;
			}
		}
		if( num_of_selected_items != 1 ) {
			alert("Currently there are " + num_of_selected_items + " items selected. There must be one and only one item selected, in order to alter the coordinates of one of its points." );
		} else {
			// locate the item which the user has selected
			for (let i = 0; i < ExcData.length; i++) { 
				if( ExcData[i].hasOwnProperty("Selected") && ExcData[i]["Selected"] ) { // the selected item was found
					CoordinateAltering_SelectedItemIdx = i; // remember which point the user wants to move
					break;
				}
			}
			// remember the current coordinates (before altered by the user) when a new item is selected for coordinate-altering. The process ends with Enter (for saving) or Escape (for canceling)
			if(CoordinateAltering_SelectedItemData_Backup==null || CoordinateAltering_SelectedItemData_Backup["IdentifierUUID"] != ExcData[CoordinateAltering_SelectedItemIdx]["IdentifierUUID"]) {
				CoordinateAltering_SelectedItemData_Backup = JSON.parse(JSON.stringify( ExcData[CoordinateAltering_SelectedItemIdx] ));
			}
			// change state
			this.CanvasState = "alter_a_coordinate";
			document.getElementById("canvas").style.cursor = "move";
			// display border around the clicked button
			var CanvasButtons = document.getElementsByClassName("canvasBtn");
			for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
			document.getElementById("alter_a_coordinate_button").style.boxShadow = "0px 0px 0px 2px  lightseagreen inset";	
			// update map
			this.drawWorld();
			// focus on the map (canvas element)
			this.canvas.focus();
		}
	}


	/** This method is called when the layers-button is clicked */
	Deactivate_all_MapTools() {
		this.CanvasState = "";
		document.getElementById("canvas").style.cursor = "default";
		// display border around the clicked button
		var CanvasButtons = document.getElementsByClassName("canvasBtn");
		for(let i=0; i<CanvasButtons.length; i++) { CanvasButtons[i].style.boxShadow = ""; }
		// update map
		this.drawWorld();
	}


}