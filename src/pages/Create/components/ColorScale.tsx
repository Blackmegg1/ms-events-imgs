import { createRef, useEffect } from 'react';

const scales = [
  {
    red: 237,
    green: 25,
    blue: 17,
    value: 3,
    ratio: 0.033333,
  },
  {
    red: 206,
    green: 87,
    blue: 51,
    value: 2,
    ratio: 0.141026,
  },
  {
    red: 180,
    green: 145,
    blue: 91,
    value: 1.8,
    ratio: 0.158974,
  },
  {
    red: 214,
    green: 220,
    blue: 193,
    value: 1.4,
    ratio: 0.128205,
  },
  {
    red: 199,
    green: 227,
    blue: 100,
    value: 1,
    ratio: 0.189744,
  },
  {
    red: 195,
    green: 221,
    blue: 146,
    value: 0.7,
    ratio: 0.130769,
  },
  {
    red: 117,
    green: 146,
    blue: 215,
    value: 0.4,
    ratio: 0.1,
  },
  {
    red: 9,
    green: 37,
    blue: 246,
    value: 0.1,
    ratio: 0.110256,
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
        微震震级(M)
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
