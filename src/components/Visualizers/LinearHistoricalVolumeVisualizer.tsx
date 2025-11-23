import type { FC } from "react";
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

export interface LinearHistoricalVolumeVisualizerProps {
	ref: React.RefObject<{
		start: () => void;
		stop: () => void;
	}>;
	streamRef: React.RefObject<MediaStream>;
	width?: number | string;
	height?: number | string;
	ratio?: number;
	barColor?: string;
	barWidth?: number | string;
	barSpacing?: number | string;
}

const getPixelValue = (value: number | string) => {
	return typeof value === "number"
		? value
		: Number.parseInt(value as string, 10);
};

export const LinearHistoricalVolumeVisualizer: FC<
	LinearHistoricalVolumeVisualizerProps
> = (props) => {
	const { ref, streamRef, width, height, barWidth, barSpacing } = props;

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyzerRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [audioVolumeHistory, setAudioVolumeHistory] = useState<
		{ id: string; volume: number }[]
	>([]);
	const [containerWidth, setContainerWidth] = useState<number>(0);

	const MAX_HISTORY_SEC = 3;
	const SAMPLING_RATE = 60;
	const MAX_BAR_HEIGHT = height
		? typeof height === "number"
			? height / 2
			: Number.parseInt(height as string, 10) / 2
		: 25; // 上下の最大バーの長さ方側

	const containerStyle = {
		width: getPixelValue(width),
		height: getPixelValue(height),
	};

	// コンテナの幅を監視
	useEffect(() => {
		if (!containerRef.current) return;

		const updateWidth = () => {
			if (containerRef.current) {
				setContainerWidth(containerRef.current.clientWidth);
			}
		};

		// 初回の幅を設定
		updateWidth();

		// ResizeObserverで幅の変化を監視
		const resizeObserver = new ResizeObserver(updateWidth);
		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	// 表示可能な最大バー数を計算
	const calculateMaxVisibleBars = useCallback(() => {
		if (containerWidth === 0) {
			// 幅がまだ測定されていない場合は、時間ベースの制限を使用
			return MAX_HISTORY_SEC * SAMPLING_RATE;
		}

		const barWidthPx = getPixelValue(barWidth ?? 1);
		const barSpacingPx = getPixelValue(barSpacing ?? 0);

		// 各バーは barWidth + barSpacing の幅を占める（最初のバーを除く）
		// 最初のバーは barWidth のみ
		// 表示可能なバー数 = 1 + Math.floor((containerWidth - barWidth) / (barWidth + barSpacing))
		if (barWidthPx + barSpacingPx === 0) {
			return MAX_HISTORY_SEC * SAMPLING_RATE;
		}

		const maxBars = Math.floor(
			(containerWidth + barSpacingPx) / (barWidthPx + barSpacingPx),
		);

		// 時間ベースの制限と画面幅ベースの制限の小さい方を返す
		return Math.min(maxBars, MAX_HISTORY_SEC * SAMPLING_RATE);
	}, [containerWidth, barWidth, barSpacing]);

	const logData = useCallback(
		(dataArray: Uint8Array) => {
			if (!analyzerRef.current) return;
			analyzerRef.current.getByteFrequencyData(dataArray);

			// Uint8Arrayから全体の音量を計算（単純な平均値）
			const totalVolume = Array.from(dataArray).reduce(
				(sum, val) => sum + val,
				0,
			);
			const averageVolume = totalVolume / dataArray.length;
			const normalizedVolume = Math.min(1, averageVolume / (props.ratio ?? 50)); // 0-1の範囲に正規化。 threshold が小さいほど小さな音がバーに反映される。

			// 新しいデータを履歴に追加し、最大長を超えた場合は古いデータを削除
			setAudioVolumeHistory((prevHistory) => {
				const newHistory = [
					...prevHistory,
					{ id: Date.now().toString(), volume: normalizedVolume },
				];
				const maxBars = calculateMaxVisibleBars();
				if (newHistory.length > maxBars) {
					return newHistory.slice(1);
				}
				return newHistory;
			});

			animationFrameRef.current = requestAnimationFrame(() =>
				logData(dataArray),
			);
		},
		[props.ratio, calculateMaxVisibleBars],
	);

	const startVisualization = useCallback(() => {
		if (!streamRef.current) return;

		audioContextRef.current = new AudioContext();
		const source = audioContextRef.current.createMediaStreamSource(
			streamRef.current,
		);

		analyzerRef.current = audioContextRef.current.createAnalyser();
		analyzerRef.current.fftSize = 256;
		source.connect(analyzerRef.current);

		const bufferLength = analyzerRef.current.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		setAudioVolumeHistory([]);
		animationFrameRef.current = requestAnimationFrame(() => logData(dataArray));
	}, [logData, streamRef]);

	const stopVisualization = useCallback(() => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
		audioContextRef.current?.close();
		audioContextRef.current = null;
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			start: startVisualization,
			stop: stopVisualization,
		}),
		[startVisualization, stopVisualization],
	);

	return (
		<div className="linear-historical-volume-visualizer flex flex-col grow justify-center min-h-[50px]">
			<div
				ref={containerRef}
				className={`volume-graph flex overflow-hidden items-center relative`}
				style={containerStyle}
			>
				{audioVolumeHistory.map((item) => (
					<div
						key={item.id}
						className="linear-bar flex flex-col items-center z-20"
						style={{
							paddingLeft: getPixelValue(barSpacing ?? 0),
						}}
					>
						<div
							// simplify
							className="rounded-full"
							style={{
								backgroundColor: props.barColor ?? "blue",
								height: `${item.volume * MAX_BAR_HEIGHT * 2}px`,
								width: getPixelValue(barWidth ?? 1),
							}}
						/>
					</div>
				))}
			</div>
		</div>
	);
};
