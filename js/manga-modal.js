/* ─────────────────────────────────────────────────────────────
   manga-modal.js  —  shared manga detail modal for MangaMap
   Include this file in any page that has clickable manga cards.
   Usage:  openMangaModal(malId, titleFallback)
───────────────────────────────────────────────────────────── */

(function () {

    // ── Inject modal HTML once ──────────────────────────────────────────────
    const modalHTML = `
    <style>
        .mm-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.88);
            z-index: 2000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .mm-overlay.open { display: flex; }

        .mm-box {
            background: #111111;
            border: 1px solid #333;
            border-radius: 14px;
            max-width: 820px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            animation: mm-in 0.18s ease;
        }
        @keyframes mm-in {
            from { opacity: 0; transform: scale(0.96); }
            to   { opacity: 1; transform: scale(1); }
        }

        .mm-close {
            position: absolute;
            top: 14px; right: 16px;
            background: none;
            border: 1px solid #444;
            color: #eeecee;
            font-size: 1.1rem;
            width: 34px; height: 34px;
            border-radius: 50%;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background-color 0.2s;
            z-index: 10;
        }
        .mm-close:hover { background-color: #2a2a2a; }

        .mm-body {
            display: flex;
            gap: 28px;
            padding: 32px;
        }

        .mm-cover { flex-shrink: 0; width: 190px; }
        .mm-cover img {
            width: 100%; border-radius: 8px;
            border: 1px solid #2a2a2a; display: block;
        }
        .mm-cover-empty {
            width: 190px; height: 270px;
            background: #1a1a1a; border-radius: 8px;
            display: flex; align-items: center;
            justify-content: center; color: #444; font-size: 0.85rem;
        }

        .mm-info { flex: 1; min-width: 0; }

        .mm-title {
            font-size: 1.5rem; font-weight: 700;
            color: #ffffff; margin-bottom: 3px; line-height: 1.3;
        }
        .mm-title-jp { font-size: 0.88rem; color: #666; margin-bottom: 16px; }

        .mm-score-big {
            font-size: 2rem; font-weight: 700;
            color: #ffffff; margin-bottom: 2px;
        }
        .mm-score-sub { font-size: 0.78rem; color: #666; margin-bottom: 16px; }

        .mm-tags {
            display: flex; flex-wrap: wrap;
            gap: 8px; margin-bottom: 16px;
        }
        .mm-tag {
            background: rgba(255,255,255,0.05);
            border: 1px solid #2a2a2a;
            border-radius: 20px;
            padding: 3px 13px;
            font-size: 0.8rem; color: #ccc;
        }
        .mm-tag strong { color: #ffffff; }

        .mm-genre-chips {
            display: flex; flex-wrap: wrap;
            gap: 7px; margin-bottom: 16px;
        }
        .mm-chip {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 20px;
            padding: 3px 11px;
            font-size: 0.78rem; color: #bbb;
        }

        .mm-label {
            font-size: 0.75rem; text-transform: uppercase;
            letter-spacing: 1px; color: #555;
            border-bottom: 1px solid #222;
            padding-bottom: 4px; margin-bottom: 8px;
        }

        .mm-synopsis {
            color: #bbb; font-size: 0.88rem;
            line-height: 1.75; margin-bottom: 18px;
        }

        .mm-mal-btn {
            display: inline-block;
            color: #ffffff; text-decoration: none;
            font-size: 0.85rem;
            border: 1px solid #ffffff;
            padding: 7px 18px; border-radius: 6px;
            transition: background-color 0.3s, color 0.3s;
        }
        .mm-mal-btn:hover { background-color: #ffffff; color: #000000; }

        .mm-loader {
            display: flex; align-items: center;
            justify-content: center; gap: 12px;
            padding: 60px 32px; color: #aaa;
        }
        .mm-spinner {
            width: 28px; height: 28px;
            border: 3px solid #333;
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: mm-spin 0.8s linear infinite;
            flex-shrink: 0;
        }
        @keyframes mm-spin { to { transform: rotate(360deg); } }

        /* Make cards look clickable */
        .manga-card.clickable { cursor: pointer; }
        .manga-card.clickable:hover { border-color: var(--accent, #ffffff); }
    </style>

    <div class="mm-overlay" id="mm-overlay">
        <div class="mm-box">
            <button class="mm-close" id="mm-close">&#x2715;</button>
            <div id="mm-content"></div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // ── Close handlers ──────────────────────────────────────────────────────
    const overlay = document.getElementById('mm-overlay');
    document.getElementById('mm-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    function closeModal() {
        overlay.classList.remove('open');
        document.getElementById('mm-content').innerHTML = '';
    }

    // ── Public: open modal for a given MAL manga ID ─────────────────────────
    window.openMangaModal = async function (malId, titleFallback = '') {
        document.getElementById('mm-content').innerHTML = `
            <div class="mm-loader">
                <div class="mm-spinner"></div>
                <span>Loading${titleFallback ? ' ' + titleFallback : ''}…</span>
            </div>
        `;
        overlay.classList.add('open');

        try {
            const res  = await fetch(`https://api.jikan.moe/v4/manga/${malId}`);
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const m    = (await res.json()).data;

            const cover     = m.images?.jpg?.large_image_url || m.images?.jpg?.image_url || '';
            const titleEn   = m.title_english || m.title;
            const titleJp   = m.title_japanese || '';
            const score     = m.score     ? m.score.toFixed(2) : 'N/A';
            const scoredBy  = m.scored_by ? m.scored_by.toLocaleString() : 'N/A';
            const rank      = m.rank      ? `#${m.rank}`       : 'N/A';
            const status    = m.status    || 'N/A';
            const volumes   = m.volumes   || 'N/A';
            const chapters  = m.chapters  || 'N/A';
            const authors   = m.authors?.map(a => a.name).join(', ') || 'N/A';
            const startDate = m.published?.from
                ? new Date(m.published.from).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
                : 'N/A';
            const endDate   = m.published?.to
                ? new Date(m.published.to).toLocaleDateString('en-US', { year:'numeric', month:'long' })
                : (status === 'Publishing' ? 'Ongoing' : 'N/A');
            const genres    = [...(m.genres||[]), ...(m.themes||[]), ...(m.demographics||[])];
            const synopsis  = (m.synopsis || 'No synopsis available.')
                                .replace(/\[Written by MAL Rewrite\]/g, '').trim();
            const malUrl    = m.url || `https://myanimelist.net/manga/${malId}`;

            document.getElementById('mm-content').innerHTML = `
                <div class="mm-body">
                    <div class="mm-cover">
                        ${cover
                            ? `<img src="${cover}" alt="Cover for ${titleEn}">`
                            : `<div class="mm-cover-empty">No Image</div>`
                        }
                    </div>
                    <div class="mm-info">
                        <h2 class="mm-title">${titleEn}</h2>
                        ${titleJp ? `<p class="mm-title-jp">${titleJp}</p>` : ''}

                        <div class="mm-score-big">${score} <span style="font-size:1rem;color:#666;">/ 10</span></div>
                        <div class="mm-score-sub">Scored by ${scoredBy} users &bull; Ranked ${rank}</div>

                        <div class="mm-tags">
                            <span class="mm-tag"><strong>Author:</strong> ${authors}</span>
                            <span class="mm-tag"><strong>Status:</strong> ${status}</span>
                            <span class="mm-tag"><strong>Volumes:</strong> ${volumes}</span>
                            <span class="mm-tag"><strong>Chapters:</strong> ${chapters}</span>
                            <span class="mm-tag"><strong>Started:</strong> ${startDate}</span>
                            <span class="mm-tag"><strong>Ended:</strong> ${endDate}</span>
                        </div>

                        ${genres.length ? `
                            <p class="mm-label">Genres &amp; Themes</p>
                            <div class="mm-genre-chips">
                                ${genres.map(g => `<span class="mm-chip">${g.name}</span>`).join('')}
                            </div>
                        ` : ''}

                        <p class="mm-label">Synopsis</p>
                        <p class="mm-synopsis">${synopsis}</p>

                        <a href="${malUrl}" target="_blank" class="mm-mal-btn">View on MyAnimeList &#8599;</a>
                    </div>
                </div>
            `;

        } catch (err) {
            document.getElementById('mm-content').innerHTML = `
                <div class="mm-loader" style="flex-direction:column;gap:10px;">
                    <p style="color:#aaa;">Could not load details. Please try again.</p>
                    <small style="color:#555;">${err.message}</small>
                </div>
            `;
        }
    };

})();
