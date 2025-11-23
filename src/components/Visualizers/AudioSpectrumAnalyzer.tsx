import type { FC } from "react";
import { useCallback, useImperativeHandle, useRef, useState } from "react";

export interface AudioSpectrumAnalyzerProps {
	ref: React.RefObject<{
		start: () => void;
		stop: () => void;
	}>;
	streamRef: React.RefObject<MediaStream>;
	width?: number | string;
	height?: number | string;
	barCount?: number; // 表示するバーの数
	barColor?: string | ((value: number) => string); // 値に応じた色を返す関数も可
	barWidth?: number | string;
	barSpacing?: number | string;
	ratio?: number;
	smoothingTimeConstant?: number; // 0.0-1.0 スムージング
	fftSize?: number; // FFTサイズ (256, 512, 1024, 2048, 4096, 8192, 16384, 32768)
	minDecibels?: number; // 最小デシベル値
	maxDecibels?: number; // 最大デシベル値
	minFrequencyHz?: number; // 最小周波数（Hz）
	maxFrequencyKHz?: number; // 最大周波数（kHz）
	showFrequencyLabels?: boolean;
	symetric?: boolean;
}

interface BarData {
	id: number;
	value: number;
}

const getPixelValue = (value: number | string) => {
	return typeof value === "number"
		? value
		: Number.parseInt(value as string, 10);
};

export const AudioSpectrumAnalyzer: FC<AudioSpectrumAnalyzerProps> = (
	props,
) => {
	const {
		ref,
		streamRef,
		width,
		height,
		barWidth = 4,
		barSpacing = 2,
		barCount = 64,
		barColor = (value: number) => `hsl(${120 - value * 120}, 100%, 50%)`,
		ratio = 512,
		smoothingTimeConstant = 0.8,
		fftSize = 1024,
		minDecibels = -100,
		maxDecibels = 0,
		minFrequencyHz,
		maxFrequencyKHz,
		showFrequencyLabels,
		symetric,
	} = props;

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyzerRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// 周波数データを保持
	const [frequencyBars, setFrequencyBars] = useState<BarData[]>(() =>
		Array.from({ length: barCount }, (_, i) => ({
			id: i,
			value: 0,
		})),
	);

	const containerStyle = {
		width: width || "100%",
		height: height || "200px",
	};

	const getBarColor = useCallback(
		(value: number) => {
			if (typeof barColor === "function") {
				return barColor(value);
			}
			return barColor;
		},
		[barColor],
	);

	// 周波数範囲に対応するバインインデックスの範囲を計算
	const getFrequencyBinRange = useCallback(
		(sampleRate: number, bufferLength: number) => {
			if (minFrequencyHz === undefined && maxFrequencyKHz === undefined) {
				return { startBin: 0, endBin: bufferLength };
			}

			const minFreq = minFrequencyHz ?? 0;
			const maxFreq = (maxFrequencyKHz ?? sampleRate / 2000) * 1000; // kHzをHzに変換

			const startBin = Math.floor((minFreq * fftSize) / sampleRate);
			const endBin = Math.ceil((maxFreq * fftSize) / sampleRate);

			return {
				startBin: Math.max(0, startBin),
				endBin: Math.min(endBin, bufferLength),
			};
		},
		[minFrequencyHz, maxFrequencyKHz, fftSize],
	);

	const updateFrequencyData = useCallback(() => {
		if (!analyzerRef.current || !audioContextRef.current) return;

		const bufferLength = analyzerRef.current.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		analyzerRef.current.getByteFrequencyData(dataArray);

		const sampleRate = audioContextRef.current.sampleRate;
		const { startBin, endBin } = getFrequencyBinRange(sampleRate, bufferLength);
		const frequencyRangeLength = endBin - startBin;

		if (frequencyRangeLength <= 0) {
			animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
			return;
		}

		// 周波数データをバーの数に合わせてサンプリング
		// 各バーに均等に周波数範囲を割り当てる（最後のバーは endBin まで確実にカバー）
		setFrequencyBars((prevBars) =>
			prevBars.map((bar, index) => {
				// 各バーに対応する周波数帯域の範囲を計算（均等に分割）
				const binRangePerBar = frequencyRangeLength / barCount;
				const rangeStartIdx = Math.floor(startBin + index * binRangePerBar);
				// 最後のバーの場合は endBin まで、それ以外は次のバーの開始位置まで
				const rangeEndIdx =
					index === barCount - 1
						? endBin
						: Math.floor(startBin + (index + 1) * binRangePerBar);

				// 範囲が有効かチェック
				if (rangeEndIdx <= rangeStartIdx) {
					return {
						...bar,
						value: 0,
					};
				}

				// 各バーに対応する周波数帯域の平均値を計算
				let sum = 0;
				for (let i = rangeStartIdx; i < rangeEndIdx; i++) {
					sum += dataArray[i];
				}

				const average = sum / (rangeEndIdx - rangeStartIdx);
				const normalizedValue = average / ratio; // 0-1に正規化

				return {
					...bar,
					value: normalizedValue,
				};
			}),
		);

		animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
	}, [barCount, ratio, getFrequencyBinRange]);

	const startVisualization = useCallback(() => {
		if (!streamRef.current) return;

		audioContextRef.current = new AudioContext();
		const source = audioContextRef.current.createMediaStreamSource(
			streamRef.current,
		);

		analyzerRef.current = audioContextRef.current.createAnalyser();
		analyzerRef.current.fftSize = fftSize;
		analyzerRef.current.smoothingTimeConstant = smoothingTimeConstant;
		analyzerRef.current.minDecibels = minDecibels;
		analyzerRef.current.maxDecibels = maxDecibels;

		source.connect(analyzerRef.current);

		// 初期化
		setFrequencyBars(
			Array.from({ length: barCount }, (_, i) => ({
				id: i,
				value: 0,
			})),
		);

		animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
	}, [
		streamRef,
		updateFrequencyData,
		fftSize,
		smoothingTimeConstant,
		minDecibels,
		maxDecibels,
		barCount,
	]);

	const stopVisualization = useCallback(() => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
		audioContextRef.current?.close();
		audioContextRef.current = null;

		// バーをリセット
		setFrequencyBars((prevBars) =>
			prevBars.map((bar) => ({
				...bar,
				value: 0,
			})),
		);
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
		<div className="frequency-spectrum-analyzer flex flex-col grow justify-center">
			<div
				ref={containerRef}
				className={`spectrum-container flex ${symetric ? "items-center" : "items-end"} justify-center relative gap-0`}
				style={containerStyle}
			>
				{frequencyBars.map((bar) => (
					<div
						key={bar.id}
						className={`frequency-bar ${symetric ? "rounded" : "rounded-t"}`}
						style={{
							backgroundColor: getBarColor(bar.value),
							marginLeft: bar.id === 0 ? 0 : getPixelValue(barSpacing),
							height: symetric ? `${bar.value * 50}%` : `${bar.value * 100}%`,
							width: getPixelValue(barWidth),
						}}
					/>
				))}
			</div>

			{/* 周波数ラベル（オプション） */}
			{showFrequencyLabels && (
				<div className="frequency-labels flex justify-between mt-2 text-xs text-gray-500">
					<span>
						{minFrequencyHz !== undefined
							? minFrequencyHz >= 1000
								? `${(minFrequencyHz / 1000).toFixed(1)}kHz`
								: `${minFrequencyHz}Hz`
							: "20Hz"}
					</span>
					<span>
						{minFrequencyHz !== undefined && maxFrequencyKHz !== undefined
							? (() => {
									const midFreq = (minFrequencyHz + maxFrequencyKHz * 1000) / 2;
									return midFreq >= 1000
										? `${(midFreq / 1000).toFixed(1)}kHz`
										: `${Math.round(midFreq)}Hz`;
								})()
							: "200Hz"}
					</span>
					<span>
						{maxFrequencyKHz !== undefined ? `${maxFrequencyKHz}kHz` : "2kHz"}
					</span>
					<span>
						{maxFrequencyKHz !== undefined ? `${maxFrequencyKHz}kHz` : "20kHz"}
					</span>
				</div>
			)}
		</div>
	);
};
