// 이 프로젝트는 오프라인 캐시를 사용하지 않습니다.
// 과거 버전이나 브라우저 확장 등에 의해 Cache Storage가 만들어졌다면 제거합니다.
if ("caches" in window) {
  caches.keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .catch(() => {});
}

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

const selectedGenres = new Set();
let profileImage = null;
let currentStamp = "";

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
    profileImage = await loadImage(dataUrl);

    photoPreview.innerHTML = "";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "선택된 프로필 사진";
    photoPreview.appendChild(img);
  } catch {
    alert("사진을 불러오지 못했습니다.");
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
  const fileName = `만화마을_주민등록증_${safeName}.png`;

  try {
    // Android / Samsung Internet 호환성을 위해 Blob URL 대신 data URL 사용
    const dataUrl = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.rel = "noopener";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    // 일부 모바일 브라우저는 클릭 직후 요소를 제거하면 저장 처리가 취소될 수 있음
    window.setTimeout(() => {
      a.remove();
    }, 1500);
  } catch (error) {
    console.error("이미지 저장 실패:", error);
    openImageFallback();
  }
});

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
  ctx.fillText("MANA", -150, 0);
  ctx.fillText("VILLAGE", -195, 90);
  ctx.restore();
}

function drawHeader() {
  ctx.fillStyle = "#171717";
  ctx.font = "900 46px sans-serif";
  ctx.fillText("만화마을 주민등록증", 66, 90);

  ctx.font = "800 17px sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("MANA VILLAGE RESIDENT CARD", 68, 122);
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
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  drawStampText(ctx, text);

  ctx.restore();
}

function drawStampText(context, text) {
  const maxWidth = 104;
  const words = text.trim().split(/\s+/).filter(Boolean);

  // 먼저 한 줄로 들어가는지 확인하고, 들어가면 글자 크기만 조절합니다.
  let singleLineSize = 19;
  while (singleLineSize >= 13) {
    context.font = `900 ${singleLineSize}px sans-serif`;
    if (context.measureText(text).width <= maxWidth) {
      context.fillText(text, 0, 1);
      return;
    }
    singleLineSize -= 1;
  }

  // 두 줄이 필요한 경우, 단어 중간이 아니라 공백 기준으로 가장 균형 좋은 지점을 찾습니다.
  let bestLines = null;
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i += 1) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");

    context.font = "900 17px sans-serif";
    const width1 = context.measureText(line1).width;
    const width2 = context.measureText(line2).width;
    const overflow = Math.max(0, width1 - maxWidth) + Math.max(0, width2 - maxWidth);
    const balance = Math.abs(width1 - width2);
    const score = overflow * 10 + balance;

    if (score < bestScore) {
      bestScore = score;
      bestLines = [line1, line2];
    }
  }

  // 공백이 없는 매우 긴 문구에 대한 예외 처리
  if (!bestLines) {
    const chars = [...text];
    const half = Math.ceil(chars.length / 2);
    bestLines = [
      chars.slice(0, half).join(""),
      chars.slice(half).join("")
    ];
  }

  // 두 줄 모두 원 안에 들어갈 때까지 글자 크기를 함께 줄입니다.
  let fontSize = 17;
  while (fontSize >= 12) {
    context.font = `900 ${fontSize}px sans-serif`;

    if (bestLines.every((line) => context.measureText(line).width <= maxWidth)) {
      break;
    }

    fontSize -= 1;
  }

  const lineHeight = fontSize + 5;
  context.font = `900 ${fontSize}px sans-serif`;
  context.fillText(bestLines[0], 0, -lineHeight / 2);
  context.fillText(bestLines[1], 0, lineHeight / 2);
}

function drawFooter() {
  ctx.fillStyle = "#171717";
  ctx.font = "900 13px sans-serif";
  ctx.fillText("만화마을 주민센터", 70, 648);

  ctx.textAlign = "right";
  ctx.fillText("MANA VILLAGE · 2026", 1008, 648);
  ctx.textAlign = "start";
}

function openImageFallback() {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const popup = window.open("", "_blank");

    if (!popup) {
      alert(
        "이미지 저장이 차단되었습니다. 브라우저의 팝업/다운로드 허용 설정을 확인한 뒤 다시 시도해 주세요."
      );
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>만화마을 주민등록증</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: #111;
              color: white;
              font-family: sans-serif;
              text-align: center;
            }
            p {
              line-height: 1.6;
              font-size: 14px;
            }
            img {
              display: block;
              width: 100%;
              max-width: 720px;
              height: auto;
              margin: 18px auto 0;
              border-radius: 12px;
            }
          </style>
        </head>
        <body>
          <p>이미지를 길게 눌러 <strong>이미지 저장</strong>을 선택해 주세요.</p>
          <img src="${dataUrl}" alt="만화마을 주민등록증" />
        </body>
      </html>
    `);
    popup.document.close();
  } catch (error) {
    console.error("이미지 열기 실패:", error);
    alert("이미지를 열지 못했습니다. 브라우저를 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.");
  }
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
    output[maxLines - 1] = ellipsis(output[maxLines - 1], output[maxLines - 1].length - 1);
  }

  const oldAlign = context.textAlign;
  if (centered) context.textAlign = "center";

  output.forEach((item, index) => {
    context.fillText(item, x + (centered ? maxWidth / 2 : 0), y + index * lineHeight);
  });

  context.textAlign = oldAlign;
}

function ellipsis(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, Math.max(1, maxLength - 1))}…` : text;
}

function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
