import { Button } from "./ui/button";
import { useState } from "react";

export interface ControllerProps {
	onStart: () => void;
	onStop: () => void;
}

export const Controller = (props: ControllerProps) => {
	const { onStart, onStop } = props;
	const [isMicRecording, setIsMicRecording] = useState(false);

	const startMicRecording = () => {
		setIsMicRecording(true);
		onStart();
	};

	const stopMicRecording = () => {
		setIsMicRecording(false);
		onStop();
	};

	return (
		<div className="flex flex-col gap-4">
			<Button
				type="button"
				variant="default"
				onClick={isMicRecording ? stopMicRecording : startMicRecording}
			>
				{isMicRecording ? "Stop" : "Mic Start"}
			</Button>
		</div>
	);
};
