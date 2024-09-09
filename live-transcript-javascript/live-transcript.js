(async () => {
  const live_audio_url = "<LIVE_AUDIO_URL_HERE>";
  const live_url = "<LIVE_TRANSCRIPT_URL_HERE>";

  let latestFetchedEndRange = 0;

  const parseContent = (content) => {
    return content
      .split(/\r?\n/)
      .filter((row) => row.length > 0)
      .map((row) => JSON.parse(row));
  };

  const checkHasEnded = (content) => {
    return content.some((row) => row.type === "end");
  };

  const getParagraphs = (content) => {
    return content.filter((row) => !!row.t);
  };

  const addParaghraphs = (textRows) => {
    if (textRows.length > 0) {
      const container = document.getElementById("live-transcript");
      const spans = textRows.map((paragraph) => {
        const span = document.createElement("span");
        span.innerText = `${paragraph.t} `;
        span.classList.add("hidden");
        span.setAttribute("data-start", paragraph.s);
        return span;
      });

      for (const span of spans) {
        container.appendChild(span);
      }
    }
  };

  const stopPolling = () => {
    document.getElementById("end-status").innerText =
      "Live transcript has ended";
    clearInterval(intervalId);
  };

  const createAudioElement = () => {
    const audioElement = document.createElement("audio");
    audioElement.controls = true;
    document.getElementById("audio-container").appendChild(audioElement);
    return audioElement;
  };

  // We need to use HLS when streaming live calls
  const setupHLSStream = (url, audioElement) => {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(audioElement);
    hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
      if (data?.details?.totalduration) {
        console.log("Total live call duration", data?.details?.totalduration);
      }
    });
  };

  // Safari browsers with native HLS support
  const handleNativeHLSSupport = (audioElement, url) => {
    if (audioElement.canPlayType("application/vnd.apple.mpegurl")) {
      audioElement.src = url;
    } else {
      console.error("Your browser does not support HLS streaming");
    }
  };

  const setupLiveAudio = (url) => {
    const audioElement = createAudioElement();

    if (Hls?.isSupported()) {
      setupHLSStream(url, audioElement);
    } else {
      handleNativeHLSSupport(audioElement, url);
    }

    // Listen to current user progress of the call and display transcript paragraphs accordingly
    audioElement.addEventListener("timeupdate", () => {
      handleVisabilityChange(audioElement.currentTime);
    });
  };

  const handleVisabilityChange = (() => {
    // This example is just a simple way to show how to sync the transcript with the audio and should be handled more efficiently in production use.

    let lastUpdate = 0; // A bit of an optimization where we do not update the UI on every audio progress change.

    return (currentTime) => {
      if (Math.abs(currentTime - lastUpdate) < 0.1) return;
      lastUpdate = currentTime;

      const spans = document.querySelectorAll("#live-transcript span");

      for (const span of spans) {
        const startValue = Number.parseInt(span.dataset.start, 10);
        const isVisible = startValue < currentTime;
        span.classList.toggle("visible", isVisible);
        span.classList.toggle("hidden", !isVisible);
      }
    };
  })();

  // Fetching live transcripts
  const intervalId = setInterval(async () => {
    const response = await fetch(live_url, {
      headers: {
        Range: `bytes=${latestFetchedEndRange}-`,
      },
    });

    if (!response.ok) {
      return;
    }

    // Handle range header so we only fetch the delta with new content and not the content from start on every request
    const rangeHeader = response.headers.get("content-range"); // the content-range in the response will look like this "bytes 0-999/1000"
    latestFetchedEndRange = rangeHeader?.split("-")[1].split("/")[0] || "0"; // we want the number in the end to fetch next i.e 1000

    // Get content in response
    const rawData = await response.text();

    // We are using jsonl where every row is a json object, we split it into an array of content and parse each into json
    const content = parseContent(rawData);

    // Set live transcript ended if present in the response data
    const hasEnded = checkHasEnded(content);

    // Take the text rows and concatinate into a string, and push it to content
    const textRows = getParagraphs(content);
    addParaghraphs(textRows);

    // Stop polling if live transcript ended
    if (hasEnded) {
      stopPolling();
    }
  }, 1500); // Adjust the polling frequency for fetching transcript data to your needs

  setupLiveAudio(live_audio_url);
})();
