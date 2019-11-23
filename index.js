const frequency = 9000.0;
const freqDiff = 500.0;
var context = new AudioContext();
let data = "hello there my name is tom";
let buffSize = data.length * 8;
const pulseWidth = 0.1;
const fftSize = 1024;
let timer;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function modulate() {
  let bin = getBin(data);
  actualBits.textContent = bin;

  actualData.textContent = decodeBits(getBin(data));

  for (let bit of bin.split("")) {
    var osc = context.createOscillator();
    var gainNode = context.createGain();

    osc.type = "square";
    if (bit == 1) {
      osc.frequency.value = frequency;
    } else {
      osc.frequency.value = frequency + freqDiff;
    }
    osc.connect(gainNode);
    gainNode.connect(context.destination);

    osc.start(context.currentTime);
    osc.stop(context.currentTime + pulseWidth);
    await sleep(pulseWidth * 1000);
  }
}

navigator.getUserMedia(
  {
    audio: true
  },
  function(stream) {
    startMicrophone(stream);
  },
  function(err) {
    console.log(err);
  }
);

let analyserNode;

function startMicrophone(stream) {
  let micStream = context.createMediaStreamSource(stream);
  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = fftSize;
  micStream.connect(analyserNode);
}

function processAudio() {
  // get first channel avg
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

document.querySelector("#play").addEventListener("click", function() {
  if (timer) clearInterval(timer);
  bits.textContent = "";
  context.resume();
  timer = setInterval(processAudio, pulseWidth * 1000);
  modulate();
});
let bits = document.querySelector("#bitData");
let decoded = document.querySelector("#decoded");
let actualBits = document.querySelector("#actualBits");
let maxText = document.querySelector("#max");
let actualData = document.querySelector("#actualData");

function appendBit(bit) {
  bits.textContent += bit;
  decoded.textContent = decodeBits(bits.textContent);
}

function decodeBits(bits) {
  bits = bits.replace(/\s+/g, "");
  bits = bits.match(/.{1,8}/g).join(" ");
  return bits
    .split(" ")
    .map(function(elem) {
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
      bin = data.replace(/[\s\S]/g, function(data) {
        data = zeroPad(data.charCodeAt().toString(2));
        return data;
      });
      break;
  }
  console.log(bin);
  // while (bin.length < buffSize) {
  // bin.unshift("0");
  // }
  return bin;
}

function zeroPad(num) {
  return "00000000".slice(String(num).length) + num;
}
