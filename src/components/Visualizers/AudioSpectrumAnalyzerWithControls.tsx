import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { AudioSpectrumAnalyzer } from "./AudioSpectrumAnalyzer";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface AudioSpectrumAnalyzerWithControlsProps {
	streamRef: React.RefObject<MediaStream>;
	isRecording?: boolean;
}

export const AudioSpectrumAnalyzerWithControls = forwardRef<
	{ start: () => void; stop: () => void },
	AudioSpectrumAnalyzerWithControlsProps
>(({ streamRef, isRecording = false }, ref) => {
	const [barCount, setBarCount] = useState<number>(16);
	const [barColor, setBarColor] = useState<string>("#9118c9");
	const [barWidth, setBarWidth] = useState<number>(16);
	const [barSpacing, setBarSpacing] = useState<number>(1);
	const [ratio, setRatio] = useState<number>(128);
	const [smoothingTimeConstant, setSmoothingTimeConstant] =
		useState<number>(0.8);
	const [showFrequencyLabels, setShowFrequencyLabels] =
		useState<boolean>(false);
	const [symetric, setSymetric] = useState<boolean>(true);

	const minFrequencyHz = 100;
	const maxFrequencyKHz = 8;

	const visualizerRef = useRef<{ start: () => void; stop: () => void }>(null);

	useImperativeHandle(ref, () => ({
		start: () => {
			visualizerRef.current?.start();
		},
		stop: () => {
			visualizerRef.current?.stop();
		},
	}));

	return (
		<div className="flex flex-col gap-4">
			<div className="bg-gray-100 rounded-md text-left">
				<h2 className="text-lg font-bold mb-2">Audio Spectrum Analyzer</h2>
				<AudioSpectrumAnalyzer
					ref={visualizerRef}
					streamRef={streamRef}
					barCount={barCount}
					barColor={barColor}
					barWidth={barWidth}
					barSpacing={barSpacing}
					ratio={ratio}
					smoothingTimeConstant={smoothingTimeConstant}
					minFrequencyHz={minFrequencyHz}
					maxFrequencyKHz={maxFrequencyKHz}
					showFrequencyLabels={showFrequencyLabels}
					symetric={symetric}
				/>
			</div>
			<div className="flex flex-col gap-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="col-span-1">
						<Label htmlFor="audioBarColor">Bar Color</Label>
						<Input
							id="audioBarColor"
							type="color"
							value={barColor}
							onChange={(e) => setBarColor(e.target.value)}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="audioBarCount">Bar Count</Label>
						<Input
							type="number"
							value={barCount}
							min={1}
							max={64}
							onChange={(e) => setBarCount(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="audioBarWidth">Bar Width</Label>
						<Input
							type="number"
							value={barWidth}
							min={1}
							max={100}
							onChange={(e) => setBarWidth(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="audioBarSpacing">Bar Spacing</Label>
						<Input
							type="number"
							value={barSpacing}
							min={0}
							max={100}
							onChange={(e) => setBarSpacing(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="ratio">Ratio</Label>
						<Input
							type="number"
							value={ratio}
							id="ratio"
							onChange={(e) => setRatio(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="smoothingTimeConstant">
							Smoothing Time Constant
						</Label>
						<Input
							type="number"
							value={smoothingTimeConstant}
							id="smoothingTimeConstant"
							min={0}
							max={1}
							step={0.1}
							onChange={(e) => setSmoothingTimeConstant(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="audioShowFrequencyLabels">Show Labels</Label>
						<Input
							type="checkbox"
							value={showFrequencyLabels ? "true" : "false"}
							onChange={(e) => setShowFrequencyLabels(e.target.checked)}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="audioSymetric">Symetric</Label>
						<Input
							type="checkbox"
							id="audioSymetric"
							checked={symetric}
							onChange={(e) => setSymetric(e.target.checked)}
							disabled={isRecording}
						/>
					</div>
				</div>
			</div>
		</div>
	);
});
