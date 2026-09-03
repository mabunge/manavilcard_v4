const form = document.getElementById("residentForm");
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const genreList = document.getElementById("genreList");
const genreCount = document.getElementById("genreCount");
const intro = document.getElementById("intro");
const introCount = document.getElementById("introCount");

const resultSection = document.getElementById("resultSection");
const canvas = document.getElementById("cardCanvas");
const ctx = canvas.getContext("2d");
const downloadBtn = document.getElementById("downloadBtn");
const rerollStampBtn = document.getElementById("rerollStampBtn");

// Cropper
const cropModal = document.getElementById("cropModal");
const cropCanvas = document.getElementById("cropCanvas");
const cropCtx = cropCanvas.getContext("2d");
const cropZoom = document.getElementById("cropZoom");
const cropApplyBtn = document.getElementById("cropApplyBtn");
const cropCancelBtn = document.getElementById("cropCancelBtn");
const cropCloseBtn = document.getElementById("cropCloseBtn");

const selectedGenres = new Set();

let profileImage = null;
let currentStamp = "";

// Original image currently being edited in the cropper
let cropSourceImage = null;
let cropBaseScale = 1;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropPointerId = null;
let cropLastX = 0;
let cropLastY = 0;

const stamps = [
  "정상 주민",
  "신입 주민",
  "고인물 주의",
  "최애 과몰입",
  "굿즈 소비 위험군",
  "새벽 정주행 주민",
  "픽업 폭사 주의",
  "취향 전파 가능",
];

const $ = (id) => document.getElementById(id);

genreList.addEventListener("click", (event) => {
  const button = event.target.closest(".chip");
  if (!button) return;

  const value = button.dataset.value;

  if (selectedGenres.has(value)) {
    selectedGenres.delete(value);
    button.classList.remove("is-selected");
  } else {
    if (selectedGenres.size >= 5) {
      alert("주력 장르는 최대 5개까지 선택할 수 있어요.");
      return;
    }

    selectedGenres.add(value);
    button.classList.add("is-selected");
  }

  genreCount.textContent = selectedGenres.size;
});

intro.addEventListener("input", () => {
  introCount.textContent = intro.value.length;
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 선택할 수 있어요.");
    photoInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("사진은 10MB 이하로 선택해 주세요.");
    photoInput.value = "";
    return;
  }

  try {
    const dataUrl = await fileToDataURL(file);
    cropSourceImage = await loadImage(dataUrl);
    openCropper(cropSourceImage);
  } catch {
    alert("사진을 불러오지 못했습니다.");
  }
});

cropZoom.addEventListener("input", () => {
  if (!cropSourceImage) return;

  const oldScale = cropScale;
  cropScale = cropBaseScale * Number(cropZoom.value);

  // Keep the visible center stable while zooming.
  const cx = cropCanvas.width / 2;
  const cy = cropCanvas.height / 2;
  const ratio = cropScale / oldScale;

  cropOffsetX = cx - (cx - cropOffsetX) * ratio;
  cropOffsetY = cy - (cy - cropOffsetY) * ratio;

  clampCropOffset();
  renderCropper();
});

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropSourceImage) return;

  cropDragging = true;
  cropPointerId = event.pointerId;
  cropLastX = event.clientX;
  cropLastY = event.clientY;
  cropCanvas.classList.add("is-dragging");
  cropCanvas.setPointerCapture(event.pointerId);
});

cropCanvas.addEventListener("pointermove", (event) => {
  if (!cropDragging || event.pointerId !== cropPointerId) return;

  const rect = cropCanvas.getBoundingClientRect();
  const canvasPerCssX = cropCanvas.width / rect.width;
  const canvasPerCssY = cropCanvas.height / rect.height;

  cropOffsetX += (event.clientX - cropLastX) * canvasPerCssX;
  cropOffsetY += (event.clientY - cropLastY) * canvasPerCssY;

  cropLastX = event.clientX;
  cropLastY = event.clientY;

  clampCropOffset();
  renderCropper();
});

cropCanvas.addEventListener("pointerup", stopCropDrag);
cropCanvas.addEventListener("pointercancel", stopCropDrag);

cropApplyBtn.addEventListener("click", async () => {
  if (!cropSourceImage) return;

  // Save only the final 3:4 crop as the profile image.
  const output = document.createElement("canvas");
  output.width = 600;
  output.height = 800;
  const outputCtx = output.getContext("2d");

  outputCtx.fillStyle = "#e6e0d5";
  outputCtx.fillRect(0, 0, output.width, output.height);
  drawCropImage(outputCtx);

  const croppedDataUrl = output.toDataURL("image/jpeg", 0.92);
  profileImage = await loadImage(croppedDataUrl);

  photoPreview.innerHTML = "";
  const img = document.createElement("img");
  img.src = croppedDataUrl;
  img.alt = "자른 프로필 사진";
  photoPreview.appendChild(img);
  photoPreview.classList.add("has-image");

  closeCropper();
});

cropCancelBtn.addEventListener("click", cancelCropper);
cropCloseBtn.addEventListener("click", cancelCropper);

cropModal.addEventListener("click", (event) => {
  if (event.target === cropModal) cancelCropper();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cropModal.hidden) {
    cancelCropper();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("name").value.trim();

  if (!name) {
    alert("이름을 입력해 주세요.");
    $("name").focus();
    return;
  }

  if (selectedGenres.size === 0) {
    alert("주력 장르를 하나 이상 선택해 주세요.");
    genreList.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  currentStamp = randomStamp();
  drawCard();
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

rerollStampBtn.addEventListener("click", () => {
  currentStamp = randomStamp(currentStamp);
  drawCard();
});

downloadBtn.addEventListener("click", () => {
  const name = $("name").value.trim() || "resident";
  const safeName = name.replace(/[\\/:*?"<>|]/g, "_");

  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `만화마을_주민등록증_${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
});

function openCropper(image) {
  const canvasW = cropCanvas.width;
  const canvasH = cropCanvas.height;

  // Minimum scale always covers the whole 3:4 crop frame.
  cropBaseScale = Math.max(canvasW / image.width, canvasH / image.height);
  cropScale = cropBaseScale;
  cropZoom.value = "1";

  const drawW = image.width * cropScale;
  const drawH = image.height * cropScale;

  cropOffsetX = (canvasW - drawW) / 2;
  cropOffsetY = (canvasH - drawH) / 2;

  clampCropOffset();
  renderCropper();

  cropModal.hidden = false;
  document.body.classList.add("is-modal-open");
}

function closeCropper() {
  cropModal.hidden = true;
  document.body.classList.remove("is-modal-open");
  cropSourceImage = null;
  cropDragging = false;
  cropPointerId = null;
  cropCanvas.classList.remove("is-dragging");
  photoInput.value = "";
}

function cancelCropper() {
  closeCropper();
}

function stopCropDrag(event) {
  if (event.pointerId !== cropPointerId) return;

  cropDragging = false;
  cropPointerId = null;
  cropCanvas.classList.remove("is-dragging");

  try {
    cropCanvas.releasePointerCapture(event.pointerId);
  } catch (_) {
    // Some mobile browsers release pointer capture automatically.
  }
}

function clampCropOffset() {
  if (!cropSourceImage) return;

  const drawW = cropSourceImage.width * cropScale;
  const drawH = cropSourceImage.height * cropScale;

  // The image must cover the entire crop canvas.
  const minX = cropCanvas.width - drawW;
  const minY = cropCanvas.height - drawH;

  cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
  cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
}

function renderCropper() {
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  cropCtx.fillStyle = "#111";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  if (!cropSourceImage) return;

  drawCropImage(cropCtx);

  // Simple composition guides.
  cropCtx.save();
  cropCtx.strokeStyle = "rgba(255,255,255,.44)";
  cropCtx.lineWidth = 2;

  for (const ratio of [1 / 3, 2 / 3]) {
    cropCtx.beginPath();
    cropCtx.moveTo(cropCanvas.width * ratio, 0);
    cropCtx.lineTo(cropCanvas.width * ratio, cropCanvas.height);
    cropCtx.stroke();

    cropCtx.beginPath();
    cropCtx.moveTo(0, cropCanvas.height * ratio);
    cropCtx.lineTo(cropCanvas.width, cropCanvas.height * ratio);
    cropCtx.stroke();
  }

  cropCtx.restore();

  cropCtx.save();
  cropCtx.strokeStyle = "rgba(255,255,255,.9)";
  cropCtx.lineWidth = 8;
  cropCtx.strokeRect(4, 4, cropCanvas.width - 8, cropCanvas.height - 8);
  cropCtx.restore();
}

function drawCropImage(context) {
  if (!cropSourceImage) return;

  const drawW = cropSourceImage.width * cropScale;
  const drawH = cropSourceImage.height * cropScale;

  context.drawImage(
    cropSourceImage,
    cropOffsetX,
    cropOffsetY,
    drawW,
    drawH
  );
}

function drawCard() {
  const data = collectFormData();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawHeader();
  drawPhoto(profileImage);
  drawIdentity(data);
  drawGenres(data.genres);
  drawFavoriteInfo(data);
  drawIntro(data.intro);
  drawContact(data);
  drawResidentCode(data);
  drawStamp(currentStamp);
  drawFooter();
}

function collectFormData() {
  const joinYear = $("joinYear").value.trim() || String(new Date().getFullYear());
  const residentNumber = $("residentNumber").value.trim();

  return {
    name: $("name").value.trim(),
    nickname: $("nickname").value.trim(),
    joinYear,
    residentNumber,
    genres: [...selectedGenres],
    favoriteWork: $("favoriteWork").value.trim(),
    favoriteCharacter: $("favoriteCharacter").value.trim(),
    intro: $("intro").value.trim(),
    contact: $("contact").value.trim(),
    showContact: $("showContact").checked,
  };
}

function drawBackground() {
  ctx.fillStyle = "#f7f3e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 4;
  roundRect(ctx, 26, 26, canvas.width - 52, canvas.height - 52, 28);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.025)";
  for (let y = 52; y < canvas.height - 40; y += 26) {
    ctx.fillRect(50, y, canvas.width - 100, 1);
  }

  ctx.save();
  ctx.translate(820, 210);
  ctx.rotate(-0.2);
  ctx.fillStyle = "rgba(0,0,0,0.035)";
  ctx.font = "900 90px sans-serif";
  ctx.fillText("MANGA", -150, 0);
  ctx.fillText("VILLAGE", -195, 90);
  ctx.restore();
}

function drawHeader() {
  ctx.fillStyle = "#171717";
  ctx.font = "900 46px sans-serif";
  ctx.fillText("만화마을 주민등록증", 66, 90);

  ctx.font = "800 17px sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("MANGA VILLAGE RESIDENT CARD", 68, 122);
  ctx.letterSpacing = "0px";

  ctx.fillRect(68, 145, 944, 3);
}

function drawPhoto(image) {
  const x = 70;
  const y = 182;
  const w = 280;
  const h = 360;

  ctx.save();
  roundRect(ctx, x, y, w, h, 20);
  ctx.clip();

  if (image) {
    // The selected profile image is already cropped to 3:4.
    drawImageCover(ctx, image, x, y, w, h);
  } else {
    ctx.fillStyle = "#e6e0d5";
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "#8e887f";
    ctx.font = "800 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PHOTO", x + w / 2, y + h / 2);
    ctx.textAlign = "start";
  }

  ctx.restore();

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 20);
  ctx.stroke();
}

function drawIdentity(data) {
  const x = 395;

  ctx.fillStyle = "#77736b";
  ctx.font = "800 17px sans-serif";
  ctx.fillText("NAME", x, 200);

  ctx.fillStyle = "#171717";
  ctx.font = "900 54px sans-serif";
  ctx.fillText(ellipsis(data.name, 11), x, 255);

  if (data.nickname) {
    ctx.fillStyle = "#77736b";
    ctx.font = "700 23px sans-serif";
    ctx.fillText(ellipsis(data.nickname, 18), x, 291);
  }
}

function drawGenres(genres) {
  const x = 395;
  let cursorX = x;
  let cursorY = 338;

  ctx.fillStyle = "#77736b";
  ctx.font = "800 17px sans-serif";
  ctx.fillText("MAIN GENRE", x, 320);

  genres.forEach((genre) => {
    ctx.font = "800 19px sans-serif";
    const text = `#${genre}`;
    const width = ctx.measureText(text).width + 28;

    if (cursorX + width > 1000) {
      cursorX = x;
      cursorY += 48;
    }

    ctx.fillStyle = "#171717";
    roundRect(ctx, cursorX, cursorY, width, 36, 18);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillText(text, cursorX + 14, cursorY + 24);

    cursorX += width + 10;
  });
}

function drawFavoriteInfo(data) {
  const x = 395;
  const y = 455;

  ctx.fillStyle = "#77736b";
  ctx.font = "800 16px sans-serif";
  ctx.fillText("FAVORITE", x, y);

  ctx.fillStyle = "#171717";
  ctx.font = "800 22px sans-serif";

  const work = data.favoriteWork || "-";
  const character = data.favoriteCharacter || "-";

  ctx.fillText(`작품  ${ellipsis(work, 21)}`, x, y + 34);
  ctx.fillText(`최애  ${ellipsis(character, 21)}`, x, y + 70);
}

function drawIntro(text) {
  const value = text || "만화마을의 새로운 주민입니다.";
  ctx.fillStyle = "#171717";
  ctx.font = "800 23px sans-serif";
  drawWrappedText(ctx, `“${value}”`, 70, 595, 660, 31, 2);
}

function drawContact(data) {
  ctx.fillStyle = "#77736b";
  ctx.font = "800 14px sans-serif";
  ctx.fillText("CONTACT", 745, 568);

  ctx.fillStyle = "#171717";
  ctx.font = "800 18px sans-serif";

  const contact =
    data.showContact && data.contact ? ellipsis(data.contact, 23) : "PRIVATE";

  ctx.fillText(contact, 745, 594);
}

function drawResidentCode(data) {
  const number = data.residentNumber
    ? String(data.residentNumber).padStart(3, "0")
    : String(simpleHash(data.name) % 999 + 1).padStart(3, "0");

  const yy = String(data.joinYear).slice(-2);
  const code = `MM-${yy}-${number}`;

  ctx.fillStyle = "#77736b";
  ctx.font = "800 14px sans-serif";
  ctx.fillText("RESIDENT CODE", 745, 620);

  ctx.fillStyle = "#171717";
  ctx.font = "900 22px monospace";
  ctx.fillText(code, 745, 648);
}

function drawStamp(text) {
  const x = 920;
  const y = 463;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#171717";
  ctx.font = "900 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawWrappedText(ctx, text, -48, -12, 96, 22, 2, true);

  ctx.restore();
}

function drawFooter() {
  ctx.fillStyle = "#171717";
  ctx.font = "900 13px sans-serif";
  ctx.fillText("만화마을 주민센터", 70, 648);

  ctx.textAlign = "right";
  ctx.fillText("MANGA VILLAGE · 2026", 1008, 648);
  ctx.textAlign = "start";
}

function randomStamp(exclude = "") {
  const pool = stamps.filter((stamp) => stamp !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageCover(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;

  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawWrappedText(
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 2,
  centered = false
) {
  const chars = [...text];
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const test = line + char;

    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);

  const output = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    output[maxLines - 1] = ellipsis(
      output[maxLines - 1],
      Math.max(2, output[maxLines - 1].length - 1)
    );
  }

  const oldAlign = context.textAlign;

  if (centered) {
    context.textAlign = "center";
  }

  output.forEach((item, index) => {
    context.fillText(
      item,
      x + (centered ? maxWidth / 2 : 0),
      y + index * lineHeight
    );
  });

  context.textAlign = oldAlign;
}

function ellipsis(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength
    ? `${text.slice(0, Math.max(1, maxLength - 1))}…`
    : text;
}

function simpleHash(text) {
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}
