import { useCallback, useState, useRef } from "react";

export interface AudioStreamingService {
	isRecording: boolean;
	audioRef: React.RefObject<HTMLAudioElement>;
	streamRef: React.RefObject<MediaStream>;
	startRecording: () => void;
	stopRecording: () => void;
}

export const useAudioStreaming = (): AudioStreamingService => {
	const [isRecording, setIsRecording] = useState(false);
	const audioRef = useRef<HTMLAudioElement>(null);
	const streamRef = useRef<MediaStream>(null);

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			setIsRecording(true);
		} catch (error) {
			console.error("Error starting recording:", error);
			setIsRecording(false);
		}
	}, []);

	const stopRecording = useCallback(async () => {
		try {
			setIsRecording(false);
			audioRef.current?.pause();
			for (const track of streamRef.current?.getTracks() ?? []) {
				track.stop();
			}
			audioRef.current = null;
			streamRef.current = null;
		} catch (error) {
			console.error("Error stopping recording:", error);
		}
	}, []);

	return {
		isRecording,
		audioRef: audioRef as React.RefObject<HTMLAudioElement>,
		streamRef: streamRef as React.RefObject<MediaStream>,
		startRecording,
		stopRecording,
	};
};
