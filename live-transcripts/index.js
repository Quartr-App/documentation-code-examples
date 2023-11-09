/**
 * Setting up a server that can receive webhooks, and then start showing, polling and syncing liveAudio and liveTranscript + fetch in batches
 * case 1:
 * 1. receive a liveStarted webhook
 * 2. getEvent with live state data
 * 3. start outputting audio and transcript from s3 urls in liveAudioState
 * 4. poll for liveTranscriptState and liveAudioState and keep in sync
 *
 * case 2:
 * 1. receive a audioAdded webhook
 * 2. getEvent with live state data
 * 3. show and sync the non live audio and transcript
 */

const express = require('express');
const bodyParser = require("body-parser");
const axios = require("axios");
const readline = require("readline");

const app = express();
const apiUrl = "http://localhost:8080";
const apiKey = "your_api_key_here";
const demoLiveTranscriptLoop = "https://ds.quartr.com/loop/live_transcript.jsonl"

app.use(bodyParser.json());

app.post("/", async (req, res) => {
  await handleWebhook(req.body);
  res.sendStatus(200);
});

app.listen(3001, () => {
  console.log("Webhook test server listening on port 3001");
});

async function handleWebhook(webhookData) {
  if (webhookData.type === "liveStarted") {
    const event = await getEvent(webhookData.eventId);
    startStreaming(event.data.liveState.liveJsonTranscriptUrl || demoLiveTranscriptLoop);
  } else if (webhookData.type === "audioAdded") {
    // Logic for handling non-live audio addition
  }
}

async function getEvent(eventId) {
  try {
    const response = await axios.get(`${apiUrl}/public/v1/events/${eventId}`, {
      headers: {"X-API-KEY": apiKey}
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching event data:", error);
    return null;
  }
}

// Example usage:
// Start the streaming process by passing the URL for live JSON transcript
// startStreaming('https://ds.quartr.com/loop/live_transcript.jsonl');

function startStreaming(liveJsonTranscriptUrl) {
  let range = 0;
  const interval = 2000

  const refetchStream = setInterval(() => {
    // test loop: https://ds.quartr.com/loop/live_transcript.jsonl
    axios({
      method: "get",
      url: liveJsonTranscriptUrl,
      responseType: "stream",
      headers: {
        "Content-Type": "application/json",
        range: `bytes=${range}-`,
      }
    }).then(function (response) {
      const rangeHeader = response.headers["content-range"];

      range = rangeHeader.split("/")[0].split("-")[1];

      const lineReader = readline.createInterface({
        input: response.data,
        crlfDelay: Infinity
      });

      lineReader.on("line", (line) => {
        const record = JSON.parse(line);
        handleRecord(record);
      });
    }).catch(function (error) {
      console.error("Error streaming transcript:", error);
      clearInterval(refetchStream)
    });
  }, interval)
}

function handleRecord(record) {
  // Handle indiscernible text, maybe by showing the original text or just ignoring it
  // {"s":218.56,"e":219.54,"p":"6","t":"[indiscernible]","c":0.62,"ot":"That in fact,"}
  // if (record.t === "[indiscernible]") {
  //   return entry.ot || '...';
  // }

  return record
}
