const oneFreq = 16000.0;
const zeroFreq = 15000.0;
const newBitFreq = 14000.0;

const freqBound = 10;

var context = new AudioContext();
let data = 0;
const pulseWidth = 10000 / context.sampleRate;
const fftSize = 2048;
let timer;
let analyserNode, decoderNode;
console.log(context.sampleRate);

window.onload = async function () {
  // await context.audioWorklet.addModule('processor.js')
  // decoderNode = new AudioWorkletNode(context, "decoder-processor");
  // console.log(decoderNode);

  navigator.getUserMedia({
      audio: true
    },
    function (stream) {
      startMicrophone(stream);
    },
    function (err) {
      console.log(err);
    }
  );
}



let bits = document.querySelector("#bitData");
let decoded = document.querySelector("#decoded");
let actualBits = document.querySelector("#actualBits");
let maxText = document.querySelector("#max");
let actualData = document.querySelector("#actualData");


document.querySelector("#play").addEventListener("click", function () {
  if (timer) clearInterval(timer);
  bits.textContent = "";
  context.resume();
  modulate();
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

  for (let bit of bin.split("")) {
    var osc = context.createOscillator();
    var sigOsc = context.createOscillator();
    sigOsc.type = "square";
    sigOsc.frequency.value = newBitFreq;
    osc.type = "square";

    osc.frequency.value = bit == 1 ? oneFreq : zeroFreq;

    osc.connect(context.destination);
    sigOsc.connect(context.destination);
    sigOsc.start(context.currentTime)
    sigOsc.stop(context.currentTime + pulseWidth * 0.9)
    osc.start(context.currentTime);
    osc.stop(context.currentTime + pulseWidth);
    await sleep(pulseWidth * 1000);
  }
}

function startMicrophone(stream) {
  let processor = context.createScriptProcessor(2048, 1, 1);
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
  let normSigStrength = normalize(sigFreqStrength, -120, 0);
  if (normSigStrength >= 0.4) {
    if (hasBeenRead) return;
    // 1s
    let oneFreqIndex = getFrequencyIndexRange(oneFreq, freqBound);
    let oneFreqStrength = Math.max(...arr.slice(oneFreqIndex.min, oneFreqIndex.max));
    let normOneStrength = normalize(oneFreqStrength, -120, 0);

    // 0s
    let zeroFreqIndex = getFrequencyIndexRange(zeroFreq, freqBound);
    let zeroFreqStrength = Math.max(...arr.slice(zeroFreqIndex.min, zeroFreqIndex.max));
    let normZeroStrength = normalize(zeroFreqStrength, -120, 0);

    console.log(normSigStrength)
    if (normOneStrength >= 0.4) {
      appendBit(1);
      hasBeenRead = true;
    } else if (normZeroStrength >= 0.4) {
      appendBit(0);
      hasBeenRead = true;
    }
  } else {
    // ready to read
    hasBeenRead = false;
  }
}