/* global document */
// Shapes and colors copied from legacy/index.html makeIcon(); no legacy runtime import.
export function drawOriginalIcon({ size, variant = 'original' }) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  if (variant === 'maskable') {
    x.fillStyle = '#15397A';
    x.fillRect(0, 0, size, size);
  }
  x.scale(size / 180, size / 180);
  // 70% puts even the ear tips inside the PWA 80% safe circle.
  // Android's adaptive layer is 108dp; its safe circle is only 66dp.
  const scale = variant === 'original' ? 1 : variant === 'maskable' ? 0.7 : 0.5;
  x.translate(90 * (1 - scale), 90 * (1 - scale));
  x.scale(scale, scale);
  const W = '#F6F8FB',
    MK = '#394963',
    TIP = '#26344E',
    PINK = '#EAC6BB',
    IRIS = '#53AAE9',
    PUP = '#101C34',
    NOSE = '#16161C',
    TONGUE = '#E76E38',
    LN = '#2E3C56';
  function tri(a, b, cc) {
    x.beginPath();
    x.moveTo(a[0], a[1]);
    x.lineTo(b[0], b[1]);
    x.lineTo(cc[0], cc[1]);
    x.closePath();
    x.fill();
  }
  function el(cx, cy, rx, ry) {
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, 7);
    x.fill();
  }
  // фон
  if (variant === 'original') {
    x.fillStyle = '#15397A';
    roundRect(x, 0, 0, 180, 180, 42);
    x.fill();
  }
  // уши (белые, тёмный кончик, розовая внутренняя часть)
  x.fillStyle = W;
  tri([38, 76], [92, 50], [50, 8]);
  x.fillStyle = TIP;
  tri([50, 8], [45, 32], [64, 26]);
  x.fillStyle = PINK;
  tri([56, 30], [60, 64], [82, 52]);
  x.fillStyle = W;
  tri([142, 76], [88, 50], [130, 8]);
  x.fillStyle = TIP;
  tri([130, 8], [135, 32], [116, 26]);
  x.fillStyle = PINK;
  tri([124, 30], [120, 64], [98, 52]);
  // морда
  x.fillStyle = W;
  el(90, 100, 57, 53);
  // тёмная маска на отдельном холсте, обрезанная по морде
  const mc = document.createElement('canvas');
  mc.width = mc.height = size;
  const m = mc.getContext('2d');
  m.scale(size / 180, size / 180);
  m.fillStyle = MK;
  roundRect(m, 40, 54, 100, 60, 42);
  m.fill();
  m.globalCompositeOperation = 'destination-out';
  m.beginPath();
  m.moveTo(90, 54);
  m.lineTo(76, 118);
  m.lineTo(104, 118);
  m.closePath();
  m.fill();
  m.beginPath();
  m.ellipse(49, 114, 23, 21, 0, 0, 7);
  m.fill();
  m.beginPath();
  m.ellipse(131, 114, 23, 21, 0, 0, 7);
  m.fill();
  m.globalCompositeOperation = 'source-over';
  x.save();
  x.beginPath();
  x.ellipse(90, 100, 57, 53, 0, 0, 7);
  x.clip();
  x.drawImage(mc, 0, 0, 180, 180);
  x.restore();
  // большие глаза
  [66, 114].forEach((ex) => {
    x.fillStyle = W;
    el(ex, 91, 19, 18);
    x.strokeStyle = LN;
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(ex, 91, 19, 18, 0, 0, 7);
    x.stroke();
    x.fillStyle = IRIS;
    el(ex, 92, 14, 14);
    x.fillStyle = PUP;
    el(ex, 93, 6, 6);
    x.fillStyle = '#fff';
    el(ex - 5, 87, 4.5, 4.5);
    x.fillStyle = 'rgba(255,255,255,.85)';
    el(ex + 4, 96, 2, 2);
  });
  // нос, рот, язык
  x.fillStyle = NOSE;
  tri([80, 120], [100, 120], [90, 133]);
  x.strokeStyle = LN;
  x.lineWidth = 3;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(90, 133);
  x.lineTo(90, 140);
  x.stroke();
  x.beginPath();
  x.moveTo(90, 140);
  x.lineTo(79, 146);
  x.stroke();
  x.beginPath();
  x.moveTo(90, 140);
  x.lineTo(101, 146);
  x.stroke();
  x.fillStyle = TONGUE;
  roundRect(x, 83, 141, 14, 13, 6);
  x.fill();
  x.strokeStyle = '#C64E26';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(90, 142);
  x.lineTo(90, 152);
  x.stroke();

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  return c.toDataURL('image/png');
}
