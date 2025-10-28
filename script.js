/* script.js - Neon Tools Hub (front-end) */
/* Global helpers used across tool pages */

(() => {
  // small helper to select
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // if on index page, nothing special needed
  if (document.body.classList.contains('tool-dashboard')) return;

  // Add back button behavior on tool pages
  const back = document.querySelector('.back-btn');
  if (back) back.addEventListener('click', () => window.location.href = '../index.html');

  /* *******************
     TOOL: Torrent (tools/torrent.html)
     - Uses WebTorrent (client-side) to parse a .torrent file and list files.
     - For magnet: just shows the magnet string.
     ******************* */
  if (document.body.dataset.tool === 'torrent') {
    const input = document.getElementById('torrentFile');
    const magnetInputBtn = document.getElementById('magnetBtn');
    const out = document.getElementById('torrentOutput');

    // load WebTorrent from CDN dynamically
    const loadWebTorrent = () => {
      return new Promise((resolve, reject) => {
        if (window.WebTorrent) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/webtorrent@1.9.3/webtorrent.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('فشل تحميل WebTorrent'));
        document.head.appendChild(s);
      });
    };

    input.addEventListener('change', async () => {
      const f = input.files[0];
      if (!f) return;
      out.innerHTML = `<p>⏳ جارٍ قراءة الملف...</p>`;
      try {
        await loadWebTorrent();
        const buffer = await f.arrayBuffer();
        const client = new WebTorrent();
        client.add(new Uint8Array(buffer), { announce: [] }, torrent => {
          const list = torrent.files.map((fi, idx) => `<li>${idx+1}. ${fi.name} — ${formatBytes(fi.length)}</li>`).join('');
          out.innerHTML = `<h4>محتويات التورنت:</h4><ul>${list}</ul><p class="note">ملاحظة: هذه واجهة للعرض فقط — لا يتم تحميل ملفات من الشبكة هنا.</p>`;
          client.destroy();
        });
      } catch (err) {
        out.innerHTML = `<p class="note">خطأ: ${err.message}</p>`;
      }
    });

    magnetInputBtn.addEventListener('click', () => {
      const m = prompt('ألصق رابط magnet هنا:');
      if (!m) return;
      out.innerHTML = `<h4>Magnet:</h4><p class="note">${m}</p><p class="note">واجهة عرض فقط — لإدارة حقيقية تحتاج backend أو عميل تورنت.</p>`;
    });
  }

  /* *******************
     TOOL: Video (tools/video.html)
     - Uses @ffmpeg/ffmpeg (ffmpeg.wasm) loaded from CDN.
     - Converts input video (mp4/...) to webm (example) and to GIF (small).
     ******************* */
  if (document.body.dataset.tool === 'video') {
    const inFile = document.getElementById('videoFile');
    const convertBtn = document.getElementById('videoConvert');
    const progressBar = document.getElementById('videoProgress');
    const outputArea = document.getElementById('videoOutput');

    let ffmpeg = null;
    const loadFF = async () => {
      if (ffmpeg) return ffmpeg;
      outputArea.innerHTML = '<p class="note">⏳ جاري تحميل محرك ffmpeg (قد يستغرق قليلاً)...</p>';
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js';
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
      const { createFFmpeg, fetchFile } = FFmpeg;
      ffmpeg = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js' });
      await ffmpeg.load();
      return { ffmpeg, fetchFile };
    };

    convertBtn.addEventListener('click', async () => {
      const f = inFile.files[0];
      if (!f) { alert('اختر ملف فيديو أولاً'); return; }
      const target = document.getElementById('videoTarget').value;
      try {
        const { ffmpeg, fetchFile } = await loadFF();
        outputArea.innerHTML = `<p class="note">🔄 جاري التحويل إلى ${target} — قد يستغرق بعض الوقت</p>`;
        progressBar.querySelector('i').style.width = '0%';

        ffmpeg.setProgress(({ ratio }) => {
          progressBar.querySelector('i').style.width = `${Math.round(ratio * 100)}%`;
        });

        const name = 'input' + getExt(f.name);
        ffmpeg.FS('writeFile', name, await fetchFile(f));

        const outName = 'output.' + target;
        // basic conversion command
        if (target === 'gif') {
          await ffmpeg.run('-i', name, '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-t', '10', outName);
        } else {
          await ffmpeg.run('-i', name, outName);
        }

        const data = ffmpeg.FS('readFile', outName);
        const blob = new Blob([data.buffer], { type: mimeFor(target) });
        const url = URL.createObjectURL(blob);
        outputArea.innerHTML = `<a class="result-link" href="${url}" download="${outName}">⬇️ تحميل ${outName}</a>
                               <p class="note">حجم الناتج: ${formatBytes(blob.size)}</p>`;
      } catch (err) {
        outputArea.innerHTML = `<p class="note">خطأ أثناء التحويل: ${err.message}</p>`;
      }
    });
  }

  /* *******************
     TOOL: Audio (tools/audio.html)
     - Use ffmpeg.wasm to convert audio formats
     ******************* */
  if (document.body.dataset.tool === 'audio') {
    const fileIn = document.getElementById('audioFile');
    const btn = document.getElementById('audioConvert');
    const progressBar = document.getElementById('audioProgress');
    const out = document.getElementById('audioOutput');

    let ffmpegA = null;
    const loadFFA = async () => {
      if (ffmpegA) return ffmpegA;
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js';
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
      const { createFFmpeg, fetchFile } = FFmpeg;
      ffmpegA = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js' });
      await ffmpegA.load();
      return { ffmpegA, fetchFile };
    };

    btn.addEventListener('click', async () => {
      const f = fileIn.files[0];
      if (!f) { alert('اختر ملف صوتي'); return; }
      const target = document.getElementById('audioTarget').value;
      try {
        const { ffmpegA, fetchFile } = await loadFFA();
        out.innerHTML = `<p class="note">🔄 جاري التحويل إلى ${target} ...</p>`;
        progressBar.querySelector('i').style.width = '0%';
        ffmpegA.setProgress(({ ratio }) => {
          progressBar.querySelector('i').style.width = `${Math.round(ratio * 100)}%`;
        });

        const inName = 'in'+getExt(f.name);
        ffmpegA.FS('writeFile', inName, await fetchFile(f));
        const outName = 'out.' + target;
        await ffmpegA.run('-i', inName, outName);
        const data = ffmpegA.FS('readFile', outName);
        const blob = new Blob([data.buffer], { type: mimeFor(target) });
        const url = URL.createObjectURL(blob);
        out.innerHTML = `<a class="result-link" href="${url}" download="${outName}">⬇️ تحميل ${outName}</a>
                         <p class="note">حجم الناتج: ${formatBytes(blob.size)}</p>`;
      } catch (e) {
        out.innerHTML = `<p class="note">خطأ: ${e.message}</p>`;
      }
    });
  }

  /* *******************
     TOOL: Image (tools/image.html)
     - Convert using Canvas (fast and local)
     ******************* */
  if (document.body.dataset.tool === 'image') {
    const inFile = document.getElementById('imageFile');
    const convertBtn = document.getElementById('imageConvert');
    const output = document.getElementById('imageOutput');

    convertBtn.addEventListener('click', async () => {
      const f = inFile.files[0];
      if (!f) { alert('اختر صورة'); return; }
      const target = document.getElementById('imageTarget').value;
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        const mime = mimeFor(target);
        canvas.toBlob(blob => {
          const dlUrl = URL.createObjectURL(blob);
          output.innerHTML = `<a class="result-link" href="${dlUrl}" download="converted.${target}">⬇️ تحميل converted.${target}</a>
                              <p class="note">أبعاد: ${canvas.width}×${canvas.height} — الحجم: ${formatBytes(blob.size)}</p>`;
        }, mime, 0.92);
      };
    });
  }

  /* *******************
     TOOL: Compress (tools/compress.html)
     - Use ffmpeg for video compression (CRF) or canvas for images (quality)
     ******************* */
  if (document.body.dataset.tool === 'compress') {
    const fileIn = document.getElementById('compressFile');
    const btn = document.getElementById('compressBtn');
    const out = document.getElementById('compressOutput');
    const progressBar = document.getElementById('compressProgress');

    btn.addEventListener('click', async () => {
      const f = fileIn.files[0];
      if (!f) { alert('اختر ملف'); return; }
      const type = f.type.startsWith('image/') ? 'image' : (f.type.startsWith('video/') ? 'video' : 'other');
      if (type === 'image') {
        // use canvas quality param by converting to jpeg/webp
        const img = new Image(); img.src = URL.createObjectURL(f);
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img,0,0);
          c.toBlob(b => {
            const link = URL.createObjectURL(b);
            out.innerHTML = `<a class="result-link" href="${link}" download="compressed.jpg">⬇️ تحميل صورة مضغوطة (JPEG)</a>
                             <p class="note">الحجم: ${formatBytes(b.size)}</p>`;
          }, 'image/jpeg', 0.6);
        };
      } else if (type === 'video') {
        // use ffmpeg to compress: -vcodec libx264 -crf 28
        out.innerHTML = `<p class="note">يتم التحميل إلى ffmpeg... (قد يستغرق وقتاً)</p>`;
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js';
        document.head.appendChild(script);
        await new Promise(r => script.onload = r);
        const { createFFmpeg, fetchFile } = FFmpeg;
        const ff = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js' });
        await ff.load();
        ff.setProgress(({ ratio }) => { progressBar.querySelector('i').style.width = `${Math.round(ratio*100)}%`; });
        const inName = 'in'+getExt(f.name);
        ff.FS('writeFile', inName, await fetchFile(f));
        const outName = 'out_compressed.mp4';
        await ff.run('-i', inName, '-vcodec', 'libx264', '-crf', '28', outName);
        const data = ff.FS('readFile', outName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        out.innerHTML = `<a class="result-link" href="${url}" download="${outName}">⬇️ تحميل فيديو مضغوط</a>
                         <p class="note">الحجم: ${formatBytes(blob.size)}</p>`;
      } else {
        alert('نوع الملف غير مدعوم للضغط في هذه الواجهة.');
      }
    });
  }

  /* *******************
     TOOL: Extract audio (tools/extract.html)
     - ffmpeg: extract audio track to mp3
     ******************* */
  if (document.body.dataset.tool === 'extract') {
    const fIn = document.getElementById('extractFile');
    const btn = document.getElementById('extractBtn');
    const out = document.getElementById('extractOutput');
    const progressBar = document.getElementById('extractProgress');

    btn.addEventListener('click', async () => {
      const f = fIn.files[0];
      if (!f) { alert('اختر فيديو'); return; }
      out.innerHTML = `<p class="note">تحميل ffmpeg...</p>`;
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js';
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
      const { createFFmpeg, fetchFile } = FFmpeg;
      const ff = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js' });
      await ff.load();
      ff.setProgress(({ ratio }) => { progressBar.querySelector('i').style.width = `${Math.round(ratio*100)}%`; });
      const inName = 'in'+getExt(f.name);
      ff.FS('writeFile', inName, await fetchFile(f));
      const outName = 'extracted.mp3';
      await ff.run('-i', inName, '-q:a', '0', '-map', 'a', outName);
      const data = ff.FS('readFile', outName);
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      out.innerHTML = `<a class="result-link" href="${url}" download="${outName}">⬇️ تحميل mp3</a>
                       <p class="note">الحجم: ${formatBytes(blob.size)}</p>`;
    });
  }

  /* *******************
     TOOL: Universal (tools/universal.html)
     - UI to pick file & choose target type (delegates to above tools if possible)
     ******************* */
  if (document.body.dataset.tool === 'universal') {
    const fIn = document.getElementById('uFile');
    const sel = document.getElementById('uTarget');
    const btn = document.getElementById('uGo');
    const out = document.getElementById('uOutput');

    btn.addEventListener('click', () => {
      const f = fIn.files[0];
      if (!f) { alert('اختر ملف'); return; }
      const tgt = sel.value;
      // simple delegation by mimetype
      if (f.type.startsWith('image/') && ['jpg','webp','png','gif'].includes(tgt)) {
        // delegate to image conversion code (reuse canvas approach)
        const img = new Image(); img.src = URL.createObjectURL(f);
        img.onload = () => {
          const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img,0,0);
          c.toBlob(b => {
            out.innerHTML = `<a class="result-link" href="${URL.createObjectURL(b)}" download="converted.${tgt}">⬇️ تحميل converted.${tgt}</a>
                             <p class="note">الحجم: ${formatBytes(b.size)}</p>`;
          }, mimeFor(tgt), 0.92);
        };
      } else {
        out.innerHTML = `<p class="note">يتم توجيه الملف للأداة المناسبة — إذا كانت تحويل فيديو/صوت، افتح صفحة الأداة.</p>`;
      }
    });
  }

  /* ===== helpers ===== */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(bytes)/Math.log(k));
    return parseFloat((bytes / Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
  }
  function getExt(name) {
    const i = name.lastIndexOf('.');
    return i===-1 ? '' : name.slice(i);
  }
  function mimeFor(extOrType) {
    const map = { mp4:'video/mp4', webm:'video/webm', mkv:'video/x-matroska', gif:'image/gif',
                  mp3:'audio/mpeg', wav:'audio/wav', aac:'audio/aac', flac:'audio/flac', ogg:'audio/ogg',
                  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp' };
    return map[extOrType] || extOrType;
  }

})();
