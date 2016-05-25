var camera, scene, renderer;
var geometry, material, mesh, group, points;
var satellites;
var positions, point_mat;

function init() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 1000;

    scene = new THREE.Scene();

    geometry = new THREE.SphereGeometry(400, 32, 24);

    material = new THREE.MeshPhongMaterial( );
   // material.transparent = true;
   // material.opacity = 0.9;
   /*
    var map_loader = new THREE.TextureLoader();
    map_loader.load(
       'images/earthmap1k.jpg',
        function ( texture ) {
            material.map = texture;
            mesh.material = material;
        },
        function ( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
        function ( xhr ) {
            console.log( 'An error happened' );
        }
    );
   */
    material.map = THREE.ImageUtils.loadTexture('images/earthmap1k.jpg');

    material.bumpMap = THREE.ImageUtils.loadTexture('images/earthbump1k.jpg');
    material.bumpScale = 0.9;

    material.specularMap = THREE.ImageUtils.loadTexture('images/earthspec1k.jpg');
    material.specular = new THREE.Color('grey');


    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.set( 0.5, 1, 1);
    scene.add( directionalLight );

    var light = new THREE.AmbientLight( 0x000000 ); // soft white light
    scene.add( light );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);
    group = new THREE.Object3D();
    scene.add(group);

    positions = new THREE.Geometry();
    point_mat = new THREE.PointsMaterial({color: 0xffff00, size: 1, sizeAttenuation: false});
}

function animate() {

    requestAnimationFrame(animate);

    if (satellites) {
        update_positions();
        //points.rotation.x += 0.01;
        if (points) {
            points.rotation.y += 0.002;
        }
    }

    //mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.002;

    //group.rotation.x += 0.01;
    group.rotation.y += 0.002;

    renderer.render(scene, camera);

}

function go() {
//    new Loader('gshhg-bin-2/gshhs_c.b', process_map_data, 'arraybuffer');
    new Loader('tle/visual.txt', prcoess_tle_response);
    init();
    animate();
}

function Loader(path, onload, type) {
    this.path = path;
    this.request = new XMLHttpRequest();
    this.onload = onload;
    this.request.onload = Loader.prototype.onload.bind(this);
    this.request.open('get', this.path);
    if (type) {
        this.request.responseType = type;
    }
    this.request.send();
}

Loader.prototype.onload = function() {
    if (this.onload) {
        this.onload(this.request);
    }
}

function process_map_data(request) {
    var arrayBuffer = request.response; // Note: not request.responseText
    var header = {
        id: {type: 'int32'},             /* Unique polygon id number, starting at 0 */
        n: {type: 'int32'},              /* Number of points in this polygon */
                                         /* flag contains 5 items, as follows:
                                          * low byte:    level = flag & 255: Values: 1 land, 2 lake, 3 island_in_lake, 4 pond_in_island_in_lake
                                          * 2nd byte:    version = (flag >> 8) & 255: Values: Should be 12 for GSHHG release 12 (i.e., version 2.2)
                                          * 3rd byte:    greenwich = (flag >> 16) & 1: Values: Greenwich is 1 if Greenwich is crossed
                                          * 4th byte:    source = (flag >> 24) & 1: Values: 0 = CIA WDBII, 1 = WVS
                                          * 4th byte:    river = (flag >> 25) & 1: Values: 0 = not set, 1 = river-lake and level = 2
                                          */

        source: {type: 'int8'},          /* 0 = not set, 1 = river-lake and level = 2 */
        greenwich: {type: 'int8'},       /* Greenwich is 1 if Greenwich is crossed */
        version: {type: 'int8'},         /* Should be 12 for GSHHG release 12 (i.e., version 2.2) */
        level: {type: 'int8'},           /* 1 land, 2 lake, 3 island_in_lake, 4 pond_in_island_in_lake */
        west: {type: 'int32'},           /* min/max extent in micro-degrees */
        east: {type: 'int32'},           /* min/max extent in micro-degrees */
        south: {type: 'int32'},          /* min/max extent in micro-degrees */
        north: {type: 'int32'},          /* min/max extent in micro-degrees */
        area: {type: 'int32'},           /* Area of polygon in 1/10 km^2 */
        area_full: {type: 'int32'},      /* Area of original full-resolution polygon in 1/10 km^2 */
        container: {type: 'int32'},      /* Id of container polygon that encloses this polygon (-1 if none) */
        ancestor: {type: 'int32'}        /* Id of ancestor polygon in the full resolution set that was the source of this polygon (-1 if none) */
    };
    var point = {
        x: {type: 'int32'},
        y: {type: 'int32'}
    };

    var offset = 0;
    var outlines = [];
    var current = [];
    var max_east = 270000000;
    var lat, lon;
    var earth_radius = 400;
    var r;

    var material = new THREE.LineBasicMaterial({
        color: 0x90ff90
    });
    var geometry;
    var line;
    var points = 0;

    if (arrayBuffer) {
        while (offset < arrayBuffer.byteLength) {
            offset = get_struct(header, arrayBuffer, offset);

            geometry = new THREE.Geometry();

            if (header.level.value < 2) {
                points += header.n.value;
                for (var i = 0; i < header.n.value; ++i) {
                    offset = get_struct(point, arrayBuffer, offset);
                    lon = (header.greenwich.value && point.x.value > max_east) ? point.x.value * 1.0e-6 - 360.0 : point.x.value * 1.0e-6;
                    lat = point.y.value * 1.0e-6;
                    lat *= Math.PI / 180;
                    lon *= -Math.PI / 180;
                    r = earth_radius * Math.cos(lat);
                    //current.push([r * Math.cos(lon), earth_radius * Math.sin(lat), r * Math.sin(lon)]);
                    geometry.vertices.push(
                        new THREE.Vector3(r * Math.cos(lon), earth_radius * Math.sin(lat), r * Math.sin(lon)));
                }
                line = new THREE.Line(geometry, material);
                group.add(line);
                //outlines.push(current);
            } else {
                offset += header.n.value * 8;
            }
            max_east = 180000000;   /* Only Eurasiafrica needs 270 */
        }
        //scene.add(group);
        console.log(points);
    }
}

function get_struct(definition, buffer, offset) {
    var view = new DataView(buffer);
    var types = {
        'int8': {size: 1, get: DataView.prototype.getInt8.bind(view)},
        'uint8': {size: 1, get: DataView.prototype.getUint8.bind(view)},
        'int16': {size: 2, get: DataView.prototype.getInt16.bind(view)},
        'uint16': {size: 2, get: DataView.prototype.getUint16.bind(view)},
        'int32': {size: 4, get: DataView.prototype.getInt32.bind(view)},
        'uint32': {size: 4, get: DataView.prototype.getUint32.bind(view)},
        'float32': {size: 4, get: DataView.prototype.getFloat32.bind(view)},
        'float64': {size: 8, get: DataView.prototype.getFloat64.bind(view)}
    };

    for (var a in definition) {
        if (definition.hasOwnProperty(a)) {
            if (types[definition[a].type]) {
                definition[a].value = types[definition[a].type].get(offset);
                offset += types[definition[a].type].size;
            } else {
                console.log('Unrecognised type: ' + definition[a].type + ' (' + a + ')');
            }

        }
    }
    return offset;
}

function prcoess_tle_response(request) {
    satellites = process_tle_file(request.responseText);
    for (var i = 0, ilen = satellites.length; i < ilen; ++i) {
        sgp4init(satellites[i], 'wgs84', 'i', satellites[i].satnum, satellites[i].jdsatepoch-2433281.5, satellites[i].bstar,
                     satellites[i].ecco, satellites[i].argpo, satellites[i].inclo, satellites[i].mo, satellites[i].no,
                     satellites[i].nodeo);
     	satellites[i].sprite = makeTextSprite( satellites[i].name, 
		    { fontsize: 24, borderColor: {r:255, g:0, b:0, a:1.0}, backgroundColor: {r:255, g:100, b:100, a:0.8} } );
	group.add(satellites[i].sprite);
    }
    update_positions();
    points = new THREE.Points(positions, point_mat);
    scene.add(points);
}

function update_positions(time) {
    var container = document.getElementById('details');
    var node;

    var r = [], v = [];

    time = time || new Date();
    var julian_day = time.getTime()/86400000 + 2440587.5;

    if (container) {
        while (container.firstChild) {
            container.removeChild(container.lastChild);
        }
    } else {
        container = document.createElement('div');
        container.id = 'details';
        container.style.position = 'fixed';
        container.style.top = 0;
        container.style.left = 0;
        container.style.width = '10em';
        container.style.height = '100%';
        container.style.overflow = 'auto';
        container.zIndex = 100;
        //document.getElementsByTagName('body')[0].appendChild(container);
    }

    for (var i = 0, ilen = satellites.length; i < ilen; ++i) {
        sgp4('wgs84', satellites[i], (julian_day - satellites[i].jdsatepoch) * 24 * 60, r, v);
        var position = eci_to_lat_long(r, julian_day);
        var R = 400 * position.altitude / 6378.137;
        var y = R * Math.sin(position.lat);
        var R2 = R * Math.cos(position.lat);
        var x = R2 * Math.cos(-position.long);
        var z = R2 * Math.sin(-position.long);
        positions.vertices[i] = new THREE.Vector3( x, y, z);
        satellites[i].sprite.position.set(x, y, z);
        /*
        node = document.createElement('span');
        node.appendChild(document.createTextNode(satellites[i].name));
        container.appendChild(node);
        container.appendChild(document.createElement('br'));
        
        node = document.createElement('span');
        node.appendChild(document.createTextNode(position.latitude));
        container.appendChild(node);
        container.appendChild(document.createElement('br'));
        node = document.createElement('span');
        node.appendChild(document.createTextNode(position.longitude));
        container.appendChild(node);
        container.appendChild(document.createElement('br'));
        node = document.createElement('span');
        node.appendChild(document.createTextNode(position.altitude - 6378.137));
        container.appendChild(node);
        container.appendChild(document.createElement('br'));
        */
    }
    positions.verticesNeedUpdate = true;
}

// Convert Earth Centred Inertial co-ordinates to latitude, longitude and distance from centre
//
// r = position vector
// time = Julian time
function eci_to_lat_long(r, time) {
    var gmst = gstime(time);
    var long = (Math.atan2(r[1], r[0]) - gmst);
    var longitude = long * 180 / Math.PI;
    var R = Math.sqrt(r[0] * r[0] + r[1] * r[1]);
    var theta_dash = Math.atan(r[2] / R);

    var latitude = theta_dash * 180 / Math.PI;
    var altitude = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]);

    return {long: long, lat: theta_dash, latitude: latitude, longitude: longitude, altitude: altitude};
}

/* -----------------------------------------------------------------------------
*
*                           procedure jday
*
*  this procedure finds the julian date given the year, month, day, and time.
*    the julian date is defined by each elapsed day since noon, jan 1, 4713 bc.
*
*  algorithm     : calculate the answer in one step for efficiency
*
*  author        : david vallado                  719-573-2600    1 mar 2001
*
*  inputs          description                    range / units
*    year        - year                           1900 .. 2100
*    mon         - month                          1 .. 12
*    day         - day                            1 .. 28,29,30,31
*    hr          - universal time hour            0 .. 23
*    min         - universal time min             0 .. 59
*    sec         - universal time sec             0.0 .. 59.999
*
*  outputs       :
*    jd          - julian date                    days from 4713 bc
*
*  locals        :
*    none.
*
*  coupling      :
*    none.
*
*  references    :
*    vallado       2007, 189, alg 14, ex 3-14
*
* --------------------------------------------------------------------------- */

function jday(year, mon, day, hr, minute, sec)
   {
     return 367.0 * year -
          Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
          Math.floor( 275 * mon / 9.0 ) +
          day + 1721013.5 +
          ((sec / 60.0 + minute) / 60.0 + hr) / 24.0;  // ut in days
          // - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
   }  // end jday


/* -----------------------------------------------------------------------------
*
*                           procedure days2mdhms
*
*  this procedure converts the day of the year, days, to the equivalent month
*    day, hour, minute and second.
*
*  algorithm     : set up array for the number of days per month
*                  find leap year - use 1900 because 2000 is a leap year
*                  loop through a temp value while the value is < the days
*                  perform int conversions to the correct day and month
*                  convert remainder into h m s using type conversions
*
*  author        : david vallado                  719-573-2600    1 mar 2001
*
*  inputs          description                    range / units
*    year        - year                           1900 .. 2100
*    days        - julian day of the year         0.0  .. 366.0
*
*  outputs       :
*    mon         - month                          1 .. 12
*    day         - day                            1 .. 28,29,30,31
*    hr          - hour                           0 .. 23
*    min         - minute                         0 .. 59
*    sec         - second                         0.0 .. 59.999
*
*  locals        :
*    dayofyr     - day of year
*    temp        - temporary extended values
*    inttemp     - temporary int value
*    i           - index
*    lmonth[12]  - int array containing the number of days per month
*
*  coupling      :
*    none.
* --------------------------------------------------------------------------- */

function days2mdhms(year, days)
//          int& mon, int& day, int& hr, int& minute, double& sec
//        )
{
    var i, inttemp, dayofyr;
    var temp;
    var lmonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    dayofyr = Math.floor(days);
    /* ----------------- find month and day of month ---------------- */
    if ( (year % 4) == 0 ) {
        lmonth[1] = 29;
    }

    i = 1;
    inttemp = 0;
    while ((dayofyr > inttemp + lmonth[i-1]) && (i < 12)) {
        inttemp = inttemp + lmonth[i-1];
        i++;
    }
    mon = i;
    day = dayofyr - inttemp;

    /* ----------------- find hours minutes and seconds ------------- */
    temp = (days - dayofyr) * 24.0;
    hr   = Math.floor(temp);
    temp = (temp - hr) * 60.0;
    minute  = Math.floor(temp);
    sec  = (temp - minute) * 60.0;
    return {month: mon, day: day, hour: hr, minute: minute, second: sec}
}  // end days2mdhms


function process_tle_file(file) {
    const deg2rad = Math.PI / 180.0;         //   0.0174532925199433
    const xpdotp = 1440.0 / (2.0 * Math.PI);  // 229.1831180523293
    var lines, line;
    var satellites = [];
    var formats = [
    [
        {field: 1, start: 0, end: 69, name: 'name', description: 'Name'}],
    [
        {field: 1, start: 0, end: 1, name: 'line1', description: 'Line number'},
        {field: 2, start: 2, end: 7, name: 'num', description: 'Satellite number', parse: parseInt10},
        {field: 3, start: 7, end: 8, name: 'classification', description: 'Classification (U=Unclassified)'},
        {field: 4, start: 9, end: 15, name: 'designator', description: 'International Designator (Last two digits of launch year)'},
        {field: 7, start: 18, end: 20, name: 'epochyear', description: 'Epoch Year (last two digits of year)', parse: parseYear},
        {field: 8, start: 20, end: 32, name: 'epochdays', description: 'Epoch (day of the year and fractional portion of the day)', parse: parseFloat},
        {field: 9, start: 33, end: 43, name: 'ndot', description: 'First Time Derivative of the Mean Motion divided by two [10]', parse: parseFloat},
        {field: 10, start: 44, end: 52, name: 'nddot', description: 'Second Time Derivative of Mean Motion divided by six (decimal point assumed)', parse: parseExp},
        {field: 11, start: 53, end: 61, name: 'bstar', description: 'BSTAR drag term (decimal point assumed) [10]', parse: parseExp},
        {field: 12, start: 62, end: 63, name: 'type', description: 'The number 0 (originally this should have been "Ephemeris type")'},
        {field: 13, start: 64, end: 68, name: 'num', description: 'Element set number. Incremented when a new TLE is generated for this object.[10]'},
        {field: 14, start: 68, end: 69, name: 'cksum', description: 'Checksum (modulo 10)'}],
    [
        {field: 1, start: 0, end: 1, name: 'line2', description: 'Line number'},
        {field: 2, start: 2, end: 7, name: 'num', description: 'Satellite number', parse: parseInt10},
        {field: 3, start: 8, end: 16, name: 'inclo', description: 'Inclination [Degrees]', parse: parseFloat},
        {field: 4, start: 17, end: 25, name: 'nodeo', description: 'Right Ascension of the Ascending Node [Degrees]', parse: parseFloat},
        {field: 7, start: 26, end: 33, name: 'ecco', description: 'Eccentricity (decimal point assumed)', parse: parseEccentricity},
        {field: 8, start: 34, end: 42, name: 'argpo', description: 'Argument of Perigee [Degrees]', parse: parseFloat},
        {field: 9, start: 43, end: 51, name: 'mo', description: 'Mean Anomaly [Degrees]', parse: parseFloat},
        {field: 10, start: 52, end: 63, name: 'no', description: 'Mean Motion [Revs per day]', parse: parseFloat},
        {field: 11, start: 63, end: 68, name: 'revnum', description: 'Revolution number at epoch [Revs]', parse: parseInt10},
        {field: 14, start: 68, end: 69, name: 'cksum', description: 'Checksum (modulo 10)'}]
        ];
    var sat = {};

    lines = file.split(/\n/);

    line = 0;
    for (var l = 0, llen = lines.length; l < llen; ++l) {
        if (lines[l]) {
            for (var f = 0, flen = formats[line].length; f < flen; ++f) {
                sat[formats[line][f].name] = lines[l].slice(formats[line][f].start,
                                                            formats[line][f].end).trim();
                if (formats[line][f].parse !== undefined) {
                    sat[formats[line][f].name] = formats[line][f].parse(sat[formats[line][f].name]);
                }
            }
            line = (line + 1) % formats.length;
            if (line === 0) {
                satellites.push(sat);
                sat = {};
            }

        }
    }
    for (var s = 0, slen = satellites.length; s < slen; ++s) {
               // ---- find no, ndot, nddot ----
       satellites[s].no   = satellites[s].no / xpdotp; //* rad/min
       //satellites[s].nddot= satellites[s].nddot * pow(10.0, nexp);
       //satellites[s].bstar= satellites[s].bstar * pow(10.0, ibexp);

       // ---- convert to sgp4 units ----
       satellites[s].a    = Math.pow(satellites[s].no * getgravconst('wgs84').tumin , (-2.0 / 3.0) );
       satellites[s].ndot = satellites[s].ndot  / (xpdotp * 1440.0);  //* ? * minperday
       satellites[s].nddot= satellites[s].nddot / (xpdotp * 1440.0 * 1440);

       // ---- find standard orbital elements ----
       satellites[s].inclo = satellites[s].inclo  * deg2rad;
       satellites[s].nodeo = satellites[s].nodeo  * deg2rad;
       satellites[s].argpo = satellites[s].argpo  * deg2rad;
       satellites[s].mo    = satellites[s].mo     * deg2rad;

       satellites[s].alta = satellites[s].a * (1.0 + satellites[s].ecco) - 1.0;
       satellites[s].altp = satellites[s].a * (1.0 - satellites[s].ecco) - 1.0;

       var time = days2mdhms (satellites[s].epochyear, satellites[s].epochdays);
       satellites[s].jdsatepoch = jday(satellites[s].epochyear, time.month, time.day, time.hour, time.minute, time.second);
    }
    return satellites;
}

function parseInt10(text) {
    return parseInt(text, 10);
}

function parseExp(text) {
    text = '0.' + text.replace('-', 'e-');
    return parseFloat(text);
}

function parseEccentricity(text) {
    return parseFloat('0.' + text);
}

function parseYear(text) {
    var year = parseInt(text);
    return year < 1957 ? year + 2000 : year + 1900;
}


/*
    Following functions from...
	Three.js "tutorials by example"
	Author: Lee Stemkoski
	Date: July 2013 (three.js v59dev)
*/


function makeTextSprite( message, parameters )
{
	if ( parameters === undefined ) parameters = {};
	
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;
	
	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
		parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

	//var spriteAlignment = THREE.SpriteAlignment.bottomLeft;
		
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
    
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
        var width = Math.ceil(textWidth + 2 * borderThickness);
        var height = Math.ceil(fontsize * 1.4 + 2 * borderThickness);

	canvas.width = width;
	canvas.height = height;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
	context.clearRect(0, 0, width, height);
	// background color
	context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";

	context.lineWidth = borderThickness;
	roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	// 1.4 is extra height factor for text below baseline: g,j,p,q.
	
	// text color
	context.fillStyle = "rgba(0, 0, 0, 1.0)";

	context.fillText( message, borderThickness, fontsize + borderThickness);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture } );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(width, height, 1.0);
	return sprite;	
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) 
{
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();   
}
