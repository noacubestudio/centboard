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

// input

let isMouse = false;
let mouseDown = false;
let kbdPressed = 0;
let touchPressed = 0;

const channels = [];
// initialed with 10 channels, 
// each contains an object with the osc 
// and source: [off, kbd, touch, mouse, ref]
// sources that are off will be filled again first before starting a new osc,
// skipping the first position reserved for the ref pitch

// sound settings

let lpFilter;
let waveform = "sawtooth";
let baseFreq = 220;
let baseOscDown = 1200;

// scale settings

let centsDown = 1400;
let centsUp = 2000;
let edo = 12;
let stepCents = 1200/edo;

let ratioSlot = 0;
let ratios = [[24,27,30,32,36,40,45,48],[4,5,6,7,8],[]];


function setup() {
  cnv = createCanvas(windowWidth-20, 600).parent(container);
  cnv.touchStarted(handleTouchStart);
  cnv.touchMoved(handleTouchMove);
  cnv.touchEnded(handleTouchEnd);
  cnv.mouseOver(() => {isMouse = true;});
  textFont('monospace');
  rectMode(CORNERS);

  lpFilter = new p5.LowPass();
  
  // initialize all channels
  for (let i = 0; i < 10; i++) {
    
    let source = "off";
    let osc = new p5.Oscillator();
    let sourceProperties = {};
    
    osc.disconnect();
    osc.connect(lpFilter);
    osc.setType(waveform);
    osc.freq(baseFreq)
    osc.amp(0.5);
    
    if (i === 0) {
      osc.freq(frequency(baseFreq, -baseOscDown));
      sourceProperties = {
        cents: -baseOscDown, ratiostep: -1, edostep: -1
      }
    }
    channels.push({osc: osc, source: source, sourceProperties: sourceProperties});
  }

  baseInput.value = baseFreq;
  edoInput.value = edo;
  ratiosInput.value = ratios[ratioSlot].join(":");
  refInput.value = baseOscDown;

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
      refChannel.osc.freq(frequency(baseFreq, -baseOscDown));
      draw();
    }
  });
  
  edoInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue > 0) {
      edo = inputValue;
      stepCents = 1200/edo;
      draw();
    }
  });
  
  ratiosInput.addEventListener('input', (e) => {
    ratioUpdated(e.target, e.target.value);
    draw();
  });

  refInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue >= 0) {
      baseOscDown = inputValue;
      const refChannel = channels[0];
      refChannel.osc.freq(frequency(baseFreq, -baseOscDown));
      refChannel.sourceProperties.cents = -baseOscDown;
      draw();
    }
  });
  
  noLoop();
}

function windowResized() {
  resizeCanvas(windowWidth-20, 600);
}

function ratioSlotButtonClicked(index) {
  // update slot
  ratioSlot = index;
  ratioUpdated(ratiosInput, ratios[ratioSlot].join(":"));

  // update styling of the buttons to show new selected and change the text
  slotButtons.forEach((slot, sIndex) => {
    if (sIndex === index) {
      slot.classList.add('buttonSelected');
    } else {
      slot.classList.remove('buttonSelected');
    }
  });

  draw();
}

function ratioUpdated(el, input) {

  if (input !== "") {
    // undo any unwanted symbols and set the updated 
    const correctSymbolString = input.replace(new RegExp("[^0-9:]"), "");
    el.value = correctSymbolString;

    // only colons between digits! cap off first and last for further processing
    const ratiosString = correctSymbolString.replace(new RegExp(":[^0-9]|[^0-9]:|^:|:$"), "");

    // update array
    ratios[ratioSlot] = ratiosString.split(":");

    //also update the correct button
    const firstRatio = (ratios[ratioSlot][0] !== "") ? ratios[ratioSlot][0]+":" : "+";
    slotButtons[ratioSlot].innerText = firstRatio;
  }
}

function waveformRadioClicked(el) {
  waveform = el.value;
  for (let i = 0; i < channels.length; i++) {
    channels[i].osc.setType(waveform);
  }
}
function playDown() {
  print("play!")
}
function playUp() {
  print("end!")
}
function stepperButtonClicked(offset) {
  edo += offset;
  edo = max(edo, 2);
  stepCents = 1200/edo;
  edoInput.value = edo;
  draw();
}


// Collect inputs per visualization method
let playedCents = []; // every channel ends up here
let playedRatios = []; // ratio keyboard via mouse/touch
let playedSteps = []; // step keyboard via mouse/touch/kbd

function updatePlayed() {
  playedCents = [];
  playedRatios = [];
  playedSteps = [];
  
  channels.forEach((channel)=>{
    if (channel.source !== "off") {
      const cents = channel.sourceProperties.cents;
      const ratiostep = channel.sourceProperties.ratiostep;
      const edostep = channel.sourceProperties.edostep;

      if (cents !== undefined) {
        playedCents.push(cents)
      }
      if (ratiostep !== undefined) {
        playedRatios.push(ratiostep);
      }
      if (edostep !== undefined) {
        playedSteps.push(edostep);
      }
    }
  });
}


function draw() {
  background("black");
  textAlign(LEFT);
  textSize(10);
  
  updatePlayed();
  
  stroke("#666");

  for(let i = stepCents; i < centsDown; i += stepCents) {
    drawCentsMarker(-i);
  }
  for(let i = 0; i < centsUp; i += stepCents) {
    drawCentsMarker(i);

    const scaleStep = Math.round(i/stepCents);
    if (scaleStep <= edo) {
      noStroke();
      fill("#333");
      text(scaleStep, map(i, -centsDown, centsUp, 0, width)+5, 58);
      stroke("#666");
    }
  }

  textAlign(CENTER);
  textSize(12);
  stroke("#DDD");
  fill("#DDD");
  drawCentsMarker(0, true);
  drawCentsMarker(1200, true);
  drawCentsMarker(-1200, true);

  // filled below, for later use when showing distance to these ratios in cents
  const midOctaveRatioCents = [];
  
  const ratio = ratios[ratioSlot];
  if (ratio.length >= 2) {
    for (let i = 0; i < ratio.length; i++) { 
      const ratioCents = cents(ratio[0], ratio[i]);
      
      if (ratioCents >= 0) {
        stroke("#0DD");
        drawCentsMarker(ratioCents);
        noStroke();
        fill("#0DD");
        drawTextForRatioMarker(ratio[i], ratio[0], ratioCents);

        if (ratioCents <= 1200) {
          midOctaveRatioCents.push(ratioCents);
        }
      }
    }
  }

  midOctaveRatioCents.sort((a, b) => {a < b});

  // draw played cents
  playedCents.forEach((c) => {
    stroke("orange");
    drawCentsMarker(c);
    noStroke();
    fill("orange");
    text(Math.round(c) + " c", map(c, -centsDown, centsUp, 0, width), 20);
    const f = frequency(baseFreq, c);
    text(Math.round(f*10)/10 + " Hz", map(c, -centsDown, centsUp, 0, width), 40);
  });

  textAlign(LEFT);
  noStroke();

  // lower part
  push();
  translate(0, 200);
  if (ratios[ratioSlot].length > 1) {
    
    fill("#0DD");
    text(ratios[ratioSlot].join(":") + " Ratio Keyboard (Multiplied by "+baseFreq+" Hz)", 20, 30);

    textAlign(CENTER);

    for (let i = 0; i < ratios[ratioSlot].length; i++) {
      let playingRatio = false;
      for (let p = 0; p < playedRatios.length; p++) {
        if (i === playedRatios[p] && playedRatios.length > 1) {
          playingRatio = true; break;
        }
      }
      if (playingRatio) {
        stroke("#0AA");
        fill("#022");
      } else {
        stroke("#0AA");
        noFill();
      }
      drawRatioButton(i);
    }
  }
  
  // lower part again
  translate(0, 200);
  if (edo > 1) {
    translate(0, -40);
    textAlign(CENTER);

    midOctaveRatioCents.forEach((cent) => {
      drawEDOkeyboardRatioMarker(cent)
    });

    for (let i = 0; i < edo+1; i++) {

      // is this step currently playing?
      let playingStep = false;
      for (let p = 0; p < playedSteps.length; p++) {
        if (i === playedSteps[p] && playedSteps.length > 1) {
          playingStep = true; break;
        }
      }
      if (playingStep) {
        stroke("#666");
        fill("#FFFFFF33");
      } else {
        stroke("#666");
        noFill();
      }

      // what ratios are closest?
      //let closest = undefined;
      //if (midOctaveRatioCents.length > 0) {
      //  // only check halfway around the note with the first ratio, remove from array if found
      //  // so the next edostep won't check it again
      //  const distance = midOctaveRatioCents[0] - i * stepCents;
      //  if (Math.abs(distance) < stepCents/2) {
      //    closest = distance;
      //    midOctaveRatioCents.shift()
      //  } else if (distance < 0) {
      //    midOctaveRatioCents.shift()
      //  }
      //}

      // draw
      drawEDOButton(i); //closest
    }

    textAlign(LEFT);
    translate(0, 40);
    fill("#BBB");
    text(edo + " EDO Keyboard (Octave above "+baseFreq+" Hz, step size "+Number(stepCents.toFixed(2))+")", 20, 200-30);
  }
  pop();
  
  //const names = channels.map((channel) => channel.source);
  //const names = playedCents.map((c) => Math.round(c)).join(",") + "  " + playedRatios.join(",") + "  " + playedSteps.join(",");
  //text(names, 20, height-20)
}




function firstChannel(source) {
  for (let i = 1; i < channels.length; i++) {
    if (channels[i].source === source) {
      return i;
    }
  }
}
function exactChannel(source, id) {
  if (source === "kbd") {
    for (let i = 1; i < channels.length; i++) {
      const channel = channels[i];
      if (channel.source === source && channel.sourceProperties.edostep === id -1) {
        return i;
      }
    }
  } else if (source === "touch") {
    for (let i = 1; i < channels.length; i++) {
      const channel = channels[i];
      if (channel.source === source && channel.sourceProperties.id === id) {
        return i;
      }
    }
  }
}


function mouseDragged() {
  if (!isMouse) return
  if (outsideCanvas(mouseX, mouseY)) return;
  
  const channel = channels[firstChannel("mouse")];
  if (channel !== undefined) {
    setFromScreenXY(channel, mouseX, mouseY);
  
    draw();
  }
}

function mousePressed() {
  if (!isMouse) return
  if (outsideCanvas(mouseX, mouseY)) return;
  
  mouseDown = true;
  
  const channel = channels[firstChannel("off")];
  if (channel !== undefined) {
    setFromScreenXY(channel, mouseX, mouseY);
    channel.source = "mouse";
    channel.osc.start();
    channels[0].source = "ref";
    channels[0].osc.start();

    draw();
  }
}

function mouseReleased() {
  if (!isMouse) return
  mouseDown = false;
  
  const channel = channels[firstChannel("mouse")];
  if (channel !== undefined) {
    channel.source = "off";
    channel.sourceProperties = {};
    channel.osc.stop();
    if (nothingOn()) {
      channels[0].source = "off";
      channels[0].osc.stop();
    }
    
    draw();
  }
}

function handleTouchStart(event) {
  event.preventDefault();
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    const x = touch.clientX; const y = touch.clientY - 60;
    if (outsideCanvas(x, y)) return;
    
    touchPressed++;
    const channel = channels[firstChannel("off")];
    if (channel !== undefined) {
      setFromScreenXY(channel, x, y);
      channel.source = "touch";
      channel.sourceProperties.id = id;
      channel.osc.start();
      if (channels[0].source !== "ref") {
        channels[0].source = "ref";
        channels[0].osc.start();
      }

      draw();
    }
    //print(touch)
  })
}

function handleTouchMove(event) {
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    const x = touch.clientX; const y = touch.clientY - 60;
    if (outsideCanvas(x, y)) return;
    
    const channel = channels[exactChannel("touch", id)];
    if (channel !== undefined) {
      setFromScreenXY(channel, x, y);
  
      draw();
    }
  })
}

function handleTouchEnd(event) {
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    //const x = touch.clientX; const y = touch.clientY - 60;
    
    touchPressed--;
    const channel = channels[exactChannel("touch", id)];
    if (channel !== undefined) {
      channel.source = "off";
      channel.sourceProperties = {};
      channel.osc.stop();
      if (nothingOn()) {
        channels[0].source = "off";
        channels[0].osc.stop();
      }
      
      draw();
    }
  })
}


function keyPressed() {
  
  if (document.activeElement.type !== undefined) return
  if (!"1234567890".includes(key)) return
  kbdPressed++;
  
  const position = (key === "0") ? 10 : Number(key);

  const channel = channels[firstChannel("off")];
  if (channel !== undefined) {
    setFromKbd(channel, position);
    channel.source = "kbd";
    channel.osc.start();
    if (channels[0].source !== "ref") {
      channels[0].source = "ref";
      channels[0].osc.start();
    }

    draw();
  }
}
function keyReleased() {
  
  if (document.activeElement.type !== undefined) return
  if (!"1234567890".includes(key)) return
  kbdPressed--;
  const position = (key === "0") ? 10 : Number(key);

  const channel = channels[exactChannel("kbd", position)];
  if (channel !== undefined) {
    channel.source = "off";
    channel.sourceProperties = {};
    channel.osc.stop();
    if (nothingOn()) {
      channels[0].source = "off";
      channels[0].osc.stop();
    }

    draw();
  }
  return false; // prevent any default behavior
}

function nothingOn() {
  return (!mouseDown && kbdPressed === 0 && touchPressed === 0)
}

function setFromScreenXY(channel, x, y) {
  
  channel.sourceProperties.ratiostep = undefined;
  channel.sourceProperties.edostep = undefined;
  
  if (canvasSegment(y) === "slider") {
    const channelCents = screenXtoCents(x);
    channel.sourceProperties.cents = channelCents;
    // set freq
    channel.osc.freq(frequency(baseFreq, channelCents));
    
  } else if (canvasSegment(y) === "keyboard") { // ratio keyboard
    if (ratios[ratioSlot].length > 1) {
      const channelRatiostep = screenXtoRatio(x);
      channel.sourceProperties.ratiostep = channelRatiostep;
      const channelCents = cents(ratios[ratioSlot][0], ratios[ratioSlot][channelRatiostep]);
      channel.sourceProperties.cents = channelCents;
      // set freq
      channel.osc.freq(frequency(baseFreq, channelCents));
    }
    
  } else {
    if (edo > 1) { // edo keyboard
      const channelEDOStep = screenXtoEdo(x);
      channel.sourceProperties.edostep = channelEDOStep;
      const channelCents = (channelEDOStep/edo)*1200;
      channel.sourceProperties.cents = channelCents;
      // set freq
      channel.osc.freq(frequency(baseFreq, channelCents));
    }
  }
}

function setFromKbd(channel, position) {
  if (edo > 1) {
    const channelEDOStep = position - 1;
    channel.sourceProperties.edostep = channelEDOStep;
    const channelCents = (channelEDOStep/edo)*1200;
    channel.sourceProperties.cents = channelCents;
    // set freq
    channel.osc.freq(frequency(baseFreq, channelCents));
  }
}


function outsideCanvas(x, y) {
  if (x < 0) return true
  if (x > width) return true
  if (y < 0) return true
  if (y > height) return true
}

function canvasSegment(y) {
  if (y <= 200) return "slider"
  if (y <= 400) return "keyboard"
  return "edo"
}

function drawCentsMarker(cents, octave) {
  const xPos = map(cents, -centsDown, centsUp, 0, width);
  const gap = 50;
  const yTop = gap;
  const yBot = 200 - gap;
  line(xPos, yTop, xPos, yBot);
  if (octave !== undefined) {
    ellipse(xPos, yTop, 6);
    ellipse(xPos, yBot, 6);
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

function drawRatioButton(i) {
  const notes = ratios[ratioSlot];
  const leftEdge = map(i, 0, notes.length, 20, width-20);
  const rightEdge = map(i+1, 0, notes.length, 20, width-20);
  const centerX = 0.5 * (leftEdge + rightEdge);
  const centerY = 230/2;

  rect(leftEdge, 50, rightEdge, 200-20);
  noStroke();

  const a = Number(notes[i]);
  const b = Number(notes[0]);

  fill("#0DD");
  text([a,b].join("/"), centerX, centerY-45);

  // simplify with fallback: undefined
  const simplified = simplifiedRatio(a, b, [undefined]);

  //first check if undefined to return instantly
  if (simplified[0] === undefined) return;

  const simplifiedString = "(" + simplified.join("/") + ")";

  fill("#0AA");
  text(simplifiedString, centerX,centerY-30);
}

function drawEDOButton(i, closest) {
  const leftEdge = map(i, 0, edo+1, 20, width-20);
  const rightEdge = map(i+1, 0, edo+1, 20, width-20);
  const centerX = 0.5 * (leftEdge + rightEdge);
  const centerY = 230/2;

  rect(leftEdge, 50, rightEdge, 200-20);
  fill("#BBB");
  noStroke();
  text(i, centerX, centerY-45);
  //if (closest !== undefined) {
  //  const rangeDist = Math.abs(closest)/(stepCents*0.5);
  //  fill(lerpColor(color("#00FFFFBB"), color("#00FFFF66"), rangeDist));
  //  text(Math.round(closest) + "c", centerX, centerY+3);
  //  fill(lerpColor(color("#00FFFF22"), color("#00FFFF22"), rangeDist));
  //  const roomSize = min((230/2)/2, (rightEdge-leftEdge)/2)
  //  const discSize = map(rangeDist,0,1,roomSize*1.5,0)
  //  ellipse(map(closest/(stepCents*0.5),-1,1,leftEdge+discSize/2,rightEdge-discSize/2),centerY, discSize)
  //}
}

function drawEDOkeyboardRatioMarker(cents) {
  // if a ratio marker is exactly on the outside edges of the kbd, it is 0.5 edo steps too far
  // so the full range is the amount of keys + 1
  const xpos = map(cents, (-0.5)*stepCents, (edo+0.5)*stepCents, 20, width-20);
  const ypos = 230/2;
  const maxsize = min(80,((width-40) / (edo+1)) * 0.8);
  const distanceToEdoEdgeDown = (cents % stepCents);
  const distanceToEdoEdgeUp = stepCents - distanceToEdoEdgeDown;
  let nearestDist = min(distanceToEdoEdgeDown,distanceToEdoEdgeUp);
  let absDist = Math.abs(nearestDist)/(stepCents*0.5);

  fill("#00FFFF55");
  ellipse(xpos,ypos, maxsize*0.96);
  fill(lerpColor(color("#00000088"), color("#000000BB"), absDist));
  ellipse(xpos,ypos, maxsize);
  fill(lerpColor(color("#00FFFFBB"), color("#00FFFF66"), absDist));
  text(Math.round(nearestDist) + "c", xpos, ypos+3);
}


function screenXtoCents(x) {
  return map(x, 0, width, -centsDown, centsUp)
}

function screenXtoRatio(x) {
  const notes = ratios[ratioSlot];
  return Math.floor(map(x, 20, width-20, 0, notes.length))
}

function screenXtoEdo(x) {
  return Math.floor(map(x, 20, width-20, 0, edo+1))
}

// distance between two frequencies in cents
function cents(a, b) {
  if (b === a) return 0;
  //if (b % a === 0) return 1200;
  return 1200 * Math.log2(b / a); //% 1200;
}

// frequency after going certain distance in cents
function frequency(base, cents) {
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