// html elements

let cnv;
const container = document.getElementById("canvas-container");
const baseInput = document.getElementById("base");
const edoInput = document.getElementById("edo");
const ratiosInput = document.getElementById("ratios");
const refInput = document.getElementById("ref");

// input

let mouseDown = false;
let kbdPressed = 0;

const channels = [];
// initialed with 10 channels, 
// each contains an object with the osc 
// and source: [off, kbd, touch, mouse, ref]
// sources that are off will be filled again first before starting a new osc,
// skipping the first position reserved for the ref pitch

// sound settings

let waveform = "sine";
let baseFreq = 220;
let baseOscDown = 1200;

// scale settings

let centsDown = 1400;
let centsUp = 2000;
let edo = 12;
let ratios = [[4, 5, 6, 7]];




function setup() {
  cnv = createCanvas(windowWidth-20, 600).parent(container);
  cnv.touchStarted(handleTouchStart);
  cnv.touchMoved(handleTouchMove);
  cnv.touchEnded(handleTouchEnd);
  textFont('monospace');
  rectMode(CORNERS);
  
  // initialize all channels
  for (let i = 0; i < 10; i++) {
    
    let source = "off";
    let osc = new p5.Oscillator();
    let sourceProperties = {};
    
    osc.setType(waveform);
    osc.freq(baseFreq)
    osc.amp(0.5);
    
    if (i === 0) {
      osc.freq(frequency(baseFreq, -baseOscDown));
      sourceProperties = {
        cents: -baseOscDown, ratiostep: 0, edostep: 0
      }
    }
    channels.push({osc: osc, source: source, sourceProperties: sourceProperties});
  }
  
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
      draw();
    }
  });
  
  ratiosInput.addEventListener('input', (e) => {
    const onlyDigitsAndColons = new RegExp("[^0-9:]");
    const onlyColonsBetweenDigits = new RegExp(":[^0-9]|[^0-9]:|^:|:$");
    const ratiosString = e.target.value.replace(onlyDigitsAndColons, "").replace(onlyColonsBetweenDigits, "");
    ratios = ratiosString.split(" ").map(substr => substr.split(":"));
    draw();
  });
  
  refInput.addEventListener('input', (e) => {
    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue) && inputValue > 0) {
      baseOscDown = inputValue;
      const refChannel = channels[0];
      refChannel.osc.freq(frequency(baseFreq, -baseOscDown));
      refChannel.sourceProperties.cents = -baseOscDown;
      draw();
    }
  });
  
  noLoop()
}

function windowResized() {
  resizeCanvas(windowWidth-20, 600);
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
  background("black")
  textAlign(CENTER);
  
  updatePlayed();
  
  stroke("#666")
  const stepCents = 1200/edo;
  for(let i = 0; i < centsDown; i += stepCents) {
    drawCentsMarker(-i)
  }
  for(let i = 0; i < centsUp; i += stepCents) {
    drawCentsMarker(i)
  }
 
  stroke("#FFF")
  drawCentsMarker(0);
  
  stroke("#CCC")
  drawCentsMarker(1200);
  drawCentsMarker(-1200);
  
  ratios.forEach((ratio) => {
    if (ratio.length >= 2) {
      for (let i = 1; i < ratio.length; i++) { 
        const ratioCents = cents(ratio[0], ratio[i]);
        
        if (ratioCents >= 0) {
          stroke("#0DD")
          drawCentsMarker(ratioCents)
          noStroke()
          fill("#0DD")
          text(ratio[0], map(ratioCents, -centsDown, centsUp, 0, width), 200-13)
          text(ratio[i], map(ratioCents, -centsDown, centsUp, 0, width), 200-27)
        }
      }
    }
  })
  
  // draw played cents
  playedCents.forEach((c) => {
    stroke("orange");
    drawCentsMarker(c);
    noStroke()
    fill("orange");
    text(Math.round(c) + " c", map(c, -centsDown, centsUp, 0, width), 20);
    const f = frequency(baseFreq, c);
    text(Math.round(f*10)/10 + " Hz", map(c, -centsDown, centsUp, 0, width), 40);
  });

  
  noStroke()
  fill("#BBB")
  textAlign(LEFT);
  // let playedCentsText = "";
  // for (let p = 1; p < playedCents.length; p++) {
  //   playedCentsText += Math.round(playedCents[p])
  // }
  // if (playedCentsText.length > 0) {
  //   text(playedCentsText + " cents", 20, 20)
  // }
  
    
  // lower part
  push()
  translate(0, 200)
  if (ratios[0].length > 1) {
    
    
    fill("#0DD")
    text("Ratio chord keyboard, one octave", 20, 30)
    
    noFill()
    for (let i = 0; i < ratios[0].length; i++) {
      let playingRatio = false;
      for (let p = 0; p < playedRatios.length; p++) {
        if (i === playedRatios[p] && playedRatios.length > 1) {
          playingRatio = true; break;
        }
      }
      if (playingRatio) {
        stroke("#0AA")
        fill("#022")
      } else {
        stroke("#0AA")
        noFill()
      }
      drawRatioButton(i)
    }
  }
  
  // lower part again
  translate(0, 200)
  if (edo > 1) {
    fill("#BBB")
    text(edo + " EDO chord keyboard, one octave", 20, 30)
    
    noFill()
    for (let i = 0; i < edo+1; i++) {
      let playingStep = false;
      for (let p = 0; p < playedSteps.length; p++) {
        if (i === playedSteps[p] && playedSteps.length > 1) {
          playingStep = true; break;
        }
      }
      if (playingStep) {
        stroke("#666")
        fill("#333")
      } else {
        stroke("#666")
        noFill()
      }
      drawEDOButton(i)
    }
  }
  pop()
  
  //const names = channels.map((channel) => channel.source);
  //const names = playedRatios.join(",") + " " + playedSteps.join(",");
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
  if (outsideCanvas(mouseX, mouseY)) return;
  
  const channel = channels[firstChannel("mouse")];
  if (channel !== undefined) {
    setFromScreenXY(channel, mouseX, mouseY);
  
    draw();
  }
}

function mousePressed() {
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
    const x = touch.clientX; const y = touch.clientY;
    if (outsideCanvas(x, y)) return;
    
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
    const x = touch.clientX; const y = touch.clientY;
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
    const x = touch.clientX; const y = touch.clientY;
    
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
  return (!mouseDown && kbdPressed === 0 && touches.length === 0)
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
    if (ratios[0].length > 1) {
      const channelRatiostep = screenXtoRatio(x);
      channel.sourceProperties.ratiostep = channelRatiostep;
      const channelCents = cents(ratios[0][0], ratios[0][channelRatiostep]);
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

function drawCentsMarker(cents) {
  const xPos = map(cents, -centsDown, centsUp, 0, width)
  const yTop = 50
  const yBot = 200 - 50
  line(xPos, yTop, xPos, yBot)
}
function drawRatioButton(i) {
  //const xPos = map(i, -centsDown, centsUp, 60, width-60)
  const notes = ratios[0];
  const leftEdge = map(i, 0, notes.length, 20, width-20);
  const rightEdge = map(i+1, 0, notes.length, 20, width-20);
  rect(leftEdge, 50, rightEdge, 200-50);
  fill("#0DD");
  noStroke();
  text(notes[i]+"/"+notes[0], leftEdge+6, 50+15);
}
function drawEDOButton(i) {
  const leftEdge = map(i, 0, edo+1, 20, width-20);
  const rightEdge = map(i+1, 0, edo+1, 20, width-20);
  rect(leftEdge, 50, rightEdge, 200-50);
  fill("#BBB");
  noStroke();
  text(i, leftEdge+6, 50+15);
}


function screenXtoCents(x) {
  return map(x, 0, width, -centsDown, centsUp)
}

function screenXtoRatio(x) {
  const notes = ratios[0];
  return Math.floor(map(x, 20, width-20, 0, notes.length))
}

function screenXtoEdo(x) {
  return Math.floor(map(x, 20, width-20, 0, edo+1))
}

// distance between two frequencies in cents
function cents(a, b) {
  if (b === a) return 0;
  if (b % a === 0) return 1200;
  return 1200 * Math.log2(b / a) % 1200;
}

// frequency after going certain distance in cents
function frequency(base, cents) {
  return base * Math.pow(2, cents / 1200);
}