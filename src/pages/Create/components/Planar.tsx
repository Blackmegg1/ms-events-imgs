import { message } from 'antd';
import { useRef, useEffect, useState } from 'react';

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
  highlightStyle?: 'red' | 'arrow';
  onPointClick?: (coords: [number, number]) => void;
  selectedPoints?: number[][];
  isPicking?: boolean;
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
    highlightStyle = 'red',
    onPointClick,
    selectedPoints = [],
    isPicking = false,
  } = props;

  /* FIX: Use useRef instead of createRef */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* FIX: Store click targets in a ref to access them in a single event handler */
  const clickTargetsRef = useRef<{ x: number; y: number; r: number; evt: any }[]>([]);

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

  function drawMsEvents(cvs: any, ctx: any) {
    clickTargetsRef.current = [];

    const wRatio = (cvs.width - left_margin) / state.width;
    const hRatio = (cvs.height - top_margin) / state.height;

    const highEnergyEventsToLabel: { x: number; y: number; energyJ: number }[] =
      [];
    const occupiedRects: { x: number; y: number; w: number; h: number }[] = [];

    // Helper to check collision
    const isColliding = (
      rect: { x: number; y: number; w: number; h: number },
      rects: { x: number; y: number; w: number; h: number }[],
    ) => {
      // Boundary check
      if (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.x + rect.w > cvs.width ||
        rect.y + rect.h > cvs.height
      ) {
        return true;
      }
      // Overlap check
      for (const r of rects) {
        if (
          rect.x < r.x + r.w &&
          rect.x + rect.w > r.x &&
          rect.y < r.y + r.h &&
          rect.y + rect.h > r.y
        ) {
          return true;
        }
      }
      return false;
    };

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

      if (isHighlightEnabled && isHighEnergy && highlightStyle === 'red') {
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

      // Collect high energy events for later processing
      if (isHighlightEnabled && isHighEnergy && highlightStyle === 'arrow') {
        highEnergyEventsToLabel.push({ x, y, energyJ });
      }

      clickTargetsRef.current.push({ x, y, r, evt });
    }

    // Process labels
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    highEnergyEventsToLabel.forEach((evt) => {
      const { x, y, energyJ } = evt;
      const text = `${energyJ.toFixed(0)}J`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 16; // Approx height

      // Candidate angles to try: -45, -30, -60, -90, -135, -150, -120, -180, 0, 45...
      // Prioritize upward directions
      const angles = [
        -Math.PI / 4, // -45 (Default)
        -Math.PI / 6, // -30
        -Math.PI / 3, // -60
        -Math.PI / 2, // -90
        (-3 * Math.PI) / 4, // -135
        0, // 0
        (-5 * Math.PI) / 6, // -150
        Math.PI, // 180
      ];

      const arrowLength = 30;
      let bestConfig = null;

      for (const angle of angles) {
        const endX = x + Math.cos(angle) * arrowLength;
        const endY = y + Math.sin(angle) * arrowLength;

        // Calculate text bouning box. 
        // Text is drawn at endX + 2, endY.
        // textBaseline is bottom, so y range is [endY - textHeight, endY]
        // textAlign is left, so x range is [endX + 2, endX + 2 + textWidth]

        // We add some padding for better spacing
        const padding = 2;
        const labelRect = {
          x: endX,
          y: endY - textHeight,
          w: textWidth + 4, // +2 margin +2 padding
          h: textHeight + 2,
        };

        if (!isColliding(labelRect, occupiedRects)) {
          bestConfig = { endX, endY, angle };
          occupiedRects.push(labelRect);
          break;
        }
      }

      // If no collision-free spot found, fallback to default (-45) but still add to occupied to try to push others away if possible?
      // Or just draw it anyway.
      if (!bestConfig) {
        // Fallback to default
        const angle = -Math.PI / 4;
        const endX = x + Math.cos(angle) * arrowLength;
        const endY = y + Math.sin(angle) * arrowLength;
        bestConfig = { endX, endY, angle };
        // Still mark as occupied
        occupiedRects.push({
          x: endX,
          y: endY - textHeight,
          w: textWidth + 4,
          h: textHeight + 2,
        });
      }

      const { endX, endY, angle } = bestConfig;

      // Draw Arrow
      ctx.beginPath();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw Arrowhead
      const headLen = 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + headLen * Math.cos(angle - Math.PI / 6),
        y + headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + headLen * Math.cos(angle + Math.PI / 6),
        y + headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();

      // Draw Text
      ctx.fillStyle = 'red';
      ctx.fillText(text, endX + 2, endY);
    });
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

    // ✅ 在第二个端点右下方绘制文字，增加偏移避免遮挡
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ff00ea';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeText(dateStr, cx2 + 10, cy2 + 10);
    ctx.fillText(dateStr, cx2 + 10, cy2 + 10);
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
        drawMsEvents(canvas, ctx);
        // 绘制采线
        if (props.norm_axis === 'z' && lineCoordinate?.length === 2) {
          drawLineSegment(canvas, ctx, lineCoordinate);
        }

        // 绘制当前正在选择的点 (仅在拾取模式开启时显示)
        if (ctx && isPicking && props.norm_axis === 'z' && selectedPoints && selectedPoints.length > 0) {
          selectedPoints.forEach((pt, index) => {
            if (pt.length === 2) {
              const [x, y] = pt;
              const wRatio = (canvas.width - left_margin) / state.width;
              const hRatio = (canvas.height - top_margin) / state.height;
              const cx = wRatio * (x - state.minx) + left_margin;
              const cy = canvas.height - hRatio * (y - state.miny) + top_margin;

              // 绘制指示器
              ctx.beginPath();
              ctx.shadowBlur = 10;
              ctx.shadowColor = index === 0 ? '#52c41a' : '#1890ff';
              ctx.fillStyle = index === 0 ? '#52c41a' : '#1890ff';
              ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
              ctx.fill();
              ctx.shadowBlur = 0; // 重置阴影
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();

              // 绘制数字
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 14px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText((index + 1).toString(), cx, cy);
            }
          });
        }
      };
      img.src = `data:image/png;base64,${img_base64}`;
    }
  }, [state, img_base64, props, isHighlightEnabled, highlightThreshold, highlightStyle]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const targets = clickTargetsRef.current;
    let eventClicked = false;
    for (const target of targets) {
      const { x, y, r, evt } = target;
      if (
        Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2) <
        Math.pow(r, 2)
      ) {
        message.info(
          `事件坐标:(${evt.loc_x},${evt.loc_y},${evt.loc_z}) 时间:${evt.time} 震级:${evt.magnitude}M 能量:${evt.energy}KJ`,
        );
        eventClicked = true;
        break; // Only handle top-most (or first found) event
      }
    }

    // Convert mouse to real-world coordinates and callback
    if (onPointClick && norm_axis === 'z') {
      const wRatio = (canvas.width - left_margin) / state.width;
      const hRatio = (canvas.height - top_margin) / state.height;

      const realX = (mouseX - left_margin) / wRatio + state.minx;
      const realY = (canvas.height + top_margin - mouseY) / hRatio + state.miny;

      onPointClick([realX, realY]);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        onClick={handleCanvasClick}
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
              backgroundColor: highlightStyle === 'arrow' ? 'transparent' : 'rgba(255, 0, 0, 0.8)',
              border: highlightStyle === 'arrow' ? '2px solid red' : 'none', // Simple representation for arrow style in legend? Or just text.
              marginRight: 5,
              display: highlightStyle === 'arrow' ? 'none' : 'block'
            }}
          ></div>
          <span style={{ fontSize: 12 }}>
            {highlightStyle === 'arrow' ? `高能事件: 箭头标注(>${highlightThreshold}J)` : `高能事件(>${highlightThreshold}J)`}
          </span>
        </div>
      )}
    </div>
  );
};

export default Planar;
