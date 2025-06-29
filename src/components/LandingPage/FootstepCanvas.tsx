import { useEffect, useRef } from 'react';
import FootstepCanvas from './FootstepCanvas';

const FootstepCanvas = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const lastStepIndexRef = useRef(0);

	useEffect(() => {
		const canvas = document.createElement('canvas');
		canvas.width = window.innerWidth;
		canvas.height = 3000; // long enough to allow scroll
		canvas.style.position = 'absolute';
		canvas.style.top = '0';
		canvas.style.left = '50%';
		canvas.style.transform = 'translateX(-50%)';
		canvas.style.zIndex = '10';
		canvas.style.pointerEvents = 'none';
		canvasRef.current = canvas;
		document.body.appendChild(canvas);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.fillStyle = '#FFFFFF';

		const stepGap = 100;
		const footLength = 30;
		const footWidth = 14;
		const startX = canvas.width / 2;
		let isLeft = true;

		const drawFoot = (x: number, y: number, left: boolean) => {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(Math.PI); // flip it to point downward
			ctx.scale(1, left ? 1 : -1); // mirror right foot
			ctx.beginPath();
			ctx.ellipse(0, 0, footWidth, footLength, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		};

		const onScroll = () => {
			const scrollY = window.scrollY;
			const visibleSteps = Math.floor(scrollY / stepGap);

			if (visibleSteps <= lastStepIndexRef.current) return;

			for (let i = lastStepIndexRef.current + 1; i <= visibleSteps; i++) {
				const xOffset = (i % 2 === 0 ? -1 : 1) * 25;
				const y = i * stepGap;
				drawFoot(startX + xOffset, y, isLeft);
				isLeft = !isLeft;
			}
			lastStepIndexRef.current = visibleSteps;
		};

		window.addEventListener('scroll', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			document.body.removeChild(canvas);
		};
	}, []);

	return null;
};

export default FootstepCanvas;
