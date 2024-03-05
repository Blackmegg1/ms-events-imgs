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
    byMag,
  } = props;

  const canvasRef = createRef<HTMLCanvasElement>();
  const [state, setState] = useState({
    width: 0,
    height: 0,
  });

  function getXY(msevt: { loc_y: any; loc_z: any; loc_x: any }) {
    let x, y, minx, miny;
    if (norm_axis === 'x') {
      (x = msevt.loc_y), (y = msevt.loc_z);
      minx = min_y;
      miny = min_z;
    } else if (norm_axis === 'y') {
      (x = msevt.loc_x), (y = msevt.loc_z);
      minx = min_x;
      miny = min_z;
    } else {
      (x = msevt.loc_x), (y = msevt.loc_y);
      minx = min_x;
      miny = min_y;
    }
    return { x, y, minx, miny };
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
    const wRatio = (cvs.width - left_margin) / state.width;
    const hRatio = (cvs.height - top_margin) / state.height;
    // const engyRatio = maxRadius / maxEnergy;
    for (let i = 0; i < eventList.length; i++) {
      const evt = eventList[i];
      const xy = getXY(evt);
      const x = wRatio * (xy.x - xy.minx) + left_margin;
      const y = cvs.height - hRatio * (xy.y - xy.miny) + top_margin;
      let fc = evt.color;
      const r = getRadius(+evt.magnitude);

      ctx.fillStyle = `rgba(${fc.red},${fc.green},${fc.blue}, 0.6)`;
      ctx.strokeStyle = `rgba(255,255,255,0)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();

      // 为点添加事件监听器
      cvs.addEventListener('click', (event) => {
        const rect = cvs.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // 判断点击位置是否在点的范围内
        if (
          Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2) <
          Math.pow(r, 2)
        ) {
          message.info(
            `事件坐标:(${evt.loc_x},${evt.loc_y},${evt.loc_z}) 震级:${evt.magnitude}M 能量:${evt.energy}KJ`,
          );
        }
      });
    }
  }

  useEffect(() => {
    switch (norm_axis) {
      case 'x':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_y - min_y,
            height: max_z - min_z,
          };
        });
        break;
      case 'y':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_x - min_x,
            height: max_z - min_z,
          };
        });
        break;
      case 'z':
        setState((prevState) => {
          return {
            ...prevState,
            width: max_x - min_x,
            height: max_y - min_y,
          };
        });
        break;
    }
  }, [norm_axis, max_x, min_x, max_y, min_y, max_z, min_z]);

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
      };
      img.src = `data:image/png;base64,${img_base64}`;
    }
  }, [state, img_base64, props]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: '90%',
        }}
      />
    </>
  );
};

export default Planar;
