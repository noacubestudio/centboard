import {ratios, ratioSlot, cents, frequency, baseFreq, centsDown, centsUp, edo, uiblocks, refMode} from "./sketch.js";

export let mouseDown = false;
let isMouse = false;
let totalKbd = 0;
export let totalTouches = 0;

export const channels = [];
// initialed with 10 channels, 
// each contains an object with the synth 
// and source: [off, kbd, touch, mouse, ref]
// sources that are off will be filled again first before starting a new synth,
// skipping the first position reserved for the ref pitch

window.mouseDragged = () => {
  if (!isMouse)
    return;
  if (outsideCanvas(mouseX, mouseY))
    return;

  const channel = channels[firstChannel("mouse")];
  if (channel !== undefined) {
    setFromScreenXY(channel, mouseX, mouseY);

    window.draw();
  }
};

window.mousePressed = () => {
  userStartAudio();
  if (!isMouse) return
  if (outsideCanvas(mouseX, mouseY)) return;
  
  mouseDown = true;
  
  const channel = channels[firstChannel("off")];
  if (channel !== undefined) {
    setFromScreenXY(channel, mouseX, mouseY, "mouse");

    window.draw();
  }
}

window.mouseReleased = () => {
  if (!isMouse) return
  mouseDown = false;
  
  const channel = channels[firstChannel("mouse")];
  if (channel !== undefined) {
    channel.source = "off";
    channel.sourceProperties = {};
    channel.synth.stop();
    if (countInputs() === 0) {
      channels.forEach((channel, index) => {
        if (index !== 0) {channel.sourceProperties = {}}
        channel.source = "off";
        channel.synth.stop();
      })
      //channels[0].source = "off";
      //channels[0].synth.stop();
    }
    
    window.draw();
  }
}

export function handleMouseOver() {
  isMouse = true;
}

export function handleTouchStart(event) {
  if (event.touches !== undefined) totalTouches = event.touches.length;
  userStartAudio();
  event.preventDefault();
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    const x = touch.clientX; const y = touch.clientY - 60;
    if (outsideCanvas(x, y)) return;
    
    const channel = channels[firstChannel("off")];
    if (channel !== undefined) {
      setFromScreenXY(channel, x, y, "touch", id);

      window.draw();
    }
    //print(touch)
  })
}

export function handleTouchMove(event) {
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    const x = touch.clientX; const y = touch.clientY - 60;
    if (outsideCanvas(x, y)) return;
    
    const channel = channels[exactChannel("touch", id)];
    if (channel !== undefined) {
      setFromScreenXY(channel, x, y);
  
      window.draw();
    }
  })
}

export function handleTouchEnd(event) {
  if (event.touches !== undefined) totalTouches = event.touches.length;
  event.changedTouches.forEach((touch) => {
    const id = touch.identifier;
    //const x = touch.clientX; const y = touch.clientY - 60;
    
    const channel = channels[exactChannel("touch", id)];
    if (channel !== undefined) {
      channel.source = "off";
      channel.sourceProperties = {};
      channel.synth.stop();
      if (countInputs() === 0) {
        channels.forEach((channel, index) => {
          if (index !== 0) {channel.sourceProperties = {}}
          channel.source = "off";
          channel.synth.stop();
        })
        // channels[0].source = "off";
        // channels[0].synth.stop();
      }
      
      window.draw();
    }
  })
}

window.keyPressed = () => {

  if (document.activeElement.type !== undefined) return
  if (!"1234567890".includes(key)) return
  userStartAudio();
  totalKbd++;
  
  const position = (key === "0") ? 10 : Number(key);

  const channel = channels[firstChannel("off")];
  if (channel !== undefined) {
    setFromKbd(channel, position);
    channel.source = "kbd";
    channel.synth.start();
    if (channels[0].source !== "ref" && refMode === "on") {
      channels[0].source = "ref";
      channels[0].synth.start();
    }

    window.draw();
  }
}

window.keyReleased = () => {
  
  if (document.activeElement.type !== undefined) return
  if (!"1234567890".includes(key)) return
  totalKbd--;
  const position = (key === "0") ? 10 : Number(key);

  const channel = channels[exactChannel("kbd", position)];
  if (channel !== undefined) {
    channel.source = "off";
    channel.sourceProperties = {};
    channel.synth.stop();
    if (countInputs() === 0) {
      channels[0].source = "off";
      channels[0].synth.stop();
    }

    window.draw();
  }
  return false; // prevent any default behavior
}


function countInputs() {
  let total = totalKbd + totalTouches;
  if (mouseDown) total++;
  return total;
}

function outsideCanvas(x, y) {
  if (x < 0) return true
  if (x > width) return true
  if (y < 0) return true
  if (y > height) return true
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

function setFromScreenXY(channel, x, y, initType, id) {

  channel.sourceProperties.ratiostep = undefined;
  channel.sourceProperties.edostep = undefined;

  function canvasSegment(y) {
    let maxHeight = 0;
    if (uiblocks.centboard.visible) {
      maxHeight += uiblocks.centboard.height;
      if (y <= maxHeight) return uiblocks.centboard;
    }
    if (uiblocks.ratioModes.visible) {
      maxHeight += uiblocks.ratioModes.height;
      if (y <= maxHeight) return uiblocks.ratioModes;
    }
    if (uiblocks.ratioKbd.visible) {
      maxHeight += uiblocks.ratioKbd.height;
      if (y <= maxHeight) return uiblocks.ratioKbd;
    }
    if (uiblocks.edoKbd.visible) {
      return uiblocks.edoKbd;
    }
  }
  
  if (canvasSegment(y) === uiblocks.centboard) {
    const channelCents = screenXtoCents(x);
    channel.sourceProperties.cents = channelCents;
    // set freq
    channel.synth.freq(frequency(baseFreq, channelCents));
    if (initType !== undefined) initChannel(channel, uiblocks.centboard, initType, id);

  } else if (canvasSegment(y) === uiblocks.ratioModes) {

    if (ratios[ratioSlot].length > 1) {
      const mode = screenXtoRatio(x);
      print("mode" + mode)
    }

  } else if (canvasSegment(y) === uiblocks.ratioKbd) {

    if (ratios[ratioSlot].length > 1) {
      const channelRatiostep = screenXtoRatio(x);
      channel.sourceProperties.ratiostep = channelRatiostep;
      const channelCents = cents(ratios[ratioSlot][0], ratios[ratioSlot][channelRatiostep]);
      channel.sourceProperties.cents = channelCents;
      // set freq
      channel.synth.freq(frequency(baseFreq, channelCents));
      if (initType !== undefined) initChannel(channel, uiblocks.ratioKbd, initType, id);
    }
  } else if (canvasSegment(y) === uiblocks.edoKbd) {
    if (edo > 1) { // edo keyboard
      const channelEDOStep = screenXtoEdo(x);
      channel.sourceProperties.edostep = channelEDOStep;
      const channelCents = (channelEDOStep/edo)*1200;
      channel.sourceProperties.cents = channelCents;
      // set freq
      channel.synth.freq(frequency(baseFreq, channelCents));
      if (initType !== undefined) initChannel(channel, uiblocks.edoKbd, initType, id);
    }
  }
}

function initChannel(channel, segment, type, id) {
  channel.source = type;
  if (type === "touch") channel.sourceProperties.id = id;
  channel.synth.start();
  if (refMode === "on") {
    channels[0].source = "ref";
    channels[0].synth.start();
  }
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

function setFromKbd(channel, position) {
  if (edo > 1) {
    const channelEDOStep = position - 1;
    channel.sourceProperties.edostep = channelEDOStep;
    const channelCents = (channelEDOStep/edo)*1200;
    channel.sourceProperties.cents = channelCents;
    // set freq
    channel.synth.freq(frequency(baseFreq, channelCents));
  }
}