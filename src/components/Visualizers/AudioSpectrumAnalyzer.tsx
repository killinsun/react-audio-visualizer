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

		if (endBin <= startBin) {
			animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
			return;
		}

		// 周波数範囲を計算（対数スケール用）
		// 0Hzは対数で問題になるため最小20Hz
		const minFreq = Math.max(minFrequencyHz ?? 20, 20);
		const maxFreq = (maxFrequencyKHz ?? sampleRate / 2000) * 1000;

		// 対数スケールの範囲を計算
		const logMin = Math.log10(minFreq);
		const logMax = Math.log10(maxFreq);
		const logRange = logMax - logMin;

		// 周波数データをバーの数に合わせてサンプリング（対数スケール）
		setFrequencyBars((prevBars) =>
			prevBars.map((bar, index) => {
				// 各バーに対応する周波数帯域を対数スケールで計算
				const logStep = logRange / barCount;
				const freqStart = 10 ** (logMin + index * logStep);
				const freqEnd = 10 ** (logMin + (index + 1) * logStep);

				// 周波数をビンインデックスに変換
				const rangeStartIdx = Math.max(
					startBin,
					Math.floor((freqStart * fftSize) / sampleRate),
				);
				const rangeEndIdx = Math.min(
					endBin,
					index === barCount - 1
						? endBin
						: Math.ceil((freqEnd * fftSize) / sampleRate),
				);

				// 範囲が有効かチェック
				if (rangeEndIdx <= rangeStartIdx) {
					// 低周波数帯域で同じビンに複数のバーが割り当てられる場合
					// そのビンの値を使用
					const singleBinIdx = Math.min(
						Math.floor((freqStart * fftSize) / sampleRate),
						bufferLength - 1,
					);
					const normalizedValue = dataArray[singleBinIdx] / ratio;
					return {
						...bar,
						value: normalizedValue,
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
	}, [barCount, ratio, getFrequencyBinRange, minFrequencyHz, maxFrequencyKHz, fftSize]);

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
