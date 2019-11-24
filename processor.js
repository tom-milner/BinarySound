class DecoderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, paramters) {
    console.log(inputs, outputs, paramters);
    return true;


  }
}

registerProcessor("decoder-processor", DecoderProcessor);