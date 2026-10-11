// Runs on the Pinterest board page when the toolbar icon is clicked.
// Collects every pin (main board + sections) and hands the list to the results tab.
(() => {
  if (window.__pbdActive) return;
  window.__pbdActive = true;

  const RESERVED = new Set([
    'pin', 'search', 'ideas', 'today', 'settings', 'business', 'resource', 'explore', 'videos',
    'shopping', 'categories', 'topics', 'news_hub', 'notifications', 'inbox', 'login', 'signup',
    '_saved', '_created', '_profile', 'pins', 'boards', 'following', 'followers'
  ]);
  let stopRequested = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Progress overlay ----------
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    .box{font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#111;color:#fff;border-radius:14px;padding:14px 16px;width:280px;box-shadow:0 8px 30px rgba(0,0,0,.35)}
    .t{font-weight:700;font-size:13px;opacity:.8}
    .n{font-size:28px;font-weight:800;margin:4px 0}
    .s{opacity:.85;min-height:20px}
    button{margin-top:10px;background:#4f46e5;color:#fff;border:0;border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer}
  </style>
  <div class="box"><div class="t">Board Saver</div><div class="n" id="n">0 pins</div><div class="s" id="s">Starting...</div><button id="b">Stop and use what's found</button></div>`;
  document.documentElement.appendChild(host);
  const $n = root.getElementById('n');
  const $s = root.getElementById('s');
  const $b = root.getElementById('b');
  $b.onclick = () => { stopRequested = true; $s.textContent = 'Stopping...'; };
  const status = (msg, count) => {
    if (msg) $s.textContent = msg;
    if (count != null) $n.textContent = count + ' pins';
  };
  const finish = (msg, delay = 4000) => {
    status(msg);
    $b.remove();
    setTimeout(() => { host.remove(); window.__pbdActive = false; }, delay);
  };

  // ---------- Work out which board we're on ----------
  const parts = location.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  if (parts.length < 2 || RESERVED.has(parts[0]) || RESERVED.has(parts[1])) {
    finish('Open a Pinterest board first, then click the extension icon again.', 6000);
    return;
  }
  const [username, slug] = parts;
  const sectionSlug = parts[2] && !parts[2].startsWith('_') && parts[2] !== 'more_ideas' ? parts[2] : null;

  // ---------- Image URL helpers ----------
  // Turns any i.pinimg.com size (236x, 474x, 736x...) into the /originals/ URL, with fallbacks.
  function candidates(url) {
    const m = url.match(/^(https:\/\/i\.pinimg\.com)\/(?:\d+x(?:\d+)?(?:_RS)?|originals)\/(.+)$/);
    if (!m) return [url];
    const [, base, rest] = m;
    const extM = rest.match(/\.(\w+)$/);
    const stem = extM ? rest.slice(0, -extM[0].length) : rest;
    const ext = extM ? extM[1].toLowerCase() : 'jpg';
    const exts = [ext, ...['jpg', 'png', 'webp', 'gif'].filter((e) => e !== ext)];
    return [...new Set([...exts.map((e) => `${base}/originals/${stem}.${e}`), `${base}/736x/${rest}`, url])];
  }

  function bestImage(images) {
    if (!images) return null;
    if (images.orig && images.orig.url) return images.orig;
    let best = null;
    for (const k in images) {
      const v = images[k];
      if (v && v.url && (!best || (v.width || 0) > (best.width || 0))) best = v;
    }
    return best;
  }

  function bestVideo(p) {
    const lists = [];
    if (p.videos && p.videos.video_list) lists.push(p.videos.video_list);
    const pages = p.story_pin_data && p.story_pin_data.pages;
    if (pages) for (const pg of pages) for (const b of pg.blocks || []) if (b.video && b.video.video_list) lists.push(b.video.video_list);
    let best = null;
    for (const l of lists) for (const k in l) {
      const v = l[k];
      if (v && v.url && /\.mp4(\?|$)/.test(v.url) && (!best || (v.width || 0) > (best.width || 0))) best = v;
    }
    return best ? best.url : '';
  }

  function addApiPin(p, section, out, seen) {
    if (!p || !p.id || seen.has(String(p.id))) return;
    let img = bestImage(p.images);
    if (!img && p.story_pin_data && p.story_pin_data.pages) {
      for (const pg of p.story_pin_data.pages) {
        const blk = (pg.blocks || []).find((b) => b.image && b.image.images);
        if (blk) { img = bestImage(blk.image.images); break; }
      }
    }
    if (!img || !img.url) return;
    seen.add(String(p.id));
    out.push({
      id: String(p.id),
      title: String(p.title || p.grid_title || p.description || '').trim().slice(0, 300),
      link: p.link || '',
      section: section || '',
      urls: candidates(img.url),
      video: bestVideo(p)
    });
  }

  // ---------- Method 1: Pinterest's own web API (fast, complete) ----------
  async function resource(name, options) {
    const data = JSON.stringify({ options, context: {} });
    const url = `/resource/${name}/get/?source_url=${encodeURIComponent(location.pathname)}&data=${encodeURIComponent(data)}&_=${Date.now()}`;
    const r = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Pinterest-Source-Url': location.pathname,
        'X-Pinterest-PWS-Handler': 'www/[username]/[slug].js',
        'X-Pinterest-AppState': 'active'
      }
    });
    if (!r.ok) throw new Error(`${name} HTTP ${r.status}`);
    const j = await r.json();
    const rr = j && j.resource_response;
    if (!rr || rr.error) throw new Error(`${name} returned an error`);
    return rr;
  }

  async function pagedPins(name, baseOpts, section, out, seen) {
    let bookmark = null;
    let guard = 0;
    do {
      if (stopRequested) return;
      const opts = { ...baseOpts, page_size: 100 };
      if (bookmark) opts.bookmarks = [bookmark];
      const rr = await resource(name, opts);
      for (const p of Array.isArray(rr.data) ? rr.data : []) addApiPin(p, section, out, seen);
      status(null, out.length);
      bookmark = rr.bookmark;
      guard++;
      await sleep(150);
    } while (bookmark && bookmark !== '-end-' && guard < 500);
  }

  async function getSections(boardId) {
    const list = [];
    let bookmark = null;
    let guard = 0;
    do {
      const opts = { board_id: boardId };
      if (bookmark) opts.bookmarks = [bookmark];
      const rr = await resource('BoardSectionsResource', opts);
      for (const s of rr.data || []) list.push({ id: s.id, title: s.title || 'Section', slug: s.slug });
      bookmark = rr.bookmark;
      guard++;
    } while (bookmark && bookmark !== '-end-' && guard < 50);
    return list;
  }

  async function apiCollect(out, seen) {
    status('Reading board...', 0);
    const b = (await resource('BoardResource', { username, slug, field_set_key: 'detailed' })).data;
    if (!b || !b.id) throw new Error('Board not found');
    let boardName = b.name || slug;

    let sections = [];
    try { sections = b.section_count ? await getSections(b.id) : []; } catch (e) { sections = []; }

    if (sectionSlug) {
      const sec = sections.find((s) => s.slug === sectionSlug);
      if (!sec) throw new Error('Section not found');
      boardName += ' - ' + sec.title;
      status(`Collecting section: ${sec.title}`);
      await pagedPins('BoardSectionPinsResource', { section_id: sec.id }, '', out, seen);
    } else {
      status('Collecting pins...');
      await pagedPins('BoardFeedResource', {
        board_id: b.id,
        board_url: `/${username}/${slug}/`,
        filter_section_pins: true,
        sort: 'default',
        layout: 'default'
      }, '', out, seen);
      for (const s of sections) {
        if (stopRequested) break;
        status(`Section: ${s.title}`);
        try {
          await pagedPins('BoardSectionPinsResource', { section_id: s.id }, s.title, out, seen);
        } catch (e) {
          console.warn('Board Saver: could not read section', s.title, e);
        }
      }
    }
    if (!out.length && !stopRequested) throw new Error('No pins returned');
    return boardName;
  }

  // ---------- Method 2: scroll the page and read pins as they appear (fallback) ----------
  function largestSrc(img) {
    const set = img.getAttribute('srcset');
    if (set) {
      let best = null;
      let bestVal = -1;
      for (const part of set.split(',')) {
        const [u, d] = part.trim().split(/\s+/);
        const val = parseFloat(d) || 1;
        if (u && val > bestVal) { best = u; bestVal = val; }
      }
      if (best) return best;
    }
    return img.currentSrc || img.src;
  }

  function stopLine() {
    const h = [...document.querySelectorAll('h2,h3,div[role="heading"]')].find((el) =>
      /^(more ideas|more like this|find (some )?(more )?ideas)/i.test(el.textContent.trim())
    );
    return h ? h.getBoundingClientRect().top + window.scrollY : Infinity;
  }

  async function scrollCollect(out, seen) {
    window.scrollTo(0, 0);
    await sleep(800);
    let idle = 0;
    while (!stopRequested && out.length < 10000) {
      const limit = stopLine();
      const before = out.length;
      for (const a of document.querySelectorAll('a[href*="/pin/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/pin\/([^/?#]+)/);
        if (!m || seen.has(m[1])) continue;
        const img = a.querySelector('img');
        if (!img) continue;
        if (a.getBoundingClientRect().top + window.scrollY > limit) continue;
        const src = largestSrc(img);
        if (!src || !/pinimg\.com/.test(src)) continue;
        seen.add(m[1]);
        out.push({ id: m[1], title: (img.alt || '').trim().slice(0, 300), link: '', section: '', urls: candidates(src), video: '' });
      }
      status('Scrolling the board...', out.length);
      if (limit !== Infinity && limit < window.scrollY + window.innerHeight) break;
      idle = out.length === before ? idle + 1 : 0;
      if (idle >= 12) break;
      window.scrollBy(0, Math.round(window.innerHeight * 0.8));
      await sleep(900);
    }
  }

  // ---------- Run ----------
  (async () => {
    const out = [];
    const seen = new Set();
    let boardName = slug.replace(/-/g, ' ');
    let method = 'api';
    try {
      boardName = await apiCollect(out, seen);
    } catch (e) {
      console.warn('Board Saver: API method failed, falling back to scrolling.', e);
      if (!stopRequested) {
        method = 'scroll';
        const h = document.querySelector('h1');
        if (h && h.textContent.trim()) boardName = h.textContent.trim();
        await scrollCollect(out, seen);
      }
    }

    if (!out.length) {
      finish('No pins found. Make sure the board has loaded, then try again.', 6000);
      return;
    }
    status('Opening results...', out.length);
    chrome.runtime.sendMessage(
      { type: 'pbd-scan', job: { board: boardName, source: location.href, method, items: out, created: Date.now() } },
      () => finish(`Done. ${out.length} pins sent to the results tab.`)
    );
  })();
})();
