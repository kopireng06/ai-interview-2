export const useAudioAnalyzer = () => {
  function audioHandler(
    source: MediaStream | HTMLAudioElement,
    id = "talking-indicator",
    type: "stream" | "element" = "stream"
  ) {
    let audioInput;
    const audioContext = new (window.AudioContext || window.AudioContext)();
    const analyser = audioContext.createAnalyser();

    if (type === "stream") {
      audioInput = audioContext.createMediaStreamSource(source);
      audioInput.connect(analyser);
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Simple voice activity detection
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        const boxShadowLength = average / 4;

        if (boxShadowLength > 1) {
          document.getElementById(id)?.style.setProperty("display", "block");
        } else {
          document.getElementById(id)?.style.setProperty("display", "none");
        }
      };

      draw();
    } else {
      try {
        const input = audioContext.createMediaElementSource(source);

        input.connect(analyser);
        analyser.connect(audioContext.destination);

        // Set up the analyser
        analyser.fftSize = 2048; // Set the FFT size
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Function to get frequency data
        const getFrequencyData = () => {
          requestAnimationFrame(getFrequencyData); // Call again for continuous updates

          analyser.getByteFrequencyData(dataArray);

          // Simple voice activity detection
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / dataArray.length;

          const boxShadowLength = average / 5;

          if (boxShadowLength > 1) {
            document.getElementById(id)?.style.setProperty("display", "block");
          } else {
            document.getElementById(id)?.style.setProperty("display", "none");
          }
          // You can now use dataArray for visualization or analysis
        };

        // Start the analysis loop
        getFrequencyData();

        return;
      } catch (error) {
        console.log(error);
      }
    }
  }

  return { audioHandler };
};
