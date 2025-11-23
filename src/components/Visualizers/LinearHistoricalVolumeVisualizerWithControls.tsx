import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { LinearHistoricalVolumeVisualizer } from "./LinearHistoricalVolumeVisualizer";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface LinearHistoricalVolumeVisualizerWithControlsProps {
	streamRef: React.RefObject<MediaStream>;
	isRecording?: boolean;
}

export const LinearHistoricalVolumeVisualizerWithControls = forwardRef<
	{ start: () => void; stop: () => void },
	LinearHistoricalVolumeVisualizerWithControlsProps
>(({ streamRef, isRecording = false }, ref) => {
	const [barColor, setBarColor] = useState<string>("#9118c9");
	const [barWidth, setBarWidth] = useState<number>(7);
	const [barSpacing, setBarSpacing] = useState<number>(1);
	const [threshold, setThreshold] = useState<number>(50);

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
						<Label htmlFor="barColor">Bar Color</Label>
						<Input
							id="barColor"
							type="color"
							value={barColor}
							onChange={(e) => setBarColor(e.target.value)}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="barWidth">Bar Width</Label>
						<Input
							type="number"
							value={barWidth}
							min={0}
							max={10}
							onChange={(e) => setBarWidth(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="barSpacing">Bar Spacing</Label>
						<Input
							type="number"
							value={barSpacing}
							onChange={(e) => setBarSpacing(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
					<div className="col-span-1">
						<Label htmlFor="threshold">Threshold</Label>
						<Input
							type="number"
							value={threshold}
							onChange={(e) => setThreshold(Number(e.target.value))}
							disabled={isRecording}
						/>
					</div>
				</div>
			</div>
		</div>
	);
});
