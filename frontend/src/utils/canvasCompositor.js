/**
 * 🎨 CANVAS COMPOSITOR 1080x1920 FULL HD (WYSIWYG CAPCUT ENGINE)
 * Module chuyên biệt vẽ toàn bộ các lớp trực tiếp từ trình duyệt:
 * - Khung hình video người nói (Tự động co về nửa dưới/trên khi có B-Roll để giữ trọn vẹn khuôn mặt)
 * - B-Roll hình ảnh/video thực tế kèm hiệu ứng chuyển động Ken Burns Slow Zoom (1.0x -> 1.06x)
 * - Thẻ tiêu đề Hook vàng gradient bo góc (Title Card)
 * - Logo thương hiệu góc trên kèm độ mờ đục (Brand Logo)
 * - Phụ đề Karaoke hoạt họa từ hiện tại (Active word highlight green/yellow)
 * - Nhãn dán chữ (Text Layers)
 */

// Helper vẽ hình chữ nhật bo góc (Rounded Rectangle)
export function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Helper ngắt dòng chữ tự động theo độ rộng khung (Word Wrap)
export function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * 1. Vẽ khung hình Video người nói (Base Speaker Video Frame)
 * 🔥 Tự động tính toán khung chứa (Viewport) khi B-Roll Split bật để giữ trọn vẹn khuôn mặt nhân vật!
 */
export function drawVideoFrame(
  ctx, 
  videoElement, 
  videoLayout = 'fill', 
  activeBrollConfig = null,
  targetWidth = 1080, 
  targetHeight = 1920
) {
  if (!videoElement || videoElement.readyState < 2) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    return;
  }

  const vw = videoElement.videoWidth || 1920;
  const vh = videoElement.videoHeight || 1080;

  // Xác định vị trí khung hiển thị của Video người nói
  let boxX = 0;
  let boxY = 0;
  let boxW = targetWidth;
  let boxH = targetHeight;

  const bStyle = activeBrollConfig?.style;
  if (bStyle === 'split_50_50_top') {
    // B-Roll ở 50% trên -> Video người nói ở 50% dưới (960px)
    boxY = Math.round(targetHeight * 0.5);
    boxH = Math.round(targetHeight * 0.5);
  } else if (bStyle === 'split_50_50_bottom') {
    // B-Roll ở 50% dưới -> Video người nói ở 50% trên
    boxY = 0;
    boxH = Math.round(targetHeight * 0.5);
  } else if (bStyle === 'split_30_70_top') {
    // B-Roll ở 30% trên -> Video người nói ở 70% dưới
    boxY = Math.round(targetHeight * 0.3);
    boxH = Math.round(targetHeight * 0.7);
  } else if (bStyle === 'split_30_70_bottom') {
    // B-Roll ở 30% dưới -> Video người nói ở 70% trên
    boxY = 0;
    boxH = Math.round(targetHeight * 0.7);
  } else if (bStyle === 'full_cover') {
    // B-Roll che toàn bộ màn hình -> Không cần vẽ video nền
    return;
  }

  if (videoLayout === 'fit' && !activeBrollConfig) {
    // Fit chế độ giữ nguyên tỷ lệ
    const scale = Math.min(targetWidth / vw, targetHeight / vh);
    const sw = vw * scale;
    const sh = vh * scale;
    const sx = (targetWidth - sw) / 2;
    const sy = (targetHeight - sh) / 2;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(videoElement, 0, 0, vw, vh, sx, sy, sw, sh);
  } else {
    // Fill chế độ object-cover trong vùng boxW x boxH
    const targetAspect = boxW / boxH;
    let cropW, cropH, cropX, cropY;

    if (vw / vh > targetAspect) {
      cropH = vh;
      cropW = vh * targetAspect;
      cropX = (vw - cropW) / 2;
      cropY = 0;
    } else {
      cropW = vw;
      cropH = vw / targetAspect;
      cropX = 0;
      cropY = (vh - cropH) / 2;
    }

    ctx.drawImage(videoElement, cropX, cropY, cropW, cropH, boxX, boxY, boxW, boxH);
  }
}

/**
 * 2. Vẽ B-Roll thực tế (B-Roll Layer)
 * 🔥 Tích hợp hiệu ứng Ken Burns Slow Zoom (1.0x -> 1.06x) tạo chuyển động điện ảnh mượt mà cho ảnh tĩnh!
 */
export function drawBrollLayer(
  ctx, 
  brollMediaElement, 
  brollConfig, 
  currentTime = 0,
  targetWidth = 1080, 
  targetHeight = 1920
) {
  if (!brollMediaElement || !brollConfig) return;

  const style = brollConfig.style || 'split_30_70_top';
  const mw = brollMediaElement.videoWidth || brollMediaElement.naturalWidth || brollMediaElement.width || 1920;
  const mh = brollMediaElement.videoHeight || brollMediaElement.naturalHeight || brollMediaElement.height || 1080;

  // Tính toán Ken Burns Zoom cho ảnh tĩnh
  const isStillImage = !brollMediaElement.videoWidth; // là Image element
  let zoomFactor = 1.0;
  if (isStillImage) {
    const bStart = brollConfig.start || 0;
    const bDur = Math.max(1, brollConfig.duration || 4);
    const progress = Math.max(0, Math.min(1, (currentTime - bStart) / bDur));
    zoomFactor = 1.0 + 0.06 * progress; // zoom nhẹ từ 1.0 đến 1.06
  }

  // Helper crop-cover vẽ media vào hình chữ nhật (dx, dy, dw, dh) có hỗ trợ Ken Burns
  const drawCover = (dx, dy, dw, dh) => {
    const targetRatio = dw / dh;
    let baseW, baseH;
    if (mw / mh > targetRatio) {
      baseH = mh;
      baseW = mh * targetRatio;
    } else {
      baseW = mw;
      baseH = mw / targetRatio;
    }

    // Áp dụng zoomFactor
    const sw = baseW / zoomFactor;
    const sh = baseH / zoomFactor;
    const sx = (mw - sw) / 2;
    const sy = (mh - sh) / 2;

    ctx.drawImage(brollMediaElement, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  if (style === 'split_30_70_top') {
    const brollH = Math.round(targetHeight * 0.3); // 576px
    drawCover(0, 0, targetWidth, brollH);

    // Viền chuyển tiếp mờ nghệ thuật (ambient feather seam)
    const grad = ctx.createLinearGradient(0, brollH - 25, 0, brollH + 25);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, brollH - 25, targetWidth, 50);

    // Đường chỉ vàng nhẹ
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, brollH);
    ctx.lineTo(targetWidth - 30, brollH);
    ctx.stroke();
  } else if (style === 'split_30_70_bottom') {
    const brollH = Math.round(targetHeight * 0.3);
    const startY = targetHeight - brollH;
    drawCover(0, startY, targetWidth, brollH);
    const grad = ctx.createLinearGradient(0, startY - 25, 0, startY + 25);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, startY - 25, targetWidth, 50);
  } else if (style === 'split_50_50_top') {
    const brollH = Math.round(targetHeight * 0.5); // 960px
    drawCover(0, 0, targetWidth, brollH);

    // Viền giữa 50/50
    const grad = ctx.createLinearGradient(0, brollH - 30, 0, brollH + 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, brollH - 30, targetWidth, 60);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, brollH);
    ctx.lineTo(targetWidth - 20, brollH);
    ctx.stroke();
  } else if (style === 'split_50_50_bottom') {
    const brollH = Math.round(targetHeight * 0.5);
    drawCover(0, brollH, targetWidth, brollH);
  } else if (style === 'pip') {
    const pw = 420;
    const ph = 280;
    const px = targetWidth - pw - 40;
    const py = 120;
    ctx.save();
    drawRoundedRect(ctx, px, py, pw, ph, 24);
    ctx.clip();
    drawCover(px, py, pw, ph);
    ctx.restore();

    // Viền PIP bo góc
    ctx.save();
    drawRoundedRect(ctx, px, py, pw, ph, 24);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  } else {
    // Full cover / Background
    drawCover(0, 0, targetWidth, targetHeight);
  }
}

/**
 * 3. Vẽ Thẻ Tiêu Đề Vàng / Neon / Pill (Title Card)
 */
export function drawTitleCard(ctx, titleConfig, customTitle, targetWidth = 1080, targetHeight = 1920) {
  if (!titleConfig || titleConfig.visible === false) return;

  const posX = (titleConfig.pos?.x ?? 50) / 100 * targetWidth;
  const posY = (titleConfig.pos?.y ?? 10) / 100 * targetHeight;
  const scale = (titleConfig.scale ?? 100) / 100;
  const boxWidth = ((titleConfig.boxWidth ?? 280) * 3.4) * scale;
  const paddingY = ((titleConfig.paddingY ?? 6) * 3.5) * scale;
  const style = titleConfig.style || 'gradient_gold';
  const text = (customTitle || "TIÊU ĐỀ VIRAL CLIP").toUpperCase();

  ctx.save();
  ctx.translate(posX, posY);

  // Font setup
  const fontSize = Math.round(36 * scale * 1.1);
  ctx.font = `900 ${fontSize}px "Montserrat", "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = boxWidth - 60;
  const lines = wrapText(ctx, text, maxTextWidth);
  const lineHeight = fontSize * 1.3;
  const boxHeight = lines.length * lineHeight + paddingY * 2 + 10;
  const rx = -boxWidth / 2;
  const ry = -boxHeight / 2;

  // Vẽ nền thẻ tiêu đề theo phong cách
  if (style === 'gradient_gold') {
    // Nền vàng Gradient Amber
    const grad = ctx.createLinearGradient(rx, ry, rx + boxWidth, ry + boxHeight);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.5, '#fde047');
    grad.addColorStop(1, '#f59e0b');

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    drawRoundedRect(ctx, rx, ry, boxWidth, boxHeight, 28);
    ctx.fillStyle = grad;
    ctx.fill();

    // Viền vàng sáng
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Chữ màu đen in đậm
    ctx.fillStyle = '#000000';
  } else if (style === 'neon_cyber') {
    // Nền đen viền xanh Neon
    drawRoundedRect(ctx, rx, ry, boxWidth, boxHeight, 28);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 25;
    ctx.fill();

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
  } else if (style === 'yellow_impact') {
    // Chữ vàng không nền nhưng có bóng đậm
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
  } else {
    // Pill White mặc định
    drawRoundedRect(ctx, rx, ry, boxWidth, boxHeight, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.fillStyle = '#000000';
  }

  // Vẽ các dòng chữ
  const startTextY = ry + paddingY + (lineHeight / 2) + 5;
  for (let i = 0; i < lines.length; i++) {
    const ly = startTextY + i * lineHeight;
    if (style === 'yellow_impact') {
      ctx.strokeText(lines[i], 0, ly);
    }
    ctx.fillText(lines[i], 0, ly);
  }

  ctx.restore();
}

/**
 * 4. Vẽ Logo Thương Hiệu (Brand Logo)
 */
export function drawBrandLogo(ctx, brandConfig, logoImgElement, targetWidth = 1080, targetHeight = 1920) {
  if (!brandConfig || brandConfig.showLogo === false) return;

  const posX = (brandConfig.pos?.x ?? 82) / 100 * targetWidth;
  const posY = (brandConfig.pos?.y ?? 6) / 100 * targetHeight;
  const opacity = (brandConfig.logoOpacity ?? 90) / 100;

  ctx.save();
  ctx.translate(posX, posY);
  ctx.globalAlpha = opacity;

  if (logoImgElement && (logoImgElement.complete || logoImgElement.naturalWidth > 0)) {
    const lw = (brandConfig.logoWidth || brandConfig.logoSize || 65) * 3.5;
    const lh = brandConfig.logoHeight ? brandConfig.logoHeight * 3.5 : (lw * (logoImgElement.naturalHeight / (logoImgElement.naturalWidth || 1)));
    ctx.drawImage(logoImgElement, -lw / 2, -lh / 2, lw, lh);
  } else {
    // Badge Logo Text mặc định ("OPUS STUDIO" hoặc "E")
    const text = (brandConfig.logoText || 'OPUS STUDIO').toUpperCase();
    const fontSize = Math.round((brandConfig.logoSize || 65) * 0.6);
    ctx.font = `900 ${fontSize}px "Montserrat", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(text).width + 40;
    const th = fontSize * 1.6 + 16;
    const rx = -tw / 2;
    const ry = -th / 2;

    drawRoundedRect(ctx, rx, ry, tw, th, 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
  }

  ctx.restore();
}

/**
 * 5. Vẽ Phụ Đề Karaoke Chuyển Động (Dynamic Karaoke Captions)
 */
export function drawKaraokeCaptions(ctx, words = [], captionConfig = {}, fontStyle = {}, currentTime = 0, targetWidth = 1080, targetHeight = 1920) {
  if (!words || words.length === 0 || captionConfig.visible === false) return;

  // Tìm cụm từ (phrase) tương ứng với thời gian hiện tại
  let currentIdx = words.findIndex(w => currentTime >= w.start && currentTime <= w.end);
  if (currentIdx === -1) {
    currentIdx = words.findIndex(w => w.start >= currentTime);
    if (currentIdx === -1) currentIdx = words.length - 1;
  }

  // Nhóm cụm 3 đến 5 từ xung quanh
  const phraseStart = Math.max(0, currentIdx - 1);
  const phraseEnd = Math.min(words.length, phraseStart + 4);
  const activePhrase = words.slice(phraseStart, phraseEnd);
  if (activePhrase.length === 0) return;

  const posX = (captionConfig.pos?.x ?? 50) / 100 * targetWidth;
  const posY = (captionConfig.pos?.y ?? 84) / 100 * targetHeight;
  const scale = (captionConfig.scale ?? 100) / 100;
  const fontFamily = fontStyle.fontFamily || 'Montserrat';
  const baseFontSize = (fontStyle.fontSize || 40) * 1.9 * scale;
  const textColor = fontStyle.textColor || '#ffffff';
  const isUppercase = fontStyle.uppercase !== false;

  ctx.save();
  ctx.translate(posX, posY);

  ctx.font = `900 ${baseFontSize}px "${fontFamily}", "Arial", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Tính toán chiều rộng toàn bộ cụm từ để căn giữa (Center Alignment)
  const spaceWidth = ctx.measureText(' ').width;
  const wordMetrics = activePhrase.map(w => {
    const rawText = isUppercase ? w.word.toUpperCase() : w.word;
    const isCurrent = currentTime >= w.start && currentTime <= w.end;
    return {
      text: rawText,
      width: ctx.measureText(rawText).width,
      isCurrent
    };
  });

  const totalWidth = wordMetrics.reduce((sum, item) => sum + item.width, 0) + (wordMetrics.length - 1) * spaceWidth;
  let currX = -totalWidth / 2;

  // Vẽ từng từ trong cụm từ
  for (const item of wordMetrics) {
    ctx.save();
    const wordCenterX = currX + item.width / 2;

    if (item.isCurrent) {
      // Từ đang phát: phóng to nhẹ 1.08x và đổi màu xanh lá #22c55e nổi bật
      ctx.translate(wordCenterX, 0);
      ctx.scale(1.08, 1.08);
      ctx.translate(-wordCenterX, 0);

      // Viền đen dày
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.strokeText(item.text, currX, 0);

      // Bóng đổ
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 16;

      // Màu chữ nổi (Xanh lá chuẩn Viral)
      ctx.fillStyle = '#22c55e';
      ctx.fillText(item.text, currX, 0);
    } else {
      // Từ xung quanh: Viền đen + chữ trắng
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.strokeText(item.text, currX, 0);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;

      ctx.fillStyle = textColor;
      ctx.fillText(item.text, currX, 0);
    }

    ctx.restore();
    currX += item.width + spaceWidth;
  }

  ctx.restore();
}

/**
 * 6. Vẽ Nhãn Dán Chữ Tùy Biến (Custom Text Layers)
 */
export function drawTextLayers(ctx, textLayers = [], targetWidth = 1080, targetHeight = 1920) {
  if (!textLayers || textLayers.length === 0) return;

  for (const tl of textLayers) {
    const textObj = typeof tl === 'string' ? { text: tl, pos: { x: 50, y: 50 }, scale: 100 } : tl;
    if (!textObj.text) continue;

    const posX = (textObj.pos?.x ?? 50) / 100 * targetWidth;
    const posY = (textObj.pos?.y ?? 50) / 100 * targetHeight;
    const scale = (textObj.scale ?? 100) / 100;
    const fontSize = Math.round(36 * scale * 1.1);

    ctx.save();
    ctx.translate(posX, posY);
    ctx.font = `900 ${fontSize}px "Montserrat", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(textObj.text, 0, 0);

    ctx.fillStyle = textObj.color || '#ffffff';
    ctx.fillText(textObj.text, 0, 0);
    ctx.restore();
  }
}

/**
 * 🌟 HÀM TỔNG HỢP: VẼ HOÀN CHỈNH 1 KHUNG HÌNH (RENDER COMPOSITED FRAME)
 */
export function renderCompositedFrame(ctx, options = {}) {
  const {
    videoElement,
    videoLayout = 'fill',
    activeBrollMediaElement = null,
    activeBrollConfig = null,
    titleConfig = null,
    customTitle = '',
    isTitleVisible = false,
    brandConfig = null,
    logoImgElement = null,
    words = [],
    captionConfig = null,
    fontStyle = null,
    textLayers = [],
    currentTime = 0,
    targetWidth = 1080,
    targetHeight = 1920
  } = options;

  // 1. Xóa khung hình sạch
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // 2. Vẽ Video người nói (Base Video) - Tự động co về nửa dưới/trên khi có B-Roll
  drawVideoFrame(ctx, videoElement, videoLayout, activeBrollConfig, targetWidth, targetHeight);

  // 3. Vẽ B-Roll nếu đang trong phân đoạn B-Roll (kèm Ken Burns Slow Zoom)
  if (activeBrollMediaElement && activeBrollConfig) {
    drawBrollLayer(ctx, activeBrollMediaElement, activeBrollConfig, currentTime, targetWidth, targetHeight);
  }

  // 4. Vẽ Thẻ Tiêu Đề Vàng (nếu đang trong mốc hiển thị của tiêu đề)
  if (isTitleVisible && titleConfig?.visible !== false) {
    drawTitleCard(ctx, titleConfig, customTitle, targetWidth, targetHeight);
  }

  // 5. Vẽ Logo Thương Hiệu
  if (brandConfig?.showLogo !== false) {
    drawBrandLogo(ctx, brandConfig, logoImgElement, targetWidth, targetHeight);
  }

  // 6. Vẽ Phụ Đề Karaoke Chuyển Động
  drawKaraokeCaptions(ctx, words, captionConfig || {}, fontStyle || {}, currentTime, targetWidth, targetHeight);

  // 7. Vẽ Nhãn Dán Chữ Tùy Biến
  drawTextLayers(ctx, textLayers, targetWidth, targetHeight);
}
