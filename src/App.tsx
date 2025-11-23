import { useCallback, useRef, useState } from "react";
import { Controller } from "./components/Controller";
import { useAudioStreaming } from "./hooks/useAudioStreaming";
import "./index.css";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LinearHistoricalVolumeVisualizer } from "./components/Visualizers/LinearHistoricalVolumeVisualizer";
import { Input } from "./components/ui/input";

export function App() {
	const { isRecording, audioRef, streamRef, startRecording, stopRecording } =
		useAudioStreaming();

	const [barColor, setBarColor] = useState<string>("#9118c9");
	const [barWidth, setBarWidth] = useState<number>(7);
	const [barSpacing, setBarSpacing] = useState<number>(1);
	const [threshold, setThreshold] = useState<number>(50);

	const visualizerRef = useRef<{ start: () => void; stop: () => void }>(null);

	const handleStart = useCallback(async () => {
		await startRecording();
		visualizerRef.current?.start();
	}, [startRecording]);

	const handleStop = useCallback(async () => {
		await stopRecording();
		visualizerRef.current?.stop();
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
					<CardContent className="pt-6 flex-col gap-4 w-[640px]">
						<div className="flex flex-col gap-4">
							<div className="bg-gray-100 rounded-md text-left">
								<h2 className="text-lg font-bold mb-2">
									Linear Historical Volume Visualizer
								</h2>
								<LinearHistoricalVolumeVisualizer
									ref={visualizerRef}
									streamRef={streamRef}
									barColor={barColor}
									barWidth={barWidth}
									barSpacing={barSpacing}
									ratio={threshold}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<div className="flex grid-cols-3 gap-4">
									<div className="col-span-1">
										<label htmlFor="barColor">Bar Color</label>
										<Input
											id="barColor"
											type="color"
											value={barColor}
											onChange={(e) => setBarColor(e.target.value)}
										/>
									</div>
									<div className="col-span-1">
										<label htmlFor="barWidth">Bar Width</label>
										<Input
											type="number"
											value={barWidth}
											min={0}
											max={10}
											onChange={(e) => setBarWidth(Number(e.target.value))}
										/>
									</div>
									<div className="col-span-1">
										<label htmlFor="barSpacing">Bar Spacing</label>
										<Input
											type="number"
											value={barSpacing}
											onChange={(e) => setBarSpacing(Number(e.target.value))}
										/>
									</div>
									<div className="col-span-1">
										<label htmlFor="threshold">Threshold</label>
										<Input
											type="number"
											value={threshold}
											onChange={(e) => setThreshold(Number(e.target.value))}
										/>
									</div>
								</div>
							</div>
							<div className="flex flex-col gap-4">
								<Controller onStart={handleStart} onStop={handleStop} />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default App;
