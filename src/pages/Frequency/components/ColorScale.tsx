import { createRef, useEffect } from 'react';

const scales = [
  {
    red: 255,
    green: 50,
    blue: 50,
    value: 20,
    ratio: 0,
  },
  {
    red: 255,
    green: 192,
    blue: 0,
    value: 10,
    ratio: 0.5,
  },
  {
    red: 10,
    green: 120,
    blue: 255,
    value: 1,
    ratio: 0.49,
  },
];

function setColor(
  ed: { cvs: { width: number } },
  imgData: { data: number[] },
  row: number,
  color: { red: any; green: any; blue: any },
) {
  let kk = row * ed.cvs.width * 4;
  for (let j = 0; j < ed.cvs.width; j++) {
    imgData.data[kk] = color.red;
    imgData.data[kk + 1] = color.green;
    imgData.data[kk + 2] = color.blue;
    imgData.data[kk + 3] = 255;
    kk += 4;
  }
}

function interpolateColor(
  ed: { scales: any[]; cvs: { height: number } },
  imgData: any,
  scaleNo: number,
) {
  const s1 = scales[scaleNo - 1],
    s2 = scales[scaleNo];

  const r1 = s1 ? s1?.row : 0,
    r2 = s2?.row;

  const ht = s2.ratio * ed.cvs.height;
  for (let i = r1; i < r2; i++) {
    const cr = (i - r1) / ht;
    const color = {
      red: scaleNo == 0 ? s2.red : s1.red + (s2.red - s1.red) * cr,
      green: scaleNo == 0 ? s2.green : s1.green + (s2.green - s1.green) * cr,
      blue: scaleNo == 0 ? s2.blue : s1.blue + (s2.blue - s1.blue) * cr,
    };
    setColor(ed, imgData, i, color);
  }
}

export function getColor(val: number) {
  const num = scales.length;
  if (val <= scales[num - 1].value) {
    return {
      red: scales[num - 1].red,
      green: scales[num - 1].green,
      blue: scales[num - 1].blue,
    };
  }
  if (val >= scales[0].value) {
    return {
      red: scales[0].red,
      green: scales[0].green,
      blue: scales[0].blue,
    };
  }
  for (let i = num - 1; i > 0; i--) {
    if (val > scales[i].value && val <= scales[i - 1].value) {
      const s1 = scales[i],
        s2 = scales[i - 1];
      return {
        red: Math.round(
          s1.red +
            ((s2.red - s1.red) * (val - s1.value)) /
              Math.abs(s1.value - s2.value),
        ),
        green: Math.round(
          s1.green +
            ((s2.green - s1.green) * (val - s1.value)) /
              Math.abs(s1.value - s2.value),
        ),
        blue: Math.round(
          s1.blue +
            ((s2.blue - s1.blue) * (val - s1.value)) /
              Math.abs(s1.value - s2.value),
        ),
      };
    }
  }
}

function render(ed) {
  const img = ed.ctx.createImageData(ed.cvs.width, ed.cvs.height);
  if (ed.scales) {
    ed.inputs = [];
    for (let i = 0, l = 0; i < ed.scales.length; l = ed.scales[i].row, i++) {
      const s = ed.scales[i];
      const row = Math.round(l + s.ratio * ed.cvs.height);
      s.row = row;
      interpolateColor(ed, img, i);

      const input = document.createElement('input');
      ed.cvs.parentElement.append(input);
      const inputStyle = {
        position: 'absolute',
        border: 'none',
        borderBottom: 'solid 1px black',
        backgroundColor: 'inherit',
        zIndex: 120,
        textAlign: 'right',
        MozAppearance: 'textfield',
      };
      input.id = new Date().getTime() * Math.random();
      input.style.left = ed.cvs.offsetLeft + 30 + 5 + 'px';
      input.style.top = ed.cvs.offsetTop + row - input.clientHeight + 'px';
      input.style.color = ed.fontColor;
      input.size = 6;
      input.style.width = 6 + 'ch';
      input.value = ed.scales[i].value;
      Object.assign(input.style, inputStyle);
      ed.inputs.push(input);
    }
    const last = ed.scales[ed.scales.length - 1];
    const color = { red: last.red, green: last.green, blue: last.blue };
    for (let l = last.row; l < ed.cvs.height; l++) {
      setColor(ed, img, l, color);
    }
  }
  ed.ctx.putImageData(img, 0, 0);
}

const ColorScale = () => {
  const canvasRef = createRef<HTMLCanvasElement>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas?.getContext('2d');
      const ed = {
        ctx: ctx,
        cvs: canvas,
        scales: scales,
      };
      render(ed);
    }
  }, []);

  return (
    <div
      style={{
        backgroundColor: 'inherit',
        width: '140px',
        height: '100%',
        zIndex: '100',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px',
        paddingTop: '20px',
      }}
    >
      <span id="title" style={{ margin: '15px' }}>
        微震次数
      </span>
      <canvas
        ref={canvasRef}
        style={{
          width: '30px',
          height: '150px',
        }}
      ></canvas>
    </div>
  );
};

export default ColorScale;
