/* =========================================
   CẤU HÌNH & DATA
   ========================================= */

// Tự động lấy 50 ảnh từ thư mục assets/IMG/
const IMAGES = [];
const TOTAL_IMAGES = 78;
for (let i = 1; i <= TOTAL_IMAGES; i++) {
  IMAGES.push(`assets/IMG/${i}.jpg`);
}

// CẤU HÌNH TIM "SIÊU ĐẶC"
const PARTICLE_COUNT = 15000; // Số lượng hạt lớn để tim đặc khít
const HEART_SIZE = 250; // Kích thước tim
// Màu Đỏ Ruby Thẫm
const HEART_COLOR = { r: 180, g: 0, b: 50 };

/* =========================================
   SETUP CANVAS
   ========================================= */

const canvas = document.getElementById("heartCanvas");
const ctx = canvas.getContext("2d");
const uiLayer = document.getElementById("ui-layer");
const galleryOverlay = document.getElementById("gallery-overlay");
const photoGrid = document.getElementById("photo-grid");
const closeBtn = document.getElementById("close-gallery");

let width, height;
let particles = [];
let fireworks = [];
let mouse = { x: 0, y: 0 };
let isGalleryOpen = false;

// Camera
let rotationAngle = 0;
let perspective = 1000;
let heartState = "assemble";

const random = (min, max) => Math.random() * (max - min) + min;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  mouse.x = width / 2;
  mouse.y = height / 2;
}
window.addEventListener("resize", resize);
resize();

/* =========================================
   HỆ THỐNG PHÁO HOA
   ========================================= */
class Firework {
  constructor() {
    this.x = random(width * 0.1, width * 0.9);
    this.y = random(height * 0.1, height * 0.7);
    this.particles = [];
    this.isDead = false;
    const colors = ["#ff4081", "#ffeb3b", "#00e5ff"];
    const color = colors[Math.floor(random(0, colors.length))];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(random(0, Math.PI * 2)) * random(1, 4),
        vy: Math.sin(random(0, Math.PI * 2)) * random(1, 4),
        life: 1,
        decay: random(0.02, 0.05),
        color: color,
      });
    }
  }
  update() {
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length === 0) this.isDead = true;
  }
  draw(ctx) {
    this.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

/* =========================================
   HẠT TRÁI TIM
   ========================================= */

class HeartParticle {
  constructor(targetPoint) {
    this.target = targetPoint;
    this.x = random(-width, width);
    this.y = random(-height, height);
    this.z = random(-1000, 1000);
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.size = random(1.2, 2.4);
    this.speed = random(0.05, 0.1);
    this.colorVar = random(-30, 30);
  }

  update(time, beatScale) {
    if (heartState === "exploded") {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.vz *= 0.95;
    } else {
      let tx = this.target.x * beatScale;
      let ty = this.target.y * beatScale;
      let tz = this.target.z * beatScale;
      this.x += (tx - this.x) * this.speed;
      this.y += (ty - this.y) * this.speed;
      this.z += (tz - this.z) * this.speed;
    }
  }

  draw(ctx, cx, cy, rotX, rotY) {
    // Xoay 3D
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.x * Math.sin(rotY) + this.z * Math.cos(rotY);
    // rotX (nghiêng lên xuống) sẽ được cố định để tim đứng thẳng
    let y1 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = this.y * Math.sin(rotX) + z1 * Math.cos(rotX);

    if (z2 > -perspective + 10) {
      let scale = perspective / (perspective + z2);
      let x2d = x1 * scale + cx;
      let y2d = y1 * scale + cy;

      let depth = (z2 + 500) / 1000;
      let alpha = Math.min(1, Math.max(0.2, depth));
      let r = HEART_COLOR.r + this.colorVar;
      let g = HEART_COLOR.g;
      let b = HEART_COLOR.b;
      if (depth > 0.7) {
        r += 40;
        g += 10;
        b += 10;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x2d, y2d, this.size * scale, 0, Math.PI * 2);
      // const radius = Math.max(0.9, this.size * scale * 1.35);
      // ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// THUẬT TOÁN TẠO KHỐI ĐẶC
function initParticles() {
  particles = [];
  while (particles.length < PARTICLE_COUNT) {
    let x = random(-1.5, 1.5);
    let y = random(-1.5, 1.5);
    let z = random(-1.5, 1.5);
    // Phương trình kiểm tra điểm nằm trong khối tim
    let a = x * x + (9 / 4) * y * y + z * z - 1;
    let check = a * a * a - x * x * z * z * z - (9 / 80) * y * y * z * z * z;

    if (check <= 0) {
      // ✅ ĐỔI TRỤC để tim ĐỨNG (swap Y <-> Z)
      let p = {
        x: x * HEART_SIZE,
        y: -z * HEART_SIZE, // Z trở thành trục đứng
        z: y * HEART_SIZE, // Y trở thành chiều sâu
      };

      particles.push(new HeartParticle(p));
    }
  }
}

/* =========================================
   LOOP & LOGIC
   ========================================= */

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, width, height);
  time += 0.015;

  // Pháo hoa
  if (Math.random() < 0.03 && heartState !== "exploded")
    fireworks.push(new Firework());
  fireworks.forEach((fw) => fw.update());
  fireworks.forEach((fw) => fw.draw(ctx));
  fireworks = fireworks.filter((fw) => !fw.isDead);

  // Tim đập
  let beat = Math.pow(Math.sin(time * 3.5), 3);
  let beatScale = 1 + beat * 0.05;
  if (heartState === "exploded") beatScale = 1;

  // --- ĐIỀU CHỈNH GÓC XOAY ĐỂ TIM ĐỨNG THẲNG ---
  rotationAngle += 0.02; // Tự động xoay tròn quanh trục thẳng đứng

  // Góc xoay quanh trục Y (Trái/Phải) - Cho phép tương tác nhẹ theo chuột
  let targetRotY = rotationAngle + ((mouse.x - width / 2) / width) * 0.5;

  // Góc xoay quanh trục X (Lên/Xuống) - KHÓA CỨNG để tim đứng thẳng
  // Đặt một góc nhỏ cố định (ví dụ 0.15) để nhìn từ hơi phía trên xuống cho đẹp
  let targetRotX = 0;

  particles.forEach((p) => {
    p.update(time, beatScale);
    p.draw(ctx, width / 2, height / 2, targetRotX, targetRotY);
  });

  // Cursor
  if (
    heartState === "exploded" ||
    Math.sqrt(
      Math.pow(mouse.x - width / 2, 2) + Math.pow(mouse.y - height / 2, 2)
    ) < 250
  ) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "default";
  }
}

// EVENTS CLICK TOGGLE
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function toggleGallery() {
  if (isGalleryOpen) {
    // ĐÓNG
    galleryOverlay.classList.remove("visible");
    setTimeout(() => {
      galleryOverlay.classList.add("hidden");
      isGalleryOpen = false;
      uiLayer.style.opacity = 1;
      heartState = "assemble";
      particles.forEach((p) => {
        p.x += random(-500, 500);
        p.y += random(-500, 500);
        p.z += random(-500, 500);
      });
    }, 500);
  } else {
    // MỞ
    heartState = "exploded";
    uiLayer.style.opacity = 0;
    particles.forEach((p) => {
      let len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
      let force = random(15, 45);
      p.vx = (p.x / len) * force;
      p.vy = (p.y / len) * force;
      p.vz = (p.z / len) * force;
    });
    setTimeout(() => {
      isGalleryOpen = true;
      galleryOverlay.classList.remove("hidden");
      photoGrid.innerHTML = "";
      IMAGES.forEach((src, idx) => {
        let div = document.createElement("div");
        div.className = "photo-card";
        div.style.setProperty("--r", random(-5, 5) + "deg");
        div.style.animationDelay = idx * 0.15 + "s";
        let img = document.createElement("img");
        img.src = src;
        img.onerror = function () {
          this.src = "https://via.placeholder.com/200?text=Error";
        };
        div.appendChild(img);
        photoGrid.appendChild(div);
      });
      setTimeout(() => galleryOverlay.classList.add("visible"), 50);
    }, 800);
  }
}

window.addEventListener("click", (e) => {
  // ✅ Khi gallery đang mở: KHÔNG toggleGallery nữa (để click ảnh không làm tim thu nhỏ)
  if (isGalleryOpen) return;

  // Khi gallery chưa mở: click vào vùng tim mới mở
  let dx = e.clientX - width / 2;
  let dy = e.clientY - height / 2;
  if (Math.sqrt(dx * dx + dy * dy) < 250) toggleGallery();
});

// Click vào nền tối (overlay) thì đóng, click vào nội dung thì không
galleryOverlay.addEventListener("click", (e) => {
  if (e.target === galleryOverlay) toggleGallery();
});

// Chặn click bên trong khung gallery không bị coi là click nền
document.querySelector(".gallery-content").addEventListener("click", (e) => {
  e.stopPropagation();
});

closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleGallery();
});

initParticles();
animate();
