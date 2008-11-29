/*
 * Snow Effect Script
 * Created and submitted by
 *     Altan d.o.o. (snow at altan dot hr, http://www.altan.hr/snow/)
 * Cleaning, bugfixes and improvements by
 *     John Morrissey (jwm at horde dot net, http://horde.net/)
 *
 ********************************************************************
 * This software is distributed in the hope that it will be useful, *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of   *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.             *
 ********************************************************************
 */

// Number of snowflakes to render
var numSnowflakes = 20;
// Number of different flake styles
var numFlakeStyles = 1;

// browser sniffer
var is_ns = (document.layers) ? 1 : 0;
var is_ie = (document.all)    ? 1 : 0;

var stepXFactor = 0.02, stepYFactor = 0.7, maxAmplitude = 20;
var i, doc_width = 800, doc_height = 600;
var dx, posX, posY;   // coordinate and position variables
var am, stepX, stepY; // amplitude and step variables

if (is_ns) {
	doc_width  = self.innerWidth;
	doc_height = self.innerHeight;
} else if (is_ie) {
	doc_width  = document.body.clientWidth;
	doc_height = document.body.clientHeight;
}

dx = new Array();
am = new Array();
posX  = new Array();
posY  = new Array();
stepX = new Array();
stepY = new Array();

for (i = 0; i < numSnowflakes; ++i) {
	dx[i] = 0;                                   // set coordinate variables
	am[i] = Math.random() * maxAmplitude;        // set amplitude variables
	posX[i] = Math.random() * (doc_width - 50);  // set position variables
	posY[i] = -50 * (i % 10);
	stepX[i] = stepXFactor + Math.random() / 10; // set step variables
	stepY[i] = stepYFactor + Math.random();      // set step variables

	snowsrc = 'pix/snowflake' + (Math.floor(Math.random() * numFlakeStyles) + 1) + '.gif';

	if (is_ns) {
		document.write('<layer name="dot' + i + '" left="15" top="15" visibility="show"><img src="' + snowsrc + '" border="0"></layer>');
	} else if (is_ie) {
		document.write('<div id="dot' + i + '" style="POSITION: absolute; Z-INDEX: ' + i + '; VISIBILITY: visible; TOP: 15px; LEFT: 15px;"><img src="' + snowsrc + '" border="0"></div>');
	}
}

function letItSnow() {
	for (i = 0; i < numSnowflakes; ++i) {
		posY[i] += stepY[i];
		if (posY[i] > doc_height) {
			posX[i] = Math.random() *
		              (doc_width - am[i] + (2 * maxAmplitude)) -
			          maxAmplitude;
			posY[i] = -50 * ((i % 10) + 1);
			stepX[i] = stepXFactor + Math.random() / 10;
			stepY[i] = stepYFactor + Math.random();
		}
		dx[i] += stepX[i];

		if (is_ns) {
			document.layers['dot' + i].top  = posY[i];
			document.layers['dot' + i].left = posX[i] + am[i] * Math.sin(dx[i]);
		} else if (is_ie) {
			document.all['dot' + i].style.pixelTop  = posY[i];
			document.all['dot' + i].style.pixelLeft = posX[i] + am[i] * Math.sin(dx[i]);
		}
	}

	setTimeout('letItSnow()', 10);
}

letItSnow();
