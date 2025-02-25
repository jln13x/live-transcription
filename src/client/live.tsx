"use client";

import { getToken } from "@/server/get-token";
import { RealtimeTranscriber } from "assemblyai";
import { useEffect, useRef, useState } from "react";
import {
  RecordRTCPromisesHandler as RecordRTC,
  StereoAudioRecorder,
} from "recordrtc";
import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";

export const Live = () => {
  const {
    transcript,
    isLoading,
    isRecording,
    startTranscription,
    endTranscription,
  } = useLiveTranscription();

  return (
    <div className="max-w-4xl w-full flex flex-col gap-4 items-center">
      <textarea
        readOnly
        placeholder="Start recording to get a live transcript"
        className="w-full border border-gray-600 rounded-md p-2 resize-none bg-transparent focus:outline-none data-[recording=true]:border-red-600 data-[recording=true]:animate-pulse"
        data-recording={isRecording}
        rows={8}
        value={transcript}
      />

      <button
        className="relative h-auto rounded-full border border-gray-600   px-4 py-4 shadow-lg active:scale-95"
        onClick={isRecording ? endTranscription : startTranscription}
        disabled={isLoading}
      >
        <span className="size-8">
          {isLoading ? (
            <Loader2Icon className="animate-spin" />
          ) : isRecording ? (
            <SquareIcon />
          ) : (
            <MicIcon />
          )}
        </span>
      </button>
    </div>
  );
};

const useLiveTranscription = () => {
  const realtimeTranscriber = useRef<RealtimeTranscriber | null>(null);
  const recorder = useRef<RecordRTC | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const transcriptionsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    return () => {
      (async () => {
        if (realtimeTranscriber.current) {
          await realtimeTranscriber.current.close();
          realtimeTranscriber.current = null;
        }

        if (recorder.current) {
          await recorder.current.stopRecording();
          await recorder.current.destroy();
          recorder.current = null;
        }
      })();
    };
  }, []);

  const initRealtimeTranscriber = async () => {
    const token = await getToken();

    realtimeTranscriber.current = new RealtimeTranscriber({
      token: token.token,
      sampleRate: 16_000,
    });
  };

  const setupRealtimeTranscriberEvents = () => {
    if (!realtimeTranscriber.current) return;

    transcriptionsRef.current = {};

    realtimeTranscriber.current.on("transcript", (transcript) => {
      let wholeTranscript = "";

      transcriptionsRef.current[String(transcript.audio_start)] =
        transcript.text;

      const transcriptionKeys = Object.keys(transcriptionsRef.current);
      transcriptionKeys.sort((a, b) => Number(a) - Number(b));

      for (const transcriptionKey of transcriptionKeys) {
        if (transcriptionsRef.current[transcriptionKey]) {
          wholeTranscript += ` ${transcriptionsRef.current[transcriptionKey]}`;
        }
      }
      setTranscript(wholeTranscript);
    });

    realtimeTranscriber.current.on("error", async (event) => {
      console.error(event);
      await endTranscription();
    });

    realtimeTranscriber.current.on("close", async (code, reason) => {
      console.log(`Connection closed: ${code} ${reason}`);
      await endTranscription();
    });
  };

  const connectRealtimeTranscriber = async () => {
    if (!realtimeTranscriber.current) return;
    await realtimeTranscriber.current.connect();
  };

  const setupRecorder = async () => {
    if (!realtimeTranscriber.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recorder.current = new RecordRTC(stream, {
      type: "audio",
      mimeType: "audio/webm;codecs=pcm",
      recorderType: StereoAudioRecorder,
      timeSlice: 250,
      desiredSampRate: 16000,
      numberOfAudioChannels: 1,
      bufferSize: 4096,
      audioBitsPerSecond: 128000,
      ondataavailable: async (blob) => {
        if (!realtimeTranscriber.current) return;
        const buffer = await blob.arrayBuffer();
        realtimeTranscriber.current.sendAudio(buffer);
      },
    });
  };

  const startRecording = async () => {
    if (!recorder.current) return;
    await recorder.current?.startRecording();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (recorder.current) {
      await recorder.current.stopRecording();
      await recorder.current.destroy();
      recorder.current = null;
      setIsRecording(false);
    }
  };

  const startTranscription = async () => {
    try {
      setTranscript("");
      setIsLoading(true);
      await endTranscription();
      await initRealtimeTranscriber();
      setupRealtimeTranscriberEvents();
      await setupRecorder();
      await connectRealtimeTranscriber();
      await startRecording();
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  const closeRealtimeTranscriber = async () => {
    if (realtimeTranscriber.current) {
      await realtimeTranscriber.current.close();
      realtimeTranscriber.current = null;
    }
  };

  const endTranscription = async () => {
    await stopRecording();
    await closeRealtimeTranscriber();
  };

  return {
    transcript,
    isRecording,
    isLoading,
    startTranscription,
    endTranscription,
  };
};
