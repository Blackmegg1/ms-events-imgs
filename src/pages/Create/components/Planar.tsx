import { message } from 'antd';
import { createRef, useEffect, useState } from 'react';

interface Iprops {
  norm_axis: string;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  min_z: number;
  max_z: number;
  img_base64: string;
  name: string;
  top_margin: number;
  left_margin: number;
  eventList: any[];
  byMag: number;
  lineCoordinate: [number[], number[]] | null;
  highlightThreshold?: number;
  isHighlightEnabled?: boolean;
}

const Planar: React.FC<Iprops> = (props: Iprops) => {
  const {
    norm_axis,
    min_x,
    min_y,
    min_z,
    max_x,
    max_y,
    max_z,
    img_base64,
    name,
    top_margin,
    left_margin,
    eventList,
    lineCoordinate,
    byMag,
    highlightThreshold = 2000,
    isHighlightEnabled = false,
  } = props;

  const canvasRef = createRef<HTMLCanvasElement>();
  const [state, setState] = useState({
    width: 0,
    height: 0,
    minx: 0,
    miny: 0,
  });

  function getXY(msevt: { loc_y: any; loc_z: any; loc_x: any }) {
    let x, y;
    if (norm_axis === 'x') {
      (x = msevt.loc_y), (y = msevt.loc_z);
    } else if (norm_axis === 'y') {
      (x = msevt.loc_x), (y = msevt.loc_z);
    } else {
      (x = msevt.loc_x), (y = msevt.loc_y);
    }
    return { x, y };
  }

  function getRadius(magnitude: number) {
    // 处理负数情况
    if (magnitude < 0) {
      magnitude = 0;
    }
    if (byMag) {
      let radius = 10;
      if (magnitude < 1) {
        radius = 10 - (1 - magnitude) * 5;
      }
      return Math.max(5, radius);
    } else {
      return 5;
    }
  }

  function drawMsEvents(cvs: any, ctx: any, listeners) {
    const wRatio = (cvs.width - left_margin) / state.width;
    const hRatio = (cvs.height - top_margin) / state.height;

    // const engyRatio = maxRadius / maxEnergy;
    for (let i = 0; i < eventList.length; i++) {
      const evt = eventList[i];
      const xy = getXY(evt);
      const x = wRatio * (xy.x - state.minx) + left_margin;
      const y = cvs.height - hRatio * (xy.y - state.miny) + top_margin;
      const rgbValues = evt.color.match(/\d+/g).map(Number);
      const r = getRadius(+evt.magnitude);

      // 能量单位是KJ
      const energyJ = Number(evt.energy) * 1000;
      // 默认阈值2000J
      const threshold = highlightThreshold || 2000;
      const isHighEnergy = energyJ > threshold;

      if (isHighlightEnabled && isHighEnergy) {
        ctx.fillStyle = `rgba(255, 0, 0, 0.8)`;
      } else {
        ctx.fillStyle = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.6)`;
      }

      ctx.strokeStyle = `rgba(255,255,255,0)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      const handleClick = (event: { clientX: number; clientY: number }) => {
        const rect = cvs.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // 判断点击位置是否在点的范围内
        if (
          Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2) <
          Math.pow(r, 2)
        ) {
          message.info(
            `事件坐标:(${evt.loc_x},${evt.loc_y},${evt.loc_z}) 时间:${evt.time} 震级:${evt.magnitude}M 能量:${evt.energy}KJ`,
          );
        }
      };
      // 为点添加事件监听器
      cvs.addEventListener('click', handleClick);
      listeners.push(handleClick);
    }
  }

  function drawLineSegment(cvs: any, ctx: any, coords: number[][]) {
    if (coords.length !== 2) return;

    const [[x1, y1], [x2, y2]] = coords;

    const wRatio = (cvs.width - left_margin) / state.width;
    const hRatio = (cvs.height - top_margin) / state.height;

    const cx1 = wRatio * (x1 - state.minx) + left_margin;
    const cy1 = cvs.height - hRatio * (y1 - state.miny) + top_margin;

    const cx2 = wRatio * (x2 - state.minx) + left_margin;
    const cy2 = cvs.height - hRatio * (y2 - state.miny) + top_margin;

    ctx.beginPath();
    ctx.strokeStyle = '#ff00ea';
    ctx.lineWidth = 4;
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.stroke();

    // ✅ 获取当前日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    // ✅ 在第二个端点右下角绘制文字
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ff00ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(dateStr, cx2, cy2 + 8); // 右下角偏移一点，避免遮挡线端
  }

  useEffect(() => {
    switch (norm_axis) {
      case 'x':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_y - min_y,
            height: max_z - min_z,
            minx: min_y,
            miny: min_z,
          };
        });
        break;
      case 'y':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_x - min_x,
            height: max_z - min_z,
            minx: min_x,
            miny: min_z,
          };
        });
        break;
      case 'z':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_x - min_x,
            height: max_y - min_y,
            minx: min_x,
            miny: min_y,
          };
        });
        break;
    }
  }, [norm_axis, max_x, min_x, max_y, min_y, max_z, min_z, lineCoordinate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const listeners: any[] = [];
    if (canvas) {
      const canvasWidth = canvas.clientWidth;
      canvas.width = canvasWidth;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const realRatio = state.height / state.width;
        const ratio = canvas.width / img.width;
        const imgRatio = img.height / img.width;
        const hRatio = (ratio * imgRatio) / realRatio;
        canvas.height = img.height * hRatio;
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        ctx?.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          0,
          0,
          img.width * ratio,
          img.height * hRatio,
        );
        drawMsEvents(canvas, ctx, listeners);
        // 绘制采线
        if (props.norm_axis === 'z' && lineCoordinate?.length === 2) {
          drawLineSegment(canvas, ctx, lineCoordinate);
        }
      };
      img.src = `data:image/png;base64,${img_base64}`;
    }
    return () => {
      listeners.forEach((listener) => {
        canvas?.removeEventListener('click', listener);
      });
    };
  }, [state, img_base64, props, isHighlightEnabled, highlightThreshold]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
        }}
      />
      {isHighlightEnabled && (
        <div
          style={{
            position: 'absolute',
            right: '0%',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '5px',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 0, 0, 0.8)',
              marginRight: 5,
            }}
          ></div>
          <span style={{ fontSize: 12 }}>
            高能事件(&gt;{highlightThreshold}J)
          </span>
        </div>
      )}
    </div>
  );
};

export default Planar;
