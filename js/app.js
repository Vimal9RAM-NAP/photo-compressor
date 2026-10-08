
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


dropZone.addEventListener('click', () => fileInput.click());

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

// Control Listeners
qualitySlider.addEventListener('input', (e) => {
  qualityVal.textContent = e.target.value;
  processCurrentImage();
});

formatSelect.addEventListener('change', processCurrentImage);
scaleSelect.addEventListener('change', processCurrentImage);

function handleFiles(files) {
  const validImages = files.filter((f) => f.type.startsWith('image/'));
  if (validImages.length === 0) return;

  loadedFiles = validImages;
  activeIndex = 0;
  processCurrentImage();
}


function processCurrentImage() {
  if (loadedFiles.length === 0) return;

  const file = loadedFiles[activeIndex];
  const quality = parseFloat(qualitySlider.value) / 100;
  const mimeType = formatSelect.value;
  const scale = parseFloat(scaleSelect.value);

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      compressedBlobs[activeIndex] = blob;
      updateStats(file.size, blob.size);
      downloadSingleBtn.disabled = false;
      URL.revokeObjectURL(img.src);
    }, mimeType, quality);
  };
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
  link.download = `pic-leaner-compressed.${ext}`;
  link.click();
});