//MIT-Lizenz: Copyright (c) 2018 Matthias Perenthaler
//
//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


let local_frameRate = 60;
let gObjektArray = [];

let gravitationsKonstante = 1;
let resVektorenAnzeigen = false;

let deltaT = 0;

let entfernungZentralMasse = 100;
let maxDeltaEntfernung = 0;
let satellitMasse = 10;
let planetMasse = 200000;
let animationStart = false;
let anfangsgeschwSatellit = 0;
let anfangsgeschwPlanet = 0;

function resetCanvas() {
	gObjektArray = [];
	zentralMasseDazu();
	satellitMasseDazu();	
	animationStart = false;	
	maxDeltaEntfernung = 0;
	gravitationsFeldRechner(gObjektArray);	
}

let settings;
let resKraftStrichStaerke = 3;

function satellitMasseDazu() {
	let iniOrtVec = createVector(width/2+entfernungZentralMasse, height/2);
	let iniGeschwVec = createVector(0, -anfangsgeschwSatellit);
	let iniMasse = satellitMasse;
	let farbe = color(78,97,114);
  gObjektDazu(iniMasse, iniOrtVec, iniGeschwVec, farbe);
}

function zentralMasseDazu() {
	let iniOrtVec = createVector(width/2, height/2);
	let iniGeschwVec = createVector(0, anfangsgeschwPlanet);
	let iniMasse = planetMasse;
	let farbe = color(78,97,114);
  gObjektDazu(iniMasse, iniOrtVec, iniGeschwVec, farbe);
}

var img; 
let euler = true;
let rungekutta4 = true;
let eulerSwitch = false;
let rk4Switch = false;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  frameRate(local_frameRate);
  deltaT = 0.001 * local_frameRate;

	img = loadImage("https://s3-us-west-2.amazonaws.com/s.cdpn.io/1634054/earth.png");
	
  settings = QuickSettings.create(20, 20, "Gravitationslabor 2");
	settings.setDraggable(true);
	settings.addRange("Masse Satellit", 10, 10000, satellitMasse, 1, function(value) { satellitMasse = value; });	
	settings.addRange("Geschw. Satellit", 0, 70, anfangsgeschwSatellit, 0.01, function(value) { anfangsgeschwSatellit = value; });
	settings.addRange("Entfernung", 85, 500, entfernungZentralMasse, 1, function(value) { entfernungZentralMasse = value; });	
	settings.addHTML("aktuelleEntfernung", "aktuelle Entfernung: " + entfernungZentralMasse.toFixed(2));
		settings.hideTitle("aktuelleEntfernung");
	settings.addHTML("maxDeltaEntfernung", "max. Kreisabweichung: 0.00");
		settings.hideTitle("maxDeltaEntfernung"); 		
	settings.addButton("Objekte setzen", function() { resetCanvas(); });	
		settings.overrideStyle("Objekte setzen", "width", "100%");	
	settings.addBoolean("resultierende Kraft", false, function(value) { resVektorenAnzeigen = value; });
	settings.addRange("Gravitationskonstante", 0, 5, gravitationsKonstante, 0.1, function(value) { gravitationsKonstante = value; });		
	settings.addButton("Animation starten", function() { 
		animationStart = true;
	});
	settings.overrideStyle("Animation starten", "width", "100%");	
	settings.overrideStyle("Animation starten", "background-color", "#34a853");	
	settings.overrideStyle("Animation starten", "color", "white");
	settings.addBoolean("Numerik: Euler", true, function(value) { euler = value; eulerSwitch = true; });
	settings.addBoolean("Numerik: Runge-Kutta 4", false, function(value) { rungekutta4 = value; rk4Switch = true; });		
	settings.addHTML("Version", "V1.01 - Pt");
		settings.hideTitle("Version");  	
		
	resetCanvas();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(250);

  if(eulerSwitch) { 
  	settings.setValue("Numerik: Runge-Kutta 4", false);
  	settings.setValue("Numerik: Euler", true);
  	rk4Switch = false;
  	eulerSwitch = false;
  }
  if(rk4Switch) { 
  	settings.setValue("Numerik: Runge-Kutta 4", true);
  	settings.setValue("Numerik: Euler", false);
  	eulerSwitch = false;
  	rk4Switch = false;
  }
  
  if(gObjektArray.length > 0) {
		if(animationStart && rungekutta4) {
			for (let i = 0; i < gObjektArray.length; i++) {
				bewegungBerechnen(gObjektArray, i, deltaT);
			}
		}
		if(animationStart && euler) {
			for (let i = 0; i < gObjektArray.length; i++) {
				gravitationsRechner_euler(gObjektArray);
			}
		}
		gObjekteZeichnen(gObjektArray);
  }
}

function absorbiereGObjekt(gObjArr) {
	if (this.masse < gObjArr.masse) {
		this.farbe = gObjArr.farbe;
	}
	//zentraler vollstaendig inelastischer Stoss mit Impulserhaltung
	this.geschwindigkeit.x = (this.geschwindigkeit.x * this.masse + gObjArr.geschwindigkeit.x * gObjArr.masse) / (this.masse + gObjArr.masse);
	this.geschwindigkeit.y = (this.geschwindigkeit.y * this.masse + gObjArr.geschwindigkeit.y * gObjArr.masse) / (this.masse + gObjArr.masse);
	//neuer Ort des absorbierten Körpers aus Schwerpunktsatz
	this.ort.x = (this.ort.x * this.masse + gObjArr.ort.x * gObjArr.masse) / (this.masse + gObjArr.masse);
	this.ort.y = (this.ort.y * this.masse + gObjArr.ort.y * gObjArr.masse) / (this.masse + gObjArr.masse);
	//neue Masse aus Addition der Massen
	this.masse += gObjArr.masse;
	//neuer Radius im vereinfachten Modell
	this.radius = Math.cbrt((3*this.masse)/(4*PI*0.1));
}

function gObjekt(m, ort, v, f) {
	this.masse = m;
	this.ort = ort;
	this.geschwindigkeit = v;	
	this.gKraftArray = [];
	this.resGKraft = createVector(0, 0);
	this.farbe = f;
	this.radius = Math.cbrt((3*this.masse)/(4*PI*0.1));
  this.verschieben = function(neueKoord) {
    this.ort = neueKoord;
  }; 
  this.kollision = absorbiereGObjekt;
  this.pfad = [];
}

function gObjektDazu(m, ort, v, farbe) {
	let gObj = new gObjekt(m, ort, v, farbe);
	gObjektArray.push(gObj);
}

function gObjekteZeichnen(gObjArr) {
		let xE = gObjArr[0].ort.x;
		let yE = gObjArr[0].ort.y;
		
		if(gObjArr.length > 1) {
			for (let k = 0; k < gObjArr[1].pfad.length; k++) {
					strokeWeight(0.7);
					if(rungekutta4){stroke(210);}
					if(euler){stroke('wheat');}
					noFill();
					ellipse(gObjArr[1].pfad[k].x, gObjArr[1].pfad[k].y, 1, 1);
			}
			let xS = gObjArr[1].ort.x;
			let yS = gObjArr[1].ort.y;		

			let offset = 8;
			strokeWeight(1);
			stroke(gObjArr[1].farbe);
			fill(gObjArr[1].farbe);
			ellipse(xS, yS, gObjArr[1].radius*2, gObjArr[1].radius*2);	
			
			if(resVektorenAnzeigen){		
				let distVec = p5.Vector.sub(gObjArr[0].ort, gObjArr[1].ort);
				let angleES = distVec.heading();
				push();
					strokeWeight(resKraftStrichStaerke);
					stroke(gObjArr[0].farbe);
					fill(gObjArr[0].farbe);
					translate(xE, yE);
					rotate(angleES+PI/2);
					let resGKraftE = gObjArr[0].resGKraft.mag();
					line(0, 0, 0, resGKraftE);
		    	translate(0, resGKraftE);
		    	rotate(PI);
		    	triangle(-offset*0.5, offset, offset*0.5, offset, 0, 0);
		    pop();
				push();
					strokeWeight(resKraftStrichStaerke);
					stroke(gObjArr[1].farbe);
					fill(gObjArr[1].farbe);
					translate(xS, yS);
					rotate(angleES-PI/2);
					let resGKraftS = gObjArr[1].resGKraft.mag();
					line(0, 0, 0, resGKraftS);
		    	translate(0, resGKraftS);	
		    	rotate(PI);
		    	triangle(-offset*0.5, offset, offset*0.5, offset, 0, 0);
		    pop();	    
			}
		}
		//Erde
		image(img, xE-gObjArr[0].radius, yE-gObjArr[0].radius, gObjArr[0].radius*2, gObjArr[0].radius*2);
}

function bewegungBerechnen(gObjArr, i, d_t) {
	//rungeKutta 4
	let lokalDelta = 0;
	lokalDelta = d_t;
	
	let tempOrt = createVector(0, 0);
	let tempGeschw = createVector(0, 0);
	let tempBeschl = createVector(0, 0);
	let tempVec = createVector(0, 0);
	//v1 = a_n*dt
	tempOrt.add(gObjArr[i].ort);
	tempBeschl.set(0, 0);	
	tempBeschl.add(beschlBerechnen(gObjArr, i, tempOrt));
	tempBeschl.mult(lokalDelta);
	let v_1 = createVector(0, 0);
	v_1.add(tempBeschl);
	//r1 = v_n*dt
	tempGeschw.set(0, 0);
	tempGeschw.add(gObjArr[i].geschwindigkeit);
	tempGeschw.mult(lokalDelta);
	let r_1 = createVector(0, 0);	
	r_1.add(tempGeschw);
	//v2 = a(r_n+0.5r_1)*dt
	tempVec.set(0, 0);
	tempVec.add(r_1);
	tempVec.mult(0.5);
	tempOrt.set(0, 0);
	tempOrt.add(gObjArr[i].ort);
	tempOrt.add(tempVec);
	tempBeschl.set(0, 0);
	tempBeschl.add(beschlBerechnen(gObjArr, i, tempOrt));
	tempBeschl.mult(lokalDelta);
	let v_2 = createVector(0, 0);
	v_2.add(tempBeschl);
	//r_2 = (v_n+0.5v_1)*dt
	tempVec.set(0, 0);
	tempVec.add(v_1);
	tempVec.mult(0.5);
	tempGeschw.set(0, 0);
	tempGeschw.add(gObjArr[i].geschwindigkeit);	
	tempGeschw.add(tempVec);
	let r_2 = createVector(0, 0);	
	r_2.add(tempGeschw);
	r_2.mult(lokalDelta);	
	//v3 = a(r_n+0.5r_2)*dt
	tempVec.set(0, 0);
	tempVec.add(r_2);
	tempVec.mult(0.5);	
	tempOrt.set(0, 0);
	tempOrt.add(gObjArr[i].ort);
	tempOrt.add(tempVec);
	tempBeschl.set(0, 0);
	tempBeschl.add(beschlBerechnen(gObjArr, i, tempOrt));
	tempBeschl.mult(lokalDelta);
	let v_3 = createVector(0, 0);	
	v_3.add(tempBeschl);
	//r_3 = (v_n+0.5v_2)*dt
	tempVec.set(0, 0);
	tempVec.add(v_2);
	tempVec.mult(0.5);	
	tempGeschw.set(0, 0);
	tempGeschw.add(gObjArr[i].geschwindigkeit);	
	tempGeschw.add(tempVec);
	let r_3 = createVector(0, 0);	
	r_3.add(tempGeschw);
	r_3.mult(lokalDelta);
	//v4 = a(r_n+r_3)*dt
	tempOrt.set(0, 0);
	tempOrt.add(gObjArr[i].ort);
	tempOrt.add(r_3);
	tempBeschl.set(0, 0);
	tempBeschl.add(beschlBerechnen(gObjArr, i, tempOrt));
	tempBeschl.mult(lokalDelta);
	let v_4 = createVector(0, 0);	
	v_4.add(tempBeschl);
	//r_4 = (v_n+v_3)*dt	
	tempGeschw.set(0, 0);
	tempGeschw.add(gObjArr[i].geschwindigkeit);
	tempGeschw.add(v_3);
	let r_4 = createVector(0, 0);	
	r_4.add(tempGeschw);
	r_4.mult(lokalDelta);
	//v_n+1
	gObjArr[i].geschwindigkeit.add(v_1.mult(1/6));
	gObjArr[i].geschwindigkeit.add(v_2.mult(1/3));
	gObjArr[i].geschwindigkeit.add(v_3.mult(1/3));
	gObjArr[i].geschwindigkeit.add(v_4.mult(1/6));
	//r_n+1
	gObjArr[i].ort.add(r_1.mult(1/6));
	gObjArr[i].ort.add(r_2.mult(1/3));
	gObjArr[i].ort.add(r_3.mult(1/3));
	gObjArr[i].ort.add(r_4.mult(1/6));
	
	let pfadVec = createVector(gObjArr[i].ort.x, gObjArr[i].ort.y);
	gObjArr[i].pfad.push(pfadVec);
	if(gObjArr[i].pfad.length > 1000) {
		gObjArr[i].pfad.splice(0, 1);
	}	
}

function beschlBerechnen(gObjArr, i, ort) {
	let tempGKraft = gravitationsRechner(gObjArr, i, ort);
	let beschlVec = createVector(0, 0);
	beschlVec.add(tempGKraft);
	beschlVec.normalize();
	let beschlSkalar = 0;
	beschlSkalar = tempGKraft.mag() / gObjArr[i].masse;
	beschlVec.mult(beschlSkalar);
	return beschlVec;
}

function gravitationsRechner(gObjArr, i, Ort) {
	settings.setValue("maxDeltaEntfernung", "max. Kreisabweichung: " + maxDeltaEntfernung.toFixed(2));
	let resultierendeGKraft = createVector(0, 0);
	let tempOrt = createVector(0, 0);
	tempOrt.add(Ort);
	for (let j = 0; j < gObjArr.length; j++) {
		if (j != i) {
			let entfernung = tempOrt.dist(gObjArr[j].ort);
			settings.setValue("aktuelleEntfernung", "aktuelle Entfernung: " + entfernung.toFixed(2));
			let gravitationsKraft = gravitationsKonstante * (gObjArr[i].masse * gObjArr[j].masse) / Math.pow(entfernung, 2);
			let richtungsVektor = p5.Vector.sub(gObjArr[j].ort, tempOrt);
			richtungsVektor.normalize();
			let gravitationsVektor = createVector(0, 0);
			gravitationsVektor.add(richtungsVektor);
			gravitationsVektor.mult(gravitationsKraft);
			resultierendeGKraft.add(gravitationsVektor);
		}
	}
	return resultierendeGKraft;
}

function gravitationsFeldRechner(gObjArr) {
	settings.setValue("maxDeltaEntfernung", "max. Kreisabweichung: " + maxDeltaEntfernung.toFixed(2));
	let gKraftTempArray = [];
	for (let i = 0; i < gObjArr.length; i++) {	
	gObjArr[i].gKraftArray = [];		
	let resultierendeGKraft = createVector(0,0);
	for (let j = 0; j < gObjArr.length; j++) {
		if (j != i) {
			let entfernung = gObjArr[i].ort.dist(gObjArr[j].ort);
			settings.setValue("aktuelleEntfernung", "aktuelle Entfernung: " + entfernung.toFixed(2));
			if (entfernung < gObjArr[i].radius + gObjArr[j].radius) {
				gObjArr[i].kollision(gObjArr[j]);
				gObjArr.splice(j, 1);
			} 
			else {
				let gravitationsKraft = gravitationsKonstante * (gObjArr[i].masse * gObjArr[j].masse) / Math.pow(entfernung, 2);
				let richtungsVektor = p5.Vector.sub(gObjArr[j].ort, gObjArr[i].ort);
				richtungsVektor.normalize();
				let gravitationsVektor = createVector(0, 0);
				gravitationsVektor.add(richtungsVektor);
				gravitationsVektor.mult(gravitationsKraft);
				resultierendeGKraft.add(gravitationsVektor);
				let tempVec = createVector(0, 0);
				gKraftTempArray.push(tempVec);
				gKraftTempArray[gKraftTempArray.length-1].add(gravitationsVektor);
			}
		}
	}
	gObjArr[i].resGKraft.set(0, 0);
	gObjArr[i].resGKraft.add(resultierendeGKraft);
	gObjArr[i].gKraftArray = gKraftTempArray.slice();
	}
}

//Inverse Euler
function gravitationsRechner_euler(gObjArr) {
	settings.setValue("maxDeltaEntfernung", "max. Kreisabweichung: " + maxDeltaEntfernung.toFixed(2));	
	for (let i = 0; i < gObjArr.length; i++) {
		let gKraftTempArray = [];
		gObjArr[i].gKraftArray = [];
		let resultierendeGKraft = createVector(0,0);
		let gKraftX = 0;
		let gKraftY = 0;
		for (let j = 0; j < gObjArr.length; j++) {
			if (j != i) {
				let xDist = gObjArr[i].ort.x - gObjArr[j].ort.x;
				let yDist = gObjArr[i].ort.y - gObjArr[j].ort.y;
				let entfernung = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
				settings.setValue("aktuelleEntfernung", "aktuelle Entfernung: " + entfernung.toFixed(2));
				let deltaEntfernung = entfernungZentralMasse - entfernung;
				if (maxDeltaEntfernung < Math.abs(deltaEntfernung)) { maxDeltaEntfernung = Math.abs(deltaEntfernung); }
				if (entfernung < gObjArr[i].radius + gObjArr[j].radius) {
					gObjArr[i].kollision(gObjArr[j]);
					gObjArr.splice(j, 1);
				} 
				else {				
					let xDist = gObjArr[i].ort.x - gObjArr[j].ort.x;
					let yDist = gObjArr[i].ort.y - gObjArr[j].ort.y;
					let entfernung = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
					let gravitationsKraft = gravitationsKonstante * (gObjArr[i].masse * gObjArr[j].masse) / Math.pow(entfernung, 2);
					gKraftX = Math.abs(gravitationsKraft * (xDist / entfernung)) * Math.sign(xDist);
					gKraftY = Math.abs(gravitationsKraft * (yDist / entfernung)) * Math.sign(yDist);
					resultierendeGKraft.x -= gKraftX;
					resultierendeGKraft.y -= gKraftY;
					let tempVec = createVector(0, 0);
					gKraftTempArray.push(tempVec);
					gKraftTempArray[gKraftTempArray.length-1].x = -gKraftX;
					gKraftTempArray[gKraftTempArray.length-1].y = -gKraftY;	
				}
			}
		}
		if(animationStart) {
				//a = Kraft / Masse, dv = a * dt
				gObjArr[i].geschwindigkeit.x += (resultierendeGKraft.x / gObjArr[i].masse) * deltaT;
				gObjArr[i].geschwindigkeit.y += (resultierendeGKraft.y / gObjArr[i].masse) * deltaT;
		}		
		gObjArr[i].resGKraft.x = 0;
		gObjArr[i].resGKraft.y = 0;
		gObjArr[i].resGKraft.add(resultierendeGKraft);
		gObjArr[i].gKraftArray = gKraftTempArray.slice();
	}
	if(animationStart) {
		for (let i = 0; i < gObjArr.length; i++) {
			//ds = v * dt
			gObjArr[i].ort.x += gObjArr[i].geschwindigkeit.x * deltaT;
			gObjArr[i].ort.y += gObjArr[i].geschwindigkeit.y * deltaT;
			let pfadVec = createVector(gObjArr[i].ort.x, gObjArr[i].ort.y);
			gObjArr[i].pfad.push(pfadVec);
			if(gObjArr[i].pfad.length > 1000) {
				gObjArr[i].pfad.splice(0, 1);
			}
		}	
	}	
}