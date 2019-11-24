class DecoderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  // Static getter to define AudioParam objects in this custom processor.
  static get parameterDescriptors() {
    return [{
      name: 'myParam',
      defaultValue: 0.707
    }];
  }


  process(inputs, outputs, parameters) {
    console.log(inputs, outputs, parameters);
    return true;


  }
}

registerProcessor("decoder-processor", DecoderProcessor);