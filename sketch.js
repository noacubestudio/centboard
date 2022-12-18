import {handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseOver, channels, totalTouches} from "./control.js"

// html elements

let cnv;
const container = document.getElementById("canvas-container");
const baseInput = document.getElementById("base");
const edoInput = document.getElementById("edo");
const ratiosInput = document.getElementById("ratios");
const refInput = document.getElementById("ref");
const slotButtons = [
  document.getElementById("slotButton1"),
  document.getElementById("slotButton2"),
  document.getElementById("slotButton3")
];
const waveformButtons = [
  document.getElementById("waveformButton1"),
  document.getElementById("waveformButton2"),
  document.getElementById("waveformButton3"),
  document.getElementById("waveformButton4")
];
const referenceButtons = [
  document.getElementById("referenceButton1"),
  document.getElementById("referenceButton2")
]

// sound settings

let lpFilter;
let waveform = "sawtooth";
export let baseFreq = 220;
let refCentsLower = 1200;
export let refMode = "on";

// scale settings

export let centsDown = 1400;
export let centsUp = 2000;
export let edo = 12;
let stepCents = 1200/edo;

export let ratioSlot = 0;
export let ratios = [[24,27,30,32,36,40,45,48],[4,5,6,7,8],[12,13,14,15,16,17,18,19,20,21,22,23,24]];

// visual
const palette = {
  bg: "#000005",
  default: "#6040FF",
  ratiosbase: "#FFBB44",
  rations1200: "#22FFFF",
  play: "#FFCCFF"
}

function paletteRatios(step, hexopacity) {
  return chroma.mix(palette.ratiosbase, palette.rations1200, step, 'oklch').hex() + hexopacity;
}

export const uiblocks = {
  centboard: {height: 200, visible: true},
  ratioModes: {height: 50, visible: false},
  ratioKbd: {height: 200, visible: true},
  edoKbd: {height: 200, visible: true}
}

function totalUIHeight() {
  let height = 0;
  for (const [key, block] of Object.entries(uiblocks)) {
    if (block.visible) height += block.height
  }
  return height;
}


window.setup = () => {
  cnv = createCanvas(windowWidth-20, totalUIHeight()).parent(container);
  cnv.touchStarted(handleTouchStart);
  cnv.touchMoved(handleTouchMove);
  cnv.touchEnded(handleTouchEnd);
  cnv.mouseOver(handleMouseOver);
  textFont('monospace');
  rectMode(CORNERS);

  lpFilter = new p5.BandPass();
  lpFilter.res(2);
  lpFilter.freq(220);

  // initialize all channels
  for (let i = 0; i < 10; i++) {
    
    let source = "off";
    let synth = new p5.Oscillator();
    let sourceProperties = {};
    
    synth.disconnect();
    synth.connect(lpFilter);
    synth.setType(waveform);
    synth.freq(baseFreq)
    synth.amp(0.5);
    
    if (i === 0) {
      synth.freq(frequency(baseFreq, -refCentsLower));
      sourceProperties = {
        cents: -refCentsLower, ratiostep: -1, edostep: -1
      }
    }
    channels.push({synth: synth, source: source, sourceProperties: sourceProperties});
  }

  baseInput.value = baseFreq;
  edoInput.value = edo;
  ratiosInput.value = ratios[ratioSlot].join(":");
  refInput.value = refCentsLower;

  slotButtons.forEach((slotButton, index) => {
    // button labels
    const firstRatio = (ratios[index][0] !== undefined) ? ratios[index][0]+":" : "+";
    slotButton.innerText = firstRatio;
  });
  
  baseInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue > 0) {
      baseFreq = inputValue;
      const refChannel = channels[0];
      refChannel.synth.freq(frequency(baseFreq, -refCentsLower));
      window.draw();
    }
  });
  
  edoInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue > 1) {
      edo = inputValue;
      stepCents = 1200/edo;
      window.draw();
    }
  });
  
  ratiosInput.addEventListener('input', (e) => {
    ratioUpdated(e.target, e.target.value);
    window.draw();
  });

  refInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue >= 0) {
      refCentsLower = inputValue;
      const refChannel = channels[0];
      refChannel.synth.freq(frequency(baseFreq, -refCentsLower));
      refChannel.sourceProperties.cents = -refCentsLower;
      window.draw();
    }
  });
  
  noLoop();
}

window.windowResized = () => {
  resizeCanvas(windowWidth-20, totalUIHeight());
}

document.ratioSlotButtonClicked = (index) => {
  // update slot
  const oldRatioSlot = ratioSlot;
  ratioSlot = index;
  ratioUpdated(ratiosInput, ratios[ratioSlot].join(":"), oldRatioSlot);

  // update styling of the buttons to show new selected and change the text
  selectButton(slotButtons, index);

  window.draw();
}
document.waveformButtonClicked = (index, value) => {
  //update selection
  waveform = value;
  print(waveform)
  for (let i = 0; i < channels.length; i++) {
    channels[i].synth.setType(waveform);
  }
  // button states
  selectButton(waveformButtons, index);
}
document.referenceButtonClicked = (index) => {
  //update selection
  if (index === 0) {refMode = "off"} else {refMode = "on"}
  // button states
  selectButton(referenceButtons, index);
}

function selectButton(elArray, index) {
  elArray.forEach((el, elIndex) => {
    if (elIndex === index) {
      el.classList.add('buttonSelected');
    } else {
      el.classList.remove('buttonSelected');
    }
  });
}

function ratioUpdated(el, input, oldslot) {

  if (oldslot !== undefined && input === "") input = ratios[oldslot].join(":") //just use existing last one that wasn't empty?
  if (input === "") return;

  // undo any unwanted symbols and set the updated 
  const correctSymbolString = input.replace(new RegExp("[^0-9:]"), ":");
  el.value = correctSymbolString;

  // only colons between digits! cap off first and last for further processing
  const ratiosString = correctSymbolString.replace(new RegExp(":[^0-9]|[^0-9]:|^:|:$"), "");

  // update array
  ratios[ratioSlot] = ratiosString.split(":");

  //also update the correct button
  const firstRatio = (ratios[ratioSlot][0] !== "") ? ratios[ratioSlot][0]+":" : "+";
  slotButtons[ratioSlot].innerText = firstRatio;
}

document.stepperButtonClicked = (offset) => {
  edo += offset;
  edo = max(edo, 2);
  stepCents = 1200/edo;
  edoInput.value = edo;
  window.draw();
}


// Collect inputs per visualization method
let playedCents = []; // every channel ends up here
let playedRatios = []; // ratio keyboard via mouse/touch
let playedSteps = []; // step keyboard via mouse/touch/kbd
let refCents = undefined;

function updatePlayed() {
  playedCents = [];
  playedRatios = [];
  playedSteps = [];
  refCents = undefined;
  
  channels.forEach((channel, index)=>{
    if (channel.source !== "off") {
      const cents = channel.sourceProperties.cents;
      const ratiostep = channel.sourceProperties.ratiostep;
      const edostep = channel.sourceProperties.edostep;

      if (index === 0) {
        refCents = cents;
      } else {
        if (cents !== undefined) {
          playedCents.push(cents);
        }
        if (ratiostep !== undefined) {
          playedRatios.push(ratiostep);
        }
        if (edostep !== undefined) {
          playedSteps.push(edostep);
        }
      }
    }
  });
}

window.draw = () => {
  background(palette.bg);
  textAlign(LEFT);
  textSize(10);
  push();

  updatePlayed();
  const currentRatio = ratios[ratioSlot];
  const midOctaveRatioCents = []; //set by centboard, used for edo board

  if (uiblocks.centboard.visible) {
    uiCentboard(currentRatio, midOctaveRatioCents);
    translate(0, uiblocks.centboard.height);
  }
  if (uiblocks.ratioModes.visible) {
    uiRatioModes(currentRatio);
    translate(0, uiblocks.ratioModes.height);
  }
  if (uiblocks.ratioKbd.visible) {
    uiRatioKbd(currentRatio);
    translate(0, uiblocks.ratioKbd.height);
  }
  if (uiblocks.edoKbd.visible) {
    uiEdoKbd(midOctaveRatioCents);
  }
  pop();
  //fill("gray")
  //text(channels.map((channel) => channel.source), 400, height-40)
  //text(totalTouches, 400, height-20)
}

function uiCentboard(currentRatio, midOctaveRatioCents) {
  stroke(palette.default + "80");

  for(let i = stepCents; i < centsDown; i += stepCents) {
    drawCentsMarker(-i);
  }
  for(let i = 0; i < centsUp; i += stepCents) {
    drawCentsMarker(i);

    const scaleStep = Math.round(i/stepCents);
    if (scaleStep <= edo) {
      noStroke();
      fill(palette.default + "A0");
      text(scaleStep, map(i, -centsDown, centsUp, 0, width)+6, 62);
      stroke(palette.default + "80");
    }
  }

  textAlign(CENTER);
  textSize(12);
  stroke(palette.default);
  fill(palette.default);
  drawCentsMarker(0, true);
  drawCentsMarker(1200, true);
  drawCentsMarker(-1200, true);

  if (currentRatio.length >= 2) {
    for (let i = 0; i < currentRatio.length; i++) { 
      const ratioCents = cents(currentRatio[0], currentRatio[i]);
      
      if (ratioCents >= 0) {
        const ratioColor = paletteRatios(map(ratioCents, 0, 1200, 0, 1, true), "FF");
        stroke(ratioColor);
        fill(ratioColor);
        drawCentsMarker(ratioCents, (ratioCents % 1200 === 0));
        noStroke();
        drawTextForRatioMarker(currentRatio[i], currentRatio[0], ratioCents);

        if (ratioCents <= 1200) {
          midOctaveRatioCents.push(ratioCents);
        }
      }
    }
  }

  midOctaveRatioCents.sort((a, b) => {a < b});

  // draw played cents
  playedCents.forEach((c) => {
    drawPlayedCentsMarker(c)
  });
  if (refCents !== undefined) drawPlayedCentsMarker(refCents)

  function drawPlayedCentsMarker (c) {
    stroke(palette.play);
    fill(palette.play);
    drawCentsMarker(c);
    noStroke();
    text(Math.round(c) + " c", map(c, -centsDown, centsUp, 0, width), 20);
    const f = frequency(baseFreq, c);
    text(Math.round(f*10)/10 + " Hz", map(c, -centsDown, centsUp, 0, width), 40);
  }

  textAlign(LEFT);
  noStroke();
}

function uiRatioModes(currentRatio) {
  strokeWeight(2);
  stroke(palette.bg);

  if (currentRatio.length > 0) {
    textAlign(CENTER);

    for (let i = 0; i < currentRatio.length; i++) {
      drawModeButton(currentRatio, i);
    }
  }
}

function uiRatioKbd(ratios) {
  textAlign(LEFT);
  fill(palette.ratiosbase + "DD");
  strokeWeight(2);

  if (ratios.length > 0) {
    text(ratios.join(":") + " Ratio Keyboard (Multiplied by "+baseFreq+" Hz)", 20, 30);
    textAlign(CENTER);

    for (let i = 0; i < ratios.length; i++) {
      let playingRatio = false;
      for (let p = 0; p < playedRatios.length; p++) {
        if (i === playedRatios[p]) {
          playingRatio = true; break;
        }
      }
      const ratioCents = cents(ratios[0], ratios[i]);
      stroke(palette.bg);
      drawRatioButton(ratios, i, ratioCents, playingRatio);
    }
  } else {
    // fallback graphic
    text("Waiting for ratios input... (increasing numbers separated by \":\" like 9:10:12)", 20, 30);
  }
}

function uiEdoKbd(midOctaveRatioCents) {
  if (edo > 1) {
    translate(0, -40);

    for (let i = 0; i < edo+1; i++) {

      // is this step currently playing?
      let playingStep = false;
      for (let p = 0; p < playedSteps.length; p++) {
        if (i === playedSteps[p]) {
          playingStep = true; break;
        }
      }
      stroke(palette.bg);
      if (playingStep) {
        fill(palette.default + "30");
      } else {
        fill(palette.default + "40");
      }

      // draw
      drawEDOButton(i); //closest
    }

    textAlign(CENTER);

    midOctaveRatioCents.forEach((cent) => {
      drawEDOkeyboardRatioMarker(cent)
    });

    textAlign(LEFT);
    translate(0, 40);
    fill(palette.default + "DD");
    text(edo + " EDO Keyboard (Octave above "+baseFreq+" Hz, step size "+Number(stepCents.toFixed(2))+")", 20, 200-30);
  }
}


function drawCentsMarker(cents) {
  const xPos = map(cents, -centsDown, centsUp, 0, width);
  const gap = 50;
  const yTop = gap;
  const yBot = 200 - gap;
  if (cents % 1200 === 0) {
    ellipse(xPos, yTop, 6);
    ellipse(xPos, yBot, 6);
    strokeWeight(1.5);
    line(xPos, yTop, xPos, yBot);
    strokeWeight(1);
  } else {
    line(xPos, yTop, xPos, yBot);
  }
  
}

function drawTextForRatioMarker (a, b, ratioCents) {
  const simplified = simplifiedRatio(a, b, [a, b]);
  const topString = simplified[0];
  const botString = simplified[1];

  if (botString === undefined) {
    text(topString, map(ratioCents, -centsDown, centsUp, 0, width), 200-22);
    return;
  }

  text(topString, map(ratioCents, -centsDown, centsUp, 0, width), 200-27);
  text(botString, map(ratioCents, -centsDown, centsUp, 0, width), 200-13);
}

function simplifiedRatio(a, b, fallback) {
  // return undefined if the ratio can not be simplified.
  // otherwise, return the simplified version.

  if (a < b) return fallback;

  // example: 8/4 to 2
  //if (a % b === 0) return [a/b];

  // example: 6/4 to 3/2
  const simple = reduce(a, b);
  const sa = simple[0];
  const sb = simple[1];

  return (a !== sa) ? [sa, sb] : fallback;
}

function drawModeButton(ratios, i) {
  const leftEdge = map(i, 0, ratios.length, 20, width-20);
  const rightEdge = map(i+1, 0, ratios.length, 20, width-20);
  const centerX = 0.5 * (leftEdge + rightEdge);
  const centerY = 50/2;

  fill(palette.default + "40");
  stroke(palette.bg);
  rect(leftEdge, 0, rightEdge, 50, 14);
  noStroke();

  fill(palette.default + "FF");
  text(ratios[i], centerX, centerY);
}

function drawRatioButton(ratios, i, cents, playing) {
  const leftEdge = map(i, 0, ratios.length, 20, width-20);
  const rightEdge = map(i+1, 0, ratios.length, 20, width-20);
  const centerX = 0.5 * (leftEdge + rightEdge);
  const centerY = 230/2;

  let fillColor = paletteRatios(map(cents, 0, 1200, 0, 1, true), "40");
  if (playing) {
    fillColor = paletteRatios(map(cents, 0, 1200, 0, 1, true), "30");
  } 
  fill(fillColor);
  rect(leftEdge, 50, rightEdge, 200-20, 14, 14, 24, 24);
  noStroke();

  const a = Number(ratios[i]);
  const b = Number(ratios[0]);

  fill(paletteRatios(map(cents, 0, 1200, 0, 1, true), "FF"));
  text([a,b].join("/"), centerX, centerY-45);

  // simplify with fallback: undefined
  const simplified = simplifiedRatio(a, b, [undefined]);

  //first check if undefined to return instantly
  if (simplified[0] === undefined) return;

  const simplifiedString = "(" + simplified.join("/") + ")";

  fill(paletteRatios(map(cents, 0, 1200, 0, 1, true), "CC"));
  text(simplifiedString, centerX,centerY-30);
}

function drawEDOButton(i) {
  const leftEdge = map(i, 0, edo+1, 20, width-20);
  const rightEdge = map(i+1, 0, edo+1, 20, width-20);
  const centerX = 0.5 * (leftEdge + rightEdge);
  const centerY = 230/2;

  rect(leftEdge, 50, rightEdge, 200-20, 14, 14, 24, 24);
  fill(palette.default);
  noStroke();
  text(i, centerX, centerY-45);
}

function drawEDOkeyboardRatioMarker(cents) {
  // if a ratio marker is exactly on the outside edges of the kbd, it is 0.5 edo steps too far
  // so the full range is the amount of keys + 1
  const xpos = map(cents, (-0.5)*stepCents, (edo+0.5)*stepCents, 20, width-20);
  const ypos = 230/2;
  const maxsize = min(80,((width-40) / (edo+1)) * 0.8);

  const distances = [cents % stepCents,cents % stepCents - stepCents]; // to edges up, down
  let nearestDist = distances[0];
  if (Math.abs(distances[0]) > Math.abs(distances[1])) {
    nearestDist = distances[1];
  }

  let absDist = Math.abs(nearestDist)/(stepCents*0.5);

  fill(lerpColor(
    color(paletteRatios(map(cents, 0, 1200, 0, 1, true), "20")), 
    color(paletteRatios(map(cents, 0, 1200, 0, 1, true), "10")), absDist
    ));
  ellipse(xpos,ypos, maxsize);
  fill(lerpColor(
    color(paletteRatios(map(cents, 0, 1200, 0, 1, true), "E0")), 
    color(paletteRatios(map(cents, 0, 1200, 0, 1, true), "A0")), absDist
    ));
  text(Math.round(nearestDist) + "c", xpos, ypos+3);
}


// distance between two frequencies in cents
export function cents(a, b) {
  if (b === a) return 0;
  //if (b % a === 0) return 1200;
  return 1200 * Math.log2(b / a); //% 1200;
}

// frequency after going certain distance in cents
export function frequency(base, cents) {
  return base * Math.pow(2, cents / 1200);
}

function reduce(numerator, denominator) {
  let a = numerator;
  let b = denominator;
  let c;
  while (b) {
    c = a % b; a = b; b = c;
  }
  return [numerator / a, denominator / a];
}