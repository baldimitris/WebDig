/**
 * This class calculates cross sections 
 * A cross section is a vertical cut of the soil along a user-defined line. 
 * It reveals the vertical geometry of a trench item.
 */

class CrossSection {

	/**
	 * Initializes
	 * @arg {object} _ItemData the data of a trench item. This is an object created from parsed json data.
	 * @arg {int} _section_x1 horizontal coordinate of the 1st point of the cross-section line segment
	 * @arg {int} _section_y1 vertical   coordinate of the 1st point of the cross-section line segment
	 * @arg {int} _section_x2 horizontal coordinate of the 2nd point of the cross-section line segment
	 * @arg {int} _section_y2 vertical   coordinate of the 2nd point of the cross-section line segment
	 */
	constructor( _ItemData, _section_x1, _section_y1, _section_x2, _section_y2 ) {
		this.ItemData = _ItemData;
		this.section_x1 = _section_x1;
		this.section_y1 = _section_y1;
		this.section_x2 = _section_x2;
		this.section_y2 = _section_y2;
		this.SectionPoints = [];
	}



	/**
	 * Parses the "Location" field of an item and returns the polygons described in the following format:
	 * [   [ {X:3, Y:4, Z:1}, {X:7, Y:6, Z:1}, {X:8, Y:11, Z:1}, {X:9, Y:2, Z:1} ]  ,   [ {X:0, Y:1, Z:2}, {X:2, Y:4, Z:2}, {X:8, Y:6, Z:2} ]   ]
	 */
	getItemPolygons() {
		return this.ItemData["Location"];
	}
	




	/**
	 * Calculates the coordinates of the intersection points between the cross-section line defined by the arguments and each polygon side of the the selected items.
	 * @returns {Array} an array of JSON entities. Each entity represents a shape and contains the coordinates of the corners. Format example: [ {"X":3, "Y":4, "Z":5}, {"X":7, "Y":6, "Z":2} ]
	 */
	CalcCrossSection( ) {  // section_x1=this.section_x1, section_y1=this.section_y1, section_x2=this.section_x2, section_y2=this.section_y2
		var section_x1 = this.section_x1;
		var section_y1 = this.section_y1;
		var section_x2 = this.section_x2;
		var section_y2 = this.section_y2;
		this.SectionPoints = [];
		
		// ignore items with no Location information for the current layer, or which are just points on the map
		if( this.ItemData.hasOwnProperty("Location") ) {
			if( this.ItemData["Location"].length <= Current_Layer ) return this.SectionPoints;
			if( this.ItemData["Location"][Current_Layer].length <= 1 ) return this.SectionPoints; 
		} else {
			return this.SectionPoints;
		}
		
		var Polygons = this.getItemPolygons();
		
		for( let poly_idx=0; poly_idx<Polygons.length; poly_idx++) { // for each polygon which describes the item
			var idx = poly_idx;
			for(let pointIdx=1; pointIdx<Polygons[idx].length; pointIdx++) { // for each polygon edge calculate the coordinates 
				var edge_x1 = Polygons[idx][pointIdx-1]["X"];
				var edge_y1 = Polygons[idx][pointIdx-1]["Y"];
				var edge_x2 = Polygons[idx][pointIdx]["X"];
				var edge_y2 = Polygons[idx][pointIdx]["Y"];
				edge_x1 = map.map_range(edge_x1,  PlanMinX, PlanMaxX,                0,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
				edge_y1 = map.map_range(edge_y1,  PlanMinY, PlanMaxY,   PlanImageHeight,               0) * ZoomFactor + CanvasOffsetY;
				edge_x2 = map.map_range(edge_x2,  PlanMinX, PlanMaxX,                0,   PlanImageWidth) * ZoomFactor + CanvasOffsetX;
				edge_y2 = map.map_range(edge_y2,  PlanMinY, PlanMaxY,   PlanImageHeight,               0) * ZoomFactor + CanvasOffsetY;
				// check if and where the item's edge and the user-drawn cross-section intersect
				var [intersectionX, intersectionY] = Lines.CalculateIntersection( edge_x1, edge_y1, edge_x2, edge_y2,  section_x1, section_y1, section_x2, section_y2 );
				if( intersectionX != null ) { // the cross-section intersects with this edge
					var edge_z1 = Polygons[idx][pointIdx-1]["Z"];
					var edge_z2 = Polygons[idx][pointIdx]["Z"];
					var intersectionZ = (edge_z2-edge_z1)*(intersectionX-edge_x1)/(edge_x2-edge_x1) + edge_z1; // calculate the depth of the intersection
					this.SectionPoints.push( {"X":parseFloat(intersectionX), "Y":parseFloat(intersectionY), "Z":parseFloat(intersectionZ)} );
				}
			}	
		}

		return this.SectionPoints;
	}


}

































