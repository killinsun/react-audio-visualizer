import { useCallback, useRef } from "react";
import { Controller } from "./components/Controller";
import { useAudioStreaming } from "./hooks/useAudioStreaming";
import "./index.css";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LinearHistoricalVolumeVisualizerWithControls } from "./components/Visualizers/LinearHistoricalVolumeVisualizerWithControls";
import { AudioSpectrumAnalyzerWithControls } from "./components/Visualizers/AudioSpectrumAnalyzerWithControls";

export function App() {
	const { isRecording, audioRef, streamRef, startRecording, stopRecording } =
		useAudioStreaming();

	const linearVisualizerRef = useRef<{ start: () => void; stop: () => void }>(
		null,
	);
	const audioSpectrumRef = useRef<{ start: () => void; stop: () => void }>(
		null,
	);

	const handleStart = useCallback(async () => {
		await startRecording();
		linearVisualizerRef.current?.start();
		audioSpectrumRef.current?.start();
	}, [startRecording]);

	const handleStop = useCallback(async () => {
		await stopRecording();
		linearVisualizerRef.current?.stop();
		audioSpectrumRef.current?.stop();
	}, [stopRecording]);

	return (
		<div className="container mx-auto text-center relative z-10 h-screen p-4">
			<div className="flex justify-center items-center gap-8">
				<Card className="bg-card/50 backdrop-blur-sm border-muted flex-1 flex flex-col h-full">
					<CardHeader>
						<h1 className="text-4xl font-bold my-4 leading-tight">
							Audio Spectrum Analyzer sample app
						</h1>
					</CardHeader>
					<CardContent className="pt-6 flex-col gap-4">
						<div className="flex flex-col gap-16">
							<div className="flex flex-col gap-4">
								<Controller onStart={handleStart} onStop={handleStop} />
							</div>
							<LinearHistoricalVolumeVisualizerWithControls
								ref={linearVisualizerRef}
								streamRef={streamRef}
								isRecording={isRecording}
							/>
							<AudioSpectrumAnalyzerWithControls
								ref={audioSpectrumRef}
								streamRef={streamRef}
								isRecording={isRecording}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default App;
