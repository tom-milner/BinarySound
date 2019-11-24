const frequency = 9000.0;
const freqDiff = 500.0;
var context = new AudioContext();
let data = "hello";
let buffSize = data.length * 8;
const pulseWidth = 0.1;
const fftSize = 1024;
let timer;
let analyserNode, decoderNode;

window.onload = async function () {
  await context.audioWorklet.addModule('processor.js')
  decoderNode = new AudioWorkletNode(context, "decoder-processor");


  navigator.getUserMedia(
    {
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
  timer = setInterval(processAudio, pulseWidth * 1000);
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
  switch (typeof data) {
    case "Number":
      bin = data.toString(2);
      break;
    case "string":
      bin = data.replace(/[\s\S]/g, function (data) {
        data = zeroPad(data.charCodeAt().toString(2));
        return data;
      });
      break;
  }
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

    osc.type = "square";
    if (bit == 1) {
      osc.frequency.value = frequency;
    } else {
      osc.frequency.value = frequency + freqDiff;
    }
    // osc.connect(context.destination);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + pulseWidth);
    await sleep(pulseWidth * 1000);
  }
}

function startMicrophone(stream) {
  let micStream = context.createMediaStreamSource(stream);
  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = fftSize;
  micStream.connect(analyserNode);
  analyserNode.connect(decoderNode);

  decoderNode.connect(context.destination)
}

function processAudio() {

  let arr = new Float32Array(analyserNode.frequencyBinCount);
  analyserNode.getFloatFrequencyData(arr);
  let maxFreq = parseInt(
    arr.indexOf(Math.max(...arr)) * (context.sampleRate / fftSize)
  );
  maxText.textContent = maxFreq;

  let bound = freqDiff / 2;
  if (maxFreq > frequency - bound && maxFreq < frequency + bound) {
    appendBit(1);
  }
  let zeroFreq = frequency + freqDiff;
  if (maxFreq > zeroFreq - bound && maxFreq < zeroFreq + bound) {
    appendBit(0);
  }
}