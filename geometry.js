
/**
 * This class can be used to determine if a Point in 2D space is inside a 2D Polygon, given their coordinates.
 * The polygon-coordinates are given to the consructor. 
 * The point-coordinates are given to the method isPointInsidePolygon which executes the calculation and returns the result as well.
 * It uses the Ray Casting algorithm. 
 * The idea is that if a vector between the Point and any point outside the Polygon intersects the polygon edges odd times, then the Point lies inside the Polygon.
 */
class RayCasting {

    /**
	 *    - initializes the cartesian coordinates of a polygon.
     *	  - calculates the bounding rectangle for the polygon. This is useful for speeding up the exclusion of far away points.
	 *    - calculates the line-function coefficients for each polygon side. That is the a,b,c variables of the function aX + bY + c = 0.
	 *      This is done only once at the initialization of the class, so that consequent calls of the method isPointInsidePolygon() do not recalculate this info.
	 * @param {Array} thePolygonPoints an array of x, y pairs. They are the corners of a polygon. Examples: this.PolygonPoints.push( {"x":2.8, "y":3.55} );    this.PolygonPoints[2]["x"]=4.1;
	 */	
	constructor( thePolygonPoints ) {
		this.PolygonPoints = thePolygonPoints; // an array of x, y pairs. Examples: this.PolygonPoints.push( {"x":2.8, "y":3.55} );    this.PolygonPoints[2]["x"]=4.1;
		this.PolygonSides = [];  // an array of a, b, c coefficients for the line function a*X + b*Y + c = 0 of each side. Example: this.PolygonPoints.push( {"a":2.2, "b":3.87, "c":6.11} );
		this.minPolyX = 0; // bounding box of the polygon
		this.maxPolyX = 0; // bounding box of the polygon
		this.minPolyY = 0; // bounding box of the polygon
		this.maxPolyY = 0; // bounding box of the polygon
		
		// for speed: calculate the bounding box of the polygon, so that you check only the points that fall inside it. 
		if( this.PolygonPoints.length > 0 ) {
			this.minPolyX = this.PolygonPoints[0]["x"];
			this.maxPolyX = this.PolygonPoints[0]["x"];
			this.minPolyY = this.PolygonPoints[0]["y"];
			this.maxPolyY = this.PolygonPoints[0]["y"];
			for(let i=1; i<this.PolygonPoints.length; i++) {
				if( this.minPolyX > this.PolygonPoints[i]["x"] ) this.minPolyX = this.PolygonPoints[i]["x"];
				if( this.maxPolyX < this.PolygonPoints[i]["x"] ) this.maxPolyX = this.PolygonPoints[i]["x"];
				if( this.minPolyY > this.PolygonPoints[i]["y"] ) this.minPolyY = this.PolygonPoints[i]["y"];
				if( this.maxPolyY < this.PolygonPoints[i]["y"] ) this.maxPolyY = this.PolygonPoints[i]["y"];
			}
		}
		
		// calculate the line-function coefficients for each polygon side
		if( this.PolygonPoints.length > 1 ) {	
			for(let i=1; i<this.PolygonPoints.length; i++) {	
				var x1 = this.PolygonPoints[i-1]["x"];
				var y1 = this.PolygonPoints[i-1]["y"];
				var x2 = this.PolygonPoints[i]["x"];
				var y2 = this.PolygonPoints[i]["y"];
				var a = y2 - y1;
				var b = x1 - x2;
				var c = (x2 * y1) - (x1 * y2);
				this.PolygonSides.push( {"a":a, "b":b, "c":c} );
			}
		}
		
	}
	
	
	/**
	 * @param {float} x coordinate of the point to check
	 * @param {float} y coordinate of the point to check
	 * @return {boolean} true if the point with the coordinates given in the arguments lies inside the polygon defined at the constructor. It uses the ray casting algorithm.
	 */
	isPointInsidePolygon( x, y ) {
		var result = false;
		var sign1, sign2; // support variables

		if( x >= this.minPolyX  &&  x <= this.maxPolyX  &&   y >= this.minPolyY  &&  y <= this.maxPolyY ) { // point is inside the coarse bounding box, now check if it is inside the polygon by Ray Casting
			var intersections  = 0;
			
			// calculate the line-function coefficients for the horizontal Ray from outside the polygon to (x,y)
			var x1 = this.minPolyX - 1;
			var y1 = y;
			var x2 = x;
			var y2 = y;
			var a = y2 - y1;
			var b = x1 - x2;
			var c = (x2 * y1) - (x1 * y2);
			
			// for each polygon side check if it intersects the Ray 
			for(let i=1; i<this.PolygonPoints.length; i++) {
				// The equation aX+bY+c will be positive if (X,Y) is on one side of the Ray and negative if (X,Y) is on the other side. Check the side the polygon:
				var corner1_x = this.PolygonPoints[i-1]["x"];
				var corner1_y = this.PolygonPoints[i-1]["y"];
				var corner2_x = this.PolygonPoints[i]["x"];
				var corner2_y = this.PolygonPoints[i]["y"];
				sign1 = a*corner1_x + b*corner1_y + c;
				sign2 = a*corner2_x + b*corner2_y + c;
				if( (sign1>0 && sign2>0) || (sign1<0 && sign2<0) ) continue; // <<< this side lies on the same side of the Ray, so they do not intersect
				
				// Do the same calculation for the Ray in respect to the polygon side
				var side_a = this.PolygonSides[i-1]["a"];
				var side_b = this.PolygonSides[i-1]["b"];
				var side_c = this.PolygonSides[i-1]["c"];
				sign1 = side_a*x1 + side_b*y1 + side_c;
				sign2 = side_a*x2 + side_b*y2 + side_c;
				if( (sign1>0 && sign2>0) || (sign1<0 && sign2<0) ) continue; // <<< the ray lies on the same side of the side, so they do not intersect
				
				// if reached here then the Ray and the current polygon side intersect
				intersections += 1;
			}
			// when the number of intersections between the Ray and the Polygon is odd, then the point lies inside the polygon
			if( intersections % 2 == 1 ) result = true;
		}
		
		return result;
	}
	
	
	/**
	 * displays debugging info at the console and at the map.
	 */
	DisplayDebugInfo() {
		// calculate the line-function coefficients for the horizontal Ray from outside the polygon to (x,y)
		var x1 = this.minPolyX - 1;
		var y1 = y;
		var x2 = x;
		var y2 = y;
		var a = y2 - y1;
		var b = x1 - x2;
		var c = (x2 * y1) - (x1 * y2);
		// draw Ray
		context.beginPath();
		context.strokeStyle = "red";
		context.moveTo(x1, y1);
		context.lineTo(x2, y2);
		context.closePath();
		context.stroke();
		console.log( "Ray:" + x1 +  " " + y1 + " : " + x2 + " " + y2);
		//drawBox
		context.beginPath();
		context.strokeStyle = "blue";
		context.moveTo(this.minPolyX, this.minPolyY);
		context.lineTo(this.maxPolyX, this.minPolyY);
		context.lineTo(this.maxPolyX, this.maxPolyY);
		context.lineTo(this.minPolyX, this.maxPolyY);
		context.lineTo(this.minPolyX, this.minPolyY);
		context.closePath();
		context.stroke();
		console.log( "Box:" + this.minPolyX + " " + this.minPolyY + " : " + this.maxPolyX + " " + this.maxPolyY);
	}
	
}





/**
 * This class contains methods for useful calculations related to line segments.
 */
class Lines {
	
	/**
	 * line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
	 * Determine the intersection point of two line segments in 2D space.
	 * @param {float} x1 the coordinates of the first point of the first line segment
	 * @param {float} y1 the coordinates of the first point of the first line segment
	 * @param {float} x2 the coordinates of the second point of the first line segment
	 * @param {float} y2 the coordinates of the second point of the first line segment
	 * @param {float} x3 the coordinates of the first point of the second line segment
	 * @param {float} y3 the coordinates of the first point of the second line segment
	 * @param {float} x4 the coordinates of the second point of the second line segment
	 * @param {float} y4 the coordinates of the second point of the second line segment
	 * @return {Array} an array of the two coordinates [x,y] of the intersection. If the lines don't intersect x and y will be null
	 */
	static CalculateIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
	  // Check if none of the lines are of length 0
		if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) return [null, null];

		var denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
		if (denominator === 0) return [null, null]; // Lines are parallel

		var ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
		var ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
		if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return [null, null]; // is the intersection along the segments

		// Return a object with the x and y coordinates of the intersection
		var x = x1 + ua * (x2 - x1);
		var y = y1 + ua * (y2 - y1);
		return [x, y];
	}
	
	
	
	/**
	 * @param {float} x1 the coordinate of the first point
	 * @param {float} y1 the coordinate of the first point
	 * @param {float} x2 the coordinates of the second point
	 * @param {float} y2 the coordinates of the second point
	 * @returns {float} the euclidean distance between two points.
	 */
	static CalculateDistance( x1, y1,  x2, y2 ) {
		return Math.sqrt( (x2-x1)**2 + (y2-y1)**2 );
	}

}





/**
 * This class contains utilities for calculating the area of shapes and sorting their corners.
 */
class Area {
	
	/**
	 * returns the area of a triangle given the coordinates of its 3 points.
	 * @param {float} x1 the coordinates of the first point
	 * @param {float} y1 the coordinates of the first point
	 * @param {float} x2 the coordinates of the second point
	 * @param {float} y2 the coordinates of the second point
	 * @param {float} x3 the coordinates of the third point
	 * @param {float} y3 the coordinates of the third point
	 */
	static CalcArea_of_Triangle( x1, y1,   x2, y2,   x3, y3 ) {
		var side1 = Lines.CalculateDistance( x1, y1,  x2, y2);
		var side2 = Lines.CalculateDistance( x2, y2,  x3, y3);
		var side3 = Lines.CalculateDistance( x3, y3,  x1, y1);
		var s = (side1 + side2 + side3) / 2;
		return Math.sqrt(s * ((s - side1) * (s - side2) * (s - side3)));
	}
	
	
	/**
	 * @param {Array} PolygonPoints a list of X, Y points comprising the polygon. Format: [ {"X":3, "Y":4}, {"X":7, "Y":6} ]
	 * @returns {float} the area of a polygon by adding the area of succesive triangles originating from its first point.
	 */
	static CalcArea_of_Polygon( PolygonPoints ) {
		var result = 0;
		if( PolygonPoints.length >= 3 ) {
			for(let i=1; i<PolygonPoints.length-1; i++) {
				result += Area.CalcArea_of_Triangle( PolygonPoints[0]["X"], PolygonPoints[0]["Y"],  PolygonPoints[i]["X"], PolygonPoints[i]["Y"],  PolygonPoints[i+1]["X"], PolygonPoints[i+1]["Y"] );
			}
		}
		return result;
	}
	
	
	/**
	 * @param {Array} Corners an array of points. Format: [ {"X":3, "Y":4, "Z":5}, {"X":7, "Y":6, "Z":2} ]
	 * @param {float} centerX the coordinates of a center point relative to which the angles to the corners wii be computed
	 * @param {float} centerY the coordinates of a center point relative to which the angles to the corners wii be computed
	 * @return {Array} the sorted array of points. Sorting is done according to the angle between each Corner and the Center-point. Drawing the edges in this order they will not cross each other.
	 */
	static SortPolygonCorners( Corners, centerX, centerY ) {
		// sort Corners according to Angles
		var tmp = 0.0;
		var Angles = [];
		var done = false;
		while( ! done ) { // continue until no swap occures
			done = true;
			// for each corner compute its angle relative to the center point (between center-right and center-corner)
			for (let i=0; i<Corners.length; i++) {
				Angles[i] = Math.atan2(Corners[i]["Z"]-centerY, Corners[i]["X"]-centerX) * 180 / Math.PI;
			}
			// sort the corners according their angles to the center point
			for (let i=0; i<Corners.length-1; i++) {
				if( Angles[i] > Angles[i+1] ) {
					tmp = Corners[i]["X"];  Corners[i]["X"] = Corners[i+1]["X"];  Corners[i+1]["X"] = tmp;
					tmp = Corners[i]["Y"];  Corners[i]["Y"] = Corners[i+1]["Y"];  Corners[i+1]["Y"] = tmp;
					tmp = Corners[i]["Z"];  Corners[i]["Z"] = Corners[i+1]["Z"];  Corners[i+1]["Z"] = tmp;
					done = false;
					break;
				}
			}
		}
		return Corners;
	}
	
}