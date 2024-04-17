import { createRef, useEffect, useState } from 'react';
import { getColor } from './ColorScale';

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
  divide: number;
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
    divide,
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

  function drawMsEvents(cvs: any, ctx: any, divide: number) {
    const wRatio = (cvs.width - left_margin) / state.width;
    const hRatio = (cvs.height - top_margin) / state.height;

    const gridWidth = Math.ceil(cvs.width / divide); // 网格宽度(列数)
    const gridHeight = Math.ceil(cvs.height / divide); // 网格高度(行数)
    const gridCount = Array.from({ length: gridHeight }, () =>
      new Array(gridWidth).fill(0),
    ); // 初始化二维数组

    // 遍历事件列表,统计每个网格内事件的数量
    for (let i = 0; i < eventList.length; i++) {
      const evt = eventList[i];
      const xy = getXY(evt);
      const x = Math.floor((wRatio * (xy.x - xy.minx)) / divide);
      const y = Math.floor(
        (cvs.height - hRatio * (xy.y - xy.miny) + top_margin) / divide,
      );
      gridCount[y][x]++;
    }

    // 绘制网格
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const count = gridCount[y][x];
        let color = getColor(count);
        if (count === 0) {
          ctx.fillStyle = `rgba(255,255,255,0)`;
          ctx.fillRect(x * divide, y * divide, divide, divide);
        } else {
          ctx.fillStyle = `rgba(${color?.red},${color?.green},${color?.blue},0.6)`;
          ctx.fillRect(x * divide, y * divide, divide, divide);
        }
      }
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
        if (state.width !== 0 && state.height !== 0) {
          drawMsEvents(canvas, ctx, divide ?? 10);
        }
      };
      img.src = `data:image/png;base64,${img_base64}`;
    }
    return () => {
      listeners.forEach((listener) => {
        canvas?.removeEventListener('click', listener);
      });
    };
  }, [state, img_base64, props, divide]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '90%',
      }}
    />
  );
};

export default Planar;
