let loadedFiles = [];
let activeIndex = 0;
let compressedBlobs = [];

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const formatSelect = document.getElementById('formatSelect');
const scaleSelect = document.getElementById('scaleSelect');

const origSizeEl = document.getElementById('origSize');
const compSizeEl = document.getElementById('compSize');
const savedRatioEl = document.getElementById('savedRatio');

const downloadSingleBtn = document.getElementById('downloadSingleBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');

const placeholderText = document.querySelector('.placeholder-text');
const splitWrapper = document.getElementById('splitWrapper');
const imgOriginal = document.getElementById('imgOriginal');
const imgCompressed = document.getElementById('imgCompressed');
const compressedWrapper = document.getElementById('compressedWrapper');
const splitSlider = document.getElementById('splitSlider');

dropZone.addEventListener('click', (e) => {
  if (e.target !== fileInput) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFiles(Array.from(e.target.files));
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    handleFiles(Array.from(e.dataTransfer.files));
  }
});

qualitySlider.addEventListener('input', (e) => {
  qualityVal.textContent = e.target.value;
  processCurrentImage();
});

formatSelect.addEventListener('change', processCurrentImage);
scaleSelect.addEventListener('change', processCurrentImage);

if (splitSlider) {
  splitSlider.addEventListener('input', (e) => {
    compressedWrapper.style.width = `${e.target.value}%`;
  });
}

function handleFiles(files) {
  const validImages = files.filter((f) => f.type.startsWith('image/'));
  if (validImages.length === 0) return;

  loadedFiles = validImages;
  activeIndex = 0;

  if (loadedFiles.length > 1) {
    downloadZipBtn.disabled = false;
  }

  processCurrentImage();
}

function compressSingleImage(file, quality, mimeType, scale) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = Math.max(1, img.width * scale);
      canvas.height = Math.max(1, img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, mimeType, quality);
    };
  });
}

async function processCurrentImage() {
  if (loadedFiles.length === 0) return;

  const file = loadedFiles[activeIndex];
  const quality = parseFloat(qualitySlider.value) / 100;
  const mimeType = formatSelect.value;
  const scale = parseFloat(scaleSelect.value);

  const origUrl = URL.createObjectURL(file);
  imgOriginal.src = origUrl;

  const blob = await compressSingleImage(file, quality, mimeType, scale);
  compressedBlobs[activeIndex] = blob;

  const compUrl = URL.createObjectURL(blob);
  imgCompressed.src = compUrl;

  if (placeholderText) placeholderText.hidden = true;
  if (splitWrapper) splitWrapper.hidden = false;

  updateStats(file.size, blob.size);
  downloadSingleBtn.disabled = false;
}

function updateStats(origBytes, compBytes) {
  origSizeEl.textContent = formatBytes(origBytes);
  compSizeEl.textContent = formatBytes(compBytes);

  const savedPercent = (((origBytes - compBytes) / origBytes) * 100).toFixed(1);
  savedRatioEl.textContent = `${savedPercent > 0 ? '-' : '+'}${Math.abs(savedPercent)}%`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

downloadSingleBtn.addEventListener('click', () => {
  const blob = compressedBlobs[activeIndex];
  if (!blob) return;

  const ext = formatSelect.value.split('/')[1];
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `pic-leaner-${Date.now()}.${ext}`;
  link.click();
});

downloadZipBtn.addEventListener('click', async () => {
  if (loadedFiles.length === 0) return;

  downloadZipBtn.disabled = true;
  downloadZipBtn.textContent = 'Compressing ZIP...';

  const zip = new JSZip();
  const quality = parseFloat(qualitySlider.value) / 100;
  const mimeType = formatSelect.value;
  const scale = parseFloat(scaleSelect.value);
  const ext = mimeType.split('/')[1];

  for (let i = 0; i < loadedFiles.length; i++) {
    const file = loadedFiles[i];
    const blob = await compressSingleImage(file, quality, mimeType, scale);
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    zip.file(`${baseName}-compressed.${ext}`, blob);
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipContent);
  link.download = `pic-leaner-batch.zip`;
  link.click();

  downloadZipBtn.disabled = false;
  downloadZipBtn.textContent = 'Export All as ZIP';
});