(async () => {
  const live_url = "<LIVE_TRANSCRIPT_URL_HERE>";

  let latestFetchedEndRange = 0;

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
  }, 1500); // Adjust the polling frequency to your needs

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
    return content.filter((row) => !!row.t).map((row) => row.t);
  };

  const addParaghraphs = (textRows) => {
    if (textRows.length > 0) {
      document.getElementById("live-transcript").innerText +=
        textRows.join(" ");
    }
  };

  const stopPolling = () => {
    document.getElementById("end-status").innerText =
      "Live transcript has ended";
    clearInterval(intervalId);
  };
})();
