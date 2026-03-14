// ── SlideFlow App ──
(function () {
  'use strict';

  // ── State ──
  const state = {
    slides: [],
    currentSlide: 0,
    selectedElement: null,
    slideWidth: 960,
    slideHeight: 540,
    showGrid: false,
    snapEnabled: true,
    undoStack: [],
    redoStack: [],
    clipboard: null,
    isDragging: false,
    isResizing: false,
    dragData: null,
  };

  let elementIdCounter = 0;

  // ── DOM refs ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const canvas = $('#slideCanvas');
  const slideList = $('#slideList');
  const formatBar = $('#formatBar');

  // ── Init ──
  function init() {
    addSlide();
    renderSlideList();
    renderCanvas();
    bindEvents();
  }

  // ── Slide management ──
  function createSlide() {
    return {
      id: Date.now() + Math.random(),
      elements: [],
      background: '#ffffff',
      backgroundImage: '',
    };
  }

  function addSlide() {
    pushUndo();
    state.slides.push(createSlide());
    state.currentSlide = state.slides.length - 1;
    deselectElement();
    renderSlideList();
    renderCanvas();
  }

  function duplicateSlide() {
    pushUndo();
    const src = state.slides[state.currentSlide];
    const dup = JSON.parse(JSON.stringify(src));
    dup.id = Date.now() + Math.random();
    dup.elements.forEach(e => e.id = 'el-' + (++elementIdCounter));
    state.slides.splice(state.currentSlide + 1, 0, dup);
    state.currentSlide++;
    deselectElement();
    renderSlideList();
    renderCanvas();
  }

  function deleteSlide() {
    if (state.slides.length <= 1) return;
    pushUndo();
    state.slides.splice(state.currentSlide, 1);
    if (state.currentSlide >= state.slides.length) state.currentSlide = state.slides.length - 1;
    deselectElement();
    renderSlideList();
    renderCanvas();
  }

  function switchSlide(index) {
    if (index === state.currentSlide) return;
    deselectElement();
    state.currentSlide = index;
    renderSlideList();
    renderCanvas();
  }

  function currentSlideData() {
    return state.slides[state.currentSlide];
  }

  // ── Undo/Redo ──
  function pushUndo() {
    state.undoStack.push(JSON.stringify(state.slides));
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (state.undoStack.length === 0) return;
    state.redoStack.push(JSON.stringify(state.slides));
    state.slides = JSON.parse(state.undoStack.pop());
    if (state.currentSlide >= state.slides.length) state.currentSlide = state.slides.length - 1;
    deselectElement();
    renderSlideList();
    renderCanvas();
    updateUndoRedoButtons();
  }

  function redo() {
    if (state.redoStack.length === 0) return;
    state.undoStack.push(JSON.stringify(state.slides));
    state.slides = JSON.parse(state.redoStack.pop());
    if (state.currentSlide >= state.slides.length) state.currentSlide = state.slides.length - 1;
    deselectElement();
    renderSlideList();
    renderCanvas();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    $('#undoBtn').disabled = state.undoStack.length === 0;
    $('#redoBtn').disabled = state.redoStack.length === 0;
  }

  // ── Element creation ──
  function createElement(type, props = {}) {
    return {
      id: 'el-' + (++elementIdCounter),
      type,
      x: props.x || 100,
      y: props.y || 100,
      width: props.width || 200,
      height: props.height || 120,
      ...props,
    };
  }

  function addElement(el) {
    pushUndo();
    currentSlideData().elements.push(el);
    renderCanvas();
    selectElement(el.id);
  }

  function addTextElement() {
    addElement(createElement('text', {
      x: 80, y: 80, width: 300, height: 60,
      content: 'Double-click to edit',
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#000000',
      fillColor: 'transparent',
      borderColor: 'transparent',
    }));
  }

  function addImageElement(src) {
    const img = new Image();
    img.onload = function () {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const maxW = state.slideWidth * 0.6;
      const maxH = state.slideHeight * 0.6;
      if (w > maxW) { h *= maxW / w; w = maxW; }
      if (h > maxH) { w *= maxH / h; h = maxH; }
      addElement(createElement('image', {
        x: (state.slideWidth - w) / 2,
        y: (state.slideHeight - h) / 2,
        width: Math.round(w),
        height: Math.round(h),
        src,
      }));
    };
    img.onerror = () => alert('Failed to load image');
    img.src = src;
  }

  function addShapeElement(shape) {
    addElement(createElement('shape', {
      x: 100, y: 100, width: 160, height: 120,
      shape,
      fillColor: '#4285f4',
      borderColor: '#333333',
      borderWidth: 2,
    }));
  }

  function addLineElement(lineType) {
    addElement(createElement('line', {
      x: 80, y: 200, width: 300, height: 4,
      lineType,
      color: '#333333',
      strokeWidth: 3,
    }));
  }

  function addTableElement(rows, cols) {
    const cellData = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push('');
      cellData.push(row);
    }
    addElement(createElement('table', {
      x: 60, y: 60,
      width: Math.min(cols * 100, state.slideWidth - 120),
      height: Math.min(rows * 36, state.slideHeight - 120),
      rows, cols,
      cellData,
      fontSize: 14,
      color: '#333333',
      borderColor: '#cccccc',
    }));
  }

  function addLinkElement(text, url) {
    addElement(createElement('link', {
      x: 100, y: 100, width: 250, height: 40,
      text: text || url,
      url,
      fontSize: 18,
    }));
  }

  function addGifElement(src) {
    addElement(createElement('gif', {
      x: 100, y: 100, width: 300, height: 220,
      src,
    }));
  }

  // ── Render canvas ──
  function renderCanvas() {
    const slide = currentSlideData();
    canvas.innerHTML = '';
    canvas.style.width = state.slideWidth + 'px';
    canvas.style.height = state.slideHeight + 'px';
    canvas.style.background = slide.background || '#fff';
    if (slide.backgroundImage) {
      canvas.style.backgroundImage = `url(${slide.backgroundImage})`;
      canvas.style.backgroundSize = 'cover';
      canvas.style.backgroundPosition = 'center';
    } else {
      canvas.style.backgroundImage = 'none';
    }

    // Grid
    const grid = document.createElement('div');
    grid.className = 'grid-overlay' + (state.showGrid ? ' show' : '');
    canvas.appendChild(grid);

    // Elements
    slide.elements.forEach(el => {
      const dom = createElementDOM(el);
      canvas.appendChild(dom);
    });

    if (state.selectedElement) {
      const dom = canvas.querySelector(`[data-id="${state.selectedElement}"]`);
      if (dom) dom.classList.add('selected');
    }
  }

  function createElementDOM(el) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slide-element';
    wrapper.dataset.id = el.id;
    wrapper.style.left = el.x + 'px';
    wrapper.style.top = el.y + 'px';
    wrapper.style.width = el.width + 'px';
    wrapper.style.height = el.height + 'px';

    // Resize handles
    ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].forEach(dir => {
      const h = document.createElement('div');
      h.className = `resize-handle ${dir}`;
      h.dataset.dir = dir;
      wrapper.appendChild(h);
    });

    switch (el.type) {
      case 'text': {
        const div = document.createElement('div');
        div.className = 'element-text';
        div.contentEditable = 'false';
        div.innerText = el.content || '';
        div.style.fontFamily = el.fontFamily || 'Inter';
        div.style.fontSize = (el.fontSize || 24) + 'px';
        div.style.fontWeight = el.fontWeight || 'normal';
        div.style.fontStyle = el.fontStyle || 'normal';
        div.style.textDecoration = el.textDecoration || 'none';
        div.style.textAlign = el.textAlign || 'left';
        div.style.color = el.color || '#000';
        div.style.backgroundColor = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'transparent';
        if (el.borderColor && el.borderColor !== 'transparent') {
          div.style.border = '2px solid ' + el.borderColor;
        }
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.overflow = 'hidden';
        wrapper.appendChild(div);
        break;
      }
      case 'image': {
        const img = document.createElement('img');
        img.className = 'element-image';
        img.src = el.src;
        img.draggable = false;
        wrapper.appendChild(img);
        break;
      }
      case 'gif': {
        const img = document.createElement('img');
        img.className = 'element-gif';
        img.src = el.src;
        img.draggable = false;
        wrapper.appendChild(img);
        break;
      }
      case 'shape': {
        const div = document.createElement('div');
        div.className = 'element-shape';
        div.innerHTML = renderShapeSVG(el);
        wrapper.appendChild(div);
        break;
      }
      case 'line': {
        const div = document.createElement('div');
        div.className = 'element-line';
        div.innerHTML = renderLineSVG(el);
        wrapper.appendChild(div);
        break;
      }
      case 'table': {
        const table = document.createElement('table');
        table.className = 'element-table';
        table.style.fontSize = (el.fontSize || 14) + 'px';
        table.style.color = el.color || '#333';
        for (let r = 0; r < el.rows; r++) {
          const tr = document.createElement('tr');
          for (let c = 0; c < el.cols; c++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.textContent = el.cellData[r]?.[c] || '';
            td.style.borderColor = el.borderColor || '#ccc';
            td.dataset.row = r;
            td.dataset.col = c;
            td.addEventListener('input', () => {
              el.cellData[r][c] = td.textContent;
            });
            td.addEventListener('focus', (e) => e.stopPropagation());
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        wrapper.appendChild(table);
        break;
      }
      case 'link': {
        const div = document.createElement('div');
        div.className = 'element-link';
        div.style.fontSize = (el.fontSize || 18) + 'px';
        const a = document.createElement('a');
        a.href = el.url;
        a.textContent = el.text || el.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.addEventListener('click', (e) => {
          if (!$('#presentationMode').classList.contains('hidden')) return;
          e.preventDefault();
        });
        div.appendChild(a);
        wrapper.appendChild(div);
        break;
      }
    }

    return wrapper;
  }

  // ── SVG Shapes ──
  function renderShapeSVG(el) {
    const fill = el.fillColor || '#4285f4';
    const stroke = el.borderColor || '#333';
    const sw = el.borderWidth || 2;
    const w = el.width;
    const h = el.height;
    const shapes = {
      rect: `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      'rounded-rect': `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" rx="12" ry="12" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      circle: `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - sw}" ry="${h / 2 - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      triangle: `<polygon points="${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      diamond: `<polygon points="${w / 2},${sw} ${w - sw},${h / 2} ${w / 2},${h - sw} ${sw},${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      star: getStarPoints(w, h, sw, fill, stroke),
      'arrow-right': `<polygon points="${sw},${h * 0.25} ${w * 0.65},${h * 0.25} ${w * 0.65},${sw} ${w - sw},${h / 2} ${w * 0.65},${h - sw} ${w * 0.65},${h * 0.75} ${sw},${h * 0.75}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
      hexagon: getHexagonPoints(w, h, sw, fill, stroke),
    };
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${shapes[el.shape] || shapes.rect}</svg>`;
  }

  function getStarPoints(w, h, sw, fill, stroke) {
    const cx = w / 2, cy = h / 2;
    const outer = Math.min(w, h) / 2 - sw;
    const inner = outer * 0.4;
    let points = '';
    for (let i = 0; i < 5; i++) {
      const aO = (Math.PI / 2 * -1) + (i * 2 * Math.PI / 5);
      const aI = aO + Math.PI / 5;
      points += `${cx + outer * Math.cos(aO)},${cy + outer * Math.sin(aO)} `;
      points += `${cx + inner * Math.cos(aI)},${cy + inner * Math.sin(aI)} `;
    }
    return `<polygon points="${points.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }

  function getHexagonPoints(w, h, sw, fill, stroke) {
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - sw;
    let points = '';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      points += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
    }
    return `<polygon points="${points.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }

  function renderLineSVG(el) {
    const color = el.color || '#333';
    const sw = el.strokeWidth || 3;
    const w = el.width;
    const h = Math.max(el.height, sw + 4);
    const y = h / 2;
    let dashArray = '';
    if (el.lineType === 'dashed') dashArray = 'stroke-dasharray="10,6"';

    let marker = '';
    let markerDef = '';
    if (el.lineType === 'arrow' || el.lineType === 'double-arrow') {
      markerDef = `<defs><marker id="ah-${el.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${color}"/></marker>`;
      if (el.lineType === 'double-arrow') {
        markerDef += `<marker id="ahs-${el.id}" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="${color}"/></marker>`;
      }
      markerDef += '</defs>';
      marker = `marker-end="url(#ah-${el.id})"`;
      if (el.lineType === 'double-arrow') marker += ` marker-start="url(#ahs-${el.id})"`;
    }

    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${markerDef}<line x1="4" y1="${y}" x2="${w - 4}" y2="${y}" stroke="${color}" stroke-width="${sw}" ${dashArray} ${marker} stroke-linecap="round"/></svg>`;
  }

  // ── Selection ──
  function selectElement(id) {
    state.selectedElement = id;
    canvas.querySelectorAll('.slide-element').forEach(el => el.classList.remove('selected'));
    const dom = canvas.querySelector(`[data-id="${id}"]`);
    if (dom) dom.classList.add('selected');
    showFormatBar();
    updateFormatBarValues();
  }

  function deselectElement() {
    // Save any editing text
    if (state.selectedElement) {
      const el = getElement(state.selectedElement);
      if (el && el.type === 'text') {
        const dom = canvas.querySelector(`[data-id="${state.selectedElement}"] .element-text`);
        if (dom && dom.contentEditable === 'true') {
          pushUndo();
          el.content = dom.innerText;
          dom.contentEditable = 'false';
        }
      }
    }
    state.selectedElement = null;
    canvas.querySelectorAll('.slide-element').forEach(el => el.classList.remove('selected'));
    formatBar.classList.add('hidden');
    recalcAppHeight();
  }

  function getElement(id) {
    return currentSlideData().elements.find(e => e.id === id);
  }

  function deleteSelectedElement() {
    if (!state.selectedElement) return;
    pushUndo();
    const slide = currentSlideData();
    slide.elements = slide.elements.filter(e => e.id !== state.selectedElement);
    deselectElement();
    renderCanvas();
  }

  // ── Format Bar ──
  function showFormatBar() {
    formatBar.classList.remove('hidden');
    recalcAppHeight();
  }

  function recalcAppHeight() {
    const formatVisible = !formatBar.classList.contains('hidden');
    const h = formatVisible ? `calc(100vh - var(--toolbar-h) - var(--format-h))` : `calc(100vh - var(--toolbar-h))`;
    $('#appBody').style.height = h;
  }

  function updateFormatBarValues() {
    const el = getElement(state.selectedElement);
    if (!el) return;
    if (el.type === 'text') {
      $('#fontFamily').value = el.fontFamily || 'Inter';
      $('#fontSize').value = el.fontSize || 24;
      $('#boldBtn').classList.toggle('active', el.fontWeight === 'bold');
      $('#italicBtn').classList.toggle('active', el.fontStyle === 'italic');
      $('#underlineBtn').classList.toggle('active', el.textDecoration === 'underline');
      $('#textColor').value = el.color || '#000000';
      $('#fillColor').value = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : '#ffffff';
      $('#borderColor').value = el.borderColor && el.borderColor !== 'transparent' ? el.borderColor : '#333333';
      $('#textAlign').value = el.textAlign || 'left';
    } else if (el.type === 'shape') {
      $('#fillColor').value = el.fillColor || '#4285f4';
      $('#borderColor').value = el.borderColor || '#333333';
    } else if (el.type === 'line') {
      $('#textColor').value = el.color || '#333333';
    } else if (el.type === 'table') {
      $('#fontSize').value = el.fontSize || 14;
      $('#textColor').value = el.color || '#333333';
      $('#borderColor').value = el.borderColor || '#cccccc';
    }
  }

  function applyFormat(prop, value) {
    const el = getElement(state.selectedElement);
    if (!el) return;
    pushUndo();
    el[prop] = value;
    renderCanvas();
    selectElement(el.id);
  }

  // ── Drag & Resize ──
  function startDrag(elId, clientX, clientY) {
    const el = getElement(elId);
    if (!el) return;
    state.isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / state.slideWidth;
    state.dragData = {
      id: elId,
      startX: clientX,
      startY: clientY,
      origX: el.x,
      origY: el.y,
      scale,
    };
    pushUndo();
  }

  function onDragMove(clientX, clientY) {
    if (!state.isDragging || !state.dragData) return;
    const d = state.dragData;
    const el = getElement(d.id);
    if (!el) return;
    let newX = d.origX + (clientX - d.startX) / d.scale;
    let newY = d.origY + (clientY - d.startY) / d.scale;

    if (state.snapEnabled) {
      const snapDist = 8;
      const cx = newX + el.width / 2;
      const cy = newY + el.height / 2;
      const midX = state.slideWidth / 2;
      const midY = state.slideHeight / 2;
      if (Math.abs(cx - midX) < snapDist) newX = midX - el.width / 2;
      if (Math.abs(cy - midY) < snapDist) newY = midY - el.height / 2;
      if (Math.abs(newX) < snapDist) newX = 0;
      if (Math.abs(newY) < snapDist) newY = 0;
      if (Math.abs(newX + el.width - state.slideWidth) < snapDist) newX = state.slideWidth - el.width;
      if (Math.abs(newY + el.height - state.slideHeight) < snapDist) newY = state.slideHeight - el.height;
    }

    el.x = Math.round(newX);
    el.y = Math.round(newY);

    const dom = canvas.querySelector(`[data-id="${d.id}"]`);
    if (dom) {
      dom.style.left = el.x + 'px';
      dom.style.top = el.y + 'px';
    }
  }

  function endDrag() {
    state.isDragging = false;
    state.dragData = null;
    renderSlideList();
  }

  function startResize(elId, dir, clientX, clientY) {
    const el = getElement(elId);
    if (!el) return;
    state.isResizing = true;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / state.slideWidth;
    state.dragData = {
      id: elId,
      dir,
      startX: clientX,
      startY: clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      scale,
    };
    pushUndo();
  }

  function onResizeMove(clientX, clientY) {
    if (!state.isResizing || !state.dragData) return;
    const d = state.dragData;
    const el = getElement(d.id);
    if (!el) return;
    const dx = (clientX - d.startX) / d.scale;
    const dy = (clientY - d.startY) / d.scale;
    const minSize = 20;

    if (d.dir.includes('e')) el.width = Math.max(minSize, Math.round(d.origW + dx));
    if (d.dir.includes('s')) el.height = Math.max(minSize, Math.round(d.origH + dy));
    if (d.dir.includes('w')) {
      el.width = Math.max(minSize, Math.round(d.origW - dx));
      el.x = Math.round(d.origX + d.origW - el.width);
    }
    if (d.dir.includes('n')) {
      el.height = Math.max(minSize, Math.round(d.origH - dy));
      el.y = Math.round(d.origY + d.origH - el.height);
    }

    const dom = canvas.querySelector(`[data-id="${d.id}"]`);
    if (dom) {
      dom.style.left = el.x + 'px';
      dom.style.top = el.y + 'px';
      dom.style.width = el.width + 'px';
      dom.style.height = el.height + 'px';
      // Re-render inner content for shapes/lines
      if (el.type === 'shape') {
        const inner = dom.querySelector('.element-shape');
        if (inner) inner.innerHTML = renderShapeSVG(el);
      }
      if (el.type === 'line') {
        const inner = dom.querySelector('.element-line');
        if (inner) inner.innerHTML = renderLineSVG(el);
      }
    }
  }

  function endResize() {
    state.isResizing = false;
    state.dragData = null;
    renderCanvas();
    if (state.selectedElement) selectElement(state.selectedElement);
    renderSlideList();
  }

  // ── Slide thumbnails ──
  function renderSlideList() {
    slideList.innerHTML = '';
    state.slides.forEach((slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb' + (i === state.currentSlide ? ' active' : '');
      thumb.addEventListener('click', () => switchSlide(i));

      // Add context menu for mobile long-press
      thumb.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        switchSlide(i);
      });

      const num = document.createElement('div');
      num.className = 'slide-thumb-number';
      num.textContent = i + 1;
      thumb.appendChild(num);

      // Mini render
      const miniCanvas = document.createElement('div');
      miniCanvas.className = 'slide-thumb-canvas';
      miniCanvas.style.background = slide.background || '#fff';
      if (slide.backgroundImage) {
        miniCanvas.style.backgroundImage = `url(${slide.backgroundImage})`;
        miniCanvas.style.backgroundSize = 'cover';
      }
      miniCanvas.style.position = 'relative';
      miniCanvas.style.overflow = 'hidden';

      // Render tiny elements
      slide.elements.forEach(el => {
        const mini = document.createElement('div');
        mini.style.position = 'absolute';
        const scaleX = 1 / (state.slideWidth / 100);
        const scaleY = 1 / (state.slideHeight / 100);
        mini.style.left = (el.x * scaleX) + '%';
        mini.style.top = (el.y * scaleY) + '%';
        mini.style.width = (el.width * scaleX) + '%';
        mini.style.height = (el.height * scaleY) + '%';
        mini.style.overflow = 'hidden';

        if (el.type === 'text') {
          mini.style.fontSize = '4px';
          mini.style.color = el.color || '#000';
          mini.style.backgroundColor = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'transparent';
          mini.textContent = el.content;
        } else if (el.type === 'image' || el.type === 'gif') {
          mini.style.backgroundImage = `url(${el.src})`;
          mini.style.backgroundSize = 'cover';
        } else if (el.type === 'shape') {
          mini.innerHTML = renderShapeSVG(el);
        } else if (el.type === 'line') {
          mini.innerHTML = renderLineSVG(el);
        } else if (el.type === 'table') {
          mini.style.border = '1px solid #ccc';
          mini.style.background = '#fff';
        } else if (el.type === 'link') {
          mini.style.fontSize = '4px';
          mini.style.color = '#1a73e8';
          mini.textContent = el.text;
        }
        miniCanvas.appendChild(mini);
      });

      thumb.appendChild(miniCanvas);
      slideList.appendChild(thumb);
    });
  }

  // ── Presentation Mode ──
  function startPresentation() {
    const presMode = $('#presentationMode');
    presMode.classList.remove('hidden');
    state.presSlide = state.currentSlide;
    renderPresentSlide();
    document.body.style.overflow = 'hidden';
  }

  function exitPresentation() {
    $('#presentationMode').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderPresentSlide() {
    const slide = state.slides[state.presSlide];
    if (!slide) return;
    const container = $('#presentSlide');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / state.slideWidth, vh / state.slideHeight);
    const w = state.slideWidth * scale;
    const h = state.slideHeight * scale;
    container.style.width = w + 'px';
    container.style.height = h + 'px';
    container.style.transform = `scale(1)`;
    container.style.background = slide.background || '#fff';
    if (slide.backgroundImage) {
      container.style.backgroundImage = `url(${slide.backgroundImage})`;
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
    } else {
      container.style.backgroundImage = 'none';
    }
    container.innerHTML = '';

    slide.elements.forEach(el => {
      const dom = createElementDOM(el);
      dom.style.left = (el.x * scale) + 'px';
      dom.style.top = (el.y * scale) + 'px';
      dom.style.width = (el.width * scale) + 'px';
      dom.style.height = (el.height * scale) + 'px';
      dom.style.cursor = 'default';
      dom.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
      // Scale text
      const textEl = dom.querySelector('.element-text');
      if (textEl) textEl.style.fontSize = ((el.fontSize || 24) * scale) + 'px';
      const tableEl = dom.querySelector('.element-table');
      if (tableEl) {
        tableEl.style.fontSize = ((el.fontSize || 14) * scale) + 'px';
        tableEl.querySelectorAll('td').forEach(td => td.contentEditable = 'false');
      }
      const linkEl = dom.querySelector('.element-link');
      if (linkEl) linkEl.style.fontSize = ((el.fontSize || 18) * scale) + 'px';
      container.appendChild(dom);
    });

    $('#slideCounter').textContent = `${state.presSlide + 1} / ${state.slides.length}`;
  }

  function nextPresSlide() {
    if (state.presSlide < state.slides.length - 1) {
      state.presSlide++;
      renderPresentSlide();
    }
  }

  function prevPresSlide() {
    if (state.presSlide > 0) {
      state.presSlide--;
      renderPresentSlide();
    }
  }

  // ── Save/Load ──
  function savePresentation() {
    const data = {
      slideWidth: state.slideWidth,
      slideHeight: state.slideHeight,
      slides: state.slides,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presentation.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadPresentation(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        pushUndo();
        state.slides = data.slides;
        state.slideWidth = data.slideWidth || 960;
        state.slideHeight = data.slideHeight || 540;
        state.currentSlide = 0;
        deselectElement();
        updateSlideSizePreset();
        renderSlideList();
        renderCanvas();
      } catch (err) {
        alert('Invalid file');
      }
    };
    reader.readAsText(file);
  }

  function newPresentation() {
    if (!confirm('Create new presentation? Unsaved changes will be lost.')) return;
    state.slides = [];
    state.undoStack = [];
    state.redoStack = [];
    state.currentSlide = 0;
    deselectElement();
    addSlide();
    updateUndoRedoButtons();
  }

  // ── Export ──
  function exportImages() {
    alert('To export slides as images, use your browser\'s screenshot tool or press Print Screen on each slide in presentation mode.');
  }

  // ── Slide Size ──
  function applySlideSize() {
    const preset = $('#slideSizePreset').value;
    let w, h;
    if (preset === 'custom') {
      w = parseInt($('#customWidth').value) || 960;
      h = parseInt($('#customHeight').value) || 540;
    } else {
      const ratios = { '16:9': [960, 540], '4:3': [800, 600], '1:1': [600, 600], '9:16': [540, 960] };
      [w, h] = ratios[preset] || [960, 540];
    }
    pushUndo();
    state.slideWidth = w;
    state.slideHeight = h;
    renderCanvas();
    renderSlideList();
    $('#slideSizeModal').classList.add('hidden');
  }

  function updateSlideSizePreset() {
    const ratios = { '960-540': '16:9', '800-600': '4:3', '600-600': '1:1', '540-960': '9:16' };
    const key = `${state.slideWidth}-${state.slideHeight}`;
    const preset = ratios[key] || 'custom';
    $('#slideSizePreset').value = preset;
    if (preset === 'custom') {
      $('#customSizeFields').classList.remove('hidden');
      $('#customWidth').value = state.slideWidth;
      $('#customHeight').value = state.slideHeight;
    }
  }

  // ── Layer order ──
  function bringToFront() {
    const el = getElement(state.selectedElement);
    if (!el) return;
    pushUndo();
    const elems = currentSlideData().elements;
    const idx = elems.indexOf(el);
    elems.splice(idx, 1);
    elems.push(el);
    renderCanvas();
    selectElement(el.id);
  }

  function sendToBack() {
    const el = getElement(state.selectedElement);
    if (!el) return;
    pushUndo();
    const elems = currentSlideData().elements;
    const idx = elems.indexOf(el);
    elems.splice(idx, 1);
    elems.unshift(el);
    renderCanvas();
    selectElement(el.id);
  }

  // ── Copy/Paste ──
  function copyElement() {
    const el = getElement(state.selectedElement);
    if (!el) return;
    state.clipboard = JSON.parse(JSON.stringify(el));
  }

  function pasteElement() {
    if (!state.clipboard) return;
    const el = JSON.parse(JSON.stringify(state.clipboard));
    el.id = 'el-' + (++elementIdCounter);
    el.x += 20;
    el.y += 20;
    addElement(el);
  }

  // ── Events ──
  function bindEvents() {
    // Toolbar buttons
    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);
    $('#addTextBtn').addEventListener('click', addTextElement);
    $('#addImageBtn').addEventListener('click', () => $('#imageInput').click());
    $('#imageInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => addImageElement(ev.target.result);
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    $('#addSlideBtn').addEventListener('click', addSlide);
    $('#playBtn').addEventListener('click', startPresentation);

    // Shape dropdown
    $('#addShapeBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = $('#shapeDropdown');
      dd.classList.toggle('hidden');
      $('#lineDropdown').classList.add('hidden');
      const rect = $('#addShapeBtn').getBoundingClientRect();
      dd.style.left = rect.left + 'px';
    });
    $$('#shapeDropdown button').forEach(btn => {
      btn.addEventListener('click', () => {
        addShapeElement(btn.dataset.shape);
        $('#shapeDropdown').classList.add('hidden');
      });
    });

    // Line dropdown
    $('#addLineBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = $('#lineDropdown');
      dd.classList.toggle('hidden');
      $('#shapeDropdown').classList.add('hidden');
      const rect = $('#addLineBtn').getBoundingClientRect();
      dd.style.left = rect.left + 'px';
    });
    $$('#lineDropdown button').forEach(btn => {
      btn.addEventListener('click', () => {
        addLineElement(btn.dataset.line);
        $('#lineDropdown').classList.add('hidden');
      });
    });

    // Table
    $('#addTableBtn').addEventListener('click', () => $('#tableSizeModal').classList.remove('hidden'));
    $('#insertTableBtn').addEventListener('click', () => {
      const rows = parseInt($('#tableRows').value) || 3;
      const cols = parseInt($('#tableCols').value) || 3;
      addTableElement(rows, cols);
      $('#tableSizeModal').classList.add('hidden');
    });

    // Link
    $('#addLinkBtn').addEventListener('click', () => {
      $('#linkText').value = '';
      $('#linkUrl').value = '';
      $('#linkModal').classList.remove('hidden');
    });
    $('#insertLinkBtn').addEventListener('click', () => {
      const text = $('#linkText').value.trim();
      const url = $('#linkUrl').value.trim();
      if (!url) return alert('Please enter a URL');
      addLinkElement(text, url);
      $('#linkModal').classList.add('hidden');
    });

    // GIF
    $('#addGifBtn').addEventListener('click', () => {
      $('#gifUrl').value = '';
      $('#gifModal').classList.remove('hidden');
    });
    $('#insertGifBtn').addEventListener('click', () => {
      const url = $('#gifUrl').value.trim();
      if (!url) return alert('Please enter a GIF URL');
      addGifElement(url);
      $('#gifModal').classList.add('hidden');
    });

    // Slide size
    $('#slideSizeBtn').addEventListener('click', () => {
      updateSlideSizePreset();
      $('#slideSizeModal').classList.remove('hidden');
    });
    $('#slideSizePreset').addEventListener('change', () => {
      $('#customSizeFields').classList.toggle('hidden', $('#slideSizePreset').value !== 'custom');
    });
    $('#applySizeBtn').addEventListener('click', applySlideSize);

    // Format bar
    $('#fontFamily').addEventListener('change', (e) => applyFormat('fontFamily', e.target.value));
    $('#fontSize').addEventListener('change', (e) => applyFormat('fontSize', parseInt(e.target.value)));
    $('#boldBtn').addEventListener('click', () => {
      const el = getElement(state.selectedElement);
      if (el) applyFormat('fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold');
    });
    $('#italicBtn').addEventListener('click', () => {
      const el = getElement(state.selectedElement);
      if (el) applyFormat('fontStyle', el.fontStyle === 'italic' ? 'normal' : 'italic');
    });
    $('#underlineBtn').addEventListener('click', () => {
      const el = getElement(state.selectedElement);
      if (el) applyFormat('textDecoration', el.textDecoration === 'underline' ? 'none' : 'underline');
    });
    $('#textColor').addEventListener('input', (e) => {
      const el = getElement(state.selectedElement);
      if (el && el.type === 'line') applyFormat('color', e.target.value);
      else applyFormat('color', e.target.value);
    });
    $('#fillColor').addEventListener('input', (e) => applyFormat('fillColor', e.target.value));
    $('#borderColor').addEventListener('input', (e) => applyFormat('borderColor', e.target.value));
    $('#textAlign').addEventListener('change', (e) => applyFormat('textAlign', e.target.value));
    $('#bringFrontBtn').addEventListener('click', bringToFront);
    $('#sendBackBtn').addEventListener('click', sendToBack);
    $('#deleteElementBtn').addEventListener('click', deleteSelectedElement);

    // Side menu
    $('#menuBtn').addEventListener('click', () => {
      $('#sideMenu').classList.remove('hidden');
      $('#sideMenuOverlay').classList.remove('hidden');
    });
    const closeMenu = () => {
      $('#sideMenu').classList.add('hidden');
      $('#sideMenuOverlay').classList.add('hidden');
    };
    $('#closeMenuBtn').addEventListener('click', closeMenu);
    $('#sideMenuOverlay').addEventListener('click', closeMenu);
    $('#newPresentationBtn').addEventListener('click', () => { closeMenu(); newPresentation(); });
    $('#savePresentationBtn').addEventListener('click', () => { closeMenu(); savePresentation(); });
    $('#loadPresentationBtn').addEventListener('click', () => { closeMenu(); $('#loadInput').click(); });
    $('#loadInput').addEventListener('change', (e) => {
      if (e.target.files[0]) loadPresentation(e.target.files[0]);
      e.target.value = '';
    });
    $('#exportPdfBtn').addEventListener('click', () => { closeMenu(); exportImages(); });
    $('#duplicateSlideBtn').addEventListener('click', () => { closeMenu(); duplicateSlide(); });
    $('#deleteSlideBtn').addEventListener('click', () => { closeMenu(); deleteSlide(); });
    $('#slideSettingsBtn').addEventListener('click', () => {
      closeMenu();
      const slide = currentSlideData();
      $('#bgColor').value = slide.background || '#ffffff';
      $('#bgImage').value = slide.backgroundImage || '';
      $('#bgModal').classList.remove('hidden');
    });
    $('#applyBgBtn').addEventListener('click', () => {
      pushUndo();
      const slide = currentSlideData();
      slide.background = $('#bgColor').value;
      slide.backgroundImage = $('#bgImage').value.trim();
      renderCanvas();
      renderSlideList();
      $('#bgModal').classList.add('hidden');
    });
    $('#gridToggleBtn').addEventListener('click', () => {
      closeMenu();
      state.showGrid = !state.showGrid;
      renderCanvas();
      if (state.selectedElement) selectElement(state.selectedElement);
    });
    $('#snapToggleBtn').addEventListener('click', () => {
      closeMenu();
      state.snapEnabled = !state.snapEnabled;
    });

    // Presentation controls
    $('#exitPresentation').addEventListener('click', exitPresentation);
    $('#nextSlideBtn').addEventListener('click', nextPresSlide);
    $('#prevSlideBtn').addEventListener('click', prevPresSlide);

    // Canvas mouse/touch events
    canvas.addEventListener('mousedown', onCanvasPointerDown);
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);

    // Double-click to edit text
    canvas.addEventListener('dblclick', onCanvasDblClick);

    // Click outside to deselect
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('.slide-element') || e.target.closest('#formatBar') || e.target.closest('#toolbar') || e.target.closest('.dropdown-menu') || e.target.closest('.modal') || e.target.closest('.side-menu')) return;
      if (e.target.closest('#slideCanvas') && !e.target.closest('.slide-element')) {
        deselectElement();
      }
      // Close dropdowns
      if (!e.target.closest('#addShapeBtn') && !e.target.closest('#shapeDropdown')) {
        $('#shapeDropdown').classList.add('hidden');
      }
      if (!e.target.closest('#addLineBtn') && !e.target.closest('#lineDropdown')) {
        $('#lineDropdown').classList.add('hidden');
      }
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);

    // Presentation keyboard/touch
    $('#presentationMode').addEventListener('click', (e) => {
      if (e.target.closest('.present-nav') || e.target.closest('.exit-present-btn')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX > rect.width / 2) nextPresSlide();
      else prevPresSlide();
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (!$('#presentationMode').classList.contains('hidden')) renderPresentSlide();
    });

    // Presentation swipe
    let touchStartX = 0;
    $('#presentationMode').addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    $('#presentationMode').addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) nextPresSlide();
        else prevPresSlide();
      }
    });

    // Mobile slide panel toggle
    canvas.addEventListener('touchstart', () => {
      const panel = $('#slidePanel');
      if (panel.classList.contains('mobile-show')) panel.classList.remove('mobile-show');
    }, { passive: true });
  }

  function onCanvasPointerDown(e) {
    const handle = e.target.closest('.resize-handle');
    const element = e.target.closest('.slide-element');

    if (handle && element) {
      e.preventDefault();
      selectElement(element.dataset.id);
      startResize(element.dataset.id, handle.dataset.dir, e.clientX, e.clientY);
      return;
    }

    if (element) {
      // Don't start drag if editing text
      const textEl = element.querySelector('.element-text');
      if (textEl && textEl.contentEditable === 'true') return;
      // Don't start drag if editing table
      if (e.target.closest('td[contenteditable="true"]')) return;

      e.preventDefault();
      selectElement(element.dataset.id);
      startDrag(element.dataset.id, e.clientX, e.clientY);
    }
  }

  function onCanvasTouchStart(e) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const handle = target?.closest('.resize-handle');
    const element = target?.closest('.slide-element');

    if (handle && element) {
      e.preventDefault();
      selectElement(element.dataset.id);
      startResize(element.dataset.id, handle.dataset.dir, touch.clientX, touch.clientY);
      return;
    }

    if (element) {
      const textEl = element.querySelector('.element-text');
      if (textEl && textEl.contentEditable === 'true') return;
      if (target?.closest('td[contenteditable="true"]')) return;

      e.preventDefault();
      selectElement(element.dataset.id);
      startDrag(element.dataset.id, touch.clientX, touch.clientY);
    }
  }

  function onPointerMove(e) {
    if (state.isDragging) onDragMove(e.clientX, e.clientY);
    if (state.isResizing) onResizeMove(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (state.isDragging || state.isResizing) {
      e.preventDefault();
      const t = e.touches[0];
      if (state.isDragging) onDragMove(t.clientX, t.clientY);
      if (state.isResizing) onResizeMove(t.clientX, t.clientY);
    }
  }

  function onPointerUp() {
    if (state.isDragging) endDrag();
    if (state.isResizing) endResize();
  }

  function onCanvasDblClick(e) {
    const element = e.target.closest('.slide-element');
    if (!element) return;
    const el = getElement(element.dataset.id);
    if (!el || el.type !== 'text') return;

    const textDiv = element.querySelector('.element-text');
    if (!textDiv) return;
    textDiv.contentEditable = 'true';
    textDiv.focus();

    // Save on blur
    textDiv.addEventListener('blur', function onBlur() {
      pushUndo();
      el.content = textDiv.innerText;
      textDiv.contentEditable = 'false';
      textDiv.removeEventListener('blur', onBlur);
      renderSlideList();
    }, { once: true });
  }

  function onKeyDown(e) {
    // Don't intercept if editing
    if (e.target.contentEditable === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    // Presentation mode
    if (!$('#presentationMode').classList.contains('hidden')) {
      if (e.key === 'Escape') exitPresentation();
      if (e.key === 'ArrowRight' || e.key === ' ') nextPresSlide();
      if (e.key === 'ArrowLeft') prevPresSlide();
      return;
    }

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); return; }

    // Copy/Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') { copyElement(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') { pasteElement(); return; }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedElement) { e.preventDefault(); deleteSelectedElement(); }
      return;
    }

    // Escape
    if (e.key === 'Escape') { deselectElement(); return; }

    // Arrow keys to nudge
    if (state.selectedElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const el = getElement(state.selectedElement);
      if (!el) return;
      pushUndo();
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') el.y -= step;
      if (e.key === 'ArrowDown') el.y += step;
      if (e.key === 'ArrowLeft') el.x -= step;
      if (e.key === 'ArrowRight') el.x += step;
      renderCanvas();
      selectElement(el.id);
    }
  }

  // ── Mobile slide panel ──
  // Swipe from left edge to show slide panel on mobile
  let edgeStart = null;
  document.addEventListener('touchstart', (e) => {
    if (e.touches[0].clientX < 20) edgeStart = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (edgeStart !== null && e.touches[0].clientX > 60) {
      const panel = $('#slidePanel');
      if (window.innerWidth <= 768) panel.classList.add('mobile-show');
      edgeStart = null;
    }
  }, { passive: true });
  document.addEventListener('touchend', () => { edgeStart = null; }, { passive: true });

  // ── Start ──
  init();
})();
