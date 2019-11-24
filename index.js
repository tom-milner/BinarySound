const oneFreq = 15000.0;
const zeroFreq = 12000.0;
const newBitFreq = 10000.0;

const freqBound = 10;

var context = new AudioContext();
let data = JSON.stringify({
  msg: "hello"
});
const pulseWidth = 6000 / context.sampleRate;
const fftSize = 2048;
let analyserNode;
let micStream;

let bits = document.querySelector("#bitData");
let decoded = document.querySelector("#decoded");
let actualBits = document.querySelector("#actualBits");
let actualData = document.querySelector("#actualData");


window.onload = async function () {
  navigator.getUserMedia({
      audio: true
    },
    function (stream) {
      micStream = stream;
    },
    function (err) {
      console.log(err);
    }
  );
}

document.querySelector("#rt").addEventListener("click", function () {
  bits.textContent = "";
  startMicrophone(micStream);
  modulate();
});

document.querySelector("#transmit").addEventListener("click", function () {
  modulate();
});

document.querySelector("#receive").addEventListener("click", function () {
  startMicrophone(micStream);
  bits.textContent = "";
});

function appendBit(bit) {
  bits.textContent += bit;
  decoded.textContent = decodeBits(bits.textContent);
}

function decodeBits(bits) {
  bits = bits.replace(/\s+/g, "");
  bits = bits.match(/.{1,8}/g).join(" ");
  return bits
    .split(" ")
    .map(function (elem) {
      return String.fromCharCode(parseInt(elem, 2));
    })
    .join("");
}

function getBin(data) {
  let bin = "";
  bin = data.toString().replace(/[\s\S]/g, function (data) {
    data = zeroPad(data.charCodeAt().toString(2));
    return data;
  });
  return bin;
}

function zeroPad(num) {
  return "00000000".slice(String(num).length) + num;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function modulate() {
  let bin = getBin(data);
  actualBits.textContent = bin;
  actualData.textContent = decodeBits(getBin(data));

  let binArr = bin.split("");
  for (let bit of binArr) {
    var osc = context.createOscillator();
    var sigOsc = context.createOscillator();
    sigOsc.type = "square";
    sigOsc.frequency.value = newBitFreq;
    osc.type = "square";

    osc.frequency.value = bit == 1 ? oneFreq : zeroFreq;

    osc.connect(context.destination);
    sigOsc.connect(context.destination);
    sigOsc.start(context.currentTime + (pulseWidth * 0.25))
    sigOsc.stop(context.currentTime + (pulseWidth * 0.5))
    osc.start(context.currentTime);
    osc.stop(context.currentTime + pulseWidth);
    await sleep(pulseWidth * 1000);
  }
}

function startMicrophone(stream) {
  let processor = context.createScriptProcessor(fftSize, 1, 1);
  let micStream = context.createMediaStreamSource(stream);
  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = fftSize;
  micStream.connect(analyserNode);
  analyserNode.connect(processor);
  processor.connect(context.destination);

  processor.onaudioprocess = processAudio;
}


function normalize(val, min, max) {
  return Math.round(((val - min) / (max - min)) * 100) / 100;
}

function getFrequencyIndexRange(frequency, range) {
  let max = parseInt(((frequency + range) * fftSize) / context.sampleRate)
  let min = parseInt(((frequency - range) * fftSize) / context.sampleRate)
  return {
    max,
    min
  };
  // return array of indexes
}


let hasBeenRead = false;

function processAudio() {

  let arr = new Float32Array(analyserNode.frequencyBinCount);
  analyserNode.getFloatFrequencyData(arr);

  // signal
  let sigFreqIndex = getFrequencyIndexRange(newBitFreq, freqBound);
  let sigFreqStrength = Math.max(...arr.slice(sigFreqIndex.min, sigFreqIndex.max));
  let normSigStrength = normalize(sigFreqStrength, -100, 0);

  if (normSigStrength >= 0.5) {
    if (hasBeenRead) return;
    // 1s
    let oneFreqIndex = getFrequencyIndexRange(oneFreq, freqBound);
    let oneFreqStrength = Math.max(...arr.slice(oneFreqIndex.min, oneFreqIndex.max));
    let normOneStrength = normalize(oneFreqStrength, -100, 0);

    // 0s
    let zeroFreqIndex = getFrequencyIndexRange(zeroFreq, freqBound);
    let zeroFreqStrength = Math.max(...arr.slice(zeroFreqIndex.min, zeroFreqIndex.max));
    let normZeroStrength = normalize(zeroFreqStrength, -100, 0);

    console.log(normOneStrength, normZeroStrength)
    if (normOneStrength >= 0.5) {
      appendBit(1);
    } else {
      appendBit(0);
    }
    hasBeenRead = true;
  } else {
    // ready to read
    hasBeenRead = false;
  }
}