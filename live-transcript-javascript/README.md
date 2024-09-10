### Handling Live Audio and Live Transcripts in a Web Client

This example is implemented using only JavaScript, HTML, and CSS, without any dependencies other than `HLS.js`, which is required for some browsers to stream audio.

This example needs to be modified to fit your frontend framework of choice, and other types of optimizations can be made. It is provided to demonstrate a potential implementation, but it is not ready for production use.

#### Background

Since the live transcript is not bundled with the live audio stream, there are two files to fetch data from to provide the full experience:

- Live audio stream
- Live transcript data file

It is a complex task to keep these in sync from the server side because the server does not control how often a client fetches data, any delays, or other issues that may occur.

Therefore, it is up to the client to handle this synchronization so that the audio and transcript display properly. Since the live transcript includes timestamps indicating when each text occurs in the live audio, this can be managed by the client.

#### Implementation

All handling is located in the file `live-transcript.js` and consists of two main parts:

- Handling the polling of the live transcript file to get new data as it becomes available. A range header is used to fetch only the delta since the last fetch, so it does not fetch all transcript data from the start with each polling request.

- Setting up live audio handling, along with syncing that hides transcript text that has advanced further than the live audio itself.

In this example, transcript paragraphs that have advanced further than the audio stream are marked in red to make them easy as an example. However, they should be hidden or customized to suit your needs in production use.

There are two ways to manage how the audio sync works and which parts of the transcript should be displayed:

1. By listening to the `timeupdate` event for the `audio` element. This reflects the user's audio progress. If the user scrubs through the audio, the transcript visibility will adapt accordingly. This option is used in this example.

2. By listening to the `hls` instance and the `LEVEL_LOADED` event. This tracks how far the live audio has progressed overall and is unaffected by user scrubbing. An event listener is set up in the example code but is not used.

Depending on your needs, you can choose one of these methods to track the live audio's progress and display the live transcript accordingly.
